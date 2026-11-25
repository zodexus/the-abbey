import { authenticate, db, isAdmin } from './server';
import { AppError, type TelegramUser } from './security';
import type { EquipmentRole } from './equipment';
export async function equipmentRole(user: TelegramUser): Promise<EquipmentRole> {
  if (isAdmin(user)) return 'owner';
  const { data,error } = await db().rpc('abbey_claim_tech_admin',{p_user:user.id,p_handle:user.username?.toLowerCase() || ''});
  if(error) throw new AppError('Equipment permissions are temporarily unavailable.',503);
  return data ? 'tech' : 'member';
}
export async function equipmentAuth(request: Request, required: 'owner' | 'staff' | null = null) {
  const session=await authenticate(request);
  const role=await equipmentRole(session.user);
  if(required==='owner' && role!=='owner') throw new AppError('Only the quartermaster can do this.',403);
  if(required==='staff' && role==='member') throw new AppError('Only the quartermaster and Tech Admins can record handovers.',403);
  return {...session,role};
}
export function equipmentError(error: {code?: string; message?: string}) {
  if(error.code==='23505') throw new AppError('This record already exists. Check for duplicate items or asset tags.',409);
  if(error.code==='P0001') throw new AppError(error.message || 'Could not save equipment.',409);
  if(error.code?.startsWith('22') || error.code?.startsWith('23')) throw new AppError('Check the quantities, labels and required fields.',400);
  throw new AppError('Equipment is temporarily unavailable. Please try again.',503);
}
export const qmId = () => {
  const id=Number(process.env.TELEGRAM_QM_CHAT_ID);
  if(!Number.isSafeInteger(id) || id<=0) throw new AppError('Quartermaster approval is not configured.',503);
  return id;
};
export const uuid = (value: unknown) => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
