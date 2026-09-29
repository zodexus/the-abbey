export type TembusuHouse = 'Shan' | 'Ora' | 'Gaja' | 'Tancho' | 'Ponya';

export type BookingStatus = 'confirmed' | 'checked_out' | 'cancelled';

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "14:00")
  endTime: string; // HH:mm (e.g. "16:00")
  residentName: string;
  telegramHandle: string; // e.g. "@alextan"
  nusEmail: string; // e.g. "alex@u.nus.edu"
  tembusuHouse: TembusuHouse;
  bandName: string;
  purpose: 'Band Practice' | 'Concert Rehearsal' | 'Solo Jam' | 'IG Rehearsal' | 'Recording' | 'Other';
  equipmentNeeds: string[];
  status: BookingStatus;
  doorOpenerHandle?: string; // Telegram handle of Arts CC member who claimed opening
  doorClaimedAt?: string;
  checkoutPhotoUrl?: string; // Photo sent via telegram
  checkoutTimestamp?: string;
  createdAt: string;
}

export interface LicensedUser {
  id: string;
  telegramHandle: string;
  nusEmail: string;
  name: string;
  house: TembusuHouse;
  licenseAY: string; // e.g. "AY26/27"
  status: 'active' | 'pending' | 'expired';
}

export interface RecurringSlot {
  id: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  startTime: string;
  endTime: string;
  title: string;
  assignedGroup: string;
  notes?: string;
}

export interface EquipmentLoan {
  id: string;
  requesterName: string;
  telegramHandle: string;
  eventName: string;
  startDate: string;
  endDate: string;
  equipmentList: string[];
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  createdAt: string;
}

export interface TelegramSimulatedMessage {
  id: string;
  bookingId?: string;
  chatType: 'group_arts_cc' | 'direct_message';
  recipientHandle?: string;
  title: string;
  body: string;
  timestamp: string;
  hasDoorOpenAction?: boolean;
  claimedBy?: string;
  hasPhotoCheckoutAction?: boolean;
  photoUrl?: string;
}
