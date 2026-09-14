/**
 * Electron Preload script for YellowBird Admin Portal.
 * Exposes safe desktop APIs to the renderer context.
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: '1.0.0',
});
