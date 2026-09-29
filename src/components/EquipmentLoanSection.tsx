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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 7-Day Lead Time Policy Banner (Per QM Handover Notes) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300">
              Quartermaster 7-Day Advance Notice Policy
            </h3>
            <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
              All microphone, cable, and PA speaker loans for house events or external IGs must be requested at least <strong>1 week in advance</strong>. Last-minute requests on the eve or day of the event may be turned down to protect gear availability.
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[11px] font-mono bg-[#0d1117] text-slate-300 px-3 py-1.5 rounded-lg border border-[#30363d]">
            tKaraoke: Fridays Reserved
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Loan Request Form */}
        <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Submit Equipment Loan Request</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            For Tembusu floor dinners, house events, and registered IGs.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Event / Purpose *</label>
              <input
                type="text"
                placeholder="e.g. Shan House Acoustic Night"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Your Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Valerie Wong"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Telegram Handle *</label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={telegramHandle}
                  onChange={(e) => setTelegramHandle(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Loan Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Return Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 7-Day Warning if requested too soon */}
            {isLessThan7Days && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-red-300">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>
                  Notice: This date is within 7 days. Approval is subject to QM & Tech members availability.
                </span>
              </div>
            )}

            {/* Gear Selection */}
            <div>
              <label className="block font-semibold text-slate-300 mb-2">Equipment Needed</label>
              <div className="space-y-1.5">
                {COMMON_LOAN_GEAR.map((item) => {
                  const checked = selectedGear.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => toggleGear(item)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        checked
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
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

            {submittedMessage && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Request sent to Quartermaster for approval!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              Submit Loan Request
            </button>
          </form>
        </div>

        {/* Existing Loans & Schedule */}
        <div className="lg:col-span-7 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col">
          <h2 className="text-base font-bold text-white mb-1">Active & Upcoming Equipment Loans</h2>
          <p className="text-xs text-slate-400 mb-4">
            Track allocated gear to prevent double-booking with college bandroom needs.
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{loan.eventName}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                      loan.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : loan.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
                  <span>
                    👤 Requester: <strong className="text-slate-200">{loan.requesterName}</strong> ({loan.telegramHandle})
                  </span>
                  <span>
                    📅 Date: <strong className="text-slate-200">{loan.startDate}</strong>
                  </span>
                </div>

                <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d] text-[11px] text-slate-300">
                  <span className="text-slate-400 font-medium">Items: </span>
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
