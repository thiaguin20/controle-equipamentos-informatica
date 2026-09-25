const Database = require('better-sqlite3');
const path = require('path');
const scheduleTeachers = require('./schedule-teachers');
const { app } = process.env.EQUIPMENT_TEST_DATA_DIR
  ? { app: { getPath: () => process.env.EQUIPMENT_TEST_DATA_DIR } }
  : require('electron');
let db;
function getDb() {
  if (db) return db;
  db = new Database(path.join(app.getPath('userData'), 'controle-equipamentos.db'));
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  migrate(); seed(); importScheduleTeachers(); cleanup(); return db;
}
function migrate() {
  const d=getRaw();
  d.exec(`
    CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS equipment_types (id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '📦', total INTEGER NOT NULL DEFAULT 0, quantity_controlled INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, is_cart INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS withdrawals (id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL, equipment_id INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, location_id INTEGER, location_name TEXT, taken_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, returned_at TEXT, status TEXT NOT NULL DEFAULT 'EM_USO', FOREIGN KEY(teacher_id) REFERENCES teachers(id), FOREIGN KEY(equipment_id) REFERENCES equipment_types(id), FOREIGN KEY(location_id) REFERENCES locations(id));
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_taken ON withdrawals(taken_at);
  `);
  for(const table of ['teachers','equipment_types','locations']){
    if(!d.prepare(`PRAGMA table_info(${table})`).all().some(column=>column.name==='pending_review'))
      d.exec(`ALTER TABLE ${table} ADD COLUMN pending_review INTEGER NOT NULL DEFAULT 0`);
  }
}
function getRaw(){ return db; }
function seed() {
  const d = getRaw(); if (d.prepare('SELECT count(*) n FROM equipment_types').get().n) return;
  const addEq=d.prepare('INSERT INTO equipment_types (name,icon,total,quantity_controlled,is_cart) VALUES (?,?,?,?,?)');
  [['Notebook','💻',25,1,0],['Fone','🎧',80,1,0],['Tablet','📱',13,1,0],['Celular','📱',5,1,0],['Carrinho de Notebooks','🛒',1,0,1]].forEach(x=>addEq.run(...x));
  const add=d.prepare('INSERT INTO teachers (name) VALUES (?)'); ['Professor 1','Professor 2','Professor 3'].forEach(x=>add.run(x));
  const room=d.prepare('INSERT INTO locations (name) VALUES (?)'); ['Sala 01','Sala 02','Sala 04','Sala 08','Sala 12','Laboratório','Biblioteca'].forEach(x=>room.run(x));
  d.prepare("INSERT INTO settings(key,value) VALUES ('pin','1234'),('retentionDays','14'),('kiosk','false'),('autostart','false')").run();
}
function importScheduleTeachers(){
  const d=getRaw();
  if(d.prepare("SELECT 1 FROM settings WHERE key='scheduleTeachersImportedV2'").get())return;
  const normalize=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
  const existing=new Set(d.prepare('SELECT name FROM teachers').all().map(row=>normalize(row.name)));
  const add=d.prepare('INSERT INTO teachers(name) VALUES(?)');
  d.transaction(()=>{
    for(const name of scheduleTeachers){const key=normalize(name);if(!existing.has(key)){add.run(name);existing.add(key)}}
    d.prepare("INSERT INTO settings(key,value) VALUES('scheduleTeachersImportedV2','2026-09-24')").run();
  })();
}
function cleanup(){ const days=Number(getRaw().prepare("SELECT value FROM settings WHERE key='retentionDays'").get()?.value||14); getRaw().prepare("DELETE FROM withdrawals WHERE status='DEVOLVIDO' AND returned_at < datetime('now', ?)").run(`-${days} days`); }
function catalog(){const d=getDb(); return {teachers:d.prepare('SELECT * FROM teachers WHERE active=1 AND pending_review=0 ORDER BY name').all(), locations:d.prepare('SELECT * FROM locations WHERE active=1 AND pending_review=0 ORDER BY name').all(), equipment:d.prepare(`SELECT e.*, e.total-COALESCE((SELECT SUM(quantity) FROM withdrawals w WHERE w.equipment_id=e.id AND w.status='EM_USO'),0) available FROM equipment_types e WHERE active=1 AND pending_review=0 ORDER BY id`).all()};}
function dashboard(){const d=getDb(); return d.prepare(`SELECT w.*,t.name teacher,e.name equipment,e.icon,COALESCE(l.name,w.location_name) location FROM withdrawals w JOIN teachers t ON t.id=w.teacher_id JOIN equipment_types e ON e.id=w.equipment_id LEFT JOIN locations l ON l.id=w.location_id WHERE w.status='EM_USO' ORDER BY w.taken_at DESC`).all();}
function createWithdrawal(x){
  const d=getDb();
  return d.transaction(()=>{
    const typedName=(value,label)=>{const name=String(value||'').trim().replace(/\s+/g,' ');if(name.length<2||name.length>100)throw new Error(`Informe ${label} com 2 a 100 caracteres.`);return name};
    let teacher;
    if(x.teacherName){
      const name=typedName(x.teacherName,'o nome do professor');
      teacher=d.prepare('SELECT * FROM teachers WHERE name=? COLLATE NOCASE AND (active=1 OR pending_review=1) ORDER BY pending_review LIMIT 1').get(name);
      if(!teacher){const id=d.prepare('INSERT INTO teachers(name,active,pending_review) VALUES(?,0,1)').run(name).lastInsertRowid;teacher=d.prepare('SELECT * FROM teachers WHERE id=?').get(id)}
    }else teacher=d.prepare('SELECT * FROM teachers WHERE id=? AND active=1 AND pending_review=0').get(x.teacherId);
    if(!teacher||(!teacher.active&&!teacher.pending_review))throw new Error('Professor inválido.');
    let eq;
    if(x.equipmentName){
      const name=typedName(x.equipmentName,'o nome do equipamento');
      eq=d.prepare('SELECT * FROM equipment_types WHERE name=? COLLATE NOCASE AND (active=1 OR pending_review=1) ORDER BY pending_review LIMIT 1').get(name);
      if(!eq){const id=d.prepare("INSERT INTO equipment_types(name,icon,total,quantity_controlled,active,pending_review) VALUES(?,'📦',0,1,0,1)").run(name).lastInsertRowid;eq=d.prepare('SELECT * FROM equipment_types WHERE id=?').get(id)}
    }else eq=d.prepare('SELECT * FROM equipment_types WHERE id=? AND active=1 AND pending_review=0').get(x.equipmentId);
    if(!eq||(!eq.active&&!eq.pending_review))throw new Error('Equipamento indisponível.');
    const quantity=Number(x.quantity);
    if(!Number.isInteger(quantity)||quantity<1||quantity>999)throw new Error('Quantidade inválida.');
    if(!eq.pending_review){
      const inUse=d.prepare("SELECT COALESCE(SUM(quantity),0) n FROM withdrawals WHERE equipment_id=? AND status='EM_USO'").get(eq.id).n;
      const available=eq.total-inUse;
      if(quantity>(eq.quantity_controlled?available:1)||(!eq.quantity_controlled&&available<1))throw new Error(eq.quantity_controlled?`Quantidade inválida. Há somente ${available} disponíveis.`:'Este equipamento já está em uso.');
    }
    let location=x.locationId?d.prepare('SELECT * FROM locations WHERE id=? AND active=1 AND pending_review=0').get(x.locationId):null;
    if(!location){
      const name=typedName(x.locationName,'o local');
      location=d.prepare('SELECT * FROM locations WHERE name=? COLLATE NOCASE AND (active=1 OR pending_review=1) ORDER BY pending_review LIMIT 1').get(name);
      if(!location){const id=d.prepare('INSERT INTO locations(name,active,pending_review) VALUES(?,0,1)').run(name).lastInsertRowid;location=d.prepare('SELECT * FROM locations WHERE id=?').get(id)}
    }
    return d.prepare('INSERT INTO withdrawals(teacher_id,equipment_id,quantity,location_id,location_name) VALUES(?,?,?,?,?)').run(teacher.id,eq.id,quantity,location.id,null).lastInsertRowid;
  })();
}
function admin(){const d=getDb();return {teachers:d.prepare('SELECT * FROM teachers WHERE pending_review=0 ORDER BY name').all(),pendingTeachers:d.prepare('SELECT * FROM teachers WHERE pending_review=1 ORDER BY name').all(),locations:d.prepare('SELECT * FROM locations WHERE pending_review=0 ORDER BY name').all(),pendingLocations:d.prepare('SELECT * FROM locations WHERE pending_review=1 ORDER BY name').all(),equipment:d.prepare(`SELECT e.*, e.total-COALESCE((SELECT SUM(quantity) FROM withdrawals w WHERE w.equipment_id=e.id AND w.status='EM_USO'),0) available FROM equipment_types e WHERE pending_review=0 ORDER BY name`).all(),pendingEquipment:d.prepare(`SELECT e.*,COALESCE((SELECT SUM(quantity) FROM withdrawals w WHERE w.equipment_id=e.id AND w.status='EM_USO'),0) inUse FROM equipment_types e WHERE pending_review=1 ORDER BY name`).all(),history:d.prepare(`SELECT w.*,t.name teacher,e.name equipment,e.icon,COALESCE(l.name,w.location_name) location FROM withdrawals w JOIN teachers t ON t.id=w.teacher_id JOIN equipment_types e ON e.id=w.equipment_id LEFT JOIN locations l ON l.id=w.location_id ORDER BY w.taken_at DESC LIMIT 300`).all(),settings:Object.fromEntries(d.prepare('SELECT key,value FROM settings').all().map(x=>[x.key,x.value]))};}
function saveEntity({type,item}){
  const d=getDb(),table={teacher:'teachers',location:'locations',equipment:'equipment_types'}[type];
  if(!table)throw new Error('Tipo inválido');
  const name=String(item.name||'').trim();
  if(!name)throw new Error('Informe o nome.');
  const fields=type==='equipment'?['name','icon','total','quantity_controlled','active','is_cart','pending_review']:['name','active','pending_review'];
  const values={name,active:item.active?1:0};
  values.pending_review=0;
  if(type==='equipment'){
    const total=Number(item.total),isCart=item.is_cart?1:0;
    if(!Number.isInteger(total)||total<1)throw new Error('Quantidade total inválida.');
    const inUse=item.id?d.prepare("SELECT COALESCE(SUM(quantity),0) AS n FROM withdrawals WHERE equipment_id=? AND status='EM_USO'").get(item.id).n:0;
    if(total<inUse)throw new Error(`Há ${inUse} em uso; aumente o total antes de salvar.`);
    values.icon=String(item.icon||'📦').trim()||'📦';
    values.total=isCart?1:total;
    if(values.total<inUse)throw new Error('Devolva o equipamento antes de transformá-lo em carrinho.');
    values.quantity_controlled=isCart?0:(item.quantity_controlled?1:0);
    values.is_cart=isCart;
  }
  if(item.id){
    const set=fields.map(f=>`${f}=@${f}`).join(',');
    d.prepare(`UPDATE ${table} SET ${set} WHERE id=@id`).run({...values,id:item.id});
  }else{
    d.prepare(`INSERT INTO ${table}(${fields.join(',')}) VALUES(${fields.map(f=>'@'+f).join(',')})`).run(values);
  }
}
function deleteEntity({type,id}){
  const d=getDb();
  const target={teacher:{table:'teachers',column:'teacher_id'},location:{table:'locations',column:'location_id'},equipment:{table:'equipment_types',column:'equipment_id'}}[type];
  if(!target||!Number.isInteger(id)||id<1)throw new Error('Item inválido.');
  const linked=d.prepare(`SELECT 1 FROM withdrawals WHERE ${target.column}=? LIMIT 1`).get(id);
  if(linked)throw new Error('Este item consta em uma retirada. Desative-o para preservar o histórico.');
  const result=d.prepare(`DELETE FROM ${target.table} WHERE id=?`).run(id);
  if(!result.changes)throw new Error('Item não encontrado.');
}
function updateWithdrawal(x){const d=getDb(); if(x.forceReturn){d.prepare("UPDATE withdrawals SET status='DEVOLVIDO',returned_at=CURRENT_TIMESTAMP WHERE id=? AND status='EM_USO'").run(x.id);return;} d.prepare('UPDATE withdrawals SET teacher_id=?,location_id=?,location_name=? WHERE id=? AND status=\'EM_USO\'').run(x.teacherId,x.locationId||null,x.locationName||null,x.id);}
function settings(s){const d=getDb();const put=d.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');Object.entries(s).forEach(([k,v])=>put.run(k,String(v))); cleanup();}
module.exports={getDb,catalog,dashboard,createWithdrawal,admin,saveEntity,deleteEntity,updateWithdrawal,settings,cleanup};
