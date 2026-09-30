'use client';

import React, { useState, useEffect } from 'react';
import { EquipmentLoan, InventoryItem } from '@/lib/types';
import { BASE_PACKAGES, BasePackage, RECURRING_EQUIPMENT_LOANS, STATIC_INVENTORY } from '@/lib/inventory';
import {
  Wrench,
  CheckCircle2,
  Calendar,
  Clock,
  Package,
  Search,
  Plus,
  Minus,
  Info,
  ShieldCheck,
  Radio,
  Music2,
} from 'lucide-react';

interface EquipmentLoanSectionProps {
  loans: EquipmentLoan[];
  onRequestLoan: (loan: Omit<EquipmentLoan, 'id' | 'createdAt' | 'status'>) => void;
}

const COMMITTEE_OPTIONS = ['CSC', 'House', 'Interest Group', 'Student Band', 'No'];

const INVENTORY_CATEGORIES = [
  'All',
  'Microphones',
  'Speakers',
  'Amplifiers',
  'Mixers',
  'Wires',
  'Auxillary Equipment',
  'Instrument',
];

export default function EquipmentLoanSection({ loans, onRequestLoan }: EquipmentLoanSectionProps) {
  // Live inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>(STATIC_INVENTORY);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states matching Google Loan Form
  const [requesterName, setRequesterName] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [committee, setCommittee] = useState('Interest Group');
  const [purpose, setPurpose] = useState('');
  const [basePackage, setBasePackage] = useState<'Set A' | 'Set B' | 'Set C' | 'None'>('Set A');
  const [selectedItems, setSelectedItems] = useState<{ [itemId: string]: number }>({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('22:00');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Fetch live inventory from server
  useEffect(() => {
    let isMounted = true;
    setIsLoadingInventory(true);
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.inventory)) {
          setInventory(data.inventory);
        }
      })
      .catch(() => {
        // Fallback already populated with STATIC_INVENTORY
      })
      .finally(() => {
        if (isMounted) setIsLoadingInventory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtype.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (item: InventoryItem) => {
    if (!item.isAvailable) return;
    const current = selectedItems[item.id] || 0;
    if (current < item.workingQty) {
      setSelectedItems((prev) => ({
        ...prev,
        [item.id]: current + 1,
      }));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const current = selectedItems[itemId] || 0;
    if (current <= 1) {
      const next = { ...selectedItems };
      delete next[itemId];
      setSelectedItems(next);
    } else {
      setSelectedItems((prev) => ({
        ...prev,
        [itemId]: current - 1,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName || !telegramHandle || !purpose || !startDate || !agreedToTerms) {
      return;
    }

    // Build equipment list combining base package + individual items
    const pkg = BASE_PACKAGES.find((p) => p.id === basePackage);
    const compiledGearList: string[] = [];

    if (pkg && pkg.id !== 'None') {
      compiledGearList.push(`${pkg.name}: ${pkg.items.join(', ')}`);
    }

    Object.entries(selectedItems).forEach(([itemId, qty]) => {
      const it = inventory.find((i) => i.id === itemId);
      if (it) {
        compiledGearList.push(`${qty}x ${it.name} (${it.subtype || it.category})`);
      }
    });

    if (additionalNotes.trim()) {
      compiledGearList.push(`Custom: ${additionalNotes.trim()}`);
    }

    onRequestLoan({
      requesterName,
      telegramHandle: telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`,
      committee,
      purpose,
      eventName: purpose,
      basePackage,
      equipmentList: compiledGearList,
      additionalNotes: additionalNotes.trim() || undefined,
      startDate,
      startTime,
      endDate: endDate || startDate,
      endTime: endTime || startTime,
      agreedToTerms: true,
    });

    setSubmittedMessage(true);
    setTimeout(() => setSubmittedMessage(false), 5000);

    // Reset inputs
    setPurpose('');
    setSelectedItems({});
    setAdditionalNotes('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Recurring IG Loans Banner */}
      <div className="bg-[#14171d] border border-[#242933] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-stone-400" />
            <h3 className="text-xs font-semibold text-stone-200">Recurring IG Equipment Loans</h3>
          </div>
          <span className="text-[10px] text-stone-500">Separated from room bookings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {RECURRING_EQUIPMENT_LOANS.map((rec) => (
            <div
              key={rec.id}
              className="bg-[#181c24] border border-[#262b35] rounded-lg p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-200 text-xs">{rec.groupName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                  {rec.schedule}
                </span>
              </div>
              <div className="text-[11px] text-stone-400">
                <span className="text-stone-300">Gear: </span>
                {rec.equipmentList.join(', ')}
              </div>
              <div className="text-[10px] text-stone-500 italic">{rec.notes}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Loan Form */}
        <div className="lg:col-span-7 bg-[#14171d] border border-[#242933] rounded-xl p-5 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-stone-300" />
              <span>Equipment Loan Request Form</span>
            </h2>
            <p className="text-[11px] text-stone-400 mt-1">
              Standard requests must be made at least 1 week in advance. Max loan duration is 3 days.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Basic Information */}
            <div className="border-t border-[#232731] pt-3 space-y-3">
              <h4 className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                1. Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Valerie Wong"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Telegram Handle <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@valeriewong"
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Are you representing a committee?
                  </label>
                  <select
                    value={committee}
                    onChange={(e) => setCommittee(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                  >
                    {COMMITTEE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Purpose of Loan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tancho Floor Dinner / Open Mic"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. Base Setup Package */}
            <div className="border-t border-[#232731] pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                  2. Base Setup Package
                </h4>
                <span className="text-[10px] text-stone-400">Which matches your needs?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BASE_PACKAGES.map((pkg) => {
                  const isSelected = basePackage === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setBasePackage(pkg.id)}
                      className={`cursor-pointer p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#202530] border-stone-400 text-stone-100'
                          : 'bg-[#181c24] border-[#282d38] text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-stone-200">{pkg.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-stone-300" />}
                      </div>
                      <p className="text-[10px] text-stone-400 line-clamp-2">{pkg.tagline}</p>
                      {pkg.items.length > 0 && (
                        <div className="mt-2 text-[10px] text-stone-400 bg-[#121419] p-1.5 rounded">
                          {pkg.items.slice(0, 3).join(' • ')}
                          {pkg.items.length > 3 ? ' ...' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Additional Specific Equipment from Live Inventory */}
            <div className="border-t border-[#232731] pt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                  3. Add Individual Items from Live Inventory
                </h4>
                {isLoadingInventory && (
                  <span className="text-[10px] text-stone-500">Syncing database...</span>
                )}
              </div>

              {/* Selected Items summary tags */}
              {Object.keys(selectedItems).length > 0 && (
                <div className="bg-[#181c24] border border-[#282d38] p-2 rounded-lg flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-stone-400 font-medium mr-1">Added:</span>
                  {Object.entries(selectedItems).map(([id, qty]) => {
                    const item = inventory.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-[#222834] text-stone-200 text-[10px] px-2 py-0.5 rounded border border-[#303746]"
                      >
                        <span>{qty}x</span>
                        <span className="truncate max-w-[120px]">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(id)}
                          className="text-stone-400 hover:text-stone-100 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Inventory Filter Tabs & Search */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-2.5 top-2 text-stone-500" />
                    <input
                      type="text"
                      placeholder="Search inventory (e.g. Shure, XLR, DI, Stand)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#181c24] border border-[#282d38] rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                    />
                  </div>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {INVENTORY_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-stone-200 text-stone-900 font-medium'
                          : 'bg-[#181c24] text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Compact Inventory Item List */}
                <div className="max-h-48 overflow-y-auto space-y-1 bg-[#121419] border border-[#232731] rounded-lg p-1.5">
                  {filteredInventory.slice(0, 40).map((item) => {
                    const count = selectedItems[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-[#181c24] transition-colors text-[11px]"
                      >
                        <div className="truncate pr-2">
                          <span className="text-stone-200 font-medium">{item.name}</span>
                          <span className="text-[10px] text-stone-500 ml-1.5">
                            ({item.subtype || item.category})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded ${
                              item.isAvailable
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : 'bg-red-950/60 text-red-400 border border-red-800/40'
                            }`}
                          >
                            {item.isAvailable ? `${item.workingQty} Avail` : 'Out of stock'}
                          </span>

                          {item.isAvailable && (
                            <div className="flex items-center gap-1">
                              {count > 0 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-[#242934] text-stone-300 hover:bg-[#2e3544]"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="text-xs text-stone-200 w-3 text-center">
                                    {count}
                                  </span>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAddItem(item)}
                                disabled={count >= item.workingQty}
                                className="w-5 h-5 flex items-center justify-center rounded bg-stone-300 text-stone-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <div className="p-3 text-center text-[10px] text-stone-500">
                      No matching items found in inventory.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1">
                  Custom requests or notes (e.g. 2x spare mic, 1x acoustic amp)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional details or requirements..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400 text-xs"
                />
              </div>
            </div>

            {/* 4. Loan Dates & Times */}
            <div className="border-t border-[#232731] pt-3 space-y-2.5">
              <h4 className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                4. Loan & Return Schedule
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* 5. Terms & Responsibility */}
            <div className="border-t border-[#232731] pt-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg bg-[#181c24] border border-[#282d38] hover:border-stone-500">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-stone-600 bg-stone-900 text-stone-200 focus:ring-0"
                />
                <span className="text-[10px] text-stone-400 leading-relaxed">
                  Any damages caused to equipment shall be borne by the loaner (calculated at replacement price). I agree to follow approved handling procedures, properly coil wires, and ensure safety.
                </span>
              </label>
            </div>

            {submittedMessage && (
              <div className="bg-[#152119] border border-emerald-600/30 text-emerald-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Equipment loan request submitted to Quartermaster!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!agreedToTerms}
              className="w-full py-2 rounded-lg bg-stone-200 hover:bg-white text-stone-950 font-medium text-xs transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Loan Request
            </button>
          </form>
        </div>

        {/* Right Column: Active Loans & Current Gear Status */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-stone-400" />
                <span>Active & Upcoming Loans</span>
              </h3>
              <span className="text-[10px] text-stone-500">{loans.length} recorded</span>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-[#181c24] border border-[#262b35] rounded-lg p-3 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-stone-200 text-xs truncate max-w-[200px]">
                      {loan.purpose || loan.eventName}
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                        loan.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : loan.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      👤 <span className="text-stone-300">{loan.requesterName}</span> ({loan.telegramHandle})
                    </span>
                    <span>
                      🏛️ <span className="text-stone-300">{loan.committee || 'Resident'}</span>
                    </span>
                    <span>
                      📅 <span className="text-stone-300">{loan.startDate}</span>
                    </span>
                  </div>

                  <div className="bg-[#121419] p-2 rounded border border-[#232731] text-[10px] text-stone-400 space-y-1">
                    <div>
                      <span className="text-stone-300 font-medium">Setup: </span>
                      <span className="text-stone-200">{loan.basePackage || 'Set A'}</span>
                    </div>
                    {loan.equipmentList && loan.equipmentList.length > 0 && (
                      <div>
                        <span className="text-stone-300 font-medium">Items: </span>
                        {loan.equipmentList.join('; ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loans.length === 0 && (
                <div className="text-center p-6 text-stone-500 text-xs">
                  No active equipment loans recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
