import { NextResponse } from 'next/server';
import { LicensedUser } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_LICENSED_USERS } from '@/lib/store';

let fallbackLicenses: LicensedUser[] = [...INITIAL_LICENSED_USERS];

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
          house: d.house || 'Shan',
          licenseAY: d.license_ay || 'AY26/27',
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
      house: u.house || 'Shan',
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
    const added: LicensedUser[] = formatted.map((f: any) => ({
      id: f.id,
      telegramHandle: f.telegram_handle,
      nusEmail: f.nus_email,
      name: f.name,
      house: f.house,
      licenseAY: f.license_ay,
      status: f.status,
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
