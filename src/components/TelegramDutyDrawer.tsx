'use client';

import React, { useState } from 'react';
import { Booking, TelegramSimulatedMessage } from '@/lib/types';
import {
  X,
  Send,
  Key,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  ShieldAlert,
  ArrowRight,
  Code2,
} from 'lucide-react';

interface TelegramDutyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  messages: TelegramSimulatedMessage[];
  onClaimDoor: (bookingId: string, claimerHandle: string) => void;
  onCheckoutPhoto: (bookingId: string, photoUrl: string) => void;
}

export default function TelegramDutyDrawer({
  isOpen,
  onClose,
  bookings,
  messages,
  onClaimDoor,
  onCheckoutPhoto,
}: TelegramDutyDrawerProps) {
  const [activeTab, setActiveTab] = useState<'stream' | 'setup'>('stream');
  const [testClaimer, setTestClaimer] = useState<string>('@sarah_arts');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0d1117] border-l border-[#30363d] w-full max-w-xl h-full shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Telegram Bot Engine</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-medium px-2 py-0.5 rounded-full border border-sky-500/30">
                  @TembusuAbbeyBot
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Door-opening dispatch & photo check-out stream
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#30363d] bg-[#161b22]/50 px-4">
          <button
            onClick={() => setActiveTab('stream')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'stream'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Telegram Messages ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Connect Real Bot (60s Setup)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'stream' ? (
            <div className="space-y-4">
              {/* Quick duty role simulator */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Simulating Duty Opener:</span>
                </span>
                <select
                  value={testClaimer}
                  onChange={(e) => setTestClaimer(e.target.value)}
                  className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-amber-300 focus:outline-none"
                >
                  <option value="@sarah_arts">@sarah_arts (Arts CC)</option>
                  <option value="@zhiyu_qm">@zhiyu_qm (Quartermaster)</option>
                  <option value="@dan_tech">@dan_tech (Tech Committee)</option>
                  <option value="@ra_weekend">@ra_weekend (RA On-Duty)</option>
                </select>
              </div>

              {/* Telegram Feed */}
              {messages.map((msg) => {
                const booking = bookings.find((b) => b.id === msg.bookingId);
                const isClaimed = Boolean(booking?.doorOpenerHandle || msg.claimedBy);
                const isCheckedOut = booking?.status === 'checked_out';

                return (
                  <div
                    key={msg.id}
                    className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 space-y-3 shadow-md"
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">{msg.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>

                    {/* Telegram Bubble style */}
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 text-xs text-slate-200 font-sans whitespace-pre-line leading-relaxed">
                      {msg.body}
                    </div>

                    {/* Action 1: Door Opening Claim Button */}
                    {msg.hasDoorOpenAction && booking && (
                      <div className="pt-1">
                        {isClaimed ? (
                          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
                            <span className="flex items-center gap-2 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Door claimed by {booking.doorOpenerHandle || msg.claimedBy}</span>
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">
                              Booker Notified
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onClaimDoor(booking.id, testClaimer)}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                          >
                            <Key className="w-4 h-4" />
                            <span>[ 🔑 I can open the Abbey as {testClaimer} ]</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action 2: End-of-Session Photo Check-Out */}
                    {booking && isClaimed && (
                      <div className="pt-2 border-t border-[#30363d] space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            <span>Check-out Room Photo:</span>
                          </span>
                          {isCheckedOut ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Photo Logged
                            </span>
                          ) : (
                            <span className="text-amber-400/90 font-medium">Awaiting End of Slot</span>
                          )}
                        </div>

                        {isCheckedOut ? (
                          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                              🎸
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold text-emerald-300">Clean room verified</p>
                              <p className="text-[10px] text-slate-400">
                                Cables coiled, amps powered down at {booking.endTime}.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              onCheckoutPhoto(
                                booking.id,
                                'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&auto=format&fit=crop'
                              )
                            }
                            className="w-full py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-medium border border-[#30363d] flex items-center justify-center gap-2 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5 text-sky-400" />
                            <span>Simulate: Resident Sends Clean Room Photo 📸</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Setup Guide for Real Bot */
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-sky-300 flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>How to connect your actual Telegram Bot</span>
                </h4>
                <p className="text-slate-300 text-xs">
                  This Next.js app has full native Telegram Bot API routes ready. You can switch from simulation to your live group chat in 3 simple steps:
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Create Bot on Telegram</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Open Telegram, message <code className="text-amber-300 bg-[#0d1117] px-1 py-0.5 rounded">@BotFather</code>, send <code className="text-amber-300 bg-[#0d1117] px-1 py-0.5 rounded">/newbot</code>, and name it (e.g. <em>TembusuAbbeyBot</em>). Copy the HTTP API token.
                  </p>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Add Bot to Arts CC Group Chat</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Add your bot to your Tembusu Arts CC or Abbey Licensed group chat. Make it an admin so it can post notifications and inline buttons.
                  </p>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Add to .env.local / Vercel Environment</span>
                  </div>
                  <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] font-mono text-[11px] text-amber-200">
                    <div>TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNO..."</div>
                    <div>TELEGRAM_ARTS_CC_CHAT_ID="-100123456789"</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
