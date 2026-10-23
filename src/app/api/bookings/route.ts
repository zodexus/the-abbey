import { authenticate, db, dbError, failure } from '@/lib/server';
import { AppError, bookingInput } from '@/lib/security';
import { flushNotifications } from '@/lib/telegram';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const { user } = await authenticate(request);
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    const mine = url.searchParams.get('mine') === '1';
    let query = db().from('abbey_bookings').select('*').order('starts_at');
    if (mine) query = query.eq('telegram_user_id', user.id).gt('ends_at', new Date().toISOString()).limit(100);
    else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('Choose a valid date.');
      const start = new Date(`${date}T00:00:00+08:00`);
      if (!Number.isFinite(start.getTime())) throw new AppError('Choose a valid date.');
      query = query.lt('starts_at', new Date(start.getTime() + 42 * 86400000).toISOString()).gt('ends_at', start.toISOString()).in('status', ['confirmed','pending']).limit(1000);
    }
    const { data, error } = await query;
    if (error) dbError(error);
    return Response.json({ bookings: (data || []).map(b => ({
      id: b.id, starts_at: b.starts_at, ends_at: b.ends_at, status: b.status,
      mine: b.telegram_user_id === user.id,
      resident_name: b.resident_name,
      purpose: b.purpose,
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const { user } = await authenticate(request);
    const input = bookingInput(await request.json());
    const qm = process.env.TELEGRAM_QM_CHAT_ID;
    if (!qm) throw new AppError('Quartermaster approval is not configured yet.', 503);
    const { data: conflicts, error: conflictError } = await db().from('abbey_bookings').select('id,telegram_user_id,request_id')
      .in('status', ['confirmed', 'pending']).lt('starts_at', input.ends_at).gt('ends_at', input.starts_at);
    if (conflictError) dbError(conflictError);
    // A retried request must still return its original booking without duplicating notifications.
    if (conflicts?.some(b => b.telegram_user_id !== user.id || b.request_id !== input.request_id)) {
      throw new AppError('This time overlaps an existing booking or pending request. Choose another time.', 409);
    }
    const { data, error } = await db().rpc('abbey_request', { p_user_id: user.id, p_request_id: input.request_id, p_name: input.resident_name, p_purpose: input.purpose, p_start: input.starts_at, p_end: input.ends_at, p_qm: qm });
    if (error) dbError(error);
    const notified = await flushNotifications();
    return Response.json({ booking: data, notificationPending: !notified }, { status: 201 });
  } catch (e) { return failure(e); }
}
export async function PATCH(request: Request) {
  try {
    const { user, admin } = await authenticate(request);
    const { id } = await request.json();
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new AppError('Invalid booking.');
    // Imported reservations have no Telegram account to notify or claim ownership.
    if (admin) {
      const { data, error } = await db().from('abbey_bookings').update({ status: 'cancelled' }).eq('id', id).eq('telegram_user_id', 0).eq('status', 'confirmed').gt('starts_at', new Date().toISOString()).select('id');
      if (error) dbError(error);
      if (data?.length) return Response.json({ ok: true });
    }
    const { error } = await db().rpc('abbey_decide', { p_id: id, p_status: 'cancelled', p_actor: user.id, p_qm: process.env.TELEGRAM_QM_CHAT_ID });
    if (error) throw new AppError('Unable to cancel. It may already be handled or have started.', 409);
    await flushNotifications();
    return Response.json({ ok: true });
  } catch (e) { return failure(e); }
}
