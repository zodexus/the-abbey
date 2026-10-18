// Reads existing .env.local without printing credentials. Configuration is explicit.
import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('Missing TELEGRAM_BOT_TOKEN.'); process.exit(1); }
async function call(method, body = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!result.ok) throw new Error(`Telegram ${method} failed. Check the bot configuration.`);
  return result.result;
}
try {
  const me = await call('getMe');
  if (me.username?.toLowerCase() !== 'theabbeybot') throw new Error('The configured token does not belong to @TheAbbeyBot. No changes made.');
  console.log(`Verified bot: @${me.username}`);
  const groupId = process.env.TELEGRAM_ABBEY_LICENSED_CHAT_ID;
  if (groupId) {
    const group = await call('getChat', { chat_id: groupId });
    const membership = await call('getChatMember', { chat_id: groupId, user_id: me.id });
    console.log(`Access group: ${group.title}; bot status: ${membership.status}`);
    if (!['administrator', 'creator'].includes(membership.status)) throw new Error('Promote @TheAbbeyBot to an admin in Abbey Licensed before enabling group access.');
  }
  const info = await call('getWebhookInfo');
  console.log(`Webhook: ${info.url || 'not configured'}; pending updates: ${info.pending_update_count}`);
  console.log(`Supabase server secret: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'}`);
  if (process.argv.includes('--apply')) {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!url?.startsWith('https://') || !secret || !/^[A-Za-z0-9_-]{16,256}$/.test(secret) || !process.env.TELEGRAM_QM_CHAT_ID) throw new Error('Set an HTTPS app URL, QM ID and webhook secret (16–256 URL-safe characters) first.');
    const health = await fetch(`${url}/api/health`, { signal:AbortSignal.timeout(15000) });
    const state = await health.json();
    if (!health.ok || state.app !== 'abbey-mini-app-v1' || !state.ready) throw new Error('Deploy the new app with its database and environment configured before switching the bot.');
    await call('setWebhook', { url:`${url.replace(/\/$/,'')}/api/telegram/webhook`, secret_token:secret, allowed_updates:['message','callback_query'] });
    await call('setChatMenuButton', { menu_button:{type:'web_app',text:'Calendar',web_app:{url}} });
    await call('setMyCommands', { commands:[{command:'start',description:'Open the Abbey booking calendar'},{command:'help',description:'Booking help'}] });
    await call('setMyCommands', { scope:{type:'chat',chat_id:Number(process.env.TELEGRAM_QM_CHAT_ID)}, commands:[{command:'start',description:'Open the calendar'},{command:'pending',description:'Review pending booking requests'},{command:'sync',description:'Retry queued notifications'}] });
    console.log('Webhook, calendar menu, and commands configured. Send /start to @TheAbbeyBot.');
  } else console.log('Read-only check. After deployment, run with --apply to configure the bot.');
} catch (error) { console.error(error.message.includes(token) ? 'Telegram connection failed.' : error.message); process.exitCode = 1; }
