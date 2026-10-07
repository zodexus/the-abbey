import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RoomCheckoutPhoto } from '@/lib/types';

// In-memory fallback if Supabase not used for checkouts
let cachedCheckouts: RoomCheckoutPhoto[] = [
  {
    id: 'chk-1',
    bookingId: 'book-prev-1',
    residentName: 'Marcus Koh',
    telegramHandle: '@marcuskoh',
    photoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    timestamp: 'Yesterday, 18:05',
    notes: 'Bandroom clean, amps switched off, cables coiled on hooks.',
  },
  {
    id: 'chk-2',
    bookingId: 'book-prev-2',
    residentName: 'Sarah Chen',
    telegramHandle: '@sarah_arts',
    photoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    timestamp: '2 days ago, 21:10',
    notes: 'Mics returned to case, floor clear.',
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      checkouts: cachedCheckouts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCheckout: RoomCheckoutPhoto = {
      id: `chk-${Date.now()}`,
      bookingId: body.bookingId,
      residentName: body.residentName || 'Resident',
      telegramHandle: body.telegramHandle || '@resident',
      photoUrl: body.photoUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      timestamp: body.timestamp || 'Just now',
      notes: body.notes || 'End-of-session room check-out',
    };

    cachedCheckouts = [newCheckout, ...cachedCheckouts];

    return NextResponse.json({
      success: true,
      checkout: newCheckout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
