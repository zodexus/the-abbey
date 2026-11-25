import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const schema = readFileSync(new URL('../scripts/inventory.sql',import.meta.url),'utf8');
async function setup() {
  const pg = new PGlite();
  await pg.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await pg.exec(schema);
  return pg;
}

test('inventory schema enforces tracking, loan ownership of assets, stock limits and return conditions', async t => {
  const pg=await setup();
  const query=(sql,values=[])=>pg.query(sql,values);
  try {
    await pg.exec(schema);
    const individual=(await query("insert into abbey_inventory_items(item_code,name,tracking_mode,unit,verification_status) values ('I1','Microphone','individual','each','verified') returning id")).rows[0].id;
    const bulk=(await query("insert into abbey_inventory_items(item_code,name,tracking_mode,unit,verification_status) values ('I2','Adapter','bulk','each','verified') returning id")).rows[0].id;
    const asset=(await query("insert into abbey_inventory_assets(item_id,asset_tag,condition,verified_at) values ($1,'A1','working',now()) returning id",[individual])).rows[0].id;
    await query("insert into abbey_inventory_balances(item_id,condition,quantity,verified_at) values ($1,'working',5,now())",[bulk]);
    const loan=(await query("insert into abbey_loans(request_id,borrower_telegram_id,borrower_name,purpose,starts_at,due_at,status,approved_by,approved_at) values ($1,123,'Borrower','Event',now(),now()+interval '1 day','approved',999,now()) returning id",[randomUUID()])).rows[0].id;
    const line=async(item,qty)=>(await query('insert into abbey_loan_items(loan_id,item_id,requested_qty,approved_qty) values ($1,$2,$3,$3) returning id',[loan,item,qty])).rows[0].id;
    const individualLine=await line(individual,1), bulkLine=await line(bulk,3);
    const move=(line,item,asset,type,qty,condition='working')=>query('insert into abbey_loan_movements(request_id,loan_item_id,item_id,asset_id,movement_type,quantity,condition,actor_telegram_id) values ($1,$2,$3,$4,$5,$6,$7,999) returning id',[randomUUID(),line,item,asset,type,qty,condition]);

    await t.test('public callers cannot read or write inventory or loan records',async()=>{
      for(const role of ['anon','authenticated']) {
        await pg.exec(`set role ${role}`);
        await assert.rejects(query('select * from abbey_inventory_items'),/permission denied/);
        await assert.rejects(query('select * from abbey_loans'),/permission denied/);
        await assert.rejects(query("insert into abbey_inventory_items(item_code,name) values ('public','no')"),/permission denied/);
        await pg.exec('reset role');
      }
    });
    await t.test('invalid quantities, dates, tracking modes and unverified stock are rejected',async()=>{
      await assert.rejects(query("insert into abbey_inventory_balances(item_id,condition,quantity,verified_at) values ($1,'faulty',-1,now())",[bulk]));
      await assert.rejects(query("insert into abbey_inventory_assets(item_id,asset_tag) values ($1,'BULK-ASSET')",[bulk]),/tracking mode/);
      await assert.rejects(query("insert into abbey_inventory_balances(item_id,condition,quantity,verified_at) values ($1,'working',1,now())",[individual]),/tracking mode/);
      await assert.rejects(move(individualLine,individual,null,'checkout',1),/asset tag/);
      await assert.rejects(move(bulkLine,bulk,asset,'checkout',1),/must not specify an asset/);
    });
    await t.test('a physical checkout removes availability and return preserves a newly reported fault',async()=>{
      await move(individualLine,individual,asset,'checkout',1);
      assert.equal((await query('select whereabouts from abbey_inventory_assets where id=$1',[asset])).rows[0].whereabouts,'off_site');
      await assert.rejects(query("update abbey_loans set status='closed',closed_at=now() where id=$1",[loan]),/outstanding/);
      await assert.rejects(query("update abbey_inventory_items set tracking_mode='bulk' where id=$1",[individual]),/Cannot change/);
      await assert.rejects(move(individualLine,individual,asset,'checkout',1),/approved quantity/);
      await move(individualLine,individual,asset,'return',1,'faulty');
      const returned=(await query('select whereabouts,condition from abbey_inventory_assets where id=$1',[asset])).rows[0];
      assert.deepEqual(returned,{whereabouts:'on_site',condition:'faulty'});
      await assert.rejects(move(individualLine,individual,asset,'return',1),/outstanding/);
    });
    await t.test('bulk partial returns conserve quantity and do not turn faulty returns into working stock',async()=>{
      await move(bulkLine,bulk,null,'checkout',3);
      assert.equal((await query("select quantity from abbey_inventory_balances where item_id=$1 and condition='working'",[bulk])).rows[0].quantity,2);
      await move(bulkLine,bulk,null,'return',1);
      await move(bulkLine,bulk,null,'return',1,'faulty');
      await assert.rejects(move(bulkLine,bulk,null,'return',2),/outstanding/);
      await move(bulkLine,bulk,null,'lost',1,'untested');
      const balances=(await query('select condition,quantity from abbey_inventory_balances where item_id=$1 order by condition',[bulk])).rows;
      assert.deepEqual(balances,[{condition:'faulty',quantity:1},{condition:'working',quantity:3}]);
      assert.equal((await query('select count(*)::integer as n from abbey_inventory_events')).rows[0].n,6);
    });
    await t.test('movement/event history is immutable and uncounted stocktake rows stay unknown',async()=>{
      await assert.rejects(query("update abbey_loan_movements set quantity=99"),/append-only/);
      await assert.rejects(query('delete from abbey_inventory_events'),/append-only/);
      const session=(await query("insert into abbey_stocktakes(name) values ('Count') returning id")).rows[0].id;
      const row=(await query('insert into abbey_stocktake_lines(stocktake_id,item_id) values ($1,$2) returning counted_working,review_status',[session,bulk])).rows[0];
      assert.deepEqual(row,{counted_working:null,review_status:'not_checked'});
      await assert.rejects(query("update abbey_stocktake_lines set review_status='checked'"));
      await assert.rejects(query("update abbey_stocktakes set status='finalized'"));
      await pg.exec('set role service_role');
      await assert.rejects(query('delete from abbey_inventory_items'),/permission denied/);
      await assert.rejects(query("update abbey_inventory_events set reason='rewrite'"),/permission denied/);
      await pg.exec('reset role');
    });
  } finally {await pg.close();}
});

