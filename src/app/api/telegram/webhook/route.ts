import { db, isAdmin, licensed } from '@/lib/server';
import { AppError, validWebhookSecret, type TelegramUser } from '@/lib/security';
import { bookingSummary, calendarButton, flushNotifications, send, telegram } from '@/lib/telegram';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validWebhookSecret(request.headers.get('x-telegram-bot-api-secret-token'), process.env.TELEGRAM_WEBHOOK_SECRET || '')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const update = await request.json();
    const callback = update.callback_query;
    const message = update.message;
    const user: TelegramUser | undefined = callback?.from || message?.from;
    if (!user || user.id <= 0 || !Number.isSafeInteger(user.id)) return Response.json({ ok: true });
    // Never publish the calendar or license registry to group chats.
    if ((callback?.message?.chat?.type || message?.chat?.type) !== 'private') return Response.json({ ok: true });
    try {
      await licensed(user);
      if (callback) {
        if (!isAdmin(user)) throw new AppError('Only the quartermaster can approve bookings.', 403);
        const match = /^(approve|reject):([0-9a-f-]{36})$/i.exec(callback.data || '');
        if (!match) throw new AppError('This button belongs to an older version. Use /pending.');
        const { data, error } = await db().rpc('abbey_decide', { p_id: match[2], p_status: match[1] === 'approve' ? 'confirmed' : 'rejected', p_actor: user.id, p_qm: process.env.TELEGRAM_QM_CHAT_ID });
        if (error) throw new AppError(error.code === '23P01' ? 'This overlaps an approved booking. Reject it or choose another slot.' : 'Cannot update: already handled, started, or the license was revoked.');
        // Deliver the resident's decision even if the old approval card can no longer be edited.
        const delivered = await flushNotifications();
        await Promise.allSettled([
          telegram('answerCallbackQuery', { callback_query_id: callback.id, text: `Booking ${data.status === 'confirmed' ? 'approved' : data.status}.` }),
          telegram('editMessageText', { chat_id: user.id, message_id: callback.message.message_id, text: `Abbey booking ${data.status}\n\n${bookingSummary(data)}`, reply_markup: { inline_keyboard: [] } }),
        ]);
        // Telegram retries this update; the database decision is idempotent.
        return Response.json(delivered ? { ok: true } : { error: 'Notification delivery delayed' }, { status: delivered ? 200 : 503 });
      } else {
        const [rawCommand] = String(message.text || '').trim().split(/\s+/);
        const command = rawCommand?.split('@')[0];
        if (isAdmin(user) && command === '/pending') {
          const { data, error } = await db().from('abbey_bookings').select('*').eq('status', 'pending').gt('starts_at', new Date().toISOString()).order('starts_at').limit(10);
          if (error) throw new AppError('Could not load requests.');
          if (!data.length) await send(user.id, 'No upcoming requests waiting for approval.');
          for (const b of data) await send(user.id, `Abbey booking request\n\n${bookingSummary(b)}`, { inline_keyboard: [[{ text: 'Approve', callback_data: `approve:${b.id}` }, { text: 'Reject', callback_data: `reject:${b.id}` }]] });
        } else if (isAdmin(user) && command === '/sync') {
          const ok = await flushNotifications();
          await send(user.id, ok ? 'Notification retry batch completed.' : 'Some notifications could not be sent. Try /sync again later.');
        } else {
          await send(user.id, `The Abbey 🎶\n\nCheck availability and request a booking below.${isAdmin(user) ? '\n\n/pending — review requests\n/sync — retry notifications' : ''}`, calendarButton());
        }
      }
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      if (callback) await telegram('answerCallbackQuery', { callback_query_id: callback.id, text: error.message.slice(0, 190), show_alert: true });
      else await send(user.id, error.message);
    }
    await flushNotifications();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'Retry later' }, { status: 500 }); }
}
