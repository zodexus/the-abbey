import { authenticate, db, dbError, failure } from '@/lib/server';
import { AppError, normalizeHandle } from '@/lib/security';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await authenticate(request, true);
    const { data, error } = await db().from('abbey_licenses').select('id,handle,name,active,telegram_user_id').order('handle');
    if (error) dbError(error);
    return Response.json({ licenses: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    await authenticate(request, true);
    const body = await request.json();
    const handle = normalizeHandle(body.handle);
    const name = String(body.name || '').trim().slice(0, 80);
    // Upsert never clears a binding or silently reactivates a revoked account.
    const { error } = await db().from('abbey_licenses').upsert({ handle, name }, { onConflict: 'handle', ignoreDuplicates: true });
    if (error) dbError(error);
    return Response.json({ ok: true });
  } catch (e) { return failure(e); }
}
export async function PATCH(request: Request) {
  try {
    await authenticate(request, true);
    const { id, active } = await request.json();
    if (typeof id !== 'string' || typeof active !== 'boolean') throw new AppError('Invalid registry update.');
    const { error } = await db().from('abbey_licenses').update({ active }).eq('id', id);
    if (error) dbError(error);
    return Response.json({ ok: true });
  } catch (e) { return failure(e); }
}