const importPath=new URL('../artifacts/inventory-import/import.sql',import.meta.url);
test('actual legacy import is repeatable and creates a catalogue review without inventing physical stock', {skip:!existsSync(importPath)},async()=>{
  const pg=await setup();
  try {
    const sql=readFileSync(importPath,'utf8');
    await pg.exec(sql);
    await pg.exec(sql);
    const count=async(table)=>(await pg.query(`select count(*)::integer as n from ${table}`)).rows[0].n;
    assert.equal(await count('abbey_inventory_items'),178);
    assert.equal(await count('abbey_stocktake_lines'),178);
    assert.equal(await count('abbey_inventory_events'),178);
    assert.equal(await count('abbey_stocktakes'),1);
    for(const table of ['abbey_inventory_assets','abbey_inventory_balances','abbey_loans','abbey_loan_items','abbey_loan_movements'])assert.equal(await count(table),0);
    assert.equal((await pg.query("select count(*)::integer as n from abbey_inventory_items where verification_status='verified'")).rows[0].n,0);
    assert.equal((await pg.query("select count(*)::integer as n from abbey_inventory_items where legacy_code='AG001'")).rows[0].n,2);
    assert.equal((await pg.query("select count(*)::integer as n from abbey_stocktake_lines where counted_working is not null or checked_at is not null")).rows[0].n,0);
    await pg.exec("update abbey_inventory_items set notes='New staff note' where item_code='ABY-I-0001'");
    await pg.exec(sql);
    assert.equal((await pg.query("select notes from abbey_inventory_items where item_code='ABY-I-0001'")).rows[0].notes,'New staff note');
  } finally {await pg.close();}
});
