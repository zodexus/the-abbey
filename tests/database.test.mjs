import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';

test('booking and registry database integration', async t => {
  const pg = new PGlite({ extensions: { btree_gist } });
  try {
    await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table licensed_users(telegram_handle text, name text, status text);
      insert into licensed_users values('@Existing_User','Existing resident','active');
      grant all on licensed_users to anon, authenticated;`);
    const migration = readFileSync(new URL('../scripts/abbey.sql', import.meta.url), 'utf8');
    await pg.exec(migration);
    await pg.exec(migration);
    const query = (sql, values=[]) => pg.query(sql,values);
    const claim = (id, handle) => query('select * from abbey_claim_license($1,$2)',[id,handle]);
    const request = (user,start,end,requestId=randomUUID()) => query('select * from abbey_request($1,$2,$3,$4,$5,$6,$7)',[user,requestId,'Resident','Rehearsal',start,end,999]);
    const decide = (id,status,actor=999) => query('select * from abbey_decide($1,$2,$3,$4)',[id,status,actor,999]);
    let bookingId;
    await t.test('imports licenses once and denies anonymous table/RPC access', async()=> {
      assert.equal((await query('select * from abbey_licenses')).rows.length,1);
      await pg.exec('set role anon');
      await assert.rejects(query('select * from abbey_licenses'),/permission denied/);
      await assert.rejects(query('select * from licensed_users'),/permission denied/);
      await assert.rejects(claim(1,'existing_user'),/permission denied/);
      await pg.exec('reset role');
    });
    await t.test('binds approved handle to stable ID and prevents username takeover', async()=> {
      assert.equal((await claim(1,'existing_user')).rows.length,1);
      assert.equal((await claim(2,'existing_user')).rows.length,0);
      assert.equal((await claim(1,'new_username')).rows.length,1);
      assert.equal((await claim(3,'unknown_user')).rows.length,0);
      await query("insert into abbey_licenses(handle,name,telegram_user_id) values ('second_user','Second',2)");
    });
    const start = new Date(Date.now()+86400000).toISOString();
    const middle = new Date(Date.now()+90000000).toISOString();
    const end = new Date(Date.now()+93600000).toISOString();
    await t.test('request retries create one booking and one notification', async()=> {
      const id = randomUUID();
      bookingId = (await request(1,start,end,id)).rows[0].id;
      assert.equal((await request(1,start,end,id)).rows[0].id,bookingId);
      assert.equal((await query('select * from abbey_notifications')).rows.length,1);
    });
    await t.test('approval prevents overlapping bookings', async()=> {
      const second = (await request(2,middle,end)).rows[0];
      await decide(bookingId,'confirmed');
      await assert.rejects(decide(second.id,'confirmed'),e=>e.code==='23P01');
      assert.equal((await query('select status from abbey_bookings where id=$1',[second.id])).rows[0].status,'pending');
      await assert.rejects(request(2,start,end),/slot booked/);
      await decide(second.id,'rejected');
      await decide(second.id,'rejected');
      const decisions = (await query("select chat_id, body from abbey_notifications where body like 'Abbey booking confirmed%' or body like 'Abbey booking rejected%'")).rows;
      assert.equal(decisions.length,2, 'retry must not queue a second decision message');
      assert.ok(decisions.some(n => Number(n.chat_id) === 1 && n.body.startsWith('Abbey booking confirmed\n')));
      assert.ok(decisions.some(n => Number(n.chat_id) === 2 && n.body.startsWith('Abbey booking rejected\n')));
      await assert.rejects(decide(second.id,'confirmed'),/already handled/);
    });
    await t.test('only QM cancels confirmed bookings; owners can withdraw pending requests', async()=> {
      await assert.rejects(decide(bookingId,'cancelled',2),/not allowed/);
      const before = (await query('select count(*)::int as count from abbey_notifications')).rows[0].count;
      await assert.rejects(decide(bookingId,'cancelled',1),/not allowed/);
      assert.equal((await query('select status from abbey_bookings where id=$1',[bookingId])).rows[0].status,'confirmed');
      assert.equal((await query('select count(*)::int as count from abbey_notifications')).rows[0].count,before);
      await decide(bookingId,'cancelled',999);
      const pending = (await request(1,new Date(Date.parse(end)+14400000).toISOString(),new Date(Date.parse(end)+18000000).toISOString())).rows[0];
      await assert.rejects(decide(pending.id,'cancelled',2),/not allowed/);
      await decide(pending.id,'cancelled',1);
      await decide(pending.id,'cancelled',1);
      await assert.rejects(decide(pending.id,'confirmed'),/already handled/);
      const next = (await request(2,start,end)).rows[0];
      await assert.rejects(decide(next.id,'confirmed',2),/not allowed/);
      await decide(next.id,'confirmed');
      const adjacent = (await request(1,end,new Date(Date.parse(end)+3600000).toISOString())).rows[0];
      await decide(adjacent.id,'confirmed');
    });
    await t.test('revocation survives username changes and migration reruns', async()=> {
      await query("update abbey_licenses set active=false where telegram_user_id=1");
      await query("insert into abbey_licenses(handle) values('another_handle')");
      assert.equal((await claim(1,'another_handle')).rows.length,0);
      await pg.exec(migration);
      assert.equal((await claim(1,'existing_user')).rows.length,0);
      const next = (await request(1,new Date(Date.parse(end)+7200000).toISOString(),new Date(Date.parse(end)+10800000).toISOString())).rows[0];
      await assert.rejects(decide(next.id,'confirmed'),/license revoked/);
    });
    await t.test('notification claims are leased to avoid simultaneous delivery', async()=> {
      const batch = (await query('select * from abbey_take_notifications()')).rows;
      assert.ok(batch.length>0);
      const next = (await query('select * from abbey_take_notifications()')).rows;
      assert.ok(next.every(n=>!batch.some(b=>b.id===n.id)));
    });
    await t.test('group registration supports accounts without usernames and never overwrites revocations', async()=> {
      const register = () => query("insert into abbey_licenses(handle,name,telegram_user_id,active) values ('telegram:4','Group member',4,true) on conflict (telegram_user_id) do nothing");
      await register();
      assert.equal((await claim(4,'')).rows.length,1);
      await query('update abbey_licenses set active=false where telegram_user_id=4');
      await register();
      assert.equal((await claim(4,'')).rows.length,0);
      assert.equal((await query('select active from abbey_licenses where telegram_user_id=4')).rows[0].active,false);
    });
  } finally { await pg.close(); }
});
