'use client';

import React, { useState } from 'react';
import { Booking, RecurringSlot } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Key,
  ShieldCheck,
  Users,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';

interface CalendarViewProps {
  bookings: Booking[];
  recurringSlots: RecurringSlot[];
  onSelectSlot: (date: string, startTime: string) => void;
  isConcertMode: boolean;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09:00 to 23:00

export default function CalendarView({
  bookings,
  recurringSlots,
  onSelectSlot,
  isConcertMode,
}: CalendarViewProps) {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);

  // Generate 7 days starting from Monday of current week or today
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + selectedDayOffset);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: d.toDateString() === today.toDateString(),
      dayOfWeek: d.getDay(),
    };
  });

  const activeDay = weekDays[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161b22] border border-[#30363d] p-4 lg:p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>The Abbey Bandroom Schedule</span>
            <span className="text-xs font-normal bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tap on any vacant slot to reserve your practice session. Verified AY26/27 license required.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={() => setSelectedDayOffset((prev) => prev - 7)}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedDayOffset(0)}
            className="px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDayOffset((prev) => prev + 7)}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Handover Notice Alert */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-200/90">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-300">Quartermaster Notice:</span>
          <p>
            Please respect your booked time slot. To keep room opening smooth, Arts CC duty members are alerted automatically via Telegram. Clean up 10 mins before your session ends and reply with a photo to check out!
          </p>
        </div>
      </div>

      {/* Responsive Weekly Grid */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
        {/* Day Header Row */}
        <div className="grid grid-cols-8 border-b border-[#30363d] bg-[#0d1117]/80 text-xs text-slate-400">
          <div className="p-3 text-center border-r border-[#30363d] font-semibold flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span>Time</span>
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-3 text-center border-r last:border-r-0 border-[#30363d] ${
                day.isToday ? 'bg-amber-500/10 text-amber-300' : ''
              }`}
            >
              <div className="font-semibold uppercase tracking-wider text-[11px]">{day.dayName}</div>
              <div className={`text-base font-bold mt-0.5 ${day.isToday ? 'text-amber-400' : 'text-slate-200'}`}>
                {day.dayNumber} {day.monthName}
              </div>
            </div>
          ))}
        </div>

        {/* Schedule Matrix Rows */}
        <div className="divide-y divide-[#21262d]">
          {HOURS.map((hour) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const nextTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

            return (
              <div key={hour} className="grid grid-cols-8 min-h-[72px] transition-colors">
                {/* Time Label Column */}
                <div className="p-2 border-r border-[#30363d] bg-[#0d1117]/40 text-slate-400 text-xs font-mono flex items-center justify-center">
                  {timeStr}
                </div>

                {/* 7 Days Columns */}
                {weekDays.map((day) => {
                  // 1. Check for recurring slot (e.g. tKaraoke on Friday night)
                  const recurring = recurringSlots.find(
                    (r) =>
                      r.dayOfWeek === day.dayOfWeek &&
                      timeStr >= r.startTime &&
                      timeStr < r.endTime
                  );

                  // 2. Check for confirmed booking on this date & time
                  const booking = bookings.find(
                    (b) =>
                      b.date === day.dateStr &&
                      b.status !== 'cancelled' &&
                      timeStr >= b.startTime &&
                      timeStr < b.endTime
                  );

                  if (recurring) {
                    return (
                      <div
                        key={day.dateStr}
                        className="p-1.5 border-r last:border-r-0 border-[#30363d] bg-purple-950/20 border-l-2 border-l-purple-500 flex flex-col justify-between"
                      >
                        <div className="text-[10px] font-semibold text-purple-300 uppercase tracking-wide">
                          Recurring IG
                        </div>
                        <div className="text-xs font-bold text-white truncate" title={recurring.title}>
                          {recurring.title}
                        </div>
                        <div className="text-[10px] text-purple-300/80 truncate">
                          {recurring.assignedGroup}
                        </div>
                      </div>
                    );
                  }

                  if (booking) {
                    const isCheckedOut = booking.status === 'checked_out';
                    const isOpeningClaimed = Boolean(booking.doorOpenerHandle);

                    return (
                      <div
                        key={day.dateStr}
                        className={`p-1.5 border-r last:border-r-0 border-[#30363d] flex flex-col justify-between transition-all ${
                          isCheckedOut
                            ? 'bg-emerald-950/20 border-l-2 border-l-emerald-500'
                            : 'bg-amber-950/30 border-l-2 border-l-amber-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-amber-300 truncate">
                            {booking.bandName}
                          </span>
                          <span className="text-[9px] bg-[#21262d] text-slate-300 px-1 py-0.5 rounded">
                            {booking.tembusuHouse}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-200 font-medium truncate mt-0.5">
                          {booking.residentName}
                        </div>

                        {/* Door Opener Badge */}
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          {isOpeningClaimed ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-medium truncate" title={`Door duty claimed by ${booking.doorOpenerHandle}`}>
                              <Key className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{booking.doorOpenerHandle}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                              <Key className="w-3 h-3 flex-shrink-0" />
                              <span>Door: Pending</span>
                            </span>
                          )}

                          {isCheckedOut && (
                            <span className="text-emerald-400 font-medium text-[9px] bg-emerald-500/20 px-1 rounded">
                              ✓ Done
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Vacant slot available to book
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => onSelectSlot(day.dateStr, timeStr)}
                      className="group p-1.5 border-r last:border-r-0 border-[#30363d] hover:bg-amber-500/10 flex flex-col items-center justify-center transition-colors text-slate-600 hover:text-amber-300"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold transition-opacity bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/40 text-amber-300">
                        + Book
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & College Guidelines Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500" />
            <span>Reserved Slot</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-purple-900/40 border border-purple-500" />
            <span>Recurring IG Block (tKaraoke / Podcast)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-500" />
            <span>Checked Out with Photo</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-[#21262d] border border-[#30363d]" />
            <span>Vacant (Click to Book)</span>
          </div>
        </div>

        <div className="text-slate-500 text-[11px]">
          Max 2 hrs/session • 7-day advance booking window
        </div>
      </div>
    </div>
  );
}
