const singaporeDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit' });
export const today = () => singaporeDayFormatter.format(new Date());
export const halfHourTimes = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  return { value: `${String(hour).padStart(2,'0')}:${i % 2 ? '30' : '00'}`, label: `${hour % 12 || 12}${i % 2 ? '.30' : ''}${hour < 12 ? 'am' : 'pm'}` };
});
export function sortBookings<T extends { starts_at: string; resident_name: string }>(bookings: T[]): T[] {
  return [...bookings].sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.resident_name.localeCompare(b.resident_name));
}
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
export const clock = (date: string) => timeFormatter.format(new Date(date));
export const singaporeDate = (date: string) => singaporeDayFormatter.format(new Date(date));
export const slotLabel = (start: string, end: string) => `${dateLabel(start, { day: 'numeric', month: 'short' })}, ${clock(start)} → ${dateLabel(end, { day: 'numeric', month: 'short' })}, ${clock(end)} SGT`;
export function bookingsByDay<T extends { starts_at: string; ends_at: string }>(bookings: T[], firstDay: string) {
  const result = new Map<string, T[]>();
  for (const booking of bookings) {
    const startDay = singaporeDate(booking.starts_at);
    const day = startDay < firstDay && Date.parse(booking.ends_at) > Date.parse(`${firstDay}T00:00:00+08:00`) ? firstDay : startDay;
    const rows = result.get(day) || [];
    rows.push(booking);
    result.set(day, rows);
  }
  return result;
}
