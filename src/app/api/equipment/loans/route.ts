import { after } from 'next/server';
import { db, failure } from '@/lib/server';
import { AppError } from '@/lib/security';
import { equipmentAuth,equipmentError,qmId,uuid } from '@/lib/equipment-server';
import { loanDates,LOAN_TERMS_VERSION } from '@/lib/equipment';
import { flushNotifications } from '@/lib/telegram';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request: Request) {
  try {
    const {user,role}=await equipmentAuth(request);
    const url=new URL(request.url), scope=url.searchParams.get('scope') || 'mine';
    if(!['mine','all'].includes(scope)) throw new AppError('Invalid loan view.');
    if(scope==='all' && role==='member') throw new AppError('Only staff can view other borrowers’ loans.',403);
    let query=db().from('abbey_loans').select('*,abbey_loan_items(*,abbey_inventory_items(name,unit,tracking_mode),abbey_loan_movements(*))').order('created_at',{ascending:false});
    if(scope!=='all') query=query.eq('borrower_telegram_id',user.id);
    if(url.searchParams.get('history')!=='1') query=query.in('status',['pending','approved','active']);
    const {data,error}=await query.limit(1000);
    if(error) equipmentError(error);
    const client=db();
    const [{data:techs,error:techError},{data:assets,error:assetError}]=await Promise.all([
      client.from('abbey_tech_admins').select('telegram_user_id,handle'),
      client.from('abbey_inventory_assets').select('id,asset_tag'),
    ]);
    if(techError || assetError) throw new AppError('Could not load handover details.',503);
    const actorLabels=new Map((techs||[]).map(t=>[String(t.telegram_user_id),'@'+t.handle]));
    const assetTags=new Map((assets||[]).map(a=>[a.id,a.asset_tag]));
    const loans=(data||[]).map(loan=>({...loan,abbey_loan_items:loan.abbey_loan_items.map((line:any)=>({...line,abbey_loan_movements:line.abbey_loan_movements.map((movement:any)=>({...movement,actor_label:String(movement.actor_telegram_id)===String(qmId())?'Quartermaster':actorLabels.get(String(movement.actor_telegram_id))||'Staff',asset_tag:assetTags.get(movement.asset_id)||null}))}))}));
    return Response.json({loans},{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const {user}=await equipmentAuth(request);
    const body=await request.json();
    if(!uuid(body.requestId) || !Array.isArray(body.items) || !body.items.length || body.items.length>30 || body.items.some((i:{item_id:unknown;quantity:unknown})=>!i || !uuid(i.item_id)||!Number.isInteger(i.quantity)||Number(i.quantity)<1||Number(i.quantity)>100)) throw new AppError('Choose equipment and valid whole quantities.');
    if(body.terms!==true) throw new AppError('Read and accept the loan terms.');
    let dates;
    try { dates=loanDates(body.starts_at,body.due_at); } catch(e) { throw new AppError((e as Error).message); }
    const {data,error}=await db().rpc('abbey_equipment_request',{p_actor:user.id,p_qm:qmId(),p_request:body.requestId,p_name:String(body.name || ''),p_handle:user.username || '',p_purpose:String(body.purpose || ''),p_committee:String(body.committee || 'No'),p_start:dates.starts_at,p_end:dates.due_at,p_items:body.items,p_terms:LOAN_TERMS_VERSION});
    if(error) equipmentError(error);
    after(async()=>{await flushNotifications();});
    return Response.json({id:data},{status:201});
  } catch(e) { return failure(e); }
}
export async function PATCH(request: Request) {
  try {
    const {user,role}=await equipmentAuth(request);
    const {id,action}=await request.json();
    if(!uuid(id) || !['approved','rejected','cancelled','closed'].includes(action)) throw new AppError('Invalid loan action.');
    if(['approved','rejected'].includes(action) && role!=='owner') throw new AppError('Only the quartermaster can approve or reject loans.',403);
    if(action==='closed' && role==='member') throw new AppError('Only staff can close a loan.',403);
    const {error}=await db().rpc('abbey_equipment_decide',{p_actor:user.id,p_qm:qmId(),p_loan:id,p_action:action});
    if(error) equipmentError(error);
    after(async()=>{await flushNotifications();});
    return Response.json({ok:true});
  } catch(e) { return failure(e); }
}
