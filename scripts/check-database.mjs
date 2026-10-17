import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Supabase URL or server secret is missing.'); process.exit(1); }
const client = createClient(url,key,{auth:{persistSession:false}});
let failed = false;
for (const table of ['abbey_licenses','abbey_bookings','abbey_notifications']) {
  const { error, count } = await client.from(table).select('*',{count:'exact',head:true});
  if(error) { failed=true; console.log(`${table}: unavailable (${error.code || 'connection error'}). Apply scripts/abbey.sql or check credentials.`); }
  else console.log(`${table}: ready (${count} rows)`);
}
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  const publicClient = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  for (const table of ['abbey_licenses','abbey_bookings']) {
    const { error, count } = await publicClient.from(table).select('*',{count:'exact',head:true});
    const denied = Boolean(error) || count === 0;
    if (!denied) failed=true;
    console.log(`${table}: ${denied ? 'public access blocked / no exposed rows' : 'WARNING: public rows visible'}`);
  }
}
process.exitCode = failed ? 1 : 0;
