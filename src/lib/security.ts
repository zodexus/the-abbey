import { createHmac, timingSafeEqual } from 'node:crypto';

export type TelegramUser = { id: number; first_name: string; username?: string };
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function validateInitData(raw: string, token: string, now = Date.now()): TelegramUser {
  if (!raw || raw.length > 12000 || !token) throw new AppError('Open this calendar from @TheAbbeyBot.', 401);
  const params = new URLSearchParams(raw);
  if (new Set(params.keys()).size !== [...params.keys()].length) throw new AppError('Invalid Telegram session.', 401);
  const hash = params.get('hash') || '';
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', secret).update(check).digest();
  if (!/^[a-f0-9]{64}$/i.test(hash) || !timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw new AppError('Invalid Telegram session.', 401);
  const age = now / 1000 - Number(params.get('auth_date'));
  if (!Number.isFinite(age) || age < -30 || age > 3600) throw new AppError('Session expired. Close and reopen the calendar in Telegram.', 401);
  let user: TelegramUser;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { throw new AppError('Invalid Telegram account.', 401); }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.first_name !== 'string') throw new AppError('Invalid Telegram account.', 401);
  return user;
}
export function normalizeHandle(value: unknown): string {
  const handle = String(value ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z][a-z0-9_]{3,31}$/.test(handle)) throw new AppError('Enter a valid Telegram username, such as @yourname.');
  return handle;
}
export function bookingInput(input: Record<string, unknown>, now = Date.now()) {
  const name = String(input.name ?? '').trim();
  const purpose = String(input.purpose ?? '').trim();
  const date = String(input.date ?? '');
  const time = String(input.time ?? '');
  const duration = Number(input.duration);
  if (!name || name.length > 80 || !purpose || purpose.length > 400) throw new AppError('Enter your name (up to 80 characters) and purpose (up to 400).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time)) throw new AppError('Choose a valid date and a start time on the hour or half hour.');
  const start = new Date(`${date}T${time}:00+08:00`);
  if (!Number.isFinite(start.getTime()) || new Date(start.getTime() + 8 * 3600000).toISOString().slice(0, 10) !== date) throw new AppError('Choose a valid date.');
  if (!Number.isInteger(duration) || duration < 30 || duration > 1440 || duration % 30 !== 0) throw new AppError('Use a duration of 0.5 to 24 hours, in half-hour steps.');
  if (start.getTime() <= now) throw new AppError('Choose a time in the future.');
  if (start.getTime() > now + 366 * 86400000) throw new AppError('Choose a date within the next year.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(input.requestId))) throw new AppError('Invalid request. Refresh and try again.');
  return { resident_name: name, purpose, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + duration * 60000).toISOString(), request_id: String(input.requestId) };
}
export function validWebhookSecret(actual: string | null, expected: string) {
  return Boolean(actual && expected && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)));
}
