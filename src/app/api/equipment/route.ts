import { db, failure } from '@/lib/server';
import { AppError } from '@/lib/security';
import { equipmentAuth, equipmentError, qmId, uuid } from '@/lib/equipment-server';
export const runtime='nodejs';
export async function GET(request: Request) {
  try {
    const {role}=await equipmentAuth(request);
    const url=new URL(request.url), start=url.searchParams.get('start'), end=url.searchParams.get('end');
    if ((start || end) && (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end)<=Date.parse(start) || Date.parse(end)-Date.parse(start)>72*3600000)) throw new AppError('Choose a valid collection and return time, up to 3 days apart.');
    const {data,error}=await db().rpc('abbey_equipment_catalogue',{p_start:start || null,p_end:end || null,p_staff:role!=='member'});
    if(error) equipmentError(error);
    return Response.json({items:data,role},{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const {user}=await equipmentAuth(request,'owner');
    const {id,data,stocktake}=await request.json();
    if(id!=null && !uuid(id)) throw new AppError('Invalid equipment record.');
    if(!data || typeof data!=='object' || JSON.stringify(data).length>100000) throw new AppError('Check the equipment details.');
    if(data.photo_path && !/^https:\/\//.test(data.photo_path)) throw new AppError('Use an HTTPS photo link.');
    const {data:result,error}=await db().rpc('abbey_equipment_save',{p_actor:user.id,p_qm:qmId(),p_item:id || null,p_data:data,p_stocktake:stocktake===true});
    if(error) equipmentError(error);
    return Response.json({id:result});
  } catch(e) { return failure(e); }
}
