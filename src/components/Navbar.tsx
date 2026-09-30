'use client';

import React from 'react';
import { Music2, Calendar, ShieldCheck, Wrench, Send, Sparkles, Bell } from 'lucide-react';

interface NavbarProps {
  activeTab: 'calendar' | 'loans' | 'licenses' | 'admin';
  setActiveTab: (tab: 'calendar' | 'loans' | 'licenses' | 'admin') => void;
  onOpenBookingModal: () => void;
  onToggleTelegramDrawer: () => void;
  isConcertMode: boolean;
  unreadTelegramCount?: number;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenBookingModal,
  onToggleTelegramDrawer,
  isConcertMode,
  unreadTelegramCount = 0,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#121418]/90 backdrop-blur-md border-b border-[#232730] px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('calendar')}>
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700/60 flex items-center justify-center text-stone-200">
              <Music2 className="w-4 h-4 text-amber-200/80" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base text-stone-100 tracking-tight">The Abbey</span>
                <span className="text-[11px] text-stone-400">Tembusu</span>
                {isConcertMode && (
                  <span className="text-[10px] bg-rose-950/60 text-rose-300 px-2 py-0.5 rounded-full border border-rose-800/40">
                    Concert Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Action trigger */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onToggleTelegramDrawer}
              className="relative p-2 rounded-lg bg-[#1c2026] text-stone-300 border border-[#2b303b]"
              title="Telegram Feed"
            >
              <Send className="w-3.5 h-3.5 text-stone-300" />
              {unreadTelegramCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-stone-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadTelegramCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenBookingModal}
              className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-950 text-xs font-medium"
            >
              + Book
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'calendar'
                ? 'bg-[#222730] text-stone-100 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1e24]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'loans'
                ? 'bg-[#222730] text-stone-100 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1e24]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Gear Loans</span>
          </button>

          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'licenses'
                ? 'bg-[#222730] text-stone-100 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1e24]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Licensing</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'admin'
                ? 'bg-[#222730] text-stone-100 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1e24]'
            }`}
          >
            <span>QM Admin</span>
          </button>
        </nav>

        {/* Right CTA buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-2.5">
          <button
            onClick={onToggleTelegramDrawer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1c2026] hover:bg-[#232830] text-stone-300 text-xs border border-[#2b303b] transition-colors relative"
          >
            <Send className="w-3.5 h-3.5 text-stone-300" />
            <span>Telegram Feed</span>
            {unreadTelegramCount > 0 && (
              <span className="w-4 h-4 bg-amber-400/90 text-stone-950 font-bold rounded-full text-[9px] flex items-center justify-center">
                {unreadTelegramCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenBookingModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-950 text-xs font-semibold shadow-sm transition-colors"
          >
            <span>+ Book Slot</span>
          </button>
        </div>
      </div>
    </header>
  );
}
