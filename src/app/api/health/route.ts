import { db } from '@/lib/server';
export const runtime = 'nodejs';
export async function GET() {
  let ready = false;
  try {
    const { error } = await db().from('abbey_licenses').select('id').limit(1);
    const { error: equipmentError } = await db().from('abbey_loans').select('id,abbey_loan_items(id,abbey_inventory_items(name,unit,tracking_mode),abbey_loan_movements(id))').limit(1);
    ready = !error && !equipmentError && Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_QM_CHAT_ID && process.env.TELEGRAM_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'));
  } catch { /* Return status only, never configuration details or credentials. */ }
  return Response.json({ app: 'abbey-mini-app-v1', ready }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
