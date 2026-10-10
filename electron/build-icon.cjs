// 用 Electron 离屏渲染把 public/icon.svg 按多个尺寸栅格化（透明底），
// 打包成多尺寸 ICO 写入 build/icon.ico（electron-builder 默认读取该位置）。
// 每个尺寸都直接用 SVG 原生渲染，避免任务栏、桌面的小图标由 256 缩小后发糊。
// 256 用 PNG 压缩（Vista 起支持），其余尺寸用 32 位 BMP，兼容 Win7 各处显示。
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const SIZES = [16, 24, 32, 48, 64, 128, 256];

// 截图像素必须与 CSS 像素一一对应，不能随高分屏缩放
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("high-dpi-support", "1");

const rootDir = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(rootDir, "public", "icon.svg"));
const svgDataUrl = "data:image/svg+xml;base64," + svg.toString("base64");

async function renderSize(win, size) {
  const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}img{display:block;width:${size}px;height:${size}px}</style></head><body><img src="${svgDataUrl}"></body></html>`;
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await win.webContents.executeJavaScript("document.querySelector('img').decode().then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))");
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  const { width, height } = image.getSize();
  if (width !== size || height !== size) {
    throw new Error(`capture size ${width}x${height} != ${size}x${size}`);
  }
  return image;
}

// NativeImage 位图是预乘 alpha 的 BGRA，ICO 的 BMP 需要非预乘
function toIcoBitmap(image, size) {
  const src = image.toBitmap();
  const rowBytes = size * 4;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const info = Buffer.alloc(40);
  info.writeUInt32LE(40, 0); // biSize
  info.writeInt32LE(size, 4); // biWidth
  info.writeInt32LE(size * 2, 8); // biHeight：XOR + AND 两段
  info.writeUInt16LE(1, 12); // biPlanes
  info.writeUInt16LE(32, 14); // biBitCount
  const pixels = Buffer.alloc(rowBytes * size);
  for (let y = 0; y < size; y += 1) {
    // BMP 行序自下而上
    const srcRow = y * rowBytes;
    const dstRow = (size - 1 - y) * rowBytes;
    for (let x = 0; x < rowBytes; x += 4) {
      const a = src[srcRow + x + 3];
      for (let c = 0; c < 3; c += 1) {
        const v = src[srcRow + x + c];
        pixels[dstRow + x + c] = a === 0 ? 0 : Math.min(255, Math.round((v * 255) / a));
      }
      pixels[dstRow + x + 3] = a;
    }
  }
  const mask = Buffer.alloc(maskRowBytes * size); // 全 0：透明度完全由 alpha 通道决定
  return Buffer.concat([info, pixels, mask]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: { offscreen: true }
  });

  const entries = [];
  for (const size of SIZES) {
    const image = await renderSize(win, size);
    entries.push({ size, data: size === 256 ? image.toPNG() : toIcoBitmap(image, size) });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4); // image count

  let offset = 6 + 16 * entries.length;
  const dir = entries.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width: 0 表示 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  const outDir = path.join(rootDir, "build");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "icon.ico");
  fs.writeFileSync(outPath, Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]));
  console.log(`icon written: ${outPath} (${SIZES.join("/")})`);
  app.exit(0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
