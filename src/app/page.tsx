'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CalendarView from '@/components/CalendarView';
import BookingModal from '@/components/BookingModal';
import TelegramDutyDrawer from '@/components/TelegramDutyDrawer';
import EquipmentLoanSection from '@/components/EquipmentLoanSection';
import TechPortal from '@/components/TechPortal';
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
import { Lock, KeyRound, AlertCircle, Sparkles, Send } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'loans' | 'tech_portal'>('schedule');
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [licensedUsers, setLicensedUsers] = useState<LicensedUser[]>(INITIAL_LICENSED_USERS);
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>(INITIAL_RECURRING_SLOTS);
  const [loans, setLoans] = useState<EquipmentLoan[]>(INITIAL_EQUIPMENT_LOANS);
  const [telegramMessages, setTelegramMessages] = useState<TelegramSimulatedMessage[]>(INITIAL_TELEGRAM_MESSAGES);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isTelegramDrawerOpen, setIsTelegramDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; startTime: string } | null>(null);
  const [unreadTelegramCount, setUnreadTelegramCount] = useState(0);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Tech Member Auth state
  const [isTechAuthenticated, setIsTechAuthenticated] = useState(false);
  const [techPasscode, setTechPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Check persisted tech auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('abbey_tech_auth');
      if (savedAuth === 'true') {
        setIsTechAuthenticated(true);
      }
    }
  }, []);

  const refreshLoans = () => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.loans)) {
          setLoans(data.loans);
        }
      })
      .catch(() => {});
  };

  const refreshLicenses = () => {
    fetch('/api/licenses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setLicensedUsers(data.users);
        }
      })
      .catch(() => {});
  };

  const refreshBookings = () => {
    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
      })
      .catch(() => {});
  };

  // Sync initial live data from Supabase
  useEffect(() => {
    fetch('/api/loans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') setIsSupabaseConnected(true);
          if (Array.isArray(data.loans)) setLoans(data.loans);
        }
      })
      .catch(() => {});

    fetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') setIsSupabaseConnected(true);
          if (Array.isArray(data.bookings)) setBookings(data.bookings);
        }
      })
      .catch(() => {});

    fetch('/api/licenses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.source === 'supabase') setIsSupabaseConnected(true);
          if (Array.isArray(data.users)) setLicensedUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  // When a student requests a booking slot
  const handleConfirmBooking = (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    const newId = `book-${Date.now()}`;
    const newBooking: Booking = {
      ...bookingData,
      id: newId,
      status: 'pending', // Pending Quartermaster approval!
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

    // Simulated Telegram message to QM
    const qmMsg: TelegramSimulatedMessage = {
      id: `tg-qm-${Date.now()}`,
      bookingId: newId,
      chatType: 'direct_message_qm',
      recipientHandle: '@mezyyy',
      title: '🎸 Booking Request Sent to QM (@mezyyy)',
      body:
        `🎸 *New Abbey Booking Request*\n\n` +
        `📅 Date: ${bookingData.date}\n` +
        `⏰ Time: ${bookingData.startTime} – ${bookingData.endTime}\n` +
        `👤 Booker: ${bookingData.residentName} (${bookingData.telegramHandle})\n` +
        `🎯 Purpose: ${bookingData.purpose}\n` +
        `🔑 Needs Unlock: ${bookingData.needsDoorUnlock ? 'Yes (will notify group chat)' : 'No (has door access)'}\n\n` +
        `Status: Pending QM Approval`,
      timestamp: 'Just now',
    };

    setTelegramMessages((prev) => [qmMsg, ...prev]);
    setUnreadTelegramCount((c) => c + 1);
    setIsBookingModalOpen(false);
    setIsTelegramDrawerOpen(true);
  };

  // Door claim handler
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

    setTelegramMessages((prev) =>
      prev.map((m) =>
        m.bookingId === bookingId
          ? {
              ...m,
              claimedBy: claimerHandle,
              body: `${m.body}\n\n✅ *DOOR CLAIMED BY:* ${claimerHandle}`,
            }
          : m
      )
    );
  };

  // Checkout photo handler
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
      title: '📦 Loan Request Sent to QM (@mezyyy)',
      body:
        `📦 *New Equipment Loan Request*\n\n` +
        `👤 Requester: ${newLoan.requesterName} (${newLoan.telegramHandle})\n` +
        `🏛️ Committee: ${newLoan.committee || 'Resident'}\n` +
        `🎯 Purpose: ${newLoan.purpose}\n` +
        `📅 Dates: ${newLoan.startDate} to ${newLoan.endDate}\n` +
        `📦 Package: ${newLoan.basePackage}\n` +
        `🔧 Gear: ${newLoan.equipmentList.join('; ')}\n\n` +
        `Status: Pending QM Approval`,
      timestamp: 'Just now',
    };

    setTelegramMessages((prev) => [newMsg, ...prev]);
    setUnreadTelegramCount((c) => c + 1);

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
      .catch((err) => console.error('Failed to persist loan:', err));
  };

  // Tech passcode check
  const handleTechLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = techPasscode.trim().toLowerCase();
    if (clean === 'abbeytech' || clean === 'admin' || clean === 'mezyyy') {
      setIsTechAuthenticated(true);
      setPasscodeError(false);
      localStorage.setItem('abbey_tech_auth', 'true');
    } else {
      setPasscodeError(true);
    }
  };

  const handleTechLogout = () => {
    setIsTechAuthenticated(false);
    localStorage.removeItem('abbey_tech_auth');
    setActiveTab('schedule');
  };

  return (
    <div className="min-h-screen bg-[#101216] text-stone-200 flex flex-col font-sans">
      {/* Navbar with 2 public pages + Tech Portal button */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
        isTechAuthenticated={isTechAuthenticated}
        onOpenBookingModal={() => {
          setSelectedSlot(null);
          setIsBookingModalOpen(true);
        }}
        onToggleTelegramDrawer={() => {
          setIsTelegramDrawerOpen(!isTelegramDrawerOpen);
          setUnreadTelegramCount(0);
        }}
        unreadTelegramCount={unreadTelegramCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* Page 1: Schedule */}
        {activeTab === 'schedule' && (
          <CalendarView
            bookings={bookings}
            recurringSlots={recurringSlots}
            onSelectSlot={handleSelectSlot}
            isConcertMode={false}
          />
        )}

        {/* Page 2: Equipment Loaning */}
        {activeTab === 'loans' && (
          <EquipmentLoanSection
            licensedUsers={licensedUsers}
            onRequestLoan={handleRequestLoan}
          />
        )}

        {/* Hidden Page: Tech Member Portal */}
        {activeTab === 'tech_portal' && (
          <div>
            {!isTechAuthenticated ? (
              <div className="max-w-md mx-auto mt-12 bg-[#14171d] border border-[#242933] rounded-2xl p-6 shadow-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-100">
                    Tech Team Portal Login
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Sign in to edit equipment logs, inspect check-out photos, review loans, and amend the licensing registry.
                  </p>
                </div>

                <form onSubmit={handleTechLogin} className="space-y-3 pt-2">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                    <input
                      type="password"
                      placeholder="Enter tech team passcode..."
                      value={techPasscode}
                      onChange={(e) => {
                        setTechPasscode(e.target.value);
                        setPasscodeError(false);
                      }}
                      required
                      className="w-full bg-[#181c24] border border-[#282d38] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  {passcodeError && (
                    <div className="text-red-400 text-[11px] flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Incorrect passcode. Check with Quartermaster (@mezyyy).</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-stone-200 hover:bg-white text-stone-900 font-semibold text-xs transition-colors shadow-sm"
                  >
                    Enter Tech Portal
                  </button>
                  <p className="text-[10px] text-stone-500 pt-1">
                    Default access: <code className="text-stone-400 bg-stone-900 px-1 py-0.5 rounded">abbeytech</code>
                  </p>
                </form>
              </div>
            ) : (
              <TechPortal
                onLogout={handleTechLogout}
                licensedUsers={licensedUsers}
                onRefreshLicenses={refreshLicenses}
                loans={loans}
                onRefreshLoans={refreshLoans}
              />
            )}
          </div>
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
        isConcertMode={false}
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
