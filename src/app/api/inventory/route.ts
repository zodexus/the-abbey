import { NextResponse } from 'next/server';
import { fetchLiveInventory, BASE_PACKAGES, RECURRING_EQUIPMENT_LOANS } from '@/lib/inventory';

export async function GET() {
  try {
    const items = await fetchLiveInventory();
    return NextResponse.json({
      success: true,
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
