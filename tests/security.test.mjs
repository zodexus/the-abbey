import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateInitData, normalizeHandle, bookingInput, validWebhookSecret } from '../src/lib/security.ts';
const token = 'test-token';
const now = Date.parse('2026-10-17T12:00:00Z');
function signed(extra = {}) {
  const fields = { auth_date: String(now / 1000), query_id: 'test', user: JSON.stringify({ id: 123, first_name: 'Alex', username: 'alex_test' }), ...extra };
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(Object.entries(fields).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n')).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}
test('accepts verified Telegram identity', () => assert.equal(validateInitData(signed(), token, now).id, 123));
test('rejects tampering, wrong bot, missing session, and malformed hashes', () => {
  for (const raw of [signed().replace('test&','evil&'), '', signed().replace(/hash=.*/, 'hash=zz')]) assert.throws(() => validateInitData(raw, token, now));
  assert.throws(() => validateInitData(signed(), 'different-token', now));
});
test('rejects stale and future sessions', () => {
  assert.throws(() => validateInitData(signed({auth_date:String(now/1000-3601)}), token, now));
  assert.throws(() => validateInitData(signed({auth_date:String(now/1000+60)}), token, now));
});
test('rejects duplicate keys and malformed user objects', () => {
  assert.throws(() => validateInitData(signed()+'&auth_date=1', token, now));
  for (const user of ['null','{}','{"id":-1,"first_name":"A"}','{']) assert.throws(() => validateInitData(signed({user}),token,now));
});
test('normalizes handles without accepting arbitrary identifiers', () => {
  assert.equal(normalizeHandle(' @Alex_Test '), 'alex_test');
  for (const v of ['','12','alex bob','https://t.me/alex']) assert.throws(()=>normalizeHandle(v));
});
const input = { date:'2026-10-18',time:'23:30',duration:120,name:'Alex',purpose:'Rehearsal',requestId:'12345678-1234-4123-8123-123456789abc' };
test('calculates overnight end dates in Singapore time',()=> {
  const value = bookingInput(input,now);
  assert.equal(value.starts_at,'2026-10-18T15:30:00.000Z');
  assert.equal(value.ends_at,'2026-10-18T17:30:00.000Z');
});
test('new requests use half-hour starts and durations, including 1.5 hours overnight',()=> {
  for (const time of ['15:15','15:45','15:01']) assert.throws(()=>bookingInput({...input,time},now));
  for (const duration of [15,45,75]) assert.throws(()=>bookingInput({...input,duration},now));
  assert.equal(bookingInput({...input,duration:90},now).ends_at,'2026-10-18T17:00:00.000Z');
});
test('validates booking inputs and rejects impossible dates and past slots',()=> {
  for(const invalid of [{date:'2026-02-30'},{time:'25:00'},{duration:-1},{duration:0},{duration:1441},{duration:16},{name:''},{purpose:'x'.repeat(401)},{date:'2026-10-16'},{requestId:'invalid'},{date:'2028-01-01'}]) assert.throws(()=>bookingInput({...input,...invalid},now));
});
test('webhooks fail closed and compare secrets safely',()=> {
  assert.equal(validWebhookSecret('abc','abc'),true);
  for(const [a,b] of [[null,'abc'],['',''],['wrong','abc'],['é','x']]) assert.equal(validWebhookSecret(a,b),false);
});
