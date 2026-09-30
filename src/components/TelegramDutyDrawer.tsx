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
      <div className="bg-[#13161c] border-l border-[#242933] w-full max-w-lg h-full shadow-xl flex flex-col text-xs">
        {/* Top Header */}
        <div className="p-4 border-b border-[#242933] bg-[#161a22] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700/60 flex items-center justify-center text-stone-200">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-stone-100 flex items-center gap-1.5">
                <span>Telegram Bot Feed</span>
                <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded border border-stone-700/60">
                  Live
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#202530] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#242933] bg-[#161a22]/60 px-4">
          <button
            onClick={() => setActiveTab('stream')}
            className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'stream'
                ? 'border-stone-300 text-stone-100'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Messages ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'border-stone-300 text-stone-100'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Bot Configuration</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {activeTab === 'stream' ? (
            <div className="space-y-3.5">
              {/* Duty Simulator helper */}
              <div className="bg-[#181c24] border border-[#262b35] rounded-lg p-2.5 flex items-center justify-between text-xs">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span>Simulating Member:</span>
                </span>
                <select
                  value={testClaimer}
                  onChange={(e) => setTestClaimer(e.target.value)}
                  className="bg-[#121419] border border-[#2b313d] rounded px-2 py-0.5 text-xs text-stone-200 focus:outline-none"
                >
                  <option value="@sarah_arts">@sarah_arts (Abbey Licensed)</option>
                  <option value="@mezyyy">@mezyyy (QM)</option>
                  <option value="@dan_tech">@dan_tech (Tech Member)</option>
                </select>
              </div>

              {/* Feed */}
              {messages.map((msg) => {
                const booking = bookings.find((b) => b.id === msg.bookingId);
                const isClaimed = Boolean(booking?.doorOpenerHandle || msg.claimedBy);
                const isCheckedOut = booking?.status === 'checked_out';
                const isQMDM = msg.chatType === 'direct_message_qm';

                return (
                  <div
                    key={msg.id}
                    className="bg-[#171b22] border border-[#262b35] rounded-xl p-3.5 space-y-2.5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isQMDM ? 'bg-amber-400' : 'bg-sky-400'
                          }`}
                        />
                        <span className="text-xs font-semibold text-stone-200">{msg.title}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono">{msg.timestamp}</span>
                    </div>

                    {msg.scheduledDispatchNote && (
                      <div className="text-[10px] text-stone-400 bg-[#1c212a] px-2 py-0.5 rounded border border-[#2b313d] inline-block">
                        ⏳ {msg.scheduledDispatchNote}
                      </div>
                    )}

                    {/* Telegram Bubble */}
                    <div className="bg-[#121419] border border-[#232731] rounded-lg p-3 text-xs text-stone-300 whitespace-pre-line leading-relaxed font-sans">
                      {msg.body}
                    </div>

                    {/* Action 1: Door Opening Claim Button */}
                    {msg.hasDoorOpenAction && booking && (
                      <div className="pt-0.5">
                        {isClaimed ? (
                          <div className="bg-[#152119] border border-emerald-600/30 rounded-lg p-2.5 flex items-center justify-between text-xs text-emerald-300">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Door claimed by {booking.doorOpenerHandle || msg.claimedBy}</span>
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                              Claimed
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onClaimDoor(booking.id, testClaimer)}
                            className="w-full py-2 rounded-lg bg-stone-200 hover:bg-white text-stone-950 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>[ 🔑 I can unlock the Abbey as {testClaimer} ]</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action 2: End-of-Session Photo Check-Out */}
                    {booking && isClaimed && (
                      <div className="pt-2 border-t border-[#232731] space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3 text-stone-400" />
                            <span>Clean room check-out:</span>
                          </span>
                          {isCheckedOut ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Photo Logged
                            </span>
                          ) : (
                            <span className="text-stone-400">Awaiting End of Slot</span>
                          )}
                        </div>

                        {!isCheckedOut && (
                          <button
                            onClick={() =>
                              onCheckoutPhoto(
                                booking.id,
                                'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&auto=format&fit=crop'
                              )
                            }
                            className="w-full py-1.5 rounded-lg bg-[#202530] hover:bg-[#282f3c] text-stone-200 text-xs font-medium border border-[#2b313d] flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Camera className="w-3 h-3 text-stone-300" />
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
            /* Setup Guide for Live Bot */
            <div className="space-y-3.5 text-xs text-stone-300 leading-relaxed">
              <div className="bg-[#181c24] border border-[#262b35] rounded-xl p-3.5 space-y-1.5">
                <h4 className="font-semibold text-stone-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Telegram Configuration</span>
                </h4>
                <p className="text-stone-400 text-xs">
                  The bot sends a direct DM to you (@mezyyy) whenever a booking is created, and dispatches the door-opening prompt to the Abbey Licensed group 12 hours before if requested.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-[#181c24] border border-[#262b35] p-3 rounded-xl space-y-1">
                  <div className="font-medium text-stone-200">1. Group Chat: Abbey Licensed</div>
                  <p className="text-stone-400 text-[11px]">
                    Add your bot to the <strong>Abbey Licensed</strong> group as an admin so it can post unlock prompts with inline buttons.
                  </p>
                </div>

                <div className="bg-[#181c24] border border-[#262b35] p-3 rounded-xl space-y-1">
                  <div className="font-medium text-stone-200">2. Quartermaster Direct Message</div>
                  <p className="text-stone-400 text-[11px]">
                    Message your bot once directly on Telegram and send <code>/start</code>. Then set your chat ID so the bot can DM you booking alerts.
                  </p>
                </div>

                <div className="bg-[#181c24] border border-[#262b35] p-3 rounded-xl space-y-1.5">
                  <div className="font-medium text-stone-200">3. Environment Variables (.env.local / Vercel)</div>
                  <div className="bg-[#121419] p-2.5 rounded-lg border border-[#232731] font-mono text-[11px] text-stone-300 space-y-0.5">
                    <div>TELEGRAM_BOT_TOKEN="your_bot_token"</div>
                    <div>TELEGRAM_QM_CHAT_ID="your_telegram_id"</div>
                    <div>TELEGRAM_ABBEY_LICENSED_CHAT_ID="-100xxxxxxxxx"</div>
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
