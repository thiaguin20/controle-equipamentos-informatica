const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('equipmentAPI', {
  getDashboard: () => ipcRenderer.invoke('dashboard:get'),
  getCatalog: () => ipcRenderer.invoke('catalog:get'),
  createWithdrawal: data => ipcRenderer.invoke('withdrawal:create', data),
  returnWithdrawal: id => ipcRenderer.invoke('withdrawal:return', id),
  getAdmin: () => ipcRenderer.invoke('admin:get'),
  saveEntity: data => ipcRenderer.invoke('admin:save-entity', data),
  deleteEntity: data => ipcRenderer.invoke('admin:delete-entity', data),
  updateWithdrawal: data => ipcRenderer.invoke('admin:update-withdrawal', data),
  deleteHistory: id => ipcRenderer.invoke('admin:delete-history', id),
  clearHistory: () => ipcRenderer.invoke('admin:clear-history'),
  verifyPin: pin => ipcRenderer.invoke('settings:verify-pin', pin),
  lockAdmin: () => ipcRenderer.invoke('admin:lock'),
  leaveFullScreen: () => ipcRenderer.invoke('app:leave-fullscreen'),
  isManagedKiosk: () => ipcRenderer.invoke('app:is-managed-kiosk'),
  getShutdownTime: () => ipcRenderer.invoke('app:shutdown-time'),
  signOutKiosk: () => ipcRenderer.invoke('app:sign-out-kiosk'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  installUpdate: () => ipcRenderer.invoke('app:install-update')
});
