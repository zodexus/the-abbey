'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collected, equipmentStaff, loanDates, loanOutstanding, LOAN_TERMS, outstanding, overdue, type Asset, type Equipment, type EquipmentLoan, type EquipmentRole, type LoanLine } from '@/lib/equipment';
import { dateLabel, shiftDay, slotLabel, today } from '@/lib/calendar';
type Api = (path: string, method?: string, body?: unknown) => Promise<any>;
type Session = {name: string;userId: number;equipmentRole?: EquipmentRole};
const labels:Record<string,string>={pending:'Pending approval',approved:'Approved · not collected',active:'Collected',closed:'Closed',rejected:'Rejected',cancelled:'Cancelled'};
const conditions=['working','limited','faulty','untested'];
const iso=(v:string)=>new Date(`${v}:00+08:00`).toISOString();
function initialDates() {const day=shiftDay(today(),8);return {start:`${day}T18:00`,end:`${shiftDay(day,1)}T18:00`};}
const Search = memo(function Search({change}:{change:(text:string)=>void}) {
 const timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <input type="search" aria-label="Find equipment" placeholder="Search equipment…" onChange={e=>{const v=e.target.value;clearTimeout(timer.current);timer.current=setTimeout(()=>change(v),150);}}/>;
});
function samples():Equipment[] {return [
 {id:'demo-mic',item_code:'ABY-I-0101',name:'Shure SM58 microphone',category:'Microphones',subtype:'Dynamic',unit:'each',tracking_mode:'individual',verification_status:'verified',loanable:true,photo_path:null,notes:null,working:2,limited:0,faulty:0,untested:0,out:1,available:2,assets:[{id:'demo-asset',asset_tag:'ABY-A-0001',serial_number:null,condition:'working',whereabouts:'on_site'},{id:'demo-out',asset_tag:'ABY-A-0002',serial_number:null,condition:'working',whereabouts:'off_site'}]},
 {id:'demo-cable',item_code:'ABY-I-0001',name:'XLR cable · 5m',category:'Cables',subtype:'XLR',unit:'each',tracking_mode:'bulk',verification_status:'verified',loanable:true,photo_path:null,notes:null,working:8,limited:0,faulty:1,untested:0,out:2,available:8,assets:[]},
 {id:'demo-amp',item_code:'ABY-I-0139',name:'Marshall MG50FX',category:'Amplifiers',subtype:'Guitar amp',unit:null,tracking_mode:null,verification_status:'needs_stocktake',loanable:false,photo_path:null,notes:'Awaiting physical stocktake',working:0,limited:0,faulty:0,untested:0,out:0,available:null,assets:[]},
];}
function demoLoans():EquipmentLoan[] {const now=Date.now();return [{id:'demo-loan',borrower_name:'Alex',borrower_handle:'alex_demo',borrower_telegram_id:2,committee:'Student Band',purpose:'Evening performance',starts_at:new Date(now-4*3600000).toISOString(),due_at:new Date(now-3600000).toISOString(),status:'active',notes:null,abbey_loan_items:[{id:'demo-line',item_id:'demo-mic',requested_qty:1,approved_qty:1,abbey_inventory_items:{name:'Shure SM58 microphone',unit:'each',tracking_mode:'individual'},abbey_loan_movements:[{id:'demo-movement',asset_id:'demo-out',movement_type:'checkout',quantity:1,condition:'working',occurred_at:new Date(now-4*3600000).toISOString(),actor_telegram_id:1,notes:'Collected before performance'}]}]}];}
export default function EquipmentApp({session,api,demo}:{session:Session;api:Api;demo:boolean}) {
 const [role,setRole]=useState<EquipmentRole>(session.equipmentRole || 'member');
 const [tab,setTab]=useState<'catalogue'|'loans'|'outstanding'>('catalogue');
 const [items,setItems]=useState<Equipment[]>(demo?samples:[]);
 const [loans,setLoans]=useState<EquipmentLoan[]>(demo?demoLoans:[]);
 const [dates,setDates]=useState(initialDates);
 const [search,setSearch]=useState(''); const [category,setCategory]=useState('All');
 const [scope,setScope]=useState<'mine'|'all'>(equipmentStaff(session.equipmentRole || 'member')?'all':'mine');
 const [history,setHistory]=useState(false); const [cart,setCart]=useState<Record<string,number>>({});
 const [loading,setLoading]=useState(!demo);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0); const [limit,setLimit]=useState(30);
 const [edit,setEdit]=useState<Equipment | 'new' | null>(null);
 const requestId=useRef(''); const saving=useRef(false);
 if(!requestId.current) requestId.current=crypto.randomUUID();
 const errorElement=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error){errorElement.current?.scrollIntoView({block:'center',behavior:'smooth'});errorElement.current?.focus({preventScroll:true});}},[error]);
 const staff=equipmentStaff(role);
 let dateError='';let start='',end='';
 try {start=iso(dates.start);end=iso(dates.end);loanDates(start,end);} catch(e) {dateError=(e as Error).message;}
 useEffect(()=>{
  if(demo)return;
  let live=true;
  const timer=setTimeout(()=>{
   setLoading(true);setError('');
   const params=start && end && Date.parse(end)>Date.parse(start) && Date.parse(end)-Date.parse(start)<=72*3600000?`?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`:'';
   api('/api/equipment'+params).then(result=>{if(live){setItems(result.items);setRole(result.role);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
  },250);
  return ()=>{live=false;clearTimeout(timer);};
 },[api,demo,start,end,revision]);
 useEffect(()=>{
  if(demo)return;
  let live=true;
  const selected=staff?scope:'mine';
  api(`/api/equipment/loans?scope=${selected}&history=${history?'1':'0'}`).then(result=>{if(live)setLoans(result.loans);}).catch(e=>{if(live)setError(e.message);});
  return ()=>{live=false;};
 },[api,demo,staff,scope,history,revision]);
 useEffect(()=>{if(demo)return;const timer=setInterval(()=>setRevision(v=>v+1),60000);return ()=>clearInterval(timer);},[demo]);
 const refresh=useCallback(()=>{setRevision(v=>v+1);},[]);
 async function run(action:()=>Promise<void>) {
  if(saving.current)return false;
  saving.current=true;setBusy(true);setError('');setNotice('');
  try{await action();refresh();return true;}catch(e){setError((e as Error).message);return false;}finally{saving.current=false;setBusy(false);}
 }
 const visible=useMemo(()=>items.filter(i=>(category==='All'||(i.category || 'Uncategorised')===category)&&`${i.name} ${i.item_code} ${i.subtype || ''}`.toLowerCase().includes(search.toLowerCase())),[items,category,search]);
 const selected=Object.entries(cart).filter(([,qty])=>qty>0).map(([id,quantity])=>({item:items.find(i=>i.id===id),quantity})).filter(x=>x.item) as {item:Equipment;quantity:number}[];
 const invalidCart=selected.some(({item,quantity})=>!item.loanable || item.verification_status!=='verified'||item.available==null||quantity>item.available);
 async function submitLoan(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault(); const fields=new FormData(event.currentTarget);
  await run(async()=>{
   if(dateError || !selected.length || invalidCart || loading)throw new Error(dateError || 'Check the selected quantities and availability.');
   const body={requestId:requestId.current,name:String(fields.get('name') || '').trim(),purpose:String(fields.get('purpose') || '').trim(),committee:fields.get('committee')==='Other'?String(fields.get('otherCommittee') || ''):String(fields.get('committee') || 'No'),starts_at:start,due_at:end,items:selected.map(({item,quantity})=>({item_id:item.id,quantity})),terms:fields.get('terms')==='on'};
   if(demo) {
    setLoans(current=>[{id:crypto.randomUUID(),borrower_name:body.name,borrower_handle:null,borrower_telegram_id:session.userId,purpose:body.purpose,committee:body.committee,starts_at:start,due_at:end,status:'pending',notes:null,abbey_loan_items:selected.map(({item,quantity})=>({id:crypto.randomUUID(),item_id:item.id,requested_qty:quantity,approved_qty:null,abbey_inventory_items:{name:item.name,unit:item.unit || 'each',tracking_mode:item.tracking_mode || 'bulk'},abbey_loan_movements:[]}))},...current]);
   } else await api('/api/equipment/loans','POST',body);
   setCart({});requestId.current=crypto.randomUUID();setNotice('Loan request sent. Your equipment is reserved only after quartermaster approval.');setTab('loans');setScope('mine');
  });
 }
 async function decide(loan:EquipmentLoan,action:string) {await run(async()=>{
  if(demo)setLoans(rows=>rows.map(l=>l.id===loan.id?{...l,status:action,abbey_loan_items:l.abbey_loan_items.map(line=>({...line,approved_qty:action==='approved'?line.requested_qty:line.approved_qty}))}:l));
  else await api('/api/equipment/loans','PATCH',{id:loan.id,action});
  setNotice(`Loan ${action==='approved'?'approved and reserved':action}.`);
 });}
 async function movement(body:Record<string,unknown>) {return run(async()=>{
  if(demo) {
   setLoans(rows=>rows.map(l=>({...l,status:l.abbey_loan_items.some(line=>line.id===body.lineId)&&body.type==='checkout'?'active':l.status,abbey_loan_items:l.abbey_loan_items.map(line=>line.id===body.lineId?{...line,abbey_loan_movements:[...line.abbey_loan_movements,{id:crypto.randomUUID(),asset_id:String(body.assetId || '') || null,movement_type:String(body.type),quantity:Number(body.quantity),condition:String(body.condition),occurred_at:new Date().toISOString(),actor_telegram_id:session.userId,notes:String(body.notes || '')}]}:line)})));
  } else await api('/api/equipment/movements','POST',body);
  setNotice(body.type==='checkout'?'Collection recorded.':'Return recorded. Check for any remaining equipment before closing the loan.');
 });}
 const filteredLoans=loans.filter(l=>(scope==='all'&&staff || l.borrower_telegram_id===session.userId)&&(!(!history&&!['pending','approved','active'].includes(l.status)))&&(tab!=='outstanding'||loanOutstanding(l)>0));
 return <section className="equipment-app" aria-label="Equipment and loans">
  {demo&&<div className="equipment-preview"><span>Preview · sample inventory and loans</span><label>View as<select aria-label="Preview role" value={role} onChange={e=>{const next=e.target.value as EquipmentRole;setRole(next);setScope(equipmentStaff(next)?'all':'mine');if(next==='member'&&tab==='outstanding')setTab('loans');}}><option value="owner">Quartermaster</option><option value="tech">Tech Admin</option><option value="member">Member</option></select></label></div>}
  <div className="equipment-top"><div><p className="range-caption">{role==='owner'?'Quartermaster':role==='tech'?'Tech Admin':'Licensed member'}</p><h2>{tab==='catalogue'?'Inventory':tab==='outstanding'?'Currently out':staff?'Loan requests':'My loans'}</h2></div><button className="equipment-button" disabled={busy||loading} onClick={refresh}>Refresh</button></div>
  <nav className="equipment-tabs" aria-label="Equipment views"><button aria-pressed={tab==='catalogue'} onClick={()=>setTab('catalogue')}>Inventory</button><button aria-pressed={tab==='loans'} onClick={()=>setTab('loans')}>{staff?'Loans':'My loans'}</button>{staff&&<button aria-pressed={tab==='outstanding'} onClick={()=>{setTab('outstanding');setScope('all');setHistory(false);}}>Currently out</button>}</nav>
  {notice&&<p className="notice" role="status">{notice}</p>}{error&&<p ref={errorElement} tabIndex={-1} className="error" role="alert">{error}</p>}
  {edit&&role==='owner'&&<InventoryEditor key={edit==='new'?'new':edit.id} item={edit==='new'?null:edit} busy={busy} close={()=>setEdit(null)} save={async(id,data,stocktake)=>{await run(async()=>{if(demo){setNotice('Preview only: no inventory changes were saved.');}else{await api('/api/equipment','POST',{id,data,stocktake});setNotice(stocktake?'Stocktake finalised and inventory updated.':'Equipment details saved.');}setEdit(null);});}}/>}
  {tab==='catalogue'?<>
   {items.some(i=>i.verification_status!=='verified')&&<div className="equipment-callout">The catalogue is awaiting a physical stocktake. Unverified items cannot be requested. {role==='owner'?'Your completed stocktake sheet can be imported when ready.':''}</div>}
   <section className="equipment-dates" aria-label="Loan dates"><div><h3>When do you need it?</h3><p>At least 7 days’ notice · up to 3 days · Singapore time</p></div><label>Collect<input type="datetime-local" value={dates.start} onChange={e=>setDates(d=>({...d,start:e.target.value}))}/></label><label>Return by<input type="datetime-local" value={dates.end} onChange={e=>setDates(d=>({...d,end:e.target.value}))}/></label></section>
   {dateError&&<p className="error" role="alert">{dateError}</p>}
   <div className="equipment-filters"><Search change={setSearch}/><select aria-label="Equipment category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(30);}}><option>All</option>{[...new Set(items.map(i=>i.category||'Uncategorised'))].sort().map(c=><option key={c}>{c}</option>)}</select>{role==='owner'&&<button className="equipment-button" onClick={()=>setEdit('new')}>+ Add equipment</button>}</div>
   <p className="equipment-count">{loading?'Checking inventory…':`${visible.length} equipment types`}</p>
   {selected.length>0&&<div className="equipment-selection"><span>{selected.reduce((n,s)=>n+s.quantity,0)} items selected</span><a className="equipment-button" href="#equipment-request">Review request ↓</a></div>}
   <div className="equipment-list">{visible.slice(0,limit).map(item=><article key={item.id} className="equipment-row">
    <details className="equipment-row-info"><summary><strong>{item.name}</strong><span className="equipment-row-meta"><span>{item.category||'Uncategorised'}{item.subtype?` / ${item.subtype}`:''}</span><span className={item.verification_status!=='verified'?'equipment-row-status unverified':'equipment-row-status'}>{item.verification_status!=='verified'?'Needs stocktake':!item.loanable?'Not loanable':`${item.available??'—'} available`}</span></span></summary>
     <div className="equipment-row-detail"><p>{item.item_code} · {item.unit||'Unit not confirmed'}</p>{item.verification_status==='verified'&&<p>{item.working} working here · {item.out} currently out · {item.limited+item.faulty+item.untested} not loanable</p>}{item.photo_path&&<img src={item.photo_path} alt={item.name} loading="lazy" referrerPolicy="no-referrer"/>}</div>
    </details>
    <input className="equipment-row-quantity" type="number" aria-label={`Quantity for ${item.name}`} title={`Quantity (${item.unit||'unit unconfirmed'})`} min="0" max={Math.min(item.available??0,100)} step="1" value={cart[item.id]||0} disabled={loading||!!dateError||!item.loanable||item.verification_status!=='verified'||!item.available} onChange={e=>setCart(c=>({...c,[item.id]:Math.max(0,Number(e.target.value))}))}/>
    {role==='owner'&&<button className="equipment-row-edit" aria-label={`Edit ${item.name}`} onClick={()=>setEdit(item)}>Edit</button>}
   </article>)}</div>
   {visible.length>limit&&<button className="equipment-button full" onClick={()=>setLimit(n=>n+30)}>Show more equipment</button>}
   {!loading&&!visible.length&&<p className="empty-day">No equipment matches your search.</p>}
   {selected.length>0&&<form id="equipment-request" className="equipment-request" onSubmit={submitLoan}><h3>Your loan request</h3><ul>{selected.map(({item,quantity})=><li key={item.id}>{quantity} × {item.name}<button type="button" className="subtle" onClick={()=>setCart(c=>({...c,[item.id]:0}))}>Remove</button></li>)}</ul><p>{start&&end&&slotLabel(start,end)}</p>{invalidCart&&<p className="error">Availability has changed. Adjust your quantities.</p>}<label>Your name<input required maxLength={80} name="name" defaultValue={session.name}/></label><label>Committee / group<select name="committee" defaultValue="No"><option>No</option><option>CSC</option><option>House</option><option>Interest Group</option><option>Student Band</option><option>Other</option></select></label><label>Group name, if Other<input name="otherCommittee" maxLength={120}/></label><label>Purpose<textarea required name="purpose" maxLength={1000}/></label><details className="loan-terms"><summary>Read the equipment loan terms</summary><p>{LOAN_TERMS}</p><p>Keep equipment dry, coil cables neatly, lower faders before powering down, and report loss or damage to @mezyyy.</p></details><label className="equipment-check"><input type="checkbox" required name="terms"/> I agree to the equipment loan terms.</label><button className="primary" disabled={busy||loading||!!dateError||invalidCart}>{busy?'Sending…':'Request equipment'}</button><p className="equipment-muted">Equipment is reserved after quartermaster approval. Collection must be recorded before taking items out.</p></form>}
  </>:<>
   <div className="equipment-loan-controls">{staff&&<select aria-label="Loan scope" value={scope} onChange={e=>setScope(e.target.value as 'mine'|'all')}><option value="all">All borrowers</option><option value="mine">My loans</option></select>}<label className="equipment-check"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/> Include closed / cancelled</label></div>
   {tab==='outstanding'&&<div className="equipment-callout">Only equipment actually collected appears here. Approved reservations remain in Loans until collection is recorded.</div>}
   {!filteredLoans.length&&<p className="empty-day">{tab==='outstanding'?'No equipment is currently recorded as out.':'No loans in this view.'}</p>}
   <div className="equipment-loans">{filteredLoans.map(loan=><LoanCard key={loan.id} loan={loan} role={role} userId={session.userId} items={items} busy={busy} expanded={tab==='outstanding'} decide={decide} movement={movement}/>)}</div>
  </>}
 </section>;
}

function LoanCard({loan,role,userId,items,busy,expanded,decide,movement}:{loan:EquipmentLoan;role:EquipmentRole;userId:number;items:Equipment[];busy:boolean;expanded:boolean;decide:(loan:EquipmentLoan,action:string)=>Promise<void>;movement:(body:Record<string,unknown>)=>Promise<boolean>}) {
 const staff=equipmentStaff(role),out=loanOutstanding(loan),late=overdue(loan);
 return <details className={`equipment-loan ${late?'is-overdue':''}`} open={expanded}>
  <summary><span><strong>{loan.borrower_name}</strong><span className="equipment-muted">{slotLabel(loan.starts_at,loan.due_at)}</span></span><span className={`equipment-badge ${late?'overdue':loan.status}`}>{late?'Overdue':labels[loan.status]||loan.status}</span></summary>
  <div className="equipment-loan-body"><p>{loan.purpose}</p><p className="equipment-muted">{loan.committee}{staff&&loan.borrower_handle?` · @${loan.borrower_handle}`:''}</p>
   {loan.abbey_loan_items.map(line=><section className="equipment-loan-line" key={line.id}><div><h4>{line.abbey_inventory_items.name}</h4><p className="equipment-muted">Requested {line.requested_qty}{line.approved_qty!=null?` · approved ${line.approved_qty}`:''} · collected {collected(line)} · <strong>{outstanding(line)} still out</strong></p></div>
    {staff&&['approved','active'].includes(loan.status)&&<HandoverForm line={line} loan={loan} item={items.find(i=>i.id===line.item_id)} busy={busy} movement={movement}/>}
    {line.abbey_loan_movements.length>0&&<details className="equipment-history"><summary>Collection / return history</summary>{line.abbey_loan_movements.map(m=><p key={m.id}>{m.movement_type==='checkout'?'Collected':'Returned'} {m.quantity} · {m.condition} · {dateLabel(m.occurred_at,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} SGT{m.asset_tag?` · ${m.asset_tag}`:''}{m.actor_label?` · ${m.actor_label}`:''}{m.notes?` · ${m.notes}`:''}</p>)}</details>}
   </section>)}
   <div className="equipment-decision-actions">{role==='owner'&&loan.status==='pending'&&<><button disabled={busy||Date.parse(loan.starts_at)<=Date.now()} className="primary" onClick={()=>void decide(loan,'approved')}>Approve loan</button><button disabled={busy} className="equipment-button" onClick={()=>void decide(loan,'rejected')}>Reject</button></>}
    {(loan.borrower_telegram_id===userId||role==='owner')&&['pending','approved'].includes(loan.status)&&<button disabled={busy} className="equipment-button" onClick={()=>void decide(loan,'cancelled')}>Cancel loan</button>}
    {staff&&out===0&&(loan.status==='active'||role==='owner'&&loan.status==='approved')&&<button disabled={busy} className="equipment-button" onClick={()=>void decide(loan,'closed')}>Close loan · release any uncollected items</button>}
   </div>
  </div>
 </details>;
}
function HandoverForm({line,loan,item,busy,movement}:{line:LoanLine;loan:EquipmentLoan;item?:Equipment;busy:boolean;movement:(body:Record<string,unknown>)=>Promise<boolean>}) {
 const [type,setType]=useState<'checkout'|'return'>(outstanding(line)>0?'return':'checkout');
 const request=useRef(crypto.randomUUID());
 const individual=line.abbey_inventory_items.tracking_mode==='individual';
 const assetOutstanding=(id:string)=>line.abbey_loan_movements.filter(m=>m.asset_id===id).reduce((sum,m)=>sum+(m.movement_type==='checkout'?m.quantity:-m.quantity),0);
 const options=item?.assets.filter(a=>type==='checkout'?a.whereabouts==='on_site'&&a.condition==='working':assetOutstanding(a.id)>0)||[];
 const qty=type==='checkout'?(line.approved_qty||0)-collected(line):outstanding(line);
 const withinPeriod=Date.now()>=Date.parse(loan.starts_at)&&Date.now()<Date.parse(loan.due_at);
 return <form className="equipment-handover" onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void movement({requestId:request.current,lineId:line.id,type,quantity:individual?1:Number(fields.get('quantity')),assetId:individual?String(fields.get('assetId')):null,condition:type==='checkout'?'working':String(fields.get('condition')),notes:String(fields.get('notes')||'')}).then(ok=>{if(ok)request.current=crypto.randomUUID();});}}>
  <label>Record<select value={type} onChange={e=>{setType(e.target.value as 'checkout'|'return');request.current=crypto.randomUUID();}}><option value="checkout">Collection</option><option value="return">Return</option></select></label>
  {individual?<label>Asset tag<select required name="assetId" key={type} disabled={!options.length}>{options.map(a=><option key={a.id} value={a.id}>{a.asset_tag}</option>)}</select></label>:<label>Quantity<input name="quantity" type="number" required min="1" max={Math.max(0,qty)} step="1" defaultValue="1"/></label>}
  {type==='return'&&<label>Returned condition<select name="condition" defaultValue="working">{conditions.map(c=><option key={c}>{c}</option>)}</select></label>}
  <label>Notes<input name="notes" maxLength={1000} placeholder="Damage, missing accessories…"/></label>
  <button className="equipment-button" disabled={busy||qty<=0||(individual&&!options.length)||(type==='checkout'&&!withinPeriod)}>{type==='checkout'?'Record collection':'Record return'}</button>
  {type==='checkout'&&!withinPeriod&&<p className="equipment-muted">Collection opens at the approved start time and closes at the due time.</p>}
 </form>;
}

function InventoryEditor({item,busy,close,save}:{item:Equipment|null;busy:boolean;close:()=>void;save:(id:string|null,data:Record<string,unknown>,stocktake:boolean)=>Promise<void>}) {
 const [mode,setMode]=useState(item?.tracking_mode||'');const [stocktake,setStocktake]=useState(false);
 const [assets,setAssets]=useState<(Partial<Asset>&{key:string})[]>(item?.assets.filter(a=>a.whereabouts==='on_site').map(a=>({...a,key:a.id}))||[]);
 const element=useRef<HTMLElement>(null);
 useEffect(()=>{element.current?.scrollIntoView({behavior:'smooth',block:'start'});element.current?.querySelector('input')?.focus({preventScroll:true});},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();const fields=new FormData(event.currentTarget);
  const assetRows=assets.map((_,index)=>({asset_tag:String(fields.get(`tag-${index}`)||'').trim(),serial_number:String(fields.get(`serial-${index}`)||''),condition:String(fields.get(`condition-${index}`)||'untested'),notes:String(fields.get(`notes-${index}`)||'')}));
  const counts=Object.fromEntries(conditions.map(c=>[c,mode==='individual'?assetRows.filter(a=>a.condition===c).length:Number(fields.get(c))]));
  await save(item?.id||null,{name:String(fields.get('name')||''),category:String(fields.get('category')||''),subtype:String(fields.get('subtype')||''),unit:String(fields.get('unit')||''),tracking_mode:mode,loanable:fields.get('loanable')==='on',notes:String(fields.get('notes')||''),photo_path:String(fields.get('photo_path')||''),...counts,assets:assetRows},stocktake);
 }
 return <section ref={element} className="equipment-editor" aria-label={item?'Edit equipment':'Add equipment'}><div className="equipment-top"><h3>{item?'Edit equipment':'Add equipment'}</h3><button className="equipment-button" type="button" disabled={busy} onClick={close}>Close editor</button></div>
  <form onSubmit={submit}><div className="equipment-editor-grid"><label>Equipment name<input name="name" required maxLength={160} defaultValue={item?.name}/></label><label>Category<input name="category" maxLength={80} defaultValue={item?.category||''}/></label><label>Type / specification<input name="subtype" maxLength={120} defaultValue={item?.subtype||''}/></label><label>Counting unit<select name="unit" defaultValue={item?.unit||''}><option value="">Choose unit</option>{['each','pair','pack','set'].map(u=><option key={u}>{u}</option>)}</select></label><label>Tracking<select value={mode} onChange={e=>setMode(e.target.value)}><option value="">Choose tracking</option><option value="bulk">Bulk · identical items</option><option value="individual">Individual · unique asset labels</option></select></label><label>Photo link<input type="url" name="photo_path" placeholder="https://…" defaultValue={item?.photo_path||''}/></label></div>
   <label>Notes / defects<textarea name="notes" maxLength={1000} defaultValue={item?.notes||''}/></label><label className="equipment-check"><input type="checkbox" name="loanable" defaultChecked={item?.loanable||false}/> Allow verified, working stock to be requested</label>
   <label className="equipment-check"><input type="checkbox" checked={stocktake} onChange={e=>setStocktake(e.target.checked)}/> I have physically checked this equipment and want to finalise a stocktake</label>
   {stocktake&&<div className="equipment-stocktake"><p>Count only what is physically in the Abbey. Equipment on loan is tracked separately. Saving records you as the checker.</p>{mode==='individual'?<><p>Add one row for each physical item found. Counts are calculated from its condition.</p>{assets.map((a,index)=><div className="equipment-asset-row" key={a.key}><label>Asset tag<input name={`tag-${index}`} required maxLength={80} defaultValue={a.asset_tag} placeholder="ABY-A-0001"/></label><label>Serial number<input name={`serial-${index}`} defaultValue={a.serial_number||''}/></label><label>Condition<select name={`condition-${index}`} defaultValue={a.condition||'untested'}>{conditions.map(c=><option key={c}>{c}</option>)}</select></label><label>Defect notes<input name={`notes-${index}`} defaultValue={a.notes||''}/></label><button type="button" className="subtle" onClick={()=>setAssets(rows=>rows.filter((_,i)=>i!==index))}>Remove from count</button></div>)}<button type="button" className="equipment-button" onClick={()=>setAssets(a=>[...a,{key:crypto.randomUUID()}])}>+ Add physical asset</button><p className="equipment-muted">Previously on-site assets omitted from this count will be marked missing. Assets on loan remain on loan.</p></>:<div className="equipment-editor-grid">{conditions.map(c=><label key={c}>{c}<input name={c} type="number" required min="0" max="10000" step="1" defaultValue={item?.verification_status==='verified'?item[c as 'working']:''}/></label>)}</div>}</div>}
   <button className="primary" disabled={busy||stocktake&&!mode}>{busy?'Saving…':stocktake?'Finalise stocktake':'Save equipment details'}</button>
  </form>
 </section>;
}
