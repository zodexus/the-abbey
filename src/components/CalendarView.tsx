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
    <div className="space-y-4">
      {/* Clean Top Bar */}
      <div className="flex items-center justify-between bg-[#16191f] border border-[#262b34] p-3.5 rounded-xl">
        <div>
          <h1 className="text-base font-semibold text-stone-100">Abbey Schedule</h1>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSelectedDayOffset((prev) => prev - 7)}
            className="p-1.5 rounded-lg bg-[#1f242d] hover:bg-[#282e3a] text-stone-300 border border-[#2d3340] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSelectedDayOffset(0)}
            className="px-2.5 py-1 rounded-lg bg-[#1f242d] hover:bg-[#282e3a] text-stone-300 text-xs font-medium border border-[#2d3340] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDayOffset((prev) => prev + 7)}
            className="p-1.5 rounded-lg bg-[#1f242d] hover:bg-[#282e3a] text-stone-300 border border-[#2d3340] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="bg-[#14171c] border border-[#232731] rounded-xl overflow-hidden shadow-sm">
        {/* Day Header Row */}
        <div className="grid grid-cols-8 border-b border-[#232731] bg-[#181b22] text-xs text-stone-400">
          <div className="p-2.5 text-center border-r border-[#232731] font-medium flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-stone-500" />
            <span>Time</span>
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-2.5 text-center border-r last:border-r-0 border-[#232731] ${
                day.isToday ? 'bg-amber-400/5 text-amber-200' : ''
              }`}
            >
              <div className="font-medium text-[11px] text-stone-400">{day.dayName}</div>
              <div className={`text-sm font-semibold mt-0.5 ${day.isToday ? 'text-amber-200' : 'text-stone-200'}`}>
                {day.dayNumber} {day.monthName}
              </div>
            </div>
          ))}
        </div>

        {/* Schedule Matrix Rows */}
        <div className="divide-y divide-[#1e222b]">
          {HOURS.map((hour) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;

            return (
              <div key={hour} className="grid grid-cols-8 min-h-[68px] transition-colors">
                {/* Time Label Column */}
                <div className="p-2 border-r border-[#232731] bg-[#16191f]/50 text-stone-400 text-xs font-mono flex items-center justify-center">
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
                        className="p-1.5 border-r last:border-r-0 border-[#232731] bg-[#1a1724] border-l-2 border-l-purple-400/50 flex flex-col justify-between"
                      >
                        <div className="text-[10px] text-purple-300/80 font-medium">
                          {recurring.assignedGroup}
                        </div>
                        <div className="text-xs font-medium text-stone-200 truncate" title={recurring.title}>
                          {recurring.title}
                        </div>
                        <div className="text-[9px] text-stone-500">Fixed Session</div>
                      </div>
                    );
                  }

                  if (booking) {
                    const isCheckedOut = booking.status === 'checked_out';
                    const isOpeningClaimed = Boolean(booking.doorOpenerHandle);

                    return (
                      <div
                        key={day.dateStr}
                        className={`p-1.5 border-r last:border-r-0 border-[#232731] flex flex-col justify-between transition-all ${
                          isCheckedOut
                            ? 'bg-[#152119] border-l-2 border-l-emerald-600/50'
                            : 'bg-[#1a1f27] border-l-2 border-l-amber-400/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-stone-200 truncate">
                            {booking.bandName}
                          </span>
                          <span className="text-[9px] text-stone-400">
                            {booking.tembusuHouse}
                          </span>
                        </div>

                        <div className="text-[10px] text-stone-400 truncate">
                          {booking.residentName}
                        </div>

                        {/* Door Opener / Access Status */}
                        <div className="mt-0.5 flex items-center justify-between text-[10px]">
                          {booking.needsDoorUnlock ? (
                            isOpeningClaimed ? (
                              <span className="flex items-center gap-1 text-emerald-300/90 truncate" title={`Door claimed by ${booking.doorOpenerHandle}`}>
                                <Key className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate">{booking.doorOpenerHandle}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-300/80">
                                <Key className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>Unlock needed</span>
                              </span>
                            )
                          ) : (
                            <span className="text-stone-500 text-[9px]">Has door access</span>
                          )}

                          {isCheckedOut && (
                            <span className="text-emerald-400 text-[9px]">✓ Out</span>
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
                      className="group p-1.5 border-r last:border-r-0 border-[#232731] hover:bg-[#1a1e26] flex flex-col items-center justify-center transition-colors text-stone-600 hover:text-stone-300"
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-medium transition-opacity bg-stone-800 px-2 py-0.5 rounded text-stone-200">
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

      {/* Clean Minimal Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1a1f27] border border-amber-400/40" />
            <span className="text-[11px]">Booked</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1a1724] border border-purple-400/40" />
            <span className="text-[11px]">tKaraoke / Podcast IG</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#152119] border border-emerald-600/40" />
            <span className="text-[11px]">Checked Out</span>
          </div>
        </div>
        <div className="text-[11px] text-stone-500">Max 2 hours per booking</div>
      </div>
    </div>
  );
}
