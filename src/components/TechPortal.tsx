'use client';

import React, { useState, useEffect } from 'react';
import {
  EquipmentLoan,
  InventoryItem,
  LicensedUser,
  RoomCheckoutPhoto,
} from '@/lib/types';
import {
  Wrench,
  Package,
  Camera,
  ShieldCheck,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Lock,
  LogOut,
  Save,
  Clock,
  Calendar,
  UserCheck,
  Users,
  Eye,
  ExternalLink,
  X,
  History,
  Check,
} from 'lucide-react';
import Image from 'next/image';

interface TechPortalProps {
  onLogout: () => void;
  licensedUsers: LicensedUser[];
  onRefreshLicenses: () => void;
  loans: EquipmentLoan[];
  onRefreshLoans: () => void;
}

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

export default function TechPortal({
  onLogout,
  licensedUsers,
  onRefreshLicenses,
  loans,
  onRefreshLoans,
}: TechPortalProps) {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'active_loans' | 'past_loans' | 'checkouts' | 'registry'
  >('inventory');

  // --- TAB 1: Inventory Logs State ---
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [invCategory, setInvCategory] = useState('All');
  const [invSearch, setInvSearch] = useState('');
  const [savingItemIds, setSavingItemIds] = useState<{ [id: string]: boolean }>({});
  const [saveSuccessIds, setSaveSuccessIds] = useState<{ [id: string]: boolean }>({});

  // --- TAB 4: Check-out Photos State ---
  const [checkouts, setCheckouts] = useState<RoomCheckoutPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<RoomCheckoutPhoto | null>(null);
  const [newPhotoResident, setNewPhotoResident] = useState('');
  const [newPhotoHandle, setNewPhotoHandle] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoNotes, setNewPhotoNotes] = useState('');
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);

  // Helper for DD/MM/YYYY
  const getTodayFormatted = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${now.getFullYear()}`;
  };

  // --- TAB 5: Licensing Registry State ---
  const [regName, setRegName] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDate, setRegDate] = useState(getTodayFormatted());
  const [batchHandles, setBatchHandles] = useState('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [regSearch, setRegSearch] = useState('');

  // Fetch live inventory
  const loadInventory = async () => {
    try {
      setIsLoadingInventory(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.success && Array.isArray(data.inventory)) {
        setInventory(data.inventory);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Fetch check-out photos
  const loadCheckouts = async () => {
    try {
      const res = await fetch('/api/checkouts');
      const data = await res.json();
      if (data.success && Array.isArray(data.checkouts)) {
        setCheckouts(data.checkouts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInventory();
    loadCheckouts();
  }, []);

  // Save changes to single inventory item directly to Supabase via PATCH
  const handleUpdateInventory = async (
    id: string,
    updates: { working_qty?: number; spoilt_qty?: number; notes?: string }
  ) => {
    setSavingItemIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessIds((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setSaveSuccessIds((prev) => ({ ...prev, [id]: false }));
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating inventory item:', err);
    } finally {
      setSavingItemIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Quick increment/decrement working qty
  const handleQtyChange = (item: InventoryItem, delta: number, field: 'working' | 'spoilt') => {
    if (field === 'working') {
      const newQty = Math.max(0, item.workingQty + delta);
      setInventory((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, workingQty: newQty, isAvailable: newQty > 0 }
            : i
        )
      );
      handleUpdateInventory(item.id, { working_qty: newQty });
    } else {
      const currentSpoilt = item.spoiltQty || 0;
      const newQty = Math.max(0, currentSpoilt + delta);
      setInventory((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, spoiltQty: newQty } : i))
      );
      handleUpdateInventory(item.id, { spoilt_qty: newQty });
    }
  };

  // Update loan status (approve, reject, collect, return)
  const handleUpdateLoanStatus = async (
    loanId: string,
    status: 'pending' | 'approved' | 'collected' | 'returned' | 'rejected'
  ) => {
    try {
      const res = await fetch('/api/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, status }),
      });
      if (res.ok) {
        onRefreshLoans();
      }
    } catch (err) {
      console.error('Error updating loan:', err);
    }
  };

  // Add single member to licensing registry
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regHandle) return;

    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          telegramHandle: regHandle.startsWith('@') ? regHandle : `@${regHandle}`,
          nusEmail: regEmail,
          licenseAY: 'AY26/27',
          dateRegistered: regDate || getTodayFormatted(),
          status: 'active',
        }),
      });
      if (res.ok) {
        setRegName('');
        setRegHandle('');
        setRegEmail('');
        setRegDate(getTodayFormatted());
        onRefreshLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Batch add handles
  const handleBatchAdd = async () => {
    if (!batchHandles.trim()) return;
    setIsSubmittingBatch(true);

    const handles = batchHandles
      .split(/[\s,\n]+/)
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .map((h) => (h.startsWith('@') ? h : `@${h}`));

    const usersToInsert = handles.map((h, i) => ({
      id: `lic-${Date.now()}-${i}`,
      name: h.replace(/^@/, ''),
      telegramHandle: h,
      licenseAY: 'AY26/27',
      dateRegistered: getTodayFormatted(),
      status: 'active',
    }));

    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersToInsert }),
      });
      if (res.ok) {
        setBatchHandles('');
        onRefreshLicenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Delete license
  const handleDeleteLicense = async (id: string) => {
    if (!confirm('Are you sure you want to remove this license?')) return;
    try {
      const res = await fetch(`/api/licenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshLicenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add room check-out record
  const handleAddCheckoutPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl) return;

    try {
      const res = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentName: newPhotoResident || 'Resident',
          telegramHandle: newPhotoHandle.startsWith('@') ? newPhotoHandle : `@${newPhotoHandle}`,
          photoUrl: newPhotoUrl,
          notes: newPhotoNotes || 'Manual upload',
        }),
      });
      if (res.ok) {
        setShowAddPhotoModal(false);
        setNewPhotoResident('');
        setNewPhotoHandle('');
        setNewPhotoUrl('');
        setNewPhotoNotes('');
        loadCheckouts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter inventory items
  const filteredInventory = inventory.filter((item) => {
    const matchesCat =
      invCategory === 'All' || item.category.toLowerCase() === invCategory.toLowerCase();
    const matchesSearch =
      !invSearch ||
      item.name.toLowerCase().includes(invSearch.toLowerCase()) ||
      item.barcode.toLowerCase().includes(invSearch.toLowerCase()) ||
      item.subtype.toLowerCase().includes(invSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate inventory overview totals
  const totalItemsCount = inventory.length;
  const totalWorkingCount = inventory.reduce((acc, i) => acc + (i.workingQty || 0), 0);
  const totalSpoiltCount = inventory.reduce((acc, i) => acc + (i.spoiltQty || 0), 0);

  // Separate active loans from past loans
  const activeLoans = loans.filter(
    (l) => l.status === 'pending' || l.status === 'approved' || l.status === 'collected'
  );
  const pastLoans = loans.filter(
    (l) => l.status === 'returned' || l.status === 'rejected'
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#14171d] border border-[#2b303b] rounded-2xl p-4 shadow-2xl overflow-hidden space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#242831]">
              <div>
                <h3 className="text-sm font-semibold text-stone-100">
                  {selectedPhoto.residentName} ({selectedPhoto.telegramHandle})
                </h3>
                <span className="text-[11px] text-stone-400">{selectedPhoto.timestamp}</span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[#20252e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-[4/3] bg-stone-950 rounded-lg overflow-hidden">
              <Image
                src={selectedPhoto.photoUrl}
                alt="Room checkout"
                fill
                className="object-contain"
                priority
              />
            </div>
            {selectedPhoto.notes && (
              <p className="text-xs text-stone-300 bg-[#181c24] p-2.5 rounded-lg border border-[#282d38]">
                {selectedPhoto.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manual Check-out Add Modal */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14171d] border border-[#282d38] rounded-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#242831] pb-3">
              <h3 className="text-sm font-semibold text-stone-100">Add Room Check-Out Record</h3>
              <button
                onClick={() => setShowAddPhotoModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCheckoutPhoto} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 mb-1">Booker Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Tan"
                  value={newPhotoResident}
                  onChange={(e) => setNewPhotoResident(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-300 mb-1">Telegram Handle</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={newPhotoHandle}
                  onChange={(e) => setNewPhotoHandle(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-300 mb-1">
                  Photo URL <span className="text-amber-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200"
                />
              </div>
              <div>
                <label className="block text-stone-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Abbey clean, AC and amps powered down"
                  value={newPhotoNotes}
                  onChange={(e) => setNewPhotoNotes(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPhotoModal(false)}
                  className="px-3 py-1.5 rounded-lg text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-900 font-semibold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tech Member Portal Header & Navigation */}
      <div className="bg-[#14171d] border border-[#242933] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                <span>Tech Team Management Portal</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  Supabase Live Synced
                </span>
              </h1>
              <p className="text-xs text-stone-400">
                Manage equipment stock, review loans, check room condition photos, and edit licenses.
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f242d] hover:bg-[#282e3a] text-stone-300 hover:text-white text-xs border border-[#2d3340] transition-colors self-start sm:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Portal</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 border-b border-[#232731] pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1c212a]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Equipment Inventory Logs ({totalItemsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('active_loans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'active_loans'
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1c212a]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Active & Upcoming Loans ({activeLoans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('past_loans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'past_loans'
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1c212a]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Loans ({pastLoans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('checkouts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'checkouts'
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1c212a]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Room Check-Out Photos ({checkouts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'registry'
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-[#1c212a]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Licensing Registry ({licensedUsers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EQUIPMENT INVENTORY LOGS                           */}
      {/* ========================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#14171d] border border-[#242933] p-4 rounded-xl">
              <span className="text-[11px] text-stone-400">Total Database Items</span>
              <div className="text-xl font-bold text-stone-100 mt-0.5">{totalItemsCount}</div>
            </div>
            <div className="bg-[#14171d] border border-[#242933] p-4 rounded-xl">
              <span className="text-[11px] text-emerald-400">Total Working Stock</span>
              <div className="text-xl font-bold text-emerald-300 mt-0.5">{totalWorkingCount} units</div>
            </div>
            <div className="bg-[#14171d] border border-[#242933] p-4 rounded-xl">
              <span className="text-[11px] text-amber-400">Total Faulty / Spoilt Units</span>
              <div className="text-xl font-bold text-amber-300 mt-0.5">{totalSpoiltCount} units</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-[#14171d] border border-[#242933] p-4 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search item name, subtype, or barcode..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {INVENTORY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInvCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      invCategory === cat
                        ? 'bg-stone-200 text-stone-900 font-semibold'
                        : 'bg-[#181c24] text-stone-400 hover:text-stone-200 border border-[#282d38]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Inventory Table */}
            <div className="overflow-x-auto border border-[#232731] rounded-xl bg-[#121419]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232731] bg-[#161921] text-stone-400">
                    <th className="py-2.5 px-3 font-medium">Barcode / ID</th>
                    <th className="py-2.5 px-3 font-medium">Item Name & Subtype</th>
                    <th className="py-2.5 px-3 font-medium">Category</th>
                    <th className="py-2.5 px-3 font-medium text-center">Working Qty</th>
                    <th className="py-2.5 px-3 font-medium text-center">Spoilt Qty</th>
                    <th className="py-2.5 px-3 font-medium">Tech Notes</th>
                    <th className="py-2.5 px-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222b]">
                  {filteredInventory.map((item) => {
                    const isSaving = savingItemIds[item.id];
                    const isSaved = saveSuccessIds[item.id];

                    return (
                      <tr key={item.id} className="hover:bg-[#161a22] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-stone-400">
                          {item.barcode || item.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-stone-200">{item.name}</span>
                          {item.subtype && (
                            <span className="text-[10px] text-stone-500 block">{item.subtype}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-stone-400">{item.category}</td>

                        {/* Working Qty Stepper */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-[#1a1e27] border border-[#282d38] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, -1, 'working')}
                              className="w-5 h-5 flex items-center justify-center rounded bg-[#242934] text-stone-300 hover:bg-[#2f3544]"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-stone-100">
                              {item.workingQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, 1, 'working')}
                              className="w-5 h-5 flex items-center justify-center rounded bg-stone-300 text-stone-900 hover:bg-white"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        {/* Spoilt Qty Stepper */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-[#1a1e27] border border-[#282d38] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, -1, 'spoilt')}
                              className="w-5 h-5 flex items-center justify-center rounded bg-[#242934] text-stone-300 hover:bg-[#2f3544]"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-5 text-center font-medium text-amber-300">
                              {item.spoiltQty || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, 1, 'spoilt')}
                              className="w-5 h-5 flex items-center justify-center rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        {/* Tech Notes */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            defaultValue={item.notes || ''}
                            placeholder="Add notes..."
                            onBlur={(e) => {
                              if (e.target.value !== (item.notes || '')) {
                                handleUpdateInventory(item.id, { notes: e.target.value });
                              }
                            }}
                            className="bg-[#181c24] border border-[#282d38] rounded px-2 py-1 text-[11px] text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400 w-full max-w-[180px]"
                          />
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 text-right">
                          {isSaved ? (
                            <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-semibold">
                              <Check className="w-3 h-3" /> Saved
                            </span>
                          ) : item.isAvailable ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              Available
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/40">
                              Out of Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ACTIVE & UPCOMING LOANS                            */}
      {/* ========================================================= */}
      {activeTab === 'active_loans' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Active & Pending Loans ({activeLoans.length})
            </h2>
            <button
              onClick={onRefreshLoans}
              className="text-[11px] text-stone-400 hover:text-white"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-[#14171d] border border-[#242933] rounded-xl p-4 space-y-3 shadow-sm text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-100 text-sm">
                      {loan.purpose || loan.eventName}
                    </h3>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      👤 <span className="text-stone-300 font-medium">{loan.requesterName}</span> ({loan.telegramHandle}) • <span className="text-stone-400">{loan.committee}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${
                      loan.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : loan.status === 'collected'
                        ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>

                {/* Dates */}
                <div className="bg-[#181c24] border border-[#282d38] p-2 rounded-lg text-[11px] text-stone-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{loan.startDate} ({loan.startTime}) to {loan.endDate} ({loan.endTime})</span>
                  </div>
                </div>

                {/* Gear breakdown */}
                <div className="bg-[#121419] border border-[#232731] p-2.5 rounded-lg text-[11px] space-y-1">
                  <div>
                    <span className="text-stone-400">Package: </span>
                    <span className="text-stone-200 font-semibold">{loan.basePackage || 'Set A'}</span>
                  </div>
                  {loan.equipmentList && loan.equipmentList.length > 0 && (
                    <div className="text-stone-300">
                      <span className="text-stone-400">Items: </span>
                      {loan.equipmentList.join('; ')}
                    </div>
                  )}
                  {loan.additionalNotes && (
                    <div className="text-stone-400 italic text-[10px]">
                      Notes: {loan.additionalNotes}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#232731]">
                  {loan.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateLoanStatus(loan.id, 'rejected')}
                        className="px-2.5 py-1 rounded-lg text-[11px] text-red-400 hover:bg-red-950/40 border border-red-900/30"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateLoanStatus(loan.id, 'approved')}
                        className="px-3 py-1 rounded-lg text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        Approve Loan
                      </button>
                    </>
                  )}

                  {loan.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateLoanStatus(loan.id, 'collected')}
                      className="px-3 py-1 rounded-lg text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    >
                      Mark Collected
                    </button>
                  )}

                  {loan.status === 'collected' && (
                    <button
                      onClick={() => handleUpdateLoanStatus(loan.id, 'returned')}
                      className="px-3 py-1 rounded-lg text-[11px] bg-stone-200 hover:bg-white text-stone-900 font-semibold"
                    >
                      Mark Returned
                    </button>
                  )}
                </div>
              </div>
            ))}

            {activeLoans.length === 0 && (
              <div className="col-span-2 text-center p-8 bg-[#14171d] border border-[#242933] rounded-xl text-stone-500 text-xs">
                No active or upcoming equipment loans recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PAST LOANS                                         */}
      {/* ========================================================= */}
      {activeTab === 'past_loans' && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
            Past Loans Archive ({pastLoans.length})
          </h2>

          <div className="space-y-2">
            {pastLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-[#14171d] border border-[#242933] rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs opacity-85 hover:opacity-100 transition-opacity"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-200">{loan.purpose || loan.eventName}</span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded capitalize ${
                        loan.status === 'returned'
                          ? 'bg-stone-800 text-emerald-400'
                          : 'bg-red-950/60 text-red-400'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">
                    👤 {loan.requesterName} ({loan.telegramHandle}) • 📅 {loan.startDate} to {loan.endDate}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    Gear: {loan.basePackage} {loan.equipmentList?.length ? `• ${loan.equipmentList.join(', ')}` : ''}
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 font-mono">
                  Completed / Archived
                </div>
              </div>
            ))}

            {pastLoans.length === 0 && (
              <div className="text-center p-8 bg-[#14171d] border border-[#242933] rounded-xl text-stone-500 text-xs">
                No archived loans yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ROOM CHECK-OUT PHOTOS                              */}
      {/* ========================================================= */}
      {activeTab === 'checkouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Room Check-Out Photos ({checkouts.length})
              </h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Sent by residents on Telegram when checking out of The Abbey.
              </p>
            </div>
            <button
              onClick={() => setShowAddPhotoModal(true)}
              className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-900 font-semibold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Check-out Record</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {checkouts.map((chk) => (
              <div
                key={chk.id}
                onClick={() => setSelectedPhoto(chk)}
                className="group cursor-pointer bg-[#14171d] border border-[#242933] hover:border-stone-400 rounded-xl overflow-hidden transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="relative w-full aspect-[4/3] bg-stone-900 overflow-hidden">
                  <Image
                    src={chk.photoUrl}
                    alt="Checkout photo"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View Photo
                    </span>
                  </div>
                </div>

                <div className="p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200">{chk.residentName}</span>
                    <span className="text-[10px] text-stone-500">{chk.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-stone-400">{chk.telegramHandle}</div>
                  {chk.notes && (
                    <div className="text-[10px] text-stone-400 bg-[#181c24] p-1.5 rounded mt-1 truncate">
                      {chk.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {checkouts.length === 0 && (
              <div className="col-span-3 text-center p-8 bg-[#14171d] border border-[#242933] rounded-xl text-stone-500 text-xs">
                No room check-out photos recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: LICENSING REGISTRY                                 */}
      {/* ========================================================= */}
      {activeTab === 'registry' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Single Add Form */}
            <div className="lg:col-span-5 bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-stone-400" />
                <span>Register Single Member</span>
              </h3>

              <form onSubmit={handleAddMember} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rachel Tan"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-300 mb-1">
                    Telegram Handle <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@racheltan"
                    value={regHandle}
                    onChange={(e) => setRegHandle(e.target.value)}
                    required
                    className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-300 mb-1">
                      NUS Email
                    </label>
                    <input
                      type="email"
                      placeholder="e0123456@u.nus.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-300 mb-1">
                      Date Registered
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={regDate}
                      onChange={(e) => setRegDate(e.target.value)}
                      className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-900 font-semibold transition-colors mt-2"
                >
                  Save Licensed Member
                </button>
              </form>
            </div>

            {/* Batch Add Handles */}
            <div className="lg:col-span-7 bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <span>Batch Register Telegram Handles</span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Paste handles from the Abbey group or workshop roster (space or line separated).
              </p>

              <textarea
                rows={4}
                placeholder="@handle1 @handle2 @handle3 ..."
                value={batchHandles}
                onChange={(e) => setBatchHandles(e.target.value)}
                className="w-full bg-[#181c24] border border-[#282d38] rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400 resize-none font-mono"
              />

              <button
                type="button"
                onClick={handleBatchAdd}
                disabled={isSubmittingBatch || !batchHandles.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#202633] hover:bg-[#2b3345] text-stone-200 text-xs font-medium border border-[#30384a] disabled:opacity-40 transition-colors"
              >
                {isSubmittingBatch ? 'Saving...' : 'Batch Register Handles'}
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-[#14171d] border border-[#242933] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-200">
                Licensed Members List ({licensedUsers.length})
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Filter name or handle..."
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg pl-8 pr-2.5 py-1 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-[#232731] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232731] bg-[#161921] text-stone-400">
                    <th className="py-2.5 px-3 font-medium">Name</th>
                    <th className="py-2.5 px-3 font-medium">Telegram Handle</th>
                    <th className="py-2.5 px-3 font-medium">Date Registered</th>
                    <th className="py-2.5 px-3 font-medium">License AY</th>
                    <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222b]">
                  {licensedUsers
                    .filter(
                      (u) =>
                        !regSearch ||
                        u.name.toLowerCase().includes(regSearch.toLowerCase()) ||
                        u.telegramHandle.toLowerCase().includes(regSearch.toLowerCase())
                    )
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-[#181c24] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-stone-200">{user.name}</td>
                        <td className="py-2.5 px-3 text-stone-300 font-mono text-[11px]">
                          {user.telegramHandle}
                        </td>
                        <td className="py-2.5 px-3 text-stone-300 font-mono text-[11px]">
                          {user.dateRegistered || (user.telegramHandle?.toLowerCase().includes('mezyyy') ? '19/08/2026' : '19/08/2026')}
                        </td>
                        <td className="py-2.5 px-3 text-stone-400">{user.licenseAY || 'AY26/27'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteLicense(user.id)}
                            className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            title="Delete License"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
