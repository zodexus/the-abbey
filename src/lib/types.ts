export type TembusuHouse = 'Shan' | 'Ora' | 'Gaja' | 'Tancho' | 'Ponya';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_out' | 'cancelled';

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "14:00")
  endTime: string; // HH:mm (e.g. "16:00")
  residentName: string;
  telegramHandle: string; // e.g. "@mezyyy"
  nusEmail?: string;
  tembusuHouse?: string;
  bandName?: string; // Backwards compatible
  purpose: string; // "Practice for / Purpose"
  equipmentNeeds?: string[];
  needsDoorUnlock: boolean; // Whether resident needs someone to unlock the Abbey
  status: BookingStatus;
  doorOpenerHandle?: string; // Telegram handle of Abbey Licensed member who claimed opening
  doorClaimedAt?: string;
  checkoutPhotoUrl?: string; // Photo sent via telegram
  checkoutTimestamp?: string;
  createdAt: string;
}

export interface LicensedUser {
  id: string;
  telegramHandle: string;
  nusEmail?: string;
  name: string;
  house?: string;
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

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  subtype: string;
  workingQty: number;
  spoiltQty?: number;
  notes?: string;
  isAvailable: boolean;
}

export interface RoomCheckoutPhoto {
  id: string;
  bookingId?: string;
  residentName: string;
  telegramHandle: string;
  photoUrl: string;
  timestamp: string;
  notes?: string;
}

export interface RecurringEquipmentLoan {
  id?: string;
  groupName: string;
  schedule: string;
  equipmentList: string[];
  notes?: string;
  dayOfWeek?: string;
  timeRange?: string;
  items?: string[];
}

export interface EquipmentLoan {
  id: string;
  requesterName: string; // Full Name
  telegramHandle: string; // Telegram Handle
  committee: 'CSC' | 'House' | 'Interest Group' | 'Student Band' | 'No' | string;
  purpose: string; // Purpose of loan
  eventName?: string; // Backwards compatibility alias for purpose
  basePackage: 'Set A' | 'Set B' | 'Set C' | 'None';
  equipmentList: string[]; // Specific inventory items / additional items requested
  additionalNotes?: string;
  startDate: string; // Start Date of Loan
  startTime?: string; // Start Time of Loan
  endDate: string; // End Date of Loan
  endTime?: string; // End Time of Loan
  agreedToTerms: boolean;
  status: 'pending' | 'approved' | 'collected' | 'returned' | 'rejected';
  createdAt: string;
}

export interface TelegramSimulatedMessage {
  id: string;
  bookingId?: string;
  chatType: 'direct_message_qm' | 'group_abbey_licensed' | 'direct_message_resident';
  recipientHandle?: string;
  title: string;
  body: string;
  timestamp: string;
  hasDoorOpenAction?: boolean;
  scheduledDispatchNote?: string;
  claimedBy?: string;
}
