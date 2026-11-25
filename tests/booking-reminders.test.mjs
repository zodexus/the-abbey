import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { advanceReminderText, deliverBookingReminders, quietHours, resetReminderText } from '../src/lib/booking-reminders.ts';
const sql = readFileSync(new URL('../scripts/booking-reminders.sql', import.meta.url), 'utf8');
const at = value => Date.parse(`2030-01-${value}+08:00`);

test('reminder timing, durable queue, rescheduling, cancellation and private scheduler tickets', async t => {
  const pg = new PGlite({ extensions: { btree_gist } });
  const query = (sql, args = []) => pg.query(sql, args);
  try {
    await pg.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await pg.exec(readFileSync(new URL('../scripts/abbey.sql',import.meta.url),'utf8'));
    await pg.exec(sql);
    await pg.exec(sql);
    const insert = async (start, end, status = 'confirmed', user = 123) => (await query(
      'insert into abbey_bookings(request_id,telegram_user_id,resident_name,purpose,starts_at,ends_at,status) values ($1,$2,\'Resident\',\'Practice\',$3,$4,$5) returning id',
      [randomUUID(),user,`2030-01-${start}+08:00`,`2030-01-${end}+08:00`,status])).rows[0].id;
    const take = async date => (await query('select * from abbey_take_booking_reminders($1)',[`2030-01-${date}+08:00`])).rows;
    await t.test('12-hour timing adjusts only midnight through 07:59 in Singapore', async () => {
      for (const [start, due] of [['02T18:00:00','02T08:00:00'],['03T13:00:00','03T08:00:00'],['04T21:00:00','04T09:00:00'],['05T07:00:00','04T19:00:00'],['06T12:00:00','06T08:00:00'],['07T20:00:00','07T08:00:00']]) {
        const value=(await query('select abbey_reminder_time($1) as due',[`2030-01-${start}+08:00`])).rows[0].due;
        assert.equal(Date.parse(value),at(due));
      }
    });
    const id = await insert('02T18:00:00','02T20:00:00');
    await t.test('only linked confirmed sessions schedule messages, and reruns preserve the queue', async () => {
      await insert('03T18:00:00','03T20:00:00','pending');
      await insert('04T18:00:00','04T20:00:00','confirmed',0);
      assert.equal((await query('select * from abbey_booking_reminders')).rows.length,2);
      await pg.exec(sql);
      assert.equal((await query('select * from abbey_booking_reminders')).rows.length,2);
      assert.equal((await take('02T07:59:00')).length,0);
    });
    let lease;
    await t.test('leases prevent simultaneous claims and recover after a worker stops', async () => {
      lease=(await take('02T08:00:00'))[0];
      assert.equal(lease.kind,'before');
      assert.equal((await take('02T08:01:00')).length,0);
      const retry=(await take('02T08:02:00'))[0];
      assert.notEqual(retry.lease_id,lease.lease_id);
      const stale=await query('update abbey_booking_reminders set sent_at=now() where id=$1 and lease_id=$2 returning id',[lease.id,lease.lease_id]);
      assert.equal(stale.rows.length,0);
      await query('update abbey_booking_reminders set sent_at=$2,locked_until=null where id=$1',[lease.id,'2030-01-02T08:02:00+08:00']);
      assert.equal((await take('02T08:05:00')).length,0);
    });
    await t.test('rescheduling recalculates unsent messages and never resends a sent reminder', async () => {
      await query("update abbey_bookings set starts_at='2030-01-02T21:00:00+08:00',ends_at='2030-01-02T23:00:00+08:00' where id=$1",[id]);
      const rows=(await query('select * from abbey_booking_reminders where booking_id=$1 order by kind',[id])).rows;
      assert.ok(rows[0].sent_at);
      assert.equal(Date.parse(rows[1].due_at),at('02T23:00:00'));
      assert.equal((await take('02T20:00:00')).length,0);
      assert.equal((await take('02T23:00:00'))[0].kind,'reset');
      await query("update abbey_booking_reminders set sent_at='2030-01-02T23:00:00+08:00' where booking_id=$1 and kind='reset'",[id]);
    });
    await t.test('late approvals respect quiet hours; expired advance reminders are skipped', async () => {
      const late=await insert('03T09:00:00','03T10:00:00');
      const early=await insert('03T07:00:00','03T08:00:00');
      assert.equal((await take('03T01:00:00')).length,0);
      const rows=await take('03T08:00:00');
      assert.ok(rows.some(r=>r.booking_id===late && r.kind==='before'));
      assert.ok(rows.some(r=>r.booking_id===early && r.kind==='reset'));
      assert.ok(!rows.some(r=>r.booking_id===early && r.kind==='before'));
    });
    await t.test('cancellation invalidates an already claimed reminder', async () => {
      const cancelled=await insert('04T21:00:00','04T23:00:00');
      const claimed=(await take('04T09:00:00')).find(r=>r.booking_id===cancelled);
      await query("update abbey_bookings set status='cancelled' where id=$1",[cancelled]);
      const rows=(await query('select * from abbey_booking_reminders where booking_id=$1',[cancelled])).rows;
      assert.ok(rows.every(r=>r.skipped_at && !r.lease_id));
      assert.ok(!rows.some(r=>r.lease_id===claimed.lease_id));
    });
    await t.test('cron dispatch generates short-lived one-use tickets and reruns update one job', async () => {
      await pg.exec(`create schema net; create schema cron; create schema if not exists extensions;
        create table net.test_requests(id bigint generated always as identity, url text, headers jsonb, body jsonb);
        create table cron.job(name text primary key, schedule text, command text);
        create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer)
          returns bigint language sql as 'insert into net.test_requests(url,headers,body) values ($1,$2,$3) returning id';
        create function cron.schedule(text,text,text) returns bigint language plpgsql as $$begin
          insert into cron.job values ($1,$2,$3) on conflict(name) do update set schedule=excluded.schedule,command=excluded.command;
          return 1; end$$;`);
      const cronSql=readFileSync(new URL('../scripts/booking-reminders-cron.sql',import.meta.url),'utf8').replace(/^create extension[^;]+;/gm,'');
      await pg.exec(cronSql);
      await pg.exec(cronSql);
      assert.equal((await query('select * from cron.job')).rows.length,1);
      await query('select abbey_private.dispatch_booking_reminders()');
      const request=(await query('select * from net.test_requests')).rows[0];
      assert.equal(request.url,'https://the-abbey.vercel.app/api/reminders');
      assert.match(request.headers.Authorization,/^Bearer [a-f0-9]{64}$/);
      const ticket=request.headers.Authorization.slice(7);
      assert.equal((await query('select abbey_claim_reminder_run($1) as ok',[ticket])).rows[0].ok,true);
      assert.equal((await query('select abbey_claim_reminder_run($1) as ok',[ticket])).rows[0].ok,false);
      await pg.exec('set role service_role');
      await assert.rejects(query('select abbey_private.dispatch_booking_reminders()'),/permission denied/);
      await pg.exec('reset role');
    });
    await t.test('tickets are private, expire, and can be consumed only once', async () => {
      for (const role of ['anon','authenticated']) {
        await pg.exec(`set role ${role}`);
        await assert.rejects(query('select * from abbey_booking_reminders'),/permission denied/);
        await assert.rejects(query("select abbey_claim_reminder_run('bad')"),/permission denied/);
        await assert.rejects(query('select * from abbey_private.reminder_runs'),/permission denied/);
        await pg.exec('reset role');
      }
      await query("insert into abbey_private.reminder_runs values(sha256(convert_to('valid','UTF8')),now()+interval '2 minutes'),(sha256(convert_to('expired','UTF8')),now()-interval '1 minute')");
      await pg.exec('set role service_role');
      for(const [token,expected] of [['wrong',false],['expired',false],['valid',true],['valid',false]]) {
        assert.equal((await query('select abbey_claim_reminder_run($1) as ok',[token])).rows[0].ok,expected);
      }
      await pg.exec('reset role');
    });
  } finally { await pg.close(); }
});

