import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, shiftMonth, singaporeDate } from '../src/lib/calendar.ts';
import { parseSource, overlaps } from '../scripts/import-notion.mjs';
test('Sunday-first calendar includes full weeks across year and leap-month boundaries',()=>{
  assert.equal(monthDays('2026-10-01')[0],'2026-09-27');
  assert.equal(monthDays('2026-10-01').at(-1),'2026-10-31');
  assert.equal(monthDays('2026-08-01').length,42);
  assert.equal(monthDays('2028-02-01').includes('2028-02-29'),true);
  assert.equal(shiftMonth('2026-12-01',1),'2027-01-01');
  assert.equal(shiftMonth('2026-01-01',-1),'2025-12-01');
});
test('Singapore date differs from UTC near midnight',()=>assert.equal(singaporeDate('2026-10-17T17:00:00Z'),'2026-10-18'));
const row=(start,end)=>({url:'https://app.notion.com/p/Name-123456781234123412341234567890ab?pvs=25',text:`1:00 PM\nName\n${start}\n${end}`});
test('Notion import repairs approved stale end dates and handles midnight without altering valid dates',()=>{
  const stale=parseSource(row('October 19, 2026 1:00 PM','October 15, 2026 3:00 PM'));
  assert.equal(stale.ends_at,'2026-10-19T07:00:00.000Z');
  assert.equal(stale.corrected,true);
  const night=parseSource(row('October 25, 2026 10:00 PM','October 25, 2026 12:00 AM'));
  assert.equal(night.ends_at,'2026-10-25T16:00:00.000Z');
  const valid=parseSource(row('October 21, 2026 8:30 PM','October 22, 2026 12:00 AM'));
  assert.equal(valid.corrected,false);
  assert.equal(valid.telegram_user_id,0);
  assert.equal(valid.id,'12345678-1234-1234-1234-1234567890ab');
});
test('import conflict detection permits back-to-back but catches true overlaps',()=>{
  const a=parseSource(row('October 19, 2026 1:00 PM','October 19, 2026 3:00 PM'));
  const b=parseSource(row('October 19, 2026 3:00 PM','October 19, 2026 5:00 PM'));
  assert.equal(overlaps(a,b),false);
  assert.equal(overlaps(a,{...b,starts_at:'2026-10-19T06:00:00Z'}),true);
});
