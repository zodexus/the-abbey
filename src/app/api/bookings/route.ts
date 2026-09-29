import { NextResponse } from 'next/server';
import { Booking } from '@/lib/types';
import { formatDoorOpeningMessage, sendTelegramMessage, TELEGRAM_ARTS_CC_CHAT_ID } from '@/lib/telegram';

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
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    bookingsState.push(newBooking);

    // Dispatch Telegram Bot Alert to Arts CC group if configured
    if (TELEGRAM_ARTS_CC_CHAT_ID) {
      const { text, inlineKeyboard } = formatDoorOpeningMessage(newBooking);
      await sendTelegramMessage(TELEGRAM_ARTS_CC_CHAT_ID, text, inlineKeyboard);
    }

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 500 });
  }
}
