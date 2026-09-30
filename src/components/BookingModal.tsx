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
  const [needsDoorUnlock, setNeedsDoorUnlock] = useState<boolean>(true);
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
      bandName: bandName || 'Jam Session',
      purpose,
      equipmentNeeds: selectedEquipment,
      needsDoorUnlock,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#14171d] border border-[#242831] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242831] bg-[#171b22]">
          <h2 className="text-base font-semibold text-stone-100">
            Book The Abbey
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#20252e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
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
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
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
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              >
                <option value={1}>1 Hour ({startTime} – {startH + 1}:00)</option>
                <option value={2}>2 Hours ({startTime} – {startH + 2}:00)</option>
              </select>
            </div>
          </div>

          {/* Booker Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Marcus Koh"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                required
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Telegram Handle
              </label>
              <input
                type="text"
                placeholder="@username"
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value)}
                required
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Band / Group Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jammers"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Tembusu House
              </label>
              <select
                value={house}
                onChange={(e) => setHouse(e.target.value as TembusuHouse)}
                className="w-full bg-[#181c23] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
              >
                {HOUSES.map((h) => (
                  <option key={h} value={h}>
                    {h} House
                  </option>
                ))}
              </select>
            </div>
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
                If checked, a message will be sent to the Abbey Licensed group 12 hours before your slot.
              </p>
            </div>
          </label>

          {/* Equipment Selection */}
          <div>
            <label className="block text-[11px] font-medium text-stone-300 mb-1.5">
              Gear Needed
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {EQUIPMENT_OPTIONS.map((item) => {
                const checked = selectedEquipment.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleEquipment(item)}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border transition-all ${
                      checked
                        ? 'bg-[#202530] border-stone-500 text-stone-100 font-medium'
                        : 'bg-[#181c23] border-[#282d38] text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {checked && <CheckCircle2 className="w-3 h-3 text-stone-300 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-950 text-xs font-semibold shadow-sm transition-colors"
            >
              Confirm Booking ({startTime} – {endTime})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
