import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { AudioCaptureManager } from './audio-capture';
import { setupWallpaper } from './wallpaper';

// Disable GPU hardware acceleration to avoid GPU driver crashes
// Uses SwiftShader software rendering for WebGL compatibility
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL]', String(reason));
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let audioCapture: AudioCaptureManager | null = null;

function createMainWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Relay renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log('[Renderer]', message);
  });

  mainWindow.webContents.on('render-process-gone', () => {
    console.error('[Renderer] crashed, reloading...');
    setTimeout(() => mainWindow?.reload(), 500);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    // Start audio capture when window is ready
    setTimeout(() => {
      if (mainWindow) {
        audioCapture = new AudioCaptureManager();
        audioCapture.start(mainWindow);
      }
    }, 500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'Escape') {
      if (mainWindow?.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
      app.quit();
    }
  });
}

function setupIPC(win: BrowserWindow): void {
  ipcMain.on('toggle-visual', () => {});
  setupWallpaper(win);
}

app.whenReady().then(() => {
  createMainWindow();
  if (mainWindow) setupIPC(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
