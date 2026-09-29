import { Booking, LicensedUser, RecurringSlot, EquipmentLoan, TelegramSimulatedMessage } from './types';

// Pre-seeded with realistic Tembusu College data for immediate demo & local use
export const INITIAL_LICENSED_USERS: LicensedUser[] = [
  {
    id: 'lic-1',
    name: 'Marcus Koh',
    telegramHandle: '@marcuskoh',
    nusEmail: 'e0912345@u.nus.edu',
    house: 'Shan',
    licenseAY: 'AY26/27',
    status: 'active',
  },
  {
    id: 'lic-2',
    name: 'Sarah Chen',
    telegramHandle: '@sarah_arts',
    nusEmail: 'e0987654@u.nus.edu',
    house: 'Ora',
    licenseAY: 'AY26/27',
    status: 'active',
  },
  {
    id: 'lic-3',
    name: 'Benjamin Lee',
    telegramHandle: '@benjjam',
    nusEmail: 'e0955512@u.nus.edu',
    house: 'Gaja',
    licenseAY: 'AY26/27',
    status: 'active',
  },
  {
    id: 'lic-4',
    name: 'Valerie Wong',
    telegramHandle: '@valwong',
    nusEmail: 'e0899123@u.nus.edu',
    house: 'Tancho',
    licenseAY: 'AY26/27',
    status: 'active',
  },
  {
    id: 'lic-5',
    name: 'Daniel Lim',
    telegramHandle: '@daniellim_band',
    nusEmail: 'e0944111@u.nus.edu',
    house: 'Ponya',
    licenseAY: 'AY26/27',
    status: 'active',
  },
  {
    id: 'lic-6',
    name: 'Zhiyu (QM)',
    telegramHandle: '@zhiyu_qm',
    nusEmail: 'zhiyu@u.nus.edu',
    house: 'Shan',
    licenseAY: 'AY26/27',
    status: 'active',
  },
];

export const INITIAL_RECURRING_SLOTS: RecurringSlot[] = [
  {
    id: 'rec-1',
    dayOfWeek: 5, // Friday
    startTime: '20:00',
    endTime: '24:00',
    title: 'tKaraoke Weekly Session',
    assignedGroup: 'tKaraoke IG',
    notes: 'CSC head has door access; loan equipment reserved.',
  },
  {
    id: 'rec-2',
    dayOfWeek: 3, // Wednesday
    startTime: '19:00',
    endTime: '21:00',
    title: 'tGrapevine Podcast Recording',
    assignedGroup: 'tGrapevine IG',
    notes: 'Requires Shure SM7B/podcasting setup.',
  },
];

export const INITIAL_EQUIPMENT_LOANS: EquipmentLoan[] = [
  {
    id: 'loan-1',
    requesterName: 'Tancho House Committee',
    telegramHandle: '@tancho_comm',
    eventName: 'House Dinner & Acoustic Night',
    startDate: '2026-10-06',
    endDate: '2026-10-06',
    equipmentList: ['2x Wireless Mics', '1x Portable PA Speaker', '2x XLR Cables'],
    status: 'approved',
    createdAt: '2026-09-28',
  },
];

// Helper to get formatted date string for today and upcoming days
export function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'book-1',
    date: getRelativeDate(0), // Today
    startTime: '16:00',
    endTime: '18:00',
    residentName: 'Marcus Koh',
    telegramHandle: '@marcuskoh',
    nusEmail: 'e0912345@u.nus.edu',
    tembusuHouse: 'Shan',
    bandName: 'The Tembusu Jammers',
    purpose: 'Concert Rehearsal',
    equipmentNeeds: ['Drum kit', '2x Vocal Mics', 'Fender Bass Amp'],
    status: 'confirmed',
    doorOpenerHandle: '@sarah_arts',
    doorClaimedAt: '15:20',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'book-2',
    date: getRelativeDate(1), // Tomorrow
    startTime: '19:00',
    endTime: '21:00',
    residentName: 'Benjamin Lee',
    telegramHandle: '@benjjam',
    nusEmail: 'e0955512@u.nus.edu',
    tembusuHouse: 'Gaja',
    bandName: 'Midterm Melodies',
    purpose: 'Band Practice',
    equipmentNeeds: ['Drum kit', 'Keyboard Amp', 'DI Box'],
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_TELEGRAM_MESSAGES: TelegramSimulatedMessage[] = [
  {
    id: 'tg-1',
    bookingId: 'book-1',
    chatType: 'group_arts_cc',
    title: 'Arts CC Door Duty Dispatch',
    body: '🎸 *NEW ABBEY BOOKING CONFIRMED*\n📅 Date: Today\n⏰ Time: 16:00 – 18:00\n👤 Booker: Marcus Koh (@marcuskoh)\n👥 Band: The Tembusu Jammers\n🔌 Gear: Drum kit, 2x Vocal Mics, Fender Bass Amp\n\n❓ *Arts CC Duty: Who is in hall and can unlock the Abbey?*',
    timestamp: '15:15 PM',
    hasDoorOpenAction: true,
    claimedBy: '@sarah_arts',
  },
];
