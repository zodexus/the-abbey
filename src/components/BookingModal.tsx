'use client';

import React, { useState, useEffect } from 'react';
import { Booking, LicensedUser, TembusuHouse } from '@/lib/types';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Key, Send, Music } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultStartTime?: string;
  licensedUsers: LicensedUser[];
  onConfirmBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void;
  isConcertMode: boolean;
}

const HOUSES: TembusuHouse[] = ['Shan', 'Ora', 'Gaja', 'Tancho', 'Ponya'];

const EQUIPMENT_OPTIONS = [
  'Drum kit & cymbals',
  'Fender Guitar Amp (Twin Reverb)',
  'Marshall Guitar Amp',
  'Ampeg Bass Amp',
  'Yamaha Stage Piano / Keyboard',
  '2x Shure SM58 Vocal Mics',
  '4x Vocal Mics',
  'Direct Injection (DI) Boxes',
  'Music Stands (x3)',
];

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
  const [nusEmail, setNusEmail] = useState<string>('');
  const [house, setHouse] = useState<TembusuHouse>('Shan');
  const [bandName, setBandName] = useState<string>('');
  const [purpose, setPurpose] = useState<Booking['purpose']>('Band Practice');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'Drum kit & cymbals',
    '2x Shure SM58 Vocal Mics',
  ]);

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

  // Verify license against current whitelist
  const cleanHandle = telegramHandle.trim().toLowerCase();
  const cleanEmail = nusEmail.trim().toLowerCase();
  const isLicensed = licensedUsers.some(
    (u) =>
      (cleanHandle && u.telegramHandle.toLowerCase() === (cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`)) ||
      (cleanEmail && u.nusEmail.toLowerCase() === cleanEmail)
  );

  const toggleEquipment = (item: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentName || !telegramHandle) return;

    onConfirmBooking({
      date,
      startTime,
      endTime,
      residentName,
      telegramHandle: telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`,
      nusEmail,
      tembusuHouse: house,
      bandName: bandName || 'Independent Session',
      purpose,
      equipmentNeeds: selectedEquipment,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b22] border border-[#30363d] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d] bg-[#0d1117]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Book The Abbey</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                AY26/27
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated door opening dispatch & check-out tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Time & Duration Picker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                step="3600"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value={1}>1 Hour ({startTime} – {startH + 1}:00)</option>
                <option value={2}>2 Hours ({startTime} – {startH + 2}:00) [Max]</option>
              </select>
            </div>
          </div>

          {/* Booker Identification & License Verification */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Booker Verification
              </span>
              {telegramHandle && (
                <div>
                  {isLicensed ? (
                    <span className="text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> AY26/27 License Verified
                    </span>
                  ) : (
                    <span className="text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Not on License Roster
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Koh"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  required
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Telegram Handle * (Strictly Required)
                </label>
                <input
                  type="text"
                  placeholder="@username"
                  value={telegramHandle}
                  onChange={(e) => setTelegramHandle(e.target.value)}
                  required
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  NUS Email
                </label>
                <input
                  type="email"
                  placeholder="e0123456@u.nus.edu"
                  value={nusEmail}
                  onChange={(e) => setNusEmail(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Tembusu House
                </label>
                <select
                  value={house}
                  onChange={(e) => setHouse(e.target.value as TembusuHouse)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {HOUSES.map((h) => (
                    <option key={h} value={h}>
                      {h} House
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* License notice */}
            {telegramHandle && !isLicensed && (
              <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                Notice: If you missed the Sem 1 licensing briefing, you can still submit. Your booking will trigger a review with QM / Tech members before door opening.
              </p>
            )}
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Band / Artist / Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. The Tembusu Jammers"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Booking Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Band Practice">Band Practice</option>
                <option value="Concert Rehearsal">Concert Rehearsal</option>
                <option value="Solo Jam">Solo Jam / Practice</option>
                <option value="IG Rehearsal">Interest Group (IG) Rehearsal</option>
                <option value="Recording">Audio / Podcast Recording</option>
              </select>
            </div>
          </div>

          {/* Equipment Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Equipment Needed (Helps duty team check gear state)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((item) => {
                const checked = selectedEquipment.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleEquipment(item)}
                    className={`text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                      checked
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span>{item}</span>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telegram Dispatch Notice */}
          <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-sky-200">
            <Send className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-300">Automated Dispatch:</span>
              <p className="text-[11px] text-sky-200/80 mt-0.5">
                Submitting will dispatch a door-opening alert to the Arts CC Telegram group. You will receive a direct message when an Arts CC member claims your door duty.
              </p>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
            >
              Confirm Booking ({startTime} – {endTime})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
