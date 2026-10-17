import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function parseDate(value) {
  const match = /^(\w+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/.exec(value.trim());
  if (!match || !months.includes(match[1])) throw new Error(`Unrecognized date: ${value}`);
  const [,month,day,year,hour,minute,period] = match;
  return new Date(`${year}-${String(months.indexOf(month)+1).padStart(2,'0')}-${day.padStart(2,'0')}T${String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')}:${minute}:00+08:00`);
}
export function parseSource(row) {
  const parts=row.text.split('\n').map(s=>s.trim()).filter(Boolean);
  if (parts.length!==4) throw new Error(`Unexpected card format: ${row.url}`);
  const sourceId = /([0-9a-f]{32})\?/.exec(row.url)?.[1];
  if (!sourceId) throw new Error('Missing source ID');
  const id=sourceId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
  const start=parseDate(parts[2]); let end=parseDate(parts[3]);
  let corrected=false;
  if (end<=start || end-start>86400000) {
    // User approved: keep start date and the recorded end clock; roll overnight.
    const endClock=(end.getTime()+8*3600000)%86400000;
    const startDay=Math.floor((start.getTime()+8*3600000)/86400000)*86400000-8*3600000;
    end=new Date(startDay+endClock);
    if(end<=start) end=new Date(end.getTime()+86400000);
    corrected=true;
  }
  return {id,request_id:id,telegram_user_id:0,resident_name:parts[1],purpose:'Imported from Notion',starts_at:start.toISOString(),ends_at:end.toISOString(),status:'confirmed',source:row.url,corrected};
}
export const overlaps=(a,b)=>Date.parse(a.starts_at)<Date.parse(b.ends_at)&&Date.parse(a.ends_at)>Date.parse(b.starts_at);
if (process.argv[1]?.endsWith('import-notion.mjs')) {
  const source=JSON.parse(readFileSync('artifacts/notion-october-source.json','utf8'));
  const rows=source.map(parseSource);
  // The quartermaster explicitly removed this overlapping reservation.
  const excluded=rows.filter(r=>r.resident_name==='Kit Yee' && r.starts_at==='2026-10-22T12:00:00.000Z');
  const candidates=rows.filter(r=>!excluded.includes(r));
  const conflicts=[];
  for(let i=0;i<candidates.length;i++) for(let j=i+1;j<candidates.length;j++) if(overlaps(candidates[i],candidates[j])) conflicts.push([candidates[i],candidates[j]]);
  const report={sourceCount:rows.length,corrections:rows.filter(r=>r.corrected),excluded,conflicts,candidates};
  writeFileSync('artifacts/notion-import-plan.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({source:rows.length,corrected:report.corrections.length,excluded:excluded.length,conflicts:conflicts.map(pair=>pair.map(r=>({name:r.resident_name,start:r.starts_at,end:r.ends_at,id:r.id})))},null,2));
  if (process.argv.includes('--apply')) {
    process.loadEnvFile('.env.local');
    const { createClient } = await import('@supabase/supabase-js');
    const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const {data:existing,error}=await client.from('abbey_bookings').select('*').order('starts_at').limit(10000);
    if(error) throw new Error(`Could not read existing bookings (${error.code}).`);
    if (!existsSync('artifacts/bookings-before-notion-import.json')) writeFileSync('artifacts/bookings-before-notion-import.json',JSON.stringify(existing,null,2),{flag:'wx'});
    // Conflicting historical entries await the quartermaster's explicit selection.
    const conflictIds=new Set(conflicts.flat().map(r=>r.id));
    const eligible=candidates.filter(r=>!conflictIds.has(r.id));
    const inserted=[],skipped=[],blocked=[];
    for (const row of eligible) {
      if(existing.some(b=>b.id===row.id)) { skipped.push(row.id); continue; }
      if(existing.some(b=>b.status==='confirmed' && overlaps(b,row))) { blocked.push(row); continue; }
      const {source,corrected,...booking}=row;
      const result=await client.from('abbey_bookings').upsert(booking,{onConflict:'id',ignoreDuplicates:true});
      if(result.error) throw new Error(`Import failed for ${row.id} (${result.error.code}).`);
      inserted.push(row.id);
    }
    const receipt={inserted,skipped,blocked,deferred:[...conflictIds],excluded};
    writeFileSync('artifacts/notion-import-receipt.json',JSON.stringify(receipt,null,2));
    console.log(JSON.stringify({inserted:inserted.length,alreadyPresent:skipped.length,blocked:blocked.length,deferred:conflictIds.size,excluded:excluded.length}));
  }
}
