const {app,BrowserWindow,ipcMain,dialog,shell} = require('electron');
const path=require('path'),fs=require('fs');
const {spawn}=require('child_process');
const db=require('./database');
const {localDayKey,minuteOfDay,parseShutdownTime,shouldRequestShutdown}=require('./shutdown-schedule');
let mainWindow;
let adminUnlocked=false;
const isManagedKiosk=()=>app.isPackaged&&process.argv.includes('--school-kiosk-shell');
function createWindow(){mainWindow=new BrowserWindow({width:1280,height:800,minWidth:900,minHeight:600,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}}); if(app.isPackaged)mainWindow.loadFile(path.join(__dirname,'../renderer-dist/index.html')).catch(error=>dialog.showErrorBox('Erro ao abrir o aplicativo',error.message));else mainWindow.loadURL('http://127.0.0.1:5173'); const s=db.admin().settings;if(isManagedKiosk()||s.kiosk==='true')mainWindow.setFullScreen(true);}
app.whenReady().then(()=>{
  createWindow();
  const requireAdmin=()=>{if(!adminUnlocked)throw new Error('Entre na área administrativa para continuar.');};
  ipcMain.handle('dashboard:get',()=>db.dashboard());
  ipcMain.handle('catalog:get',()=>db.catalog());
  ipcMain.handle('withdrawal:create',(_,x)=>db.createWithdrawal(x));
  ipcMain.handle('withdrawal:return',(_,id)=>db.updateWithdrawal({id,forceReturn:true}));
  ipcMain.handle('admin:get',()=>{requireAdmin();return db.admin()});
  ipcMain.handle('admin:save-entity',(_,x)=>{requireAdmin();return db.saveEntity(x)});
  ipcMain.handle('admin:delete-entity',(_,x)=>{requireAdmin();return db.deleteEntity(x)});
  ipcMain.handle('admin:update-withdrawal',(_,x)=>{requireAdmin();return db.updateWithdrawal(x)});
  ipcMain.handle('admin:delete-history',(_,id)=>{requireAdmin();return db.deleteHistory(id)});
  ipcMain.handle('admin:clear-history',()=>{requireAdmin();return db.clearHistory()});
  ipcMain.handle('settings:verify-pin',(_,pin)=>{adminUnlocked=db.admin().settings.pin===String(pin);return adminUnlocked});
  ipcMain.handle('admin:lock',()=>{adminUnlocked=false});
  ipcMain.handle('app:leave-fullscreen',()=>{requireAdmin();if(isManagedKiosk())throw new Error('Esta saída não está disponível no quiosque gerenciado.');mainWindow.setFullScreen(false);return true});
  ipcMain.handle('app:is-managed-kiosk',()=>isManagedKiosk());
  ipcMain.handle('app:shutdown-time',()=>db.admin().settings.shutdownTime);
  ipcMain.handle('app:sign-out-kiosk',()=>{requireAdmin();if(!isManagedKiosk())throw new Error('Saída disponível apenas no Admin do quiosque.');const child=spawn('shutdown.exe',['/l'],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();return true});
  ipcMain.handle('settings:save',(_,x)=>{requireAdmin();db.settings(x);const s=db.admin().settings;app.setLoginItemSettings({openAtLogin:s.autostart==='true'});mainWindow.setFullScreen(isManagedKiosk()||s.kiosk==='true')});
  ipcMain.handle('app:version',()=>app.getVersion());
  ipcMain.handle('app:install-update',async()=>{
    requireAdmin();
    if(!app.isPackaged||process.platform!=='win32')throw new Error('Atualização disponível somente no aplicativo instalado no Windows.');
    const selection=await dialog.showOpenDialog(mainWindow,{title:'Escolha o instalador atualizado no pendrive',properties:['openFile'],filters:[{name:'Instalador do Controle de Equipamentos',extensions:['exe']}]});
    if(selection.canceled)return {started:false};
    const installer=selection.filePaths[0];
    if(!/^ControleEquipamentos-Setup(?:[-.][\w.-]+)?\.exe$/i.test(path.basename(installer)))throw new Error('Selecione um instalador do Controle de Equipamentos.');
    const backupDirectory=path.join(app.getPath('userData'),'backups');
    fs.mkdirSync(backupDirectory,{recursive:true});
    const backupPath=path.join(backupDirectory,`antes-atualizacao-${new Date().toISOString().replace(/[:.]/g,'-')}.db`);
    db.getDb().prepare('VACUUM INTO ?').run(backupPath);
    const error=await shell.openPath(installer);
    if(error)throw new Error(`Backup salvo em ${backupPath}, mas não foi possível abrir o instalador: ${error}`);
    return {started:true,backupPath};
  });
  ipcMain.handle('backup:export',async()=>{requireAdmin();const r=await dialog.showSaveDialog(mainWindow,{defaultPath:'controle-equipamentos-backup.db'});if(!r.canceled)db.getDb().prepare('VACUUM INTO ?').run(r.filePath);return !r.canceled});
  ipcMain.handle('backup:import',async()=>{requireAdmin();const r=await dialog.showOpenDialog(mainWindow,{properties:['openFile'],filters:[{name:'Banco SQLite',extensions:['db','sqlite']} ]});if(r.canceled)return false;const target=path.join(app.getPath('userData'),'controle-equipamentos.db');fs.copyFileSync(r.filePaths[0],target);dialog.showMessageBox(mainWindow,{type:'info',message:'Backup importado. Reinicie o aplicativo para carregar os novos dados.'});return true;});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

app.whenReady().then(()=>{
  if(!isManagedKiosk())return;
  let armedDay=null;
  let completedDay=null;
  let requesting=false;
  let lastFailureAt=0;
  const check=()=>{
    const now=new Date();
    const shutdownTime=db.admin().settings.shutdownTime;
    const shutdownMinute=parseShutdownTime(shutdownTime);
    if(minuteOfDay(now)<shutdownMinute)armedDay=localDayKey(now);
    if(!shouldRequestShutdown(now,armedDay,completedDay,shutdownMinute)||requesting||Date.now()-lastFailureAt<60000)return;
    requesting=true;
    const day=localDayKey(now);
    const child=spawn('shutdown.exe',['/s','/f','/t','0','/c',`Desligamento automatico do quiosque as ${shutdownTime}.`],{windowsHide:true,stdio:'ignore'});
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
