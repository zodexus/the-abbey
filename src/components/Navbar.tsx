'use client';

import React from 'react';
import { Music2, Calendar, Wrench, Lock, Plus } from 'lucide-react';

interface NavbarProps {
  activeTab: 'schedule' | 'loans' | 'tech_portal';
  setActiveTab: (tab: 'schedule' | 'loans' | 'tech_portal') => void;
  onOpenBookingModal: () => void;
  isSupabaseConnected?: boolean;
  isTechAuthenticated?: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenBookingModal,
  isSupabaseConnected = false,
  isTechAuthenticated = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#121418]/95 backdrop-blur-md border-b border-[#232730] px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer"
          onClick={() => setActiveTab('schedule')}
        >
          <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700/60 flex items-center justify-center text-stone-200">
            <Music2 className="w-4 h-4 text-amber-200/90" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-base text-stone-100 tracking-tight">The Abbey</span>
              <span className="text-[11px] text-stone-400">Tembusu College</span>
              {isSupabaseConnected && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Synced
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Public Navigation Tabs (Only 2 pages for students) */}
        <nav className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'schedule'
                ? 'bg-[#222730] text-stone-100 font-semibold'
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
                ? 'bg-[#222730] text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1a1e24]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Equipment Loaning</span>
          </button>
        </nav>

        {/* Right Actions: Tech Login & Request Booking */}
        <div className="flex items-center space-x-2">
          {/* Tech Member Portal Button */}
          <button
            onClick={() => setActiveTab('tech_portal')}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
              activeTab === 'tech_portal'
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold'
                : isTechAuthenticated
                ? 'bg-[#181d26] text-amber-300/90 border-[#2a303d] hover:bg-[#202734]'
                : 'bg-[#161920] text-stone-400 border-[#262b35] hover:text-stone-200 hover:border-[#384050]'
            }`}
            title="Tech Team Admin Portal"
          >
            <Lock className="w-3 h-3 text-amber-400/80" />
            <span className="hidden sm:inline">
              {isTechAuthenticated ? 'Tech Portal' : 'Tech Login'}
            </span>
          </button>

          {/* Request Slot Button */}
          <button
            onClick={onOpenBookingModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-950 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Slot</span>
          </button>
        </div>
      </div>
    </header>
  );
}
