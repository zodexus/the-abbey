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
    <header className="sticky top-0 z-40 bg-[#0d1117]/90 backdrop-blur-md border-b border-[#30363d] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo and College Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('calendar')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold">
              <Music2 className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">The Abbey</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-medium px-2 py-0.5 rounded-full border border-amber-500/30">
                  Tembusu Arts CC
                </span>
                {isConcertMode && (
                  <span className="text-xs bg-red-500/20 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-500/40 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Concert Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Bandroom Booking & Duty Management</p>
            </div>
          </div>

          {/* Mobile Action trigger */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onToggleTelegramDrawer}
              className="relative p-2 rounded-lg bg-[#21262d] text-slate-300 hover:text-white border border-[#30363d]"
              title="Telegram Duty Stream"
            >
              <Send className="w-4 h-4 text-sky-400" />
              {unreadTelegramCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadTelegramCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenBookingModal}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
            >
              + Book
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'loans'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Equipment Loans</span>
          </button>

          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'licenses'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>AY26/27 Licenses</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'admin'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>QM Admin</span>
          </button>
        </nav>

        {/* Right CTA buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-3">
          <button
            onClick={onToggleTelegramDrawer}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d] transition-all hover:border-sky-500/40 relative"
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span>Telegram Bot Feed</span>
            {unreadTelegramCount > 0 && (
              <span className="w-5 h-5 bg-sky-500 text-slate-950 font-bold rounded-full text-[10px] flex items-center justify-center">
                {unreadTelegramCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenBookingModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>+ Book The Abbey</span>
          </button>
        </div>
      </div>
    </header>
  );
}
