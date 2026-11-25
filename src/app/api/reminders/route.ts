import { db } from '@/lib/server';
import { deliverBookingReminders, type Reminder } from '@/lib/booking-reminders';
import { flushNotifications, telegram } from '@/lib/telegram';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '')?.[1];
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const client = db();
    const { data: claimed, error: authError } = await client.rpc('abbey_claim_reminder_run', { p_token: token });
    if (authError) throw new Error('Scheduler unavailable');
    if (!claimed) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const began = Date.now();
    const result = await deliverBookingReminders({
      take: async () => {
        const { data, error } = await client.rpc('abbey_take_booking_reminders');
        if (error) throw new Error('Queue unavailable');
        return (data || []) as Reminder[];
      },
      booking: async id => {
        const { data, error } = await client.from('abbey_bookings').select('status,telegram_user_id,starts_at,ends_at').eq('id', id).maybeSingle();
        if (error) throw new Error('Booking unavailable');
        return data;
      },
      finish: async (reminder, update) => {
        const { error } = await client.from('abbey_booking_reminders').update(update).eq('id', reminder.id).eq('lease_id', reminder.lease_id);
        if (error) throw new Error('Queue unavailable');
      },
      send: async (recipient, html) => { await telegram('sendMessage', { chat_id: recipient, text: html, parse_mode: 'HTML' }); },
    });
    const notifications = await flushNotifications(Math.max(0, 45000 - (Date.now() - began)));
    return Response.json({ ...result, notificationsDelivered: notifications }, { status: result.failed || !notifications ? 503 : 200 });
  } catch { return Response.json({ error: 'Reminder delivery delayed' }, { status: 503 }); }
}
