'use client';

import React, { useState, useEffect } from 'react';
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
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Sync initial data from Supabase / API
  useEffect(() => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') {
            setIsSupabaseConnected(true);
            setLoans(data.loans || []);
          } else if (Array.isArray(data.loans) && data.loans.length > 0) {
            setLoans(data.loans);
          }
        }
      })
      .catch(() => {});

    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') {
            setIsSupabaseConnected(true);
            setBookings(data.bookings || []);
          } else if (Array.isArray(data.bookings) && data.bookings.length > 0) {
            setBookings(data.bookings);
          }
        }
      })
      .catch(() => {});

    fetch('/api/licenses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') {
            setIsSupabaseConnected(true);
            setLicensedUsers(data.users || []);
          } else if (Array.isArray(data.users) && data.users.length > 0) {
            setLicensedUsers(data.users);
          }
        }
      })
      .catch(() => {});
  }, []);

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

    // Persist booking to server / Supabase
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.booking) {
          setBookings((prev) => [
            data.booking,
            ...prev.filter((b) => b.id !== newId && b.id !== data.booking.id),
          ]);
        }
      })
      .catch((err) => console.error('Failed to persist booking:', err));

    const gearList =
      bookingData.equipmentNeeds.length > 0
        ? bookingData.equipmentNeeds.join(', ')
        : 'Standard backline';

    // 1. Direct Message to Quartermaster (@mezyyy)
    const qmMsg: TelegramSimulatedMessage = {
      id: `tg-qm-${Date.now()}`,
      bookingId: newId,
      chatType: 'direct_message_qm',
      recipientHandle: '@mezyyy',
      title: 'DM to Quartermaster (@mezyyy)',
      body: `🎸 *New Abbey Booking*\n\n📅 Date: ${bookingData.date}\n⏰ Time: ${bookingData.startTime} – ${bookingData.endTime}\n👤 Booker: ${bookingData.residentName} (${bookingData.telegramHandle})\n🏠 House: ${bookingData.tembusuHouse}\n👥 Band: ${bookingData.bandName} (${bookingData.purpose})\n🔌 Gear: ${gearList}\n🔑 Door Unlock: ${bookingData.needsDoorUnlock ? 'Requested (Dispatches to Abbey Licensed 12h prior)' : 'Not needed (Resident has door access)'}`,
      timestamp: 'Just now',
    };

    const newMessages: TelegramSimulatedMessage[] = [qmMsg];

    // 2. If door unlock is checked, schedule message to Abbey Licensed group 12 hours prior
    if (bookingData.needsDoorUnlock) {
      const groupMsg: TelegramSimulatedMessage = {
        id: `tg-grp-${Date.now()}`,
        bookingId: newId,
        chatType: 'group_abbey_licensed',
        title: 'Abbey Licensed Group (Door Duty)',
        body: `🎸 *Abbey Booking — Unlock Needed*\n\n📅 Date: ${bookingData.date}\n⏰ Time: ${bookingData.startTime} – ${bookingData.endTime}\n👤 Booker: ${bookingData.residentName} (${bookingData.telegramHandle})\n🏠 House: ${bookingData.tembusuHouse}\n👥 Band: ${bookingData.bandName}\n🔌 Gear: ${gearList}\n\nCan anyone in hall unlock the Abbey?`,
        timestamp: 'Scheduled (12h prior)',
        scheduledDispatchNote: 'Dispatches 12 hours before slot',
        hasDoorOpenAction: true,
      };
      newMessages.push(groupMsg);
    }

    setTelegramMessages((prev) => [...newMessages, ...prev]);
    setUnreadTelegramCount((prev) => prev + newMessages.length);
    setIsBookingModalOpen(false);
    setIsTelegramDrawerOpen(true);
  };

  // When an Abbey Licensed member taps "I can open the door"
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
    setLicensedUsers((prev) => [newUser, ...prev]);

    fetch('/api/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => {});
  };

  const handleBatchAddLicenses = (newUsers: Array<Omit<LicensedUser, 'id'>>) => {
    const entries: LicensedUser[] = newUsers.map((u, i) => ({
      ...u,
      id: `lic-${Date.now()}-${i}`,
    }));
    setLicensedUsers((prev) => [...entries, ...prev]);

    fetch('/api/licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: entries }),
    }).catch(() => {});
  };

  const handleDeleteLicense = (id: string) => {
    setLicensedUsers((prev) => prev.filter((u) => u.id !== id));

    fetch(`/api/licenses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const handleRequestLoan = (loanData: Omit<EquipmentLoan, 'id' | 'createdAt' | 'status'>) => {
    const newLoan: EquipmentLoan = {
      ...loanData,
      id: `loan-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setLoans((prev) => [newLoan, ...prev]);

    // Send direct Telegram notification to Quartermaster (@mezyyy)
    const newMsg: TelegramSimulatedMessage = {
      id: `msg-${Date.now()}`,
      chatType: 'direct_message_qm',
      recipientHandle: '@mezyyy',
      title: '📦 New Equipment Loan Request',
      body:
        `📦 *New Equipment Loan Request*\n\n` +
        `👤 *Requester:* ${newLoan.requesterName} (${newLoan.telegramHandle})\n` +
        `🏛️ *Committee:* ${newLoan.committee || 'Resident'}\n` +
        `🎯 *Purpose:* ${newLoan.purpose}\n` +
        `📅 *Dates:* ${newLoan.startDate} to ${newLoan.endDate}\n` +
        `📦 *Package:* ${newLoan.basePackage}\n` +
        `🔧 *Gear:* ${newLoan.equipmentList.join('; ')}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTelegramMessages((prev) => [newMsg, ...prev]);
    setUnreadTelegramCount((c) => c + 1);

    // Persist to server / Supabase
    fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.loan) {
          setLoans((prev) => [
            data.loan,
            ...prev.filter((l) => l.id !== newLoan.id && l.id !== data.loan.id),
          ]);
        }
      })
      .catch((err) => console.error('Failed to persist loan to API:', err));
  };

  return (
    <div className="min-h-screen bg-[#101216] text-stone-200 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
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
            onBatchAddLicenses={handleBatchAddLicenses}
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
            onBatchAddLicenses={handleBatchAddLicenses}
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
