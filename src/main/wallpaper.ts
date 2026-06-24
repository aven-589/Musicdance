import { app, BrowserWindow, globalShortcut } from 'electron';

export function setupWallpaper(win: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    win.webContents.send('toggle-immersive');
  });
}
