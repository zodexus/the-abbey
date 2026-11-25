export type Reminder = {
  id: string; booking_id: string; kind: 'before' | 'reset'; starts_at: string; ends_at: string;
  recipient: number; lease_id: string; attempts: number;
};
export type ReminderBooking = { status: string; telegram_user_id: number; starts_at: string; ends_at: string };
export type ReminderResult = { sent_at?: string; skipped_at?: string; locked_until: string | null; lease_id: null; last_error?: string | null };
type Dependencies = {
  take: () => Promise<Reminder[]>;
  booking: (id: string) => Promise<ReminderBooking | null>;
  finish: (reminder: Reminder, result: ReminderResult) => Promise<void>;
  send: (recipient: number, html: string) => Promise<void>;
  now?: () => number;
};
const dateFormat = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', hourCycle: 'h23' });
export const quietHours = (now: number) => Number(hourFormat.format(now)) < 8;
export function advanceReminderText(booking: ReminderBooking, now: number) {
  const minutes = Math.max(1, Math.ceil((Date.parse(booking.starts_at) - now) / 60000));
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  const remaining = [hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '', rest ? `${rest} minute${rest === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ');
  return `🎶 Your Abbey booking starts in <b>${remaining}</b>.\n\n📅 ${dateFormat.format(new Date(booking.starts_at))} → ${dateFormat.format(new Date(booking.ends_at))} (SGT)\n\nPlease message the <b>Abbey Licensed ’26/27 group chat</b> to arrange for someone to help unlock the Abbey before your session.`;
}
export const resetReminderText = `🎶 Your Abbey session has ended. Please reset the room before leaving:

☐ Lower the mixer faders <b>before</b> turning off all electronic equipment, including keys, amps and speakers.

☐ Unplug all cables <b>except those connected to the keys</b>, and coil them neatly into <b>uniform loops slightly larger than your palm</b>.

☐ Keep the microphones in the dry box.

☐ Turn off all power outlets <b>except the one powering the microphone dry box</b>.

☐ Return equipment to its default position and setup.

☐ Turn off the lights and aircon.

If there are any equipment issues, please message <b>@mezyyy</b>. Thank you!`;

export async function deliverBookingReminders(deps: Dependencies) {
  const now = deps.now || Date.now;
  const began = now();
  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const reminder of await deps.take()) {
    // Stay inside the hosting request budget; unprocessed leases expire automatically.
    if (now() - began > 45000) break;
    try {
      const booking = await deps.booking(reminder.booking_id);
      const current = now();
      if (!booking || booking.status !== 'confirmed' || booking.telegram_user_id <= 0 ||
          String(booking.telegram_user_id) !== String(reminder.recipient) || Date.parse(booking.starts_at) !== Date.parse(reminder.starts_at) || Date.parse(booking.ends_at) !== Date.parse(reminder.ends_at) ||
          (reminder.kind === 'before' && Date.parse(booking.starts_at) <= current) ||
          (reminder.kind === 'reset' && Date.parse(booking.ends_at) + 86400000 <= current)) {
        await deps.finish(reminder, { skipped_at: new Date(current).toISOString(), locked_until: null, lease_id: null });
        result.skipped++;
        continue;
      }
      if ((reminder.kind === 'before' && quietHours(current)) || (reminder.kind === 'reset' && Date.parse(booking.ends_at) > current)) {
        await deps.finish(reminder, { locked_until: null, lease_id: null });
        continue;
      }
      await deps.send(reminder.recipient, reminder.kind === 'before' ? advanceReminderText(booking, current) : resetReminderText);
      await deps.finish(reminder, { sent_at: new Date(now()).toISOString(), locked_until: null, lease_id: null, last_error: null });
      result.sent++;
    } catch {
      result.failed++;
      // Never persist raw upstream errors: Telegram request URLs contain the bot token.
      await deps.finish(reminder, { locked_until: new Date(now() + Math.min(3600000, 30000 * 2 ** Math.min(reminder.attempts, 7))).toISOString(), lease_id: null, last_error: 'Delivery failed; retry scheduled.' });
    }
  }
  return result;
}
