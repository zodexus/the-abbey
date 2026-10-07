import { NextResponse } from 'next/server';
import { Booking } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  formatDoorOpeningMessage,
  formatQMDMMessage,
  sendTelegramMessage,
  TELEGRAM_QM_CHAT_ID,
  TELEGRAM_ABBEY_LICENSED_CHAT_ID,
} from '@/lib/telegram';
import { INITIAL_BOOKINGS } from '@/lib/store';

let fallbackBookings: Booking[] = [...INITIAL_BOOKINGS];

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        const bookings: Booking[] = data.map((d: any) => ({
          id: d.id,
          date: d.date,
          startTime: d.start_time,
          endTime: d.end_time,
          residentName: d.resident_name,
          telegramHandle: d.telegram_handle,
          nusEmail: d.nus_email || '',
          tembusuHouse: d.tembusu_house || 'Shan',
          bandName: d.band_name || 'Band Session',
          purpose: d.purpose || 'Band Practice',
          equipmentNeeds: d.equipment_needs || [],
          needsDoorUnlock: Boolean(d.needs_door_unlock),
          status: d.status || 'confirmed',
          doorOpenerHandle: d.door_opener_handle || undefined,
          doorClaimedAt: d.door_claimed_at || undefined,
          createdAt: d.created_at || new Date().toISOString(),
        }));
        return NextResponse.json({ success: true, source: 'supabase', bookings });
      }
    }

    return NextResponse.json({ success: true, source: 'in-memory', bookings: fallbackBookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      startTime,
      endTime,
      residentName,
      telegramHandle,
      nusEmail,
      tembusuHouse,
      bandName,
      purpose,
      equipmentNeeds,
      needsDoorUnlock,
    } = body;

    // Basic validation
    if (!date || !startTime || !endTime || !residentName || !telegramHandle) {
      return NextResponse.json({ error: 'Missing required booking fields.' }, { status: 400 });
    }

    const cleanHandle = telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`;
    const newId = `book-${Date.now()}`;

    const newBooking: Booking = {
      id: newId,
      date,
      startTime,
      endTime,
      residentName,
      telegramHandle: cleanHandle,
      nusEmail: nusEmail || '',
      tembusuHouse: tembusuHouse || 'Shan',
      bandName: bandName || 'Independent Session',
      purpose: purpose || 'Band Practice',
      equipmentNeeds: equipmentNeeds || [],
      needsDoorUnlock: Boolean(needsDoorUnlock),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('bookings').insert({
        id: newId,
        date,
        start_time: startTime,
        end_time: endTime,
        resident_name: residentName,
        telegram_handle: cleanHandle,
        nus_email: nusEmail || '',
        tembusu_house: tembusuHouse || 'Shan',
        band_name: bandName || 'Independent Session',
        purpose: purpose || 'Band Practice',
        equipment_needs: equipmentNeeds || [],
        needs_door_unlock: Boolean(needsDoorUnlock),
        status: 'confirmed',
      });

      if (error) {
        console.error('Supabase booking insert error:', error.message);
      }
    } else {
      fallbackBookings = [newBooking, ...fallbackBookings];
    }

    // 1. Send DM to Quartermaster (@mezyyy)
    if (TELEGRAM_QM_CHAT_ID) {
      const qmMsg = formatQMDMMessage(newBooking);
      await sendTelegramMessage(TELEGRAM_QM_CHAT_ID, qmMsg);
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 500 });
  }
}
