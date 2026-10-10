const { app, BrowserWindow, Menu } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

// 开发模式：设置 ELECTRON_START_URL=http://localhost:3000 直连 dev server
const DEV_URL = process.env.ELECTRON_START_URL;

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
      contextIsolation: true
    }
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.on("did-fail-load", (_event, code, description) => {
    debugLog(`did-fail-load: code=${code} ${description}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    debugLog(`render-process-gone: ${JSON.stringify(details)}`);
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "out", "index.html");
    debugLog(`loadFile: ${indexPath} exists=${fs.existsSync(indexPath)}`);
    win.loadFile(indexPath);
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
