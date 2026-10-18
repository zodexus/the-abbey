import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, shiftMonth, singaporeDate } from '../src/lib/calendar.ts';
import { bookingsByDay, calendarRangeLabel, fortnightDays, halfHourTimes, slotLabel, sortBookings } from '../src/lib/calendar.ts';
import { notificationText } from '../src/lib/notification-text.ts';
test('half-hour selector covers the full day and calendar sorts actual instants',()=>{
  assert.equal(halfHourTimes.length,48);
  assert.deepEqual(halfHourTimes.slice(30,33).map(t=>t.label),['3pm','3.30pm','4pm']);
  assert.equal(halfHourTimes.at(-1).value,'23:30');
  const unsorted=[{resident_name:'Later',starts_at:'2026-10-19T08:00:00Z'},{resident_name:'Earlier',starts_at:'2026-10-19T15:30:00+08:00'}];
  assert.deepEqual(sortBookings(unsorted).map(b=>b.resident_name),['Earlier','Later']);
  assert.equal(unsorted[0].resident_name,'Later');
});
test('decision notifications clearly say approved or rejected and retain booking details',()=>{
  assert.equal(notificationText('Abbey booking confirmed\n19 Oct 2026 15:00 SGT\nPractice'),'Your Abbey booking was approved.\n19 Oct 2026 15:00 SGT\nPractice');
  assert.equal(notificationText('Abbey booking rejected\nDetails'),'Your Abbey booking was rejected.\nDetails');
  assert.equal(notificationText('Abbey booking cancelled\nDetails'),'Your Abbey booking was cancelled.\nDetails');
  assert.equal(notificationText('Abbey booking request\nDetails'),'Abbey booking request\nDetails');
});
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
test('two-week view starts on the selected date and spans exactly 14 days across month/year boundaries',()=> {
  assert.equal(fortnightDays('2026-10-18').length,14);
  assert.equal(fortnightDays('2026-10-18')[0],'2026-10-18');
  assert.equal(fortnightDays('2026-10-18').at(-1),'2026-10-31');
  assert.equal(fortnightDays('2026-10-25').at(-1),'2026-11-07');
  assert.equal(fortnightDays('2026-12-27').at(-1),'2027-01-09');
  assert.ok(fortnightDays('2028-02-25').includes('2028-02-29'));
  assert.match(calendarRangeLabel('2026-12-27'),/2026.*2027/);
});
test('pending confirmations show both dates for an overnight booking',()=> {
  const label = slotLabel('2026-10-23T23:00:00+08:00','2026-10-24T00:30:00+08:00');
  assert.match(label,/Oct 23/);
  assert.match(label,/Oct 24/);
  assert.match(label,/11:00 PM/);
  assert.match(label,/12:30 AM SGT/);
});
test('calendar groups bookings once by Singapore day, preserving overnight entries at the visible boundary',()=>{
  const bookings = [
    {id:'overnight',starts_at:'2026-09-26T15:00:00Z',ends_at:'2026-09-26T18:00:00Z'},
    {id:'ended',starts_at:'2026-09-26T14:00:00Z',ends_at:'2026-09-26T16:00:00Z'},
    {id:'morning',starts_at:'2026-09-27T01:00:00Z',ends_at:'2026-09-27T02:00:00Z'},
    {id:'next',starts_at:'2026-09-27T17:00:00Z',ends_at:'2026-09-27T18:00:00Z'},
  ];
  const grouped=bookingsByDay(bookings,'2026-09-27');
  assert.deepEqual(grouped.get('2026-09-27').map(b=>b.id),['overnight','morning']);
  assert.deepEqual(grouped.get('2026-09-28').map(b=>b.id),['next']);
  assert.equal(bookings.length,4);
});
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
