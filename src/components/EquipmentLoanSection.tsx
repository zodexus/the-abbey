'use client';

import React, { useState, useEffect } from 'react';
import { EquipmentLoan, InventoryItem, LicensedUser } from '@/lib/types';
import { BASE_PACKAGES, BasePackage, STATIC_INVENTORY } from '@/lib/inventory';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  ZoomIn,
  X,
  Send,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

interface EquipmentLoanSectionProps {
  licensedUsers: LicensedUser[];
  onRequestLoan: (loan: Omit<EquipmentLoan, 'id' | 'createdAt' | 'status'>) => void;
}

const COMMITTEE_OPTIONS = ['CSC', 'House', 'Interest Group', 'Student Band', 'Personal / Other'];

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

export default function EquipmentLoanSection({
  licensedUsers,
  onRequestLoan,
}: EquipmentLoanSectionProps) {
  // Live inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>(STATIC_INVENTORY);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
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

  // License validation states
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [matchedUser, setMatchedUser] = useState<LicensedUser | null>(null);

  // Lightbox preview for package diagrams
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

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
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingInventory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Validate telegram handle on blur
  const handleTelegramBlur = async () => {
    const clean = telegramHandle.trim().replace(/^@/, '');
    if (!clean) {
      setHandleStatus('idle');
      setMatchedUser(null);
      return;
    }

    setHandleStatus('checking');

    const directMatch = licensedUsers.find(
      (u) => u.telegramHandle.replace(/^@/, '').toLowerCase() === clean.toLowerCase()
    );

    if (directMatch) {
      setMatchedUser(directMatch);
      setHandleStatus('valid');
      if (!requesterName) setRequesterName(directMatch.name);
      return;
    }

    try {
      const res = await fetch('/api/licenses');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        const found = data.users.find(
          (u: any) => u.telegramHandle.replace(/^@/, '').toLowerCase() === clean.toLowerCase()
        );
        if (found) {
          setMatchedUser(found);
          setHandleStatus('valid');
          if (!requesterName) setRequesterName(found.name);
          return;
        }
      }
    } catch {}

    setHandleStatus('invalid');
    setMatchedUser(null);
  };

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
    if (!telegramHandle || handleStatus !== 'valid' || !purpose || !startDate || !agreedToTerms) {
      return;
    }

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
      compiledGearList.push(`Notes: ${additionalNotes.trim()}`);
    }

    const cleanHandle = telegramHandle.startsWith('@') ? telegramHandle : `@${telegramHandle}`;

    onRequestLoan({
      requesterName: requesterName || matchedUser?.name || cleanHandle,
      telegramHandle: cleanHandle,
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
    setTimeout(() => setSubmittedMessage(false), 6000);

    // Reset fields
    setPurpose('');
    setSelectedItems({});
    setAdditionalNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Lightbox Modal for Package Diagram */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#14171d] border border-[#2b303b] rounded-2xl p-3 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#242831]">
              <span className="text-xs font-semibold text-stone-200">{previewImage.title} Diagram</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#20252e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-[16/9] bg-stone-900 rounded-lg overflow-hidden">
              <Image
                src={previewImage.src}
                alt={previewImage.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Loan Form Box */}
      <div className="bg-[#14171d] border border-[#242933] rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-base font-semibold text-stone-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-200/80" />
            <span>Equipment Loan Request</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
            Borrow audio gear, speakers, mics, and accessories for events and IG activities. Requests are reviewed by Quartermaster (<span className="text-stone-300">@mezyyy</span>) via Telegram.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Booker Details & Telegram Validation */}
          <div className="border-t border-[#232731] pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              1. Requester Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Telegram Handle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-stone-300">
                    Telegram Handle <span className="text-amber-400">*</span>
                  </label>
                  <span className="text-[10px] text-stone-500">Validated with Abbey Registry</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="@username"
                    value={telegramHandle}
                    onChange={(e) => {
                      setTelegramHandle(e.target.value);
                      if (handleStatus !== 'idle') setHandleStatus('idle');
                    }}
                    onBlur={handleTelegramBlur}
                    required
                    className={`w-full bg-[#181c24] border rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none transition-colors ${
                      handleStatus === 'valid'
                        ? 'border-emerald-600/70 focus:border-emerald-500'
                        : handleStatus === 'invalid'
                        ? 'border-amber-600/70 focus:border-amber-500'
                        : 'border-[#282d38] focus:border-stone-400'
                    }`}
                  />
                  {handleStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-stone-400 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {handleStatus === 'valid' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Verified: <strong>{matchedUser?.name || requesterName}</strong> ({matchedUser?.licenseAY || 'AY26/27'})
                    </span>
                  </div>
                )}
                {handleStatus === 'invalid' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Handle not found in Abbey Registry. You must be licensed to request loans.</span>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valerie Wong"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                />
              </div>

              {/* Committee / Organization */}
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  Committee / Group <span className="text-amber-400">*</span>
                </label>
                <select
                  value={committee}
                  onChange={(e) => setCommittee(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
                >
                  {COMMITTEE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  Purpose of Loan <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tancho Acoustic Night, Floor Talk, Open Mic"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Base Setup Package with Visual Slides */}
          <div className="border-t border-[#232731] pt-4 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                2. Base Setup Package
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Choose a pre-configured audio package. Click any diagram to enlarge.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {BASE_PACKAGES.filter((p) => p.id !== 'None').map((pkg) => {
                const isSelected = basePackage === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setBasePackage(pkg.id)}
                    className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'bg-[#1e232d] border-stone-300 ring-1 ring-stone-300/40 shadow-md'
                        : 'bg-[#181c24] border-[#282d38] hover:border-stone-500'
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail with zoom trigger */}
                      {pkg.image && (
                        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black/40 mb-2.5 border border-[#242934] group">
                          <Image
                            src={pkg.image}
                            alt={pkg.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({ src: pkg.image!, title: pkg.name });
                            }}
                            className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/70 text-stone-300 hover:text-white backdrop-blur-sm transition-colors"
                            title="Expand diagram"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-stone-100">{pkg.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>

                      <div className="text-[11px] text-stone-400 font-medium mb-2">
                        {pkg.tagline}
                      </div>

                      {/* Specs and Best For */}
                      <div className="space-y-1.5 text-[10px] text-stone-400 bg-[#121419] p-2 rounded-lg border border-[#232731]">
                        <div>
                          <span className="text-stone-300 font-medium">Specs: </span>
                          {pkg.specs?.join(' • ')}
                        </div>
                        <div>
                          <span className="text-stone-300 font-medium">Best for: </span>
                          {pkg.bestFor?.join('; ')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Option for Custom Only */}
            <div
              onClick={() => setBasePackage('None')}
              className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                basePackage === 'None'
                  ? 'bg-[#1e232d] border-stone-300 text-stone-100 ring-1 ring-stone-300/40'
                  : 'bg-[#181c24] border-[#282d38] text-stone-400 hover:border-stone-500'
              }`}
            >
              <div>
                <span className="font-semibold text-xs text-stone-200">Custom Gear Selection Only (No Package)</span>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Choose individual microphones, DI boxes, stands, or wires from the Abbey inventory below.
                </p>
              </div>
              {basePackage === 'None' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
          </div>

          {/* Section 3: Additional Gear from Live Inventory */}
          <div className="border-t border-[#232731] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                  3. Additional Abbey Inventory Items (Optional)
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Pick additional microphones, cables, power extensions, or DI boxes from the inventory.
                </p>
              </div>
              {isLoadingInventory && (
                <span className="text-[10px] text-stone-500">Updating inventory...</span>
              )}
            </div>

            {/* Selected Items summary tags */}
            {Object.keys(selectedItems).length > 0 && (
              <div className="bg-[#181c24] border border-[#282d38] p-2.5 rounded-lg flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-stone-400 font-medium mr-1">Added Items:</span>
                {Object.entries(selectedItems).map(([id, qty]) => {
                  const item = inventory.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 bg-[#202530] text-stone-200 text-[10px] px-2.5 py-1 rounded-md border border-[#2f3544]"
                    >
                      <span className="font-semibold text-amber-300">{qty}x</span>
                      <span className="truncate max-w-[150px]">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(id)}
                        className="text-stone-400 hover:text-white ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Inventory Search & Categories */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search 178 inventory items (e.g. Shure, Mogami, DI, Extension)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {INVENTORY_CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-stone-200 text-stone-900 font-semibold'
                        : 'bg-[#181c24] text-stone-400 hover:text-stone-200 border border-[#282d38]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="max-h-48 overflow-y-auto space-y-1 bg-[#121419] border border-[#232731] rounded-xl p-2">
                {filteredInventory.slice(0, 30).map((item) => {
                  const count = selectedItems[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#181c24] transition-colors text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="text-stone-200 font-medium">{item.name}</span>
                        <span className="text-[10px] text-stone-500 ml-2">
                          ({item.subtype || item.category})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full ${
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
                                <span className="text-xs text-stone-200 w-4 text-center font-medium">
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
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Special Requests / Additional Details
              </label>
              <textarea
                rows={2}
                placeholder="Any special cable lengths, placement requirements, or setup requests..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400 resize-none"
              />
            </div>
          </div>

          {/* Section 4: Loan Period */}
          <div className="border-t border-[#232731] pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              4. Loan Period
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  Start Date <span className="text-amber-400">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
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
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-300 mb-1">
                  End Date <span className="text-amber-400">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
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
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Terms & Submit */}
          <div className="border-t border-[#232731] pt-4 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#181c24] border border-[#282d38] hover:border-stone-500 transition-colors">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
                className="mt-0.5 rounded border-stone-600 bg-stone-900 text-stone-200 focus:ring-0"
              />
              <span className="text-[11px] text-stone-400 leading-relaxed">
                I agree that any damage caused to Abbey equipment shall be borne by the loaner (calculated at replacement price). I will return all equipment on time, properly coiled and clean.
              </span>
            </label>

            {submittedMessage && (
              <div className="bg-[#152119] border border-emerald-600/40 text-emerald-300 p-3 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Equipment loan request sent to Quartermaster (<span className="font-semibold text-emerald-200">@mezyyy</span>) on Telegram for approval!
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={handleStatus !== 'valid' || !agreedToTerms}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                handleStatus === 'valid' && agreedToTerms
                  ? 'bg-stone-200 hover:bg-white text-stone-950 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Send Loan Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
