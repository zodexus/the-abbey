'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import CalendarView from '@/components/CalendarView';
import BookingModal from '@/components/BookingModal';
import TelegramDutyDrawer from '@/components/TelegramDutyDrawer';
import EquipmentLoanSection from '@/components/EquipmentLoanSection';
import AdminDashboard from '@/components/AdminDashboard';
import {
  Booking,
  LicensedUser,
  RecurringSlot,
  EquipmentLoan,
  TelegramSimulatedMessage,
} from '@/lib/types';
import {
  INITIAL_BOOKINGS,
  INITIAL_LICENSED_USERS,
  INITIAL_RECURRING_SLOTS,
  INITIAL_EQUIPMENT_LOANS,
  INITIAL_TELEGRAM_MESSAGES,
} from '@/lib/store';
import { Key, Send, ShieldCheck, Sparkles } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'loans' | 'licenses' | 'admin'>('calendar');
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [licensedUsers, setLicensedUsers] = useState<LicensedUser[]>(INITIAL_LICENSED_USERS);
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>(INITIAL_RECURRING_SLOTS);
  const [loans, setLoans] = useState<EquipmentLoan[]>(INITIAL_EQUIPMENT_LOANS);
  const [telegramMessages, setTelegramMessages] = useState<TelegramSimulatedMessage[]>(INITIAL_TELEGRAM_MESSAGES);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isTelegramDrawerOpen, setIsTelegramDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string } | null>(null);
  const [isConcertMode, setIsConcertMode] = useState(false);
  const [unreadTelegramCount, setUnreadTelegramCount] = useState(1);

  // When a resident books on the calendar
  const handleConfirmBooking = (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    const newId = `book-${Date.now()}`;
    const newBooking: Booking = {
      ...bookingData,
      id: newId,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Create automatic Telegram alert message to Arts CC group chat
    const gearList =
      bookingData.equipmentNeeds.length > 0
        ? bookingData.equipmentNeeds.join(', ')
        : 'Standard backline';

    const newTelegramMsg: TelegramSimulatedMessage = {
      id: `tg-${Date.now()}`,
      bookingId: newId,
      chatType: 'group_arts_cc',
      title: 'Arts CC Door Duty Dispatch',
      body: `🎸 *NEW ABBEY BOOKING CONFIRMED*\n📅 Date: ${bookingData.date}\n⏰ Time: ${bookingData.startTime} – ${bookingData.endTime}\n👤 Booker: ${bookingData.residentName} (${bookingData.telegramHandle})\n🏠 House: ${bookingData.tembusuHouse}\n👥 Band: ${bookingData.bandName} (${bookingData.purpose})\n🔌 Gear: ${gearList}\n\n❓ *Arts CC Duty: Who is in hall and can unlock the Abbey?*`,
      timestamp: 'Just now',
      hasDoorOpenAction: true,
    };

    setTelegramMessages((prev) => [newTelegramMsg, ...prev]);
    setUnreadTelegramCount((prev) => prev + 1);
    setIsBookingModalOpen(false);
    setIsTelegramDrawerOpen(true); // Open drawer immediately so user sees the Telegram action in motion!
  };

  // When an Arts CC member taps "I can open the door"
  const handleClaimDoor = (bookingId: string, claimerHandle: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              doorOpenerHandle: claimerHandle,
              doorClaimedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : b
      )
    );

    // Update Telegram message state
    setTelegramMessages((prev) =>
      prev.map((m) =>
        m.bookingId === bookingId
          ? {
              ...m,
              claimedBy: claimerHandle,
              body: `${m.body}\n\n✅ *CLAIMED BY:* ${claimerHandle} (Door Opener)`,
            }
          : m
      )
    );
  };

  // When resident sends checkout room photo
  const handleCheckoutPhoto = (bookingId: string, photoUrl: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'checked_out',
              checkoutPhotoUrl: photoUrl,
              checkoutTimestamp: new Date().toISOString(),
            }
          : b
      )
    );
  };

  const handleSelectSlot = (date: string, startTime: string) => {
    setSelectedSlot({ date, startTime });
    setIsBookingModalOpen(true);
  };

  const handleAddLicense = (user: Omit<LicensedUser, 'id'>) => {
    const newUser: LicensedUser = {
      ...user,
      id: `lic-${Date.now()}`,
    };
    setLicensedUsers((prev) => [...prev, newUser]);
  };

  const handleDeleteLicense = (id: string) => {
    setLicensedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleRequestLoan = (loanData: Omit<EquipmentLoan, 'id' | 'createdAt' | 'status'>) => {
    const newLoan: EquipmentLoan = {
      ...loanData,
      id: `loan-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setLoans((prev) => [newLoan, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBookingModal={() => {
          setSelectedSlot(null);
          setIsBookingModalOpen(true);
        }}
        onToggleTelegramDrawer={() => {
          setIsTelegramDrawerOpen(!isTelegramDrawerOpen);
          setUnreadTelegramCount(0);
        }}
        isConcertMode={isConcertMode}
        unreadTelegramCount={unreadTelegramCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'calendar' && (
          <CalendarView
            bookings={bookings}
            recurringSlots={recurringSlots}
            onSelectSlot={handleSelectSlot}
            isConcertMode={isConcertMode}
          />
        )}

        {activeTab === 'loans' && (
          <EquipmentLoanSection loans={loans} onRequestLoan={handleRequestLoan} />
        )}

        {activeTab === 'licenses' && (
          <AdminDashboard
            bookings={bookings}
            licensedUsers={licensedUsers}
            onAddLicense={handleAddLicense}
            onDeleteLicense={handleDeleteLicense}
            isConcertMode={isConcertMode}
            onToggleConcertMode={() => setIsConcertMode(!isConcertMode)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            bookings={bookings}
            licensedUsers={licensedUsers}
            onAddLicense={handleAddLicense}
            onDeleteLicense={handleDeleteLicense}
            isConcertMode={isConcertMode}
            onToggleConcertMode={() => setIsConcertMode(!isConcertMode)}
          />
        )}
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        defaultDate={selectedSlot?.date}
        defaultStartTime={selectedSlot?.startTime}
        licensedUsers={licensedUsers}
        onConfirmBooking={handleConfirmBooking}
        isConcertMode={isConcertMode}
      />

      {/* Telegram Live Duty & Check-out Simulation Drawer */}
      <TelegramDutyDrawer
        isOpen={isTelegramDrawerOpen}
        onClose={() => setIsTelegramDrawerOpen(false)}
        bookings={bookings}
        messages={telegramMessages}
        onClaimDoor={handleClaimDoor}
        onCheckoutPhoto={handleCheckoutPhoto}
      />
    </div>
  );
}
