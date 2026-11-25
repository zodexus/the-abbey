import { after } from 'next/server';
import { db, failure } from '@/lib/server';
import { AppError } from '@/lib/security';
import { equipmentAuth,equipmentError,qmId,uuid } from '@/lib/equipment-server';
import { flushNotifications } from '@/lib/telegram';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request: Request) {
  try {
    const {user}=await equipmentAuth(request,'staff');
    const {requestId,lineId,type,quantity,assetId,condition,notes}=await request.json();
    if(!uuid(requestId) || !uuid(lineId) || (assetId!=null && !uuid(assetId)) || !['checkout','return'].includes(type) || !Number.isInteger(quantity) || quantity<1 || quantity>100 || !['working','limited','faulty','untested'].includes(condition)) throw new AppError('Choose the item, quantity and condition.');
    const {data,error}=await db().rpc('abbey_equipment_movement',{p_actor:user.id,p_qm:qmId(),p_request:requestId,p_line:lineId,p_type:type,p_quantity:quantity,p_asset:assetId || null,p_condition:condition,p_notes:String(notes || '')});
    if(error) equipmentError(error);
    after(async()=>{await flushNotifications();});
    return Response.json({id:data});
  } catch(e) { return failure(e); }
}
