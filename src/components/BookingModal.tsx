'use client';

import React, { useState, useEffect } from 'react';
import { Booking, LicensedUser } from '@/lib/types';
import { X, CheckCircle2, AlertTriangle, Key, Loader2, Send } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultStartTime?: string;
  licensedUsers: LicensedUser[];
  onConfirmBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void;
  isConcertMode: boolean;
}

export default function BookingModal({
  isOpen,
  onClose,
  defaultDate,
  defaultStartTime,
  licensedUsers,
  onConfirmBooking,
  isConcertMode,
}: BookingModalProps) {
  const [date, setDate] = useState<string>(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(defaultStartTime || '14:00');
  const [durationHours, setDurationHours] = useState<number>(2); // Default max 2 hours
  const [residentName, setResidentName] = useState<string>('');
  const [telegramHandle, setTelegramHandle] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [needsDoorUnlock, setNeedsDoorUnlock] = useState<boolean>(true);

  // License verification states
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [matchedUser, setMatchedUser] = useState<LicensedUser | null>(null);

  // Sync default date/time when passed from calendar click
  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
    if (defaultStartTime) setStartTime(defaultStartTime);
  }, [defaultDate, defaultStartTime]);

  if (!isOpen) return null;

  // Calculate end time
  const [startH] = startTime.split(':').map(Number);
  const endHour = Math.min(24, startH + durationHours);
  const endTime = `${endHour.toString().padStart(2, '0')}:00`;

  // Validate telegram handle on blur (clicking away)
  const handleTelegramBlur = async () => {
    const clean = telegramHandle.trim().replace(/^@/, '');
    if (!clean) {
      setHandleStatus('idle');
      setMatchedUser(null);
      return;
    }

    setHandleStatus('checking');

    // 1. Check local licensedUsers cache first
    const directMatch = licensedUsers.find(
      (u) => u.telegramHandle.replace(/^@/, '').toLowerCase() === clean.toLowerCase()
    );

    if (directMatch) {
      setMatchedUser(directMatch);
      setHandleStatus('valid');
      if (!residentName) setResidentName(directMatch.name);
      return;
    }

    // 2. Query /api/licenses live
    try {
      const res = await fetch('/api/licenses');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        const found = data.users.find(
          (u: any) => u.telegramHandle.replace(/^@/, '').toLowerCase() === clean.toLowerCase()
        );
        if (found) {
          setMatchedUser(found);
          setHandleStatus('valid');
          if (!residentName) setResidentName(found.name);
          return;
        }
      }
    } catch (err) {
      console.error('License validation error:', err);
    }

    setHandleStatus('invalid');
    setMatchedUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramHandle || handleStatus !== 'valid') return;

    const formattedHandle = telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`;

    onConfirmBooking({
      date,
      startTime,
      endTime,
      residentName: residentName || matchedUser?.name || formattedHandle,
      telegramHandle: formattedHandle,
      purpose: purpose || 'Band Practice',
      needsDoorUnlock,
      equipmentNeeds: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14171d] border border-[#242831] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242831] bg-[#171b22]">
          <div>
            <h2 className="text-base font-semibold text-stone-100">
              Request Abbey Practice Session
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Requires AY26/27 verified license. Sent to Quartermaster for approval.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#20252e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Time & Duration Picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">Start Time</label>
              <input
                type="time"
                step="3600"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              >
                <option value={1}>1 Hour ({startTime} – {startH + 1}:00)</option>
                <option value={2}>2 Hours ({startTime} – {startH + 2}:00)</option>
              </select>
            </div>
          </div>

          {/* Telegram Handle with onBlur Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-stone-300">
                Telegram Handle <span className="text-amber-400">*</span>
              </label>
              <span className="text-[10px] text-stone-500">Validated with Abbey Registry</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="@username"
                value={telegramHandle}
                onChange={(e) => {
                  setTelegramHandle(e.target.value);
                  if (handleStatus !== 'idle') setHandleStatus('idle');
                }}
                onBlur={handleTelegramBlur}
                required
                className={`w-full bg-[#181c23] border rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none transition-colors ${
                  handleStatus === 'valid'
                    ? 'border-emerald-600/70 focus:border-emerald-500'
                    : handleStatus === 'invalid'
                    ? 'border-amber-600/70 focus:border-amber-500'
                    : 'border-[#282d38] focus:border-stone-400'
                }`}
              />
              {handleStatus === 'checking' && (
                <Loader2 className="w-4 h-4 text-stone-400 animate-spin absolute right-3 top-2.5" />
              )}
            </div>

            {/* Validation Feedback */}
            {handleStatus === 'valid' && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Verified: <strong>{matchedUser?.name || residentName}</strong> ({matchedUser?.licenseAY || 'AY26/27'})
                </span>
              </div>
            )}
            {handleStatus === 'invalid' && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Handle not found in Abbey Registry. Only licensed residents can request slots.</span>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-medium text-stone-300 mb-1">
              Full Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Tan"
              value={residentName}
              onChange={(e) => setResidentName(e.target.value)}
              required
              className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Practice for / Purpose: */}
          <div>
            <label className="block text-[11px] font-medium text-stone-300 mb-1">
              Practice for / Purpose <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acoustic band jam, vocal practice, IG rehearsal"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Door Unlock Assistance Tickbox */}
          <label className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#181c23] border border-[#282d38] cursor-pointer hover:border-[#383f4d] transition-colors">
            <input
              type="checkbox"
              checked={needsDoorUnlock}
              onChange={(e) => setNeedsDoorUnlock(e.target.checked)}
              className="mt-0.5 rounded text-amber-500 bg-[#121419] border-[#383f4d] focus:ring-0"
            />
            <div>
              <span className="text-xs font-medium text-stone-200">Require someone to help unlock the Abbey</span>
              <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                If ticked, a message will be sent to the Abbey Licensed group so an on-duty member can open the bandroom for you.
              </p>
            </div>
          </label>

          {/* Notice */}
          <div className="bg-[#181c23]/60 border border-[#262a34] rounded-lg p-2.5 text-[11px] text-stone-400">
            ℹ️ Once you click <strong>Send Request</strong>, Abbey Bot sends your request to Quartermaster (<span className="text-stone-300">@mezyyy</span>) for confirmation. You will receive a Telegram message once approved, and the slot will be added to the calendar.
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#242831]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={handleStatus !== 'valid'}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                handleStatus === 'valid'
                  ? 'bg-stone-200 hover:bg-white text-stone-950 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Send Request ({startTime} – {endTime})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
