import React,{useEffect,useState} from 'react';
import{createRoot}from'react-dom/client';import'./style.css';import'./admin.css';import'./shutdown.css';
const api=window.equipmentAPI;
const fmt=t=>new Date(t+'Z').toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function App(){const[page,setPage]=useState('home'),[open,setOpen]=useState([]),[notice,setNotice]=useState(null);const refresh=async()=>setOpen(await api.getDashboard());useEffect(()=>{refresh()},[]);const home=()=>setPage('home');const complete=async(kind,detail)=>{await refresh();setNotice({kind,detail});setPage('success');setTimeout(home,2600)};if(page==='withdraw')return <Withdraw back={home} done={x=>complete('RETIRADA REGISTRADA',x)}/>;if(page==='return')return <Return back={home} done={x=>complete('DEVOLUÇÃO REGISTRADA',x)}/>;if(page==='admin')return <Admin back={home} refresh={refresh}/>;if(page==='success')return <main><div className="success"><b>✓ {notice.kind}</b><strong>{notice.detail}</strong><small>Retornando ao início…</small></div></main>;return <main><header><div><span className="eyebrow">INFORMÁTICA</span><h1>CONTROLE DE EQUIPAMENTOS</h1><p className="subtitle">Vai retirar algum equipamento? Registre antes de levar.</p></div></header>{page==='pin'?<Pin cancel={home} ok={()=>setPage('admin')}/>:<><section className="actions"><button className="primary" onClick={()=>setPage('withdraw')}>↗<b>RETIRAR EQUIPAMENTO</b></button><button className="secondary" onClick={()=>setPage('return')}>↙<b>DEVOLVER EQUIPAMENTO</b></button></section><section className="outside"><h2>Fora agora <span>{open.length}</span></h2>{open.length?<div className="cards">{open.map(w=><Withdrawal key={w.id} w={w}/>)}</div>:<div className="empty">✓ Todos os equipamentos estão na informática.</div>}</section><button className="admin" onClick={()=>setPage('pin')}>⚙ Administração</button></>}</main>}
function Withdrawal({w,action}){return <article className="card"><i>{w.icon}</i><div><strong>{w.quantity} {w.equipment}{w.quantity>1?'s':''}</strong><p>Prof. {w.teacher} · {w.location}</p><small>Retirado em {fmt(w.taken_at)}</small></div>{action}</article>}
function Pin({cancel,ok}){const[pin,setPin]=useState('');const go=async()=>{if(await api.verifyPin(pin))ok();else setPin('')};return <div className="modal"><h2>Área administrativa</h2><p>Digite o PIN numérico.</p><input autoFocus type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()}/><div><button onClick={cancel}>Cancelar</button><button className="primary small" onClick={go}>Entrar</button></div></div>}
function useIdle(enabled,onIdle,ms=60000){useEffect(()=>{if(!enabled)return;let timer;const reset=()=>{clearTimeout(timer);timer=setTimeout(onIdle,ms)};['click','touchstart','keydown','input','change'].forEach(e=>window.addEventListener(e,reset));reset();return()=>{clearTimeout(timer);['click','touchstart','keydown','input','change'].forEach(e=>window.removeEventListener(e,reset))}},[enabled,onIdle,ms])}
function Withdraw({back,done}){
  const[c,setC]=useState(),[step,setStep]=useState(1),[data,setData]=useState({quantity:1});
  const[otherLocation,setOtherLocation]=useState(false),[otherTeacher,setOtherTeacher]=useState(false),[otherEquipment,setOtherEquipment]=useState(false),[error,setError]=useState('');
  useIdle(true,back);
  useEffect(()=>{api.getCatalog().then(setC).catch(e=>setError(e.message))},[]);
  if(!c)return <main>{error||'Carregando…'}</main>;
  const eq=c.equipment.find(x=>x.id===data.equipmentId),loc=c.locations.find(x=>x.id===data.locationId);
  const next=()=>setStep(step+1);
  const submit=async()=>{try{await api.createWithdrawal(data);done(`${data.quantity} ${eq?.name||data.equipmentName}${data.quantity>1?'s':''} · Prof. ${c.teachers.find(x=>x.id===data.teacherId)?.name||data.teacherName} — ${loc?.name||data.locationName}`)}catch(e){setError(e.message)}};
  return <main><button className="cancel" onClick={back}>Cancelar · voltar ao início</button><div className="flow"><span>RETIRADA · {step}/5</span>{error&&<p className="form-error" role="alert">{error}</p>}
    {step===1&&(otherTeacher?<OtherName label="Nome do professor" value={data.teacherName||''} set={name=>setData({...data,teacherName:name,teacherId:null})} next={next} back={()=>setOtherTeacher(false)}/>:<SearchPick title="Quem é o professor responsável?" items={c.teachers} otherLabel="Outro professor" onOther={name=>{setData({...data,teacherName:name,teacherId:null});setOtherTeacher(true)}} onPick={x=>{setData({...data,teacherId:x.id,teacherName:null});next()}}/>)}
    {step===2&&(otherEquipment?<OtherName label="Nome do equipamento" value={data.equipmentName||''} set={name=>setData({...data,equipmentName:name,equipmentId:null,quantity:1})} next={next} back={()=>setOtherEquipment(false)}/>:<SearchPick title="Qual equipamento?" items={c.equipment.filter(x=>x.available>0)} icon otherLabel="Outro equipamento" onOther={name=>{setData({...data,equipmentName:name,equipmentId:null,quantity:1});setOtherEquipment(true)}} onPick={x=>{setData({...data,equipmentId:x.id,equipmentName:null,quantity:1});next()}}/>)}
    {step===3&&<Quantity eq={eq} value={data.quantity} set={n=>setData({...data,quantity:n})} next={next}/>}
    {step===4&&<><h2>Para onde vai?</h2>{otherLocation?<OtherName label="Outro local" value={data.locationName||''} set={name=>setData({...data,locationName:name,locationId:null})} next={next} back={()=>setOtherLocation(false)}/>:<Pick title="" items={[...c.locations,{id:'other',name:'Outro local'}]} onPick={x=>{if(x.id==='other'){setOtherLocation(true);return}setData({...data,locationId:x.id,locationName:null});next()}}/>}</>}
    {step===5&&<div className="confirm"><h2>Confirmar retirada</h2><p>Professor: <b>{c.teachers.find(x=>x.id===data.teacherId)?.name||data.teacherName}</b>{data.teacherName&&' · para revisão'}</p><p>Equipamento: <b>{eq?.name||data.equipmentName}</b>{data.equipmentName&&' · para revisão'}</p><p>Quantidade: <b>{data.quantity}</b></p><p>Destino: <b>{loc?.name||data.locationName}</b>{data.locationName&&' · para revisão'}</p><button className="primary wide" onClick={submit}>Confirmar retirada</button></div>}
  </div></main>
}
function Pick({title,items,onPick,icon}){return <><h2>{title}</h2><div className="pick">{items.map(x=><button key={x.id} onClick={()=>onPick(x)}>{icon&&<i>{x.icon}</i>}<b>{x.name}</b>{x.available!==undefined&&<small>{x.available} disponíveis</small>}</button>)}</div></>}
function SearchPick({title,items,onPick,onOther,otherLabel,icon}){const[query,setQuery]=useState('');const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');const shown=items.filter(item=>normalize(item.name).includes(normalize(query.trim())));return <><h2>{title}</h2><label className="search-label">Digite para procurar<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Comece a digitar o nome"/></label><div className="pick">{shown.map(x=><button key={x.id} onClick={()=>onPick(x)}>{icon&&<i>{x.icon}</i>}<b>{x.name}</b>{x.available!==undefined&&<small>{x.available} disponíveis</small>}</button>)}<button className="other-pick" onClick={()=>onOther(query)}><b>+ {otherLabel}</b><small>Digite e envie para revisão</small></button></div>{!shown.length&&<p>Nenhum item cadastrado corresponde à busca. Use “{otherLabel}” se for novo.</p>}</>}
function OtherName({label,value,set,next,back}){return <div className="other-location"><label>{label}<input autoFocus maxLength="100" value={value} onChange={e=>set(e.target.value)} placeholder="Digite o nome" onKeyDown={e=>e.key==='Enter'&&value.trim().length>=2&&next()}/></label><button className="primary" disabled={value.trim().length<2} onClick={next}>Continuar</button><button onClick={back}>Ver lista</button><p>Será registrado como pendente de revisão no Admin.</p></div>}
function Quantity({eq,value,set,next}){if(eq&&!eq.quantity_controlled)return <><h2>{eq.is_cart?'O que está sendo levado?':'Quantidade'}</h2>{eq.is_cart?<div className="pick"><button onClick={next}><b>Carrinho inteiro</b><small>1 carrinho</small></button></div>:null}<button className="primary wide" onClick={next}>Continuar</button></>;const n=x=>set(Math.max(1,Math.min(eq?.available||999,Number(x)||1)));return <><h2>Quantidade</h2><p className="available">{eq?`${eq.available} disponíveis`:'Equipamento novo: quantidade informada, sem controle de estoque até a revisão.'}</p><div className="counter"><button onClick={()=>n(value-1)}>−</button><input value={value} inputMode="numeric" onChange={e=>n(e.target.value)}/><button onClick={()=>n(value+1)}>+</button></div>{eq&&<p>{eq.available-value} permanecerão disponíveis.</p>}<button className="primary wide" onClick={next}>Continuar</button></>}
function Return({back,done}){
  const[list,setList]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('');
  useIdle(true,back);
  useEffect(()=>{api.getDashboard().then(setList).catch(e=>setError(e.message))},[]);
  const submit=async()=>{try{await api.returnWithdrawal(selected.id);done(`${selected.quantity} ${selected.equipment} · Prof. ${selected.teacher}`)}catch(e){setError(e.message)}};
  return <main><button className="cancel" onClick={back}>Cancelar · voltar ao início</button><h2>Devolver equipamento</h2>{error&&<p className="form-error" role="alert">{error}</p>}
    {selected?<div className="flow"><h2>Confirmar devolução?</h2><p><b>{selected.quantity} {selected.equipment}</b> · Prof. {selected.teacher} · {selected.location}</p><div className="form-actions"><button onClick={()=>setSelected(null)}>Cancelar</button><button className="primary" onClick={submit}>Confirmar devolução</button></div></div>:<><div className="cards">{list.map(w=><Withdrawal key={w.id} w={w} action={<button className="small" onClick={()=>setSelected(w)}>Devolver</button>}/>)}</div>{!list.length&&<div className="empty">Nenhuma retirada aberta.</div>}</>}
  </main>
}
function Admin({back,refresh}){const[a,setA]=useState(),[tab,setTab]=useState('equipment');const load=()=>api.getAdmin().then(setA);useEffect(()=>{load()},[]);if(!a)return <main>Carregando…</main>;const save=async(type,item)=>{await api.saveEntity({type,item});await load()};const remove=async(type,id)=>{await api.deleteEntity({type,id});await load()};const pendingCount=a.pendingTeachers.length+a.pendingEquipment.length+a.pendingLocations.length;return <main><button className="back" onClick={async()=>{await api.lockAdmin();back()}}>← Início</button><h2>Administração</h2><nav>{[['equipment','Estoque'],['teachers','Professores'],['locations','Salas'],['pending',`Revisar (${pendingCount})`],['history','Histórico'],['settings','Configurações']].map(([k,n])=><button className={tab===k?'selected':''} onClick={()=>setTab(k)} key={k}>{n}</button>)}</nav>{['equipment','teachers','locations'].includes(tab)&&<Manager key={tab} type={tab==='equipment'?'equipment':tab.slice(0,-1)} data={a[tab]} save={save} remove={remove}/>} {tab==='pending'&&<><p>Nomes digitados em “Outro” ficam aqui até você revisar e cadastrar. As retiradas permanecem no histórico.</p><h3>Professores</h3><Manager key="pending-teachers" pending type="teacher" data={a.pendingTeachers} save={save} remove={remove}/><h3>Equipamentos</h3><Manager key="pending-equipment" pending type="equipment" data={a.pendingEquipment.map(x=>({...x,available:-x.inUse}))} save={save} remove={remove}/><h3>Salas e locais</h3><Manager key="pending-locations" pending type="location" data={a.pendingLocations} save={save} remove={remove}/></>} {tab==='history'&&<History rows={a.history} reload={load} refresh={refresh}/>} {tab==='settings'&&<Settings settings={a.settings}/>}</main>}
function Manager({type,data,save,remove,pending=false}){
  const label=type==='equipment'?'equipamento':type==='teacher'?'professor':'sala';
  const [editing,setEditing]=useState(null);
  const [error,setError]=useState('');
  const [deleting,setDeleting]=useState(null);
  const begin=item=>{setEditing(item?{...item,active:1,total:pending&&type==='equipment'?Math.max(1,item.inUse):item.total}:{name:'',icon:'📦',total:'1',quantity_controlled:1,active:1,is_cart:0});setError('')};
  const change=(field,value)=>setEditing(current=>({...current,[field]:value}));
  const submit=async event=>{
    event.preventDefault();
    const name=editing.name.trim();
    if(!name){setError('Informe o nome.');return}
    let item={...editing,name};
    if(type==='equipment'){
      const total=Number(editing.total);
      const inUse=editing.id?data.find(x=>x.id===editing.id).total-data.find(x=>x.id===editing.id).available:0;
      if(!Number.isInteger(total)||total<1){setError('A quantidade total deve ser um número inteiro maior que zero.');return}
      if(total<inUse){setError(`Há ${inUse} em uso. O total não pode ser menor que isso.`);return}
      item={...item,total,icon:editing.icon.trim()||'📦',quantity_controlled:Number(editing.quantity_controlled),is_cart:Number(editing.is_cart)};
      if(item.is_cart){item.total=1;item.quantity_controlled=0}
    }
    try{await save(type,item);setEditing(null);setError('')}catch(cause){setError(cause.message||'Não foi possível salvar.')}
  };
  const toggle=async item=>{try{await save(type,{...item,active:item.active?0:1});setError('')}catch(cause){setError(cause.message||'Não foi possível alterar.')}};
  const confirmDelete=async()=>{try{await remove(type,deleting.id);setDeleting(null);setEditing(null);setError('')}catch(cause){setDeleting(null);setError(cause.message||'Não foi possível excluir.')}};
  return <section className="manager">{!pending&&<button className="primary small" onClick={()=>begin(null)}>+ Adicionar {label}</button>}{pending&&!data.length&&<p>Nenhum {label} pendente.</p>}{error&&<p className="form-error" role="alert">{error}</p>}
    {deleting&&<div className="delete-confirm" role="alertdialog" aria-label="Confirmar exclusão"><strong>Excluir {deleting.name}?</strong><p>Essa ação é definitiva. O item será removido do cadastro.</p><div className="form-actions"><button onClick={()=>setDeleting(null)}>Cancelar</button><button className="danger" onClick={confirmDelete}>Confirmar exclusão</button></div></div>}
    {editing&&<form className="entity-form" onSubmit={submit}><h3>{editing.id?`Editar ${label}`:`Adicionar ${label}`}</h3><label>Nome<input autoFocus value={editing.name} onChange={event=>change('name',event.target.value)}/></label>
      {type==='equipment'&&<><label>Ícone<input value={editing.icon} onChange={event=>change('icon',event.target.value)}/></label><label>Quantidade total<input type="number" min="1" step="1" value={editing.total} onChange={event=>change('total',event.target.value)}/></label><label className="check"><input type="checkbox" checked={Boolean(editing.is_cart)} onChange={event=>change('is_cart',Number(event.target.checked))}/>Carrinho individual</label>{!editing.is_cart&&<label className="check"><input type="checkbox" checked={Boolean(editing.quantity_controlled)} onChange={event=>change('quantity_controlled',Number(event.target.checked))}/>Controlar por quantidade</label>}</>}
      <div className="form-actions"><button type="button" onClick={()=>{setEditing(null);setError('')}}>Cancelar</button><button className="primary" type="submit">Salvar</button></div></form>}
    <div className="list">{data.map(item=><div key={item.id}><b>{item.icon} {item.name}</b>{type==='equipment'&&<span>{pending?`${item.inUse} em uso · estoque ainda não cadastrado`:`Total ${item.total} · Em uso ${item.total-item.available} · Disponível ${item.available}`}</span>}<button onClick={()=>begin(item)}>{pending?'Revisar e cadastrar':'Editar'}</button>{!pending&&<button onClick={()=>toggle(item)}>{item.active?'Desativar':'Ativar'}</button>}{!pending&&<button className="delete-button" onClick={()=>{setDeleting(item);setError('')}}>Excluir</button>}</div>)}</div></section>
}
function History({rows,reload,refresh}){
  const[confirming,setConfirming]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const returned=rows.filter(w=>w.status==='DEVOLVIDO').length;
  const execute=async()=>{
    try{
      if(confirming.kind==='clear'){const count=await api.clearHistory();setNotice(`${count} registro(s) devolvido(s) excluído(s).`)}
      if(confirming.kind==='delete'){await api.deleteHistory(confirming.id);setNotice('Registro excluído.')}
      if(confirming.kind==='return'){await api.updateWithdrawal({id:confirming.id,forceReturn:true});setNotice('Devolução registrada.');await refresh()}
      await reload();setError('');setConfirming(null);
    }catch(cause){setError(cause.message||'Não foi possível concluir.');setConfirming(null)}
  };
  return <section className="manager"><p>Registros em uso permanecem no sistema para manter o estoque correto. Exporte um backup antes de limpar o histórico.</p>
    <button className="danger" disabled={!returned} onClick={()=>setConfirming({kind:'clear'})}>Limpar histórico de devoluções ({returned})</button>
    {notice&&<p role="status">{notice}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
    {confirming&&<div className="delete-confirm" role="alertdialog" aria-label="Confirmar alteração do histórico"><strong>{confirming.kind==='clear'?'Excluir todas as devoluções?':confirming.kind==='delete'?'Excluir este registro?':'Forçar devolução?'}</strong><p>{confirming.kind==='clear'?`Serão apagados definitivamente ${returned} registros já devolvidos. Retiradas em uso permanecerão.`:confirming.kind==='delete'?'Esse registro já devolvido será apagado definitivamente.':'O equipamento voltará a aparecer como disponível.'}</p><div className="form-actions"><button onClick={()=>setConfirming(null)}>Cancelar</button><button className={confirming.kind==='return'?'primary':'danger'} onClick={execute}>Confirmar</button></div></div>}
    <div className="list">{rows.map(w=><div key={w.id}><b>{w.icon} {w.quantity} {w.equipment}</b><span>Prof. {w.teacher} · {w.location} · {w.status} · Retirada: {fmt(w.taken_at)}{w.returned_at?` · Devolução: ${fmt(w.returned_at)}`:''}</span>{w.status==='EM_USO'?<button onClick={()=>setConfirming({kind:'return',id:w.id})}>Forçar devolução</button>:<button className="delete-button" onClick={()=>setConfirming({kind:'delete',id:w.id})}>Excluir</button>}</div>)}</div>
  </section>;
}
function Settings({settings}){
  const[form,setForm]=useState(settings),[message,setMessage]=useState(''),[managed,setManaged]=useState(false),[version,setVersion]=useState(''),[confirmSignOut,setConfirmSignOut]=useState(false);
  useEffect(()=>{api.isManagedKiosk().then(setManaged);api.getVersion().then(setVersion)},[]);
  const save=async()=>{try{await api.saveSettings(form);setMessage('Configurações salvas.')}catch(e){setMessage(e.message)}};
  const leave=async()=>{try{await api.leaveFullScreen();setMessage('Tela cheia encerrada nesta sessão. Ao reiniciar, a configuração salva volta a valer.')}catch(e){setMessage(e.message)}};
  const signOut=async()=>{try{await api.signOutKiosk()}catch(e){setMessage(e.message);setConfirmSignOut(false)}};
  const installUpdate=async()=>{try{const result=await api.installUpdate();if(result.started)setMessage(`Backup criado em ${result.backupPath}. Siga as instruções do instalador e autorize com a conta de administrador do Windows quando solicitado.`)}catch(e){setMessage(e.message)}};
  return <section className="settings"><p>Versão instalada: {version||'carregando…'}</p><label>PIN <input type="password" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})}/></label><label>Desligar o quiosque todos os dias às <input type="time" value={form.shutdownTime||'18:30'} onChange={e=>setForm({...form,shutdownTime:e.target.value})}/></label><p>O aviso aparece cinco minutos antes. O desligamento depende de o aplicativo estar aberto no quiosque.</p>{!managed&&<><label><input type="checkbox" checked={form.kiosk==='true'} onChange={e=>setForm({...form,kiosk:String(e.target.checked)})}/> Abrir em tela cheia</label><label><input type="checkbox" checked={form.autostart==='true'} onChange={e=>setForm({...form,autostart:String(e.target.checked)})}/> Iniciar com Windows</label></>}<button className="primary small" onClick={save}>Salvar</button><button onClick={installUpdate}>Atualizar pelo pendrive</button><p>Escolha o instalador novo. O app faz um backup antes de abri-lo; o Windows pode pedir autorização da conta administradora.</p>{managed?<><button onClick={()=>setConfirmSignOut(true)}>Sair para o login do Windows</button>{confirmSignOut&&<div className="delete-confirm" role="alertdialog" aria-label="Confirmar saída do quiosque"><strong>Encerrar a sessão de quiosque?</strong><p>O Windows mostrará a tela de entrada. Escolha sua conta administrativa para usar a área de trabalho normal.</p><div className="form-actions"><button onClick={()=>setConfirmSignOut(false)}>Cancelar</button><button className="primary" onClick={signOut}>Confirmar saída</button></div></div>}</>:<button onClick={leave}>Sair da tela cheia nesta sessão</button>}{message&&<p role="status">{message}</p>}<button onClick={()=>api.exportBackup()}>Exportar backup</button><button onClick={()=>{if(confirm('Substituir os dados atuais pelo backup?'))api.importBackup()}}>Importar backup</button></section>
}
function ShutdownWarning(){
  const[remaining,setRemaining]=useState(null),[shutdownTime,setShutdownTime]=useState('18:30');
  useEffect(()=>{
    let active=true;
    let timer;
    api.isManagedKiosk().then(managed=>{
      if(!active||!managed)return;
      const update=async()=>{
        const configured=await api.getShutdownTime();
        if(!active)return;
        setShutdownTime(configured);
        const now=new Date();
        const minute=now.getHours()*60+now.getMinutes();
        const [hour,minutes]=configured.split(':').map(Number);
        const target=hour*60+minutes;
        setRemaining(minute>=target-5&&minute<=target?target-minute:null);
      };
      update();
      timer=setInterval(update,15000);
    });
    return()=>{active=false;clearInterval(timer)};
  },[]);
  if(remaining===null)return null;
  return <aside className="shutdown-warning" role="alert">{remaining===0?'O notebook está desligando agora.':`Atenção: o notebook desligará automaticamente às ${shutdownTime}. Faltam ${remaining} minuto${remaining===1?'':'s'}. Finalize e salve qualquer registro.`}</aside>;
}
function KioskRoot(){return <><ShutdownWarning/><App/></>}
createRoot(document.getElementById('root')).render(<KioskRoot/>);
