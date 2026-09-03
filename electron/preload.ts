const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  platform: process.platform,
  isDev: () => ipcRenderer.invoke('get-is-dev')
})

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>
      getAppName: () => Promise<string>
      platform: string
      isDev: () => Promise<boolean>
    }
  }
}
