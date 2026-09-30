'use client';

import React, { useState } from 'react';
import { EquipmentLoan } from '@/lib/types';
import { Wrench, AlertCircle, Clock, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

interface EquipmentLoanSectionProps {
  loans: EquipmentLoan[];
  onRequestLoan: (loan: Omit<EquipmentLoan, 'id' | 'createdAt' | 'status'>) => void;
}

const COMMON_LOAN_GEAR = [
  '2x Shure SM58 Vocal Microphones',
  '2x 10m XLR Cables',
  '2x 1/4" Instrument Cables',
  '1x Portable Active PA Speaker & Power Cable',
  '1x Stage Floor Monitor (for IGs / events)',
  '2x Heavy-duty Microphone Boom Stands',
  '1x Direct Box (DI Box) for Acoustic Guitar',
];

export default function EquipmentLoanSection({ loans, onRequestLoan }: EquipmentLoanSectionProps) {
  const [eventName, setEventName] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGear, setSelectedGear] = useState<string[]>([
    '2x Shure SM58 Vocal Microphones',
    '2x 10m XLR Cables',
  ]);
  const [submittedMessage, setSubmittedMessage] = useState(false);

  // Check 7-day policy
  const today = new Date();
  const loanStart = startDate ? new Date(startDate) : null;
  const daysDifference = loanStart
    ? Math.ceil((loanStart.getTime() - today.getTime()) / (1000 * 3600 * 24))
    : null;
  const isLessThan7Days = daysDifference !== null && daysDifference < 7;

  const toggleGear = (item: string) => {
    setSelectedGear((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !requesterName || !telegramHandle || !startDate) return;

    onRequestLoan({
      eventName,
      requesterName,
      telegramHandle: telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`,
      startDate,
      endDate: endDate || startDate,
      equipmentList: selectedGear,
    });

    setSubmittedMessage(true);
    setTimeout(() => setSubmittedMessage(false), 5000);
    setEventName('');
    setRequesterName('');
    setTelegramHandle('');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Loan Request Form */}
        <div className="lg:col-span-5 bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-2 mb-3">
            <Wrench className="w-3.5 h-3.5 text-stone-300" />
            <span>Request Gear Loan</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">Event / Purpose</label>
              <input
                type="text"
                placeholder="e.g. Shan Acoustic Night"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Valerie Wong"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">Telegram</label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={telegramHandle}
                  onChange={(e) => setTelegramHandle(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">Loan Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">Return Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            {/* Gear Selection */}
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1.5">Equipment</label>
              <div className="space-y-1">
                {COMMON_LOAN_GEAR.map((item) => {
                  const checked = selectedGear.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => toggleGear(item)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border transition-all ${
                        checked
                          ? 'bg-[#202530] border-stone-500 text-stone-100 font-medium'
                          : 'bg-[#181c24] border-[#282d38] text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {checked && <CheckCircle2 className="w-3 h-3 text-stone-300 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {submittedMessage && (
              <div className="bg-[#152119] border border-emerald-600/30 text-emerald-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Loan request submitted.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-stone-200 hover:bg-white text-stone-950 font-medium text-xs transition-colors shadow-sm"
            >
              Submit Loan Request
            </button>
          </form>
        </div>

        {/* Existing Loans & Schedule */}
        <div className="lg:col-span-7 bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-stone-100 mb-3">Equipment Loans</h2>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="bg-[#181c24] border border-[#262b35] rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-stone-200">{loan.eventName}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                      loan.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : loan.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>

                <div className="text-[11px] text-stone-400 flex flex-wrap items-center gap-3">
                  <span>
                    👤 <span className="text-stone-300">{loan.requesterName}</span> ({loan.telegramHandle})
                  </span>
                  <span>
                    📅 <span className="text-stone-300">{loan.startDate}</span>
                  </span>
                </div>

                <div className="bg-[#121419] p-2 rounded border border-[#232731] text-[11px] text-stone-400">
                  <span className="text-stone-300 font-medium">Items: </span>
                  {loan.equipmentList.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
