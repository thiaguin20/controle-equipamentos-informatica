const {app,BrowserWindow,ipcMain,dialog} = require('electron');
const path=require('path'),fs=require('fs');
const {spawn}=require('child_process');
const db=require('./database');
const {SHUTDOWN_MINUTE,localDayKey,minuteOfDay,shouldRequestShutdown}=require('./shutdown-schedule');
let mainWindow;
let adminUnlocked=false;
const isManagedKiosk=()=>app.isPackaged&&process.argv.includes('--school-kiosk-shell');
function createWindow(){mainWindow=new BrowserWindow({width:1280,height:800,minWidth:900,minHeight:600,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}); if(app.isPackaged)mainWindow.loadFile(path.join(__dirname,'../renderer-dist/index.html')).catch(error=>dialog.showErrorBox('Erro ao abrir o aplicativo',error.message));else mainWindow.loadURL('http://127.0.0.1:5173'); const s=db.admin().settings;if(isManagedKiosk()||s.kiosk==='true')mainWindow.setFullScreen(true);}
app.whenReady().then(()=>{createWindow();ipcMain.handle('dashboard:get',()=>db.dashboard());ipcMain.handle('catalog:get',()=>db.catalog());ipcMain.handle('withdrawal:create',(_,x)=>db.createWithdrawal(x));ipcMain.handle('withdrawal:return',(_,id)=>db.updateWithdrawal({id,forceReturn:true}));ipcMain.handle('admin:get',()=>db.admin());ipcMain.handle('admin:save-entity',(_,x)=>db.saveEntity(x));ipcMain.handle('admin:delete-entity',(_,x)=>db.deleteEntity(x));ipcMain.handle('admin:update-withdrawal',(_,x)=>db.updateWithdrawal(x));ipcMain.handle('settings:verify-pin',(_,pin)=>{adminUnlocked=db.admin().settings.pin===String(pin);return adminUnlocked});ipcMain.handle('admin:lock',()=>{adminUnlocked=false});ipcMain.handle('app:leave-fullscreen',()=>{if(!adminUnlocked||isManagedKiosk())throw new Error('Esta saída não está disponível no quiosque gerenciado.');mainWindow.setFullScreen(false);return true});ipcMain.handle('app:is-managed-kiosk',()=>isManagedKiosk());ipcMain.handle('app:sign-out-kiosk',()=>{if(!adminUnlocked||!isManagedKiosk())throw new Error('Saída disponível apenas no Admin do quiosque.');const child=spawn('shutdown.exe',['/l'],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();return true});ipcMain.handle('settings:save',(_,x)=>{db.settings(x);const s=db.admin().settings;app.setLoginItemSettings({openAtLogin:s.autostart==='true'});mainWindow.setFullScreen(isManagedKiosk()||s.kiosk==='true')});ipcMain.handle('app:version',()=>app.getVersion());ipcMain.handle('backup:export',async()=>{const r=await dialog.showSaveDialog(mainWindow,{defaultPath:'controle-equipamentos-backup.db'});if(!r.canceled)db.getDb().prepare('VACUUM INTO ?').run(r.filePath);return !r.canceled});ipcMain.handle('backup:import',async()=>{const r=await dialog.showOpenDialog(mainWindow,{properties:['openFile'],filters:[{name:'Banco SQLite',extensions:['db','sqlite']} ]});if(r.canceled)return false;const target=path.join(app.getPath('userData'),'controle-equipamentos.db');fs.copyFileSync(r.filePaths[0],target);dialog.showMessageBox(mainWindow,{type:'info',message:'Backup importado. Reinicie o aplicativo para carregar os novos dados.'});return true;});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

app.whenReady().then(()=>{
  if(!isManagedKiosk())return;
  let armedDay=null;
  let completedDay=null;
  let requesting=false;
  let lastFailureAt=0;
  const check=()=>{
    const now=new Date();
    if(minuteOfDay(now)<SHUTDOWN_MINUTE)armedDay=localDayKey(now);
    if(!shouldRequestShutdown(now,armedDay,completedDay)||requesting||Date.now()-lastFailureAt<60000)return;
    requesting=true;
    const day=localDayKey(now);
    const child=spawn('shutdown.exe',['/s','/f','/t','0','/c','Desligamento automatico do quiosque as 18h30.'],{windowsHide:true,stdio:'ignore'});
    child.once('error',error=>{
      console.error('Falha ao solicitar desligamento automatico:',error);
      requesting=false;
      lastFailureAt=Date.now();
    });
    child.once('exit',code=>{
      if(code===0)completedDay=day;
      else{console.error('Desligamento automatico recusado. Codigo:',code);lastFailureAt=Date.now()}
      requesting=false;
    });
  };
  check();
  setInterval(check,15000);
});
