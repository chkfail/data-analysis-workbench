// 用 Electron 离屏渲染把 public/icon.svg 栅格化为 256x256 PNG，
// 再包一层 ICO 头写入 build/icon.ico（electron-builder 默认读取该位置）。
// PNG 压缩的 ICO 从 Vista 起都支持，覆盖 Win7 没问题。
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(rootDir, "public", "icon.svg"));
const svgDataUrl = "data:image/svg+xml;base64," + svg.toString("base64");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    webPreferences: { offscreen: true }
  });

  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden}img{display:block;width:256px;height:256px}</style></head><body><img src="${svgDataUrl}"></body></html>`;
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  // 高分屏下截图像素会按缩放比放大，统一压回 256x256
  const image = await win.webContents.capturePage();
  const png = image.resize({ width: 256, height: 256, quality: "best" }).toPNG();

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width: 0 表示 256
  entry.writeUInt8(0, 1); // height: 0 表示 256
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // 数据偏移 = 6 + 16

  const outDir = path.join(rootDir, "build");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "icon.ico");
  fs.writeFileSync(outPath, Buffer.concat([header, entry, png]));
  console.log(`icon written: ${outPath} (${png.length} bytes png)`);
  app.exit(0);
});
