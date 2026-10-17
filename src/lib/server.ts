import { createClient } from '@supabase/supabase-js';
import { AppError, validateInitData, type TelegramUser } from './security';

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError('The Abbey is being set up. Please contact the quartermaster.', 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function isAdmin(user: TelegramUser) {
  return Boolean(process.env.TELEGRAM_QM_CHAT_ID && String(user.id) === process.env.TELEGRAM_QM_CHAT_ID);
}
export async function licensed(user: TelegramUser) {
  if (isAdmin(user)) return { user, admin: true, name: user.first_name };
  const { data, error } = await db().rpc('abbey_claim_license', { p_user_id: user.id, p_handle: user.username?.toLowerCase() || '' });
  if (error) throw new AppError('The licensing registry is unavailable. Please contact the quartermaster.', 503);
  if (!data?.length) throw new AppError('Access is for Abbey-licensed residents. Ask the quartermaster to add your Telegram handle.', 403);
  return { user, admin: false, name: data[0].name || user.first_name };
}
export async function authenticate(request: Request, adminOnly = false) {
  const user = validateInitData(request.headers.get('x-telegram-init-data') || '', process.env.TELEGRAM_BOT_TOKEN || '');
  if (adminOnly && !isAdmin(user)) throw new AppError('Only the quartermaster can do this.', 403);
  return licensed(user);
}
export function failure(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export function dbError(error: { code?: string; message?: string }) {
  if (error.code === '23P01') throw new AppError('That slot has just been booked. Please choose another time.', 409);
  if (error.message?.includes('pending limit')) throw new AppError('You already have 10 pending requests. Cancel one or wait for approval.', 409);
  if (error.message?.includes('slot booked')) throw new AppError('That slot is booked. Please choose another time.', 409);
  throw new AppError('Could not save the change. Please try again.', 503);
}
