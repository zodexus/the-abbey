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
    telegramHandle: '@mezyyy',
    nusEmail: 'zhiyu@u.nus.edu',
    house: 'Shan',
    licenseAY: 'AY26/27',
    status: 'active',
  },
];

// Note: Recurring IG equipment loans (tKaraoke, tGrapevine) are managed under Equipment Loans,
// so the bandroom booking calendar remains completely open for student practices.
export const INITIAL_RECURRING_SLOTS: RecurringSlot[] = [];

export const INITIAL_EQUIPMENT_LOANS: EquipmentLoan[] = [
  {
    id: 'loan-1',
    requesterName: 'Valerie Wong',
    telegramHandle: '@valerie_tancho',
    committee: 'House',
    purpose: 'Tancho House Acoustic Night',
    eventName: 'Tancho House Acoustic Night',
    basePackage: 'Set A',
    equipmentList: ['2x Shure SM58', '2x 10m XLR Cables', '1x Mackie Thump 12A Speaker'],
    startDate: '2026-10-06',
    startTime: '18:00',
    endDate: '2026-10-06',
    endTime: '22:00',
    agreedToTerms: true,
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
    needsDoorUnlock: true,
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
    needsDoorUnlock: false,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_TELEGRAM_MESSAGES: TelegramSimulatedMessage[] = [
  {
    id: 'tg-1',
    bookingId: 'book-1',
    chatType: 'direct_message_qm',
    recipientHandle: '@mezyyy',
    title: 'DM to Quartermaster (@mezyyy)',
    body: '🎸 *New Abbey Booking*\n\n📅 Date: Today\n⏰ Time: 16:00 – 18:00\n👤 Booker: Marcus Koh (@marcuskoh)\n🏠 House: Shan\n👥 Band: The Tembusu Jammers\n🔌 Gear: Drum kit, 2x Vocal Mics, Fender Bass Amp\n🔑 Needs Unlock: Yes (Door dispatch scheduled 12h before slot)',
    timestamp: '15:15',
  },
  {
    id: 'tg-2',
    bookingId: 'book-1',
    chatType: 'group_abbey_licensed',
    title: 'Abbey Licensed Group (Door Duty)',
    body: '🎸 *Abbey Booking — Unlock Needed*\n\n📅 Date: Today\n⏰ Time: 16:00 – 18:00\n👤 Booker: Marcus Koh (@marcuskoh)\n👥 Band: The Tembusu Jammers\n\nCan anyone in hall unlock the Abbey?',
    timestamp: '04:00 (12h before slot)',
    scheduledDispatchNote: 'Dispatched 12h prior to slot',
    hasDoorOpenAction: true,
    claimedBy: '@sarah_arts',
  },
];

