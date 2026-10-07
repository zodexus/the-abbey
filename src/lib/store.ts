import { Booking, LicensedUser, RecurringSlot, EquipmentLoan, TelegramSimulatedMessage } from './types';

// Abbey Licensing Registry initial seed (Real registered data)
export const INITIAL_LICENSED_USERS: LicensedUser[] = [
  {
    id: 'lic-qm-1',
    name: 'Zhiyu (QM)',
    telegramHandle: '@mezyyy',
    nusEmail: 'zhiyu@u.nus.edu',
    licenseAY: 'AY26/27',
    dateRegistered: '19/08/2026',
    status: 'active',
  },
];

// Clean initial empty arrays for production — live data is pulled directly from Supabase
export const INITIAL_RECURRING_SLOTS: RecurringSlot[] = [];
export const INITIAL_EQUIPMENT_LOANS: EquipmentLoan[] = [];
export const INITIAL_BOOKINGS: Booking[] = [];
export const INITIAL_TELEGRAM_MESSAGES: TelegramSimulatedMessage[] = [];

// Helper to get formatted date string for today and upcoming days
export function getRelativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
