const { app, BrowserWindow, Menu, protocol, session } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 开发模式：设置 ELECTRON_START_URL=http://localhost:3000 直连 dev server
const DEV_URL = process.env.ELECTRON_START_URL;

// 静态导出产物通过 app://bundle/ 加载。相比 file://，自定义标准协议有固定 origin，
// Web Worker、绝对路径的 /_next 资源和 fetch 都能正常工作。
const APP_SCHEME = "app";
const APP_HOST = "bundle";
const APP_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;
const OUT_DIR = path.join(__dirname, "..", "out");

// 现场排障：DAW_DEBUG_LOG=1 时在系统临时目录写 daw-electron.log
const DEBUG_LOG = process.env.DAW_DEBUG_LOG === "1";
const debugLogPath = path.join(os.tmpdir(), "daw-electron.log");
function debugLog(message) {
  if (!DEBUG_LOG) return;
  try {
    fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // 忽略日志写入失败
  }
}

process.on("uncaughtException", (error) => {
  debugLog(`uncaughtException: ${error && error.stack}`);
});

debugLog(`start: electron=${process.versions.electron} platform=${process.platform} arch=${process.arch}`);

// 必须在 app ready 之前注册
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

function resolveBundlePath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return null;
  }
  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.normalize(path.join(OUT_DIR, pathname));
  // 防止 ../ 跳出 out 目录
  if (filePath !== OUT_DIR && !filePath.startsWith(OUT_DIR + path.sep)) return null;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  // Next 静态导出的路由文件形如 /foo.html
  if (!path.extname(filePath) && fs.existsSync(`${filePath}.html`)) return `${filePath}.html`;
  return null;
}

function registerBundleProtocol() {
  protocol.registerFileProtocol(APP_SCHEME, (request, callback) => {
    const filePath = resolveBundlePath(request.url);
    if (!filePath) {
      debugLog(`bundle 404: ${request.url}`);
      callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
      return;
    }
    callback({ path: filePath });
  });
}

// 应用完全离线：除开发模式的 dev server 外，拒绝一切网络请求
function blockRemoteRequests() {
  const allowedOrigin = DEV_URL ? new URL(DEV_URL).origin : null;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const isLocal =
      url.startsWith(`${APP_SCHEME}:`) ||
      url.startsWith("blob:") ||
      url.startsWith("data:") ||
      url.startsWith("devtools:") ||
      url.startsWith("chrome-extension:");
    const isDevServer =
      allowedOrigin &&
      (url.startsWith(allowedOrigin) || url.startsWith(allowedOrigin.replace(/^http/, "ws")));
    if (isLocal || isDevServer) {
      callback({});
      return;
    }
    debugLog(`blocked request: ${url}`);
    callback({ cancel: true });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // 禁止页面跳转和弹出新窗口，只允许停留在本地包内
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = url.startsWith(`${APP_SCHEME}://${APP_HOST}/`) || (DEV_URL && url.startsWith(DEV_URL));
    if (!allowed) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    debugLog(`did-fail-load: code=${code} ${description} ${url}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    debugLog(`render-process-gone: ${JSON.stringify(details)}`);
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(OUT_DIR, "index.html");
    debugLog(`load: ${APP_URL} exists=${fs.existsSync(indexPath)}`);
    win.loadURL(APP_URL);
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
debugLog(`singleInstanceLock: ${gotSingleInstanceLock}`);

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    debugLog("app ready");
    registerBundleProtocol();
    blockRemoteRequests();
    if (!DEV_URL) Menu.setApplicationMenu(null);
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}
