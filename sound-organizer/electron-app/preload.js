const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    getAudioFiles: (directoryPath) => ipcRenderer.invoke('get-audio-files', directoryPath),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    analyzeAudio: (filePath, options) => ipcRenderer.invoke('analyze-audio', filePath, options),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
    batchProcess: (files, options) => ipcRenderer.invoke('batch-process', files, options),
    exportTagDatabase: (data) => ipcRenderer.invoke('export-tag-database', data),
    importTagDatabase: () => ipcRenderer.invoke('import-tag-database')
  }
); 