const booking={status:'confirmed',telegram_user_id:123,starts_at:'2030-01-02T18:00:00+08:00',ends_at:'2030-01-02T20:00:00+08:00'};
const reminder={...booking,id:'r',booking_id:'b',kind:'before',recipient:123,lease_id:'lease',attempts:1};
function worker(overrides={}) {
  const sent=[],finished=[];
  const deps={take:async()=>[reminder],booking:async()=>booking,send:async(...args)=>{sent.push(args);},finish:async(...args)=>{finished.push(args);},now:()=>at('02T08:00:00'),...overrides};
  return {deps,sent,finished};
}
test('advance text uses actual time remaining and reset text preserves all checklist exceptions',()=>{
  assert.match(advanceReminderText(booking,at('02T08:00:00')),/10 hours/);
  assert.match(advanceReminderText(booking,at('02T16:30:00')),/1 hour 30 minutes/);
  assert.match(advanceReminderText(booking,at('02T17:45:00')),/15 minutes/);
  assert.match(resetReminderText,/except those connected to the keys/);
  assert.match(resetReminderText,/uniform loops slightly larger than your palm/);
  assert.match(resetReminderText,/except the one powering the microphone dry box/);
  assert.match(resetReminderText,/@mezyyy/);
  assert.equal(quietHours(at('02T00:00:00')),true);
  assert.equal(quietHours(at('02T07:59:00')),true);
  assert.equal(quietHours(at('02T08:00:00')),false);
});
test('worker rechecks cancellation, recipient and schedule immediately before delivery',async()=>{
  for(const changed of [null,{...booking,status:'cancelled'},{...booking,telegram_user_id:0},{...booking,starts_at:'2030-01-03T18:00:00+08:00'}]) {
    const w=worker({booking:async()=>changed});
    assert.equal((await deliverBookingReminders(w.deps)).skipped,1);
    assert.equal(w.sent.length,0);
  }
});
test('worker delivers approved text, retries failures with backoff, and respects quiet hours',async()=>{
  const success=worker();
  assert.equal((await deliverBookingReminders(success.deps)).sent,1);
  assert.equal(success.sent[0][0],123);
  assert.match(success.sent[0][1],/Abbey Licensed/);
  const failed=worker({send:async()=>{throw new Error('sensitive upstream URL');}});
  assert.equal((await deliverBookingReminders(failed.deps)).failed,1);
  assert.equal(failed.finished[0][1].last_error,'Delivery failed; retry scheduled.');
  assert.equal(Date.parse(failed.finished[0][1].locked_until),at('02T08:01:00'));
  const quiet=worker({now:()=>at('02T01:00:00')});
  await deliverBookingReminders(quiet.deps);
  assert.equal(quiet.sent.length,0);
  const reset=worker({take:async()=>[{...reminder,kind:'reset'}],now:()=>at('03T01:00:00')});
  await deliverBookingReminders(reset.deps);
  assert.equal(reset.sent[0][1],resetReminderText);
});
