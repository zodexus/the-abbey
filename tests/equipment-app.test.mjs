import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { equipmentStaff, loanDates, overdue, outstanding } from '../src/lib/equipment.ts';
const schema=readFileSync(new URL('../scripts/equipment-app.sql',import.meta.url),'utf8');
test('inventory app enforces owner/tech/member roles, dated reservations and physical handovers',async t=>{
 const pg=new PGlite({extensions:{btree_gist}});
 const q=(sql,args=[])=>pg.query(sql,args);
 const rpc=async(name,args)=>(await q(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;
 try {
  await pg.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await pg.exec(readFileSync(new URL('../scripts/abbey.sql',import.meta.url),'utf8'));
  await pg.exec(readFileSync(new URL('../scripts/inventory.sql',import.meta.url),'utf8'));
  await pg.exec(schema);await pg.exec(schema);
  await q("insert into abbey_licenses(handle,name,telegram_user_id) values ('borrower_a','A',101),('borrower_b','B',102),('nickel_tang','Tech',201)");
  await t.test('named tech role binds once to signed user ID and survives username changes',async()=>{
   assert.equal(await rpc('abbey_claim_tech_admin',[201,'nickel_tang']),true);
   assert.equal(await rpc('abbey_claim_tech_admin',[202,'nickel_tang']),false);
   assert.equal(await rpc('abbey_claim_tech_admin',[201,'new_username']),true);
   assert.equal(await rpc('abbey_equipment_staff',[201,999]),true);
   assert.equal(await rpc('abbey_equipment_staff',[101,999]),false);
   await q("update abbey_tech_admins set active=false where telegram_user_id=201");
   assert.equal(await rpc('abbey_claim_tech_admin',[201,'nickel_tang']),false);
   await q("update abbey_tech_admins set active=true where telegram_user_id=201");
  });
  const data={name:'Test cables',category:'Cables',unit:'each',tracking_mode:'bulk',loanable:true,working:3,limited:0,faulty:0,untested:0};
  let item,assetItem,assetId;
  await t.test('only owner edits/finalises inventory; metadata alone never verifies stock',async()=>{
   await assert.rejects(rpc('abbey_equipment_save',[201,999,null,data,true]),/Only the quartermaster/);
   await assert.rejects(rpc('abbey_equipment_save',[101,999,null,data,true]),/Only the quartermaster/);
   item=await rpc('abbey_equipment_save',[999,999,null,data,false]);
   let row=(await q('select * from abbey_inventory_items where id=$1',[item])).rows[0];
   assert.equal(row.verification_status,'needs_stocktake');
   await assert.rejects(rpc('abbey_equipment_save',[999,999,item,{...data,working:null},true]),/all four/);
   await rpc('abbey_equipment_save',[999,999,item,data,true]);
   assert.equal((await q('select verification_status from abbey_inventory_items where id=$1',[item])).rows[0].verification_status,'verified');
   const individual={...data,name:'Microphone',tracking_mode:'individual',working:1,assets:[{asset_tag:'ABY-A-TEST',condition:'working'}]};
   assetItem=await rpc('abbey_equipment_save',[999,999,null,individual,true]);
   assetId=(await q('select id from abbey_inventory_assets where item_id=$1',[assetItem])).rows[0].id;
   await assert.rejects(rpc('abbey_equipment_save',[999,999,assetItem,{...individual,working:2},true]),/match the physical counts/);
   assert.equal((await q('select count(*)::int as n from abbey_inventory_assets where item_id=$1',[assetItem])).rows[0].n,1);
  });
  const start=new Date(Date.now()+8*86400000).toISOString(),end=new Date(Date.parse(start)+86400000).toISOString();
  const request=(who,items=[{item_id:item,quantity:2}],s=start,e=end,id=randomUUID())=>rpc('abbey_equipment_request',[who,999,id,'Borrower','borrower','Performance','Student Band',s,e,items,'abbey-loan-2026-11']);
  const decide=(actor,id,action)=>rpc('abbey_equipment_decide',[actor,999,id,action]);
  let loan,second,line;
  await t.test('requests enforce lead time, duration, licence, stock and accepted terms',async()=>{
   await assert.rejects(request(101,undefined,new Date(Date.now()+86400000).toISOString(),end),/7 days/);
   await assert.rejects(request(101,undefined,start,new Date(Date.parse(start)+73*3600000).toISOString()),/3 days/);
   await assert.rejects(request(777),/access denied/);
   await assert.rejects(request(101,[{item_id:item,quantity:4}]),/Insufficient/);
   const unverified=await rpc('abbey_equipment_save',[999,999,null,{...data,name:'Old inventory'},false]);
   await assert.rejects(request(101,[{item_id:unverified,quantity:1}]),/verified/);
   const id=randomUUID();loan=await request(101,undefined,start,end,id);
   assert.equal(await request(101,undefined,start,end,id),loan);
   second=await request(102);
   assert.equal((await q("select count(*)::int as n from abbey_notifications where source_key like $1",['loan:'+loan+':request:%'])).rows[0].n,2);
   line=(await q('select id from abbey_loan_items where loan_id=$1',[loan])).rows[0].id;
  });
  await t.test('only owner approves; approval atomically reserves dates; adjacent periods remain free',async()=>{
   await assert.rejects(decide(201,loan,'approved'),/Only the quartermaster/);
   await assert.rejects(decide(102,loan,'approved'),/Only the quartermaster/);
   await decide(999,loan,'approved');await decide(999,loan,'approved');
   assert.equal(await rpc('abbey_equipment_available',[item,start,end,null]),1);
   await assert.rejects(decide(999,second,'approved'),/Insufficient/);
   assert.equal(await rpc('abbey_equipment_available',[item,end,new Date(Date.parse(end)+3600000).toISOString(),null]),3);
   await assert.rejects(decide(102,loan,'cancelled'),/own loan/);
   await decide(102,second,'cancelled');
  });
  const move=(actor,id,type,qty,asset=null,condition='working',request=randomUUID())=>rpc('abbey_equipment_movement',[actor,999,request,id,type,qty,asset,condition,'Checked by staff']);
  await t.test('collection/partial returns update stock; wrong actors, over-returns and early collection fail',async()=>{
   await assert.rejects(move(101,line,'checkout',1),/Staff access/);
   await assert.rejects(move(201,line,'checkout',1),/approved loan period/);
   await q("update abbey_loans set starts_at=now()-interval '1 hour',due_at=now()+interval '1 hour' where id=$1",[loan]);
   const key=randomUUID();const id=await move(201,line,'checkout',2,null,'working',key);
   assert.equal(await move(201,line,'checkout',2,null,'working',key),id);
   assert.equal((await q('select quantity from abbey_inventory_balances where item_id=$1 and condition=\'working\'',[item])).rows[0].quantity,1);
   await assert.rejects(decide(999,loan,'closed'),/all returns/);
   await move(201,line,'return',1,null,'faulty');
   const balance=(await q('select condition,quantity from abbey_inventory_balances where item_id=$1',[item])).rows;
   assert.equal(balance.find(b=>b.condition==='faulty').quantity,1);
   await assert.rejects(move(201,line,'return',2),/exceeds outstanding/);
   await move(201,line,'return',1);
   await decide(201,loan,'closed');
   assert.equal((await q('select status from abbey_loans where id=$1',[loan])).rows[0].status,'closed');
  });
  await t.test('individual collection identifies the physical asset and returns record its condition',async()=>{
   const id=await request(101,[{item_id:assetItem,quantity:1}]);await decide(999,id,'approved');
   const assetLine=(await q('select id from abbey_loan_items where loan_id=$1',[id])).rows[0].id;
   await q("update abbey_loans set starts_at=now()-interval '1 hour',due_at=now()+interval '1 hour' where id=$1",[id]);
   await move(201,assetLine,'checkout',1,assetId);
   await assert.rejects(move(201,assetLine,'checkout',1,assetId),/exceeds approved/);
   const nextStart=new Date(Date.now()+15*86400000).toISOString(), nextEnd=new Date(Date.now()+16*86400000).toISOString();
   assert.equal(await rpc('abbey_equipment_available',[assetItem,nextStart,nextEnd,null]),1);
   await q("update abbey_loans set due_at=now()-interval '1 minute' where id=$1",[id]);
   assert.equal(await rpc('abbey_equipment_available',[assetItem,nextStart,nextEnd,null]),0);
   await move(201,assetLine,'return',1,assetId,'limited');
   assert.equal((await q('select whereabouts,condition from abbey_inventory_assets where id=$1',[assetId])).rows[0].condition,'limited');
   await decide(201,id,'closed');
  });
  await t.test('expired uncollected requests can be withdrawn or rejected without blocking later loans',async()=>{
   const cancelled=await request(101,[{item_id:item,quantity:1}]);
   const rejected=await request(102,[{item_id:item,quantity:1}]);
   await q("update abbey_loans set starts_at=now()-interval '2 days',due_at=now()-interval '1 day' where id=any($1::uuid[])",[[cancelled,rejected]]);
   await assert.rejects(decide(999,cancelled,'approved'),/already started/);
   await decide(101,cancelled,'cancelled');
   await decide(999,rejected,'rejected');
  });
  await t.test('failed notification backoff prevents a blocked chat from starving new requests',async()=>{
   await q('update abbey_notifications set sent_at=now()');
   await q("insert into abbey_notifications(chat_id,body,next_attempt_at) values(111,'Retry later',now()+interval '1 hour'),(222,'Due now',now())");
   const rows=(await q('select * from abbey_take_notifications()')).rows;
   assert.equal(rows.length,1);assert.equal(Number(rows[0].chat_id),222);assert.equal(rows[0].attempts,1);
  });
  await t.test('catalogue sanitises serials/source data for members and anonymous access is denied',async()=>{
   const publicData=await rpc('abbey_equipment_catalogue',[start,end,false]);
   assert.ok(publicData.every(i=>i.assets.length===0 && !('source_data' in i)));
   const staffData=await rpc('abbey_equipment_catalogue',[start,end,true]);
   assert.equal(staffData.find(i=>i.id===assetItem).assets.length,1);
   for(const role of ['anon','authenticated']) {
    await pg.exec(`set role ${role}`);
    await assert.rejects(q('select * from abbey_tech_admins'),/permission denied/);
    await assert.rejects(rpc('abbey_equipment_catalogue',[null,null,true]),/permission denied/);
    await assert.rejects(decide(999,loan,'approved'),/permission denied/);
    await pg.exec('reset role');
   }
  });
 } finally {await pg.close();}
});
test('equipment client helpers distinguish outstanding stock and enforce loan policy',()=>{
 assert.equal(equipmentStaff('member'),false);assert.equal(equipmentStaff('tech'),true);
 assert.throws(()=>loanDates('bad','bad'),/Choose collection/);
 const line={abbey_loan_movements:[{movement_type:'checkout',quantity:3},{movement_type:'return',quantity:1}]};
 assert.equal(outstanding(line),2);
 assert.equal(overdue({due_at:'2000-01-01',abbey_loan_items:[line]}),true);
});
