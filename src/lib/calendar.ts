export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const shiftDay = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 10);
}
export function monthDays(month: string) {
  const first = `${month.slice(0, 7)}-01`;
  const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
  const count = Math.round((Date.parse(shiftMonth(first, 1)) - Date.parse(first)) / 86400000);
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => shiftDay(first, i - offset));
}
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Date(date.length === 10 ? `${date}T12:00:00+08:00` : date).toLocaleDateString('en-US', { timeZone: 'Asia/Singapore', ...options });
export const clock = (date: string) => new Date(date).toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit' });
export const singaporeDate = (date: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
