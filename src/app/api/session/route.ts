import { authenticate, failure } from '@/lib/server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const { user, name, admin } = await authenticate(request);
    return Response.json({ name, admin, userId: user.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return failure(e); }
}
