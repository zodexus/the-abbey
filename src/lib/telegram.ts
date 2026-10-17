import { db } from './server';

export async function telegram(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Telegram not configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const result = await response.json();
  if (!result.ok) throw new Error('Telegram request failed');
  return result.result;
}
export const send = (chat: string | number, text: string, reply_markup?: unknown) => telegram('sendMessage', { chat_id: chat, text, ...(reply_markup ? { reply_markup } : {}) });
export function calendarButton() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url?.startsWith('https://')) return undefined;
  return { inline_keyboard: [[{ text: 'Open Abbey calendar', web_app: { url } }]] };
}
export function bookingSummary(b: { resident_name: string; purpose: string; starts_at: string; ends_at: string }) {
  const format = (date: string) => new Date(date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return `${b.resident_name}\n${format(b.starts_at)} → ${format(b.ends_at)} (SGT)\n${b.purpose}`;
}
// Persist notifications with the booking transaction; retry via /pending and /sync.
export async function flushNotifications() {
  const { data, error } = await db().rpc('abbey_take_notifications');
  if (error) return false;
  let success = true;
  for (const n of data || []) {
    try {
      await send(n.chat_id, n.body, n.markup || undefined);
      await db().from('abbey_notifications').update({ sent_at: new Date().toISOString(), locked_until: null }).eq('id', n.id);
    } catch {
      success = false;
      await db().from('abbey_notifications').update({ locked_until: null }).eq('id', n.id);
    }
  }
  return success;
}
