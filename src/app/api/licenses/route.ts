import { NextResponse } from 'next/server';
import { LicensedUser } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_LICENSED_USERS } from '@/lib/store';

let fallbackLicenses: LicensedUser[] = [...INITIAL_LICENSED_USERS];

function formatDateRegistered(dateStr?: string, handle?: string): string {
  if (handle && handle.toLowerCase().includes('mezyyy')) {
    return '19/08/2026';
  }
  if (!dateStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${now.getFullYear()}`;
  }
  if (dateStr.includes('/')) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return '19/08/2026';
  }
}

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('licensed_users')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        const users: LicensedUser[] = data.map((d: any) => ({
          id: d.id,
          telegramHandle: d.telegram_handle,
          nusEmail: d.nus_email || '',
          name: d.name,
          licenseAY: d.license_ay || 'AY26/27',
          dateRegistered: formatDateRegistered(d.created_at, d.telegram_handle),
          status: d.status || 'active',
        }));
        return NextResponse.json({ success: true, source: 'supabase', users });
      }
    }

    return NextResponse.json({ success: true, source: 'in-memory', users: fallbackLicenses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch licenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { users } = body; // Can be array of users or single user

    const userList = Array.isArray(users) ? users : [body];

    const formatted = userList.map((u: any, idx: number) => ({
      id: u.id || `lic-${Date.now()}-${idx}`,
      telegram_handle: u.telegramHandle.startsWith('@') ? u.telegramHandle : `@${u.telegramHandle}`,
      nus_email: u.nusEmail || '',
      name: u.name,
      license_ay: u.licenseAY || 'AY26/27',
      status: u.status || 'active',
    }));

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('licensed_users')
        .upsert(formatted, { onConflict: 'telegram_handle' })
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length });
    }

    // Fallback
    const added: LicensedUser[] = userList.map((f: any, idx: number) => ({
      id: f.id || `lic-${Date.now()}-${idx}`,
      telegramHandle: f.telegramHandle.startsWith('@') ? f.telegramHandle : `@${f.telegramHandle}`,
      nusEmail: f.nusEmail,
      name: f.name,
      licenseAY: f.licenseAY || 'AY26/27',
      dateRegistered: f.dateRegistered || formatDateRegistered(undefined, f.telegramHandle),
      status: f.status || 'active',
    }));
    fallbackLicenses = [...added, ...fallbackLicenses];

    return NextResponse.json({ success: true, count: added.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save licenses' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing license ID' }, { status: 400 });
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('licensed_users').delete().eq('id', id);
      if (error) throw error;
    } else {
      fallbackLicenses = fallbackLicenses.filter((l) => l.id !== id);
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete license' }, { status: 500 });
  }
}
