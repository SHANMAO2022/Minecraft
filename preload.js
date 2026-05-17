// Preload script
// You can expose protected APIs to the renderer process here
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Add functions here to bridge between renderer and main process
});
