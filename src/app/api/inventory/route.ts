import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchLiveInventory, BASE_PACKAGES, RECURRING_EQUIPMENT_LOANS, STATIC_INVENTORY } from '@/lib/inventory';
import { InventoryItem } from '@/lib/types';

export async function GET() {
  try {
    let items: InventoryItem[] = [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        items = data.map((d: any) => ({
          id: d.id,
          barcode: d.barcode || '',
          name: d.name,
          category: d.category,
          subtype: d.subtype || '',
          workingQty: d.working_qty ?? 0,
          isAvailable: (d.working_qty ?? 0) > 0,
        }));
      }
    }

    // Fallback to Google Sheet or static database if Supabase not yet seeded or configured
    if (items.length === 0) {
      items = await fetchLiveInventory();
    }

    return NextResponse.json({
      success: true,
      source: isSupabaseConfigured && items.length > 0 ? 'supabase' : 'sheet/static',
      count: items.length,
      packages: BASE_PACKAGES,
      recurringLoans: RECURRING_EQUIPMENT_LOANS,
      inventory: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// Allow QM to update item quantity, mark spoilt, or update notes
export async function PATCH(request: Request) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured yet. Add environment variables to .env.local' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, working_qty, spoilt_qty, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (typeof working_qty === 'number') updatePayload.working_qty = working_qty;
    if (typeof spoilt_qty === 'number') updatePayload.spoilt_qty = spoilt_qty;
    if (typeof notes === 'string') updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('inventory')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 });
  }
}
