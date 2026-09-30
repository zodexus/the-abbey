import { NextResponse } from 'next/server';
import { Booking } from '@/lib/types';
import { formatDoorOpeningMessage, formatQMDMMessage, sendTelegramMessage, TELEGRAM_QM_CHAT_ID, TELEGRAM_ABBEY_LICENSED_CHAT_ID } from '@/lib/telegram';

// In-memory runtime storage for demo/development (can be seamlessly connected to Supabase/PostgreSQL)
let bookingsState: Booking[] = [];

export async function GET() {
  return NextResponse.json({ bookings: bookingsState });
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

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
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

    bookingsState.push(newBooking);

    // 1. Send DM to Quartermaster (@mezyyy)
    const { TELEGRAM_QM_CHAT_ID, TELEGRAM_ABBEY_LICENSED_CHAT_ID, formatQMDMMessage, formatDoorOpeningMessage } = await import('@/lib/telegram');
    if (TELEGRAM_QM_CHAT_ID) {
      const qmMsg = formatQMDMMessage(newBooking);
      await sendTelegramMessage(TELEGRAM_QM_CHAT_ID, qmMsg);
    }

    // 2. If needs unlock, note that it will be dispatched to Abbey Licensed 12h prior
    // In production cron / serverless, this queues for 12h before slot
    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 500 });
  }
}
