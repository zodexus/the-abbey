import { authenticate, failure } from '@/lib/server';
import { equipmentRole } from '@/lib/equipment-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const { user, name, admin } = await authenticate(request);
    const equipment = new URL(request.url).searchParams.get('equipment') === '1';
    return Response.json({ name, admin, userId: user.id, ...(equipment ? { equipmentRole: await equipmentRole(user) } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
