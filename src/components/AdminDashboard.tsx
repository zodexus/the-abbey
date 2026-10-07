'use client';

import React, { useState } from 'react';
import { Booking, LicensedUser, TembusuHouse } from '@/lib/types';
import {
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Users,
  Camera,
  UploadCloud,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  licensedUsers: LicensedUser[];
  onAddLicense: (user: Omit<LicensedUser, 'id'>) => void;
  onBatchAddLicenses?: (users: Array<Omit<LicensedUser, 'id'>>) => void;
  onDeleteLicense: (id: string) => void;
  isConcertMode: boolean;
  onToggleConcertMode: () => void;
}

export default function AdminDashboard({
  bookings,
  licensedUsers,
  onAddLicense,
  onBatchAddLicenses,
  onDeleteLicense,
  isConcertMode,
  onToggleConcertMode,
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Single Add form state
  const [newName, setNewName] = useState('');
  const [newTele, setNewTele] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newHouse, setNewHouse] = useState<TembusuHouse>('Shan');

  // Batch import state
  const [batchText, setBatchText] = useState('');
  const [batchSuccessCount, setBatchSuccessCount] = useState<number | null>(null);

  // Filtered licenses
  const filteredUsers = licensedUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.telegramHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nusEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHouse = selectedHouse === 'All' || u.house === selectedHouse;
    return matchesSearch && matchesHouse;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTele) return;
    onAddLicense({
      name: newName,
      telegramHandle: newTele.startsWith('@') ? newTele : `@${newTele}`,
      nusEmail: newEmail,
      house: newHouse,
      licenseAY: 'AY26/27',
      status: 'active',
    });
    setNewName('');
    setNewTele('');
    setNewEmail('');
    setShowAddModal(false);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;

    // Split by commas, whitespace, newlines, or bullets
    const rawTokens = batchText.split(/[\s,;\n\r\t]+/);
    const validHandles = rawTokens
      .map((t) => t.trim())
      .filter((t) => t.length > 1)
      .map((t) => (t.startsWith('@') ? t : `@${t}`));

    // Deduplicate against existing handles and inside the batch
    const existingHandles = new Set(licensedUsers.map((u) => u.telegramHandle.toLowerCase()));
    const uniqueBatch = Array.from(new Set(validHandles)).filter(
      (h) => !existingHandles.has(h.toLowerCase())
    );

    if (uniqueBatch.length === 0) {
      setBatchSuccessCount(0);
      return;
    }

    const newUsers: Array<Omit<LicensedUser, 'id'>> = uniqueBatch.map((handle) => ({
      name: handle.replace('@', ''),
      telegramHandle: handle,
      nusEmail: '',
      house: 'Shan',
      licenseAY: 'AY26/27',
      status: 'active',
    }));

    if (onBatchAddLicenses) {
      onBatchAddLicenses(newUsers);
    } else {
      newUsers.forEach((u) => onAddLicense(u));
    }

    setBatchSuccessCount(uniqueBatch.length);
    setTimeout(() => {
      setBatchText('');
      setBatchSuccessCount(null);
      setShowBatchModal(false);
    }, 1200);
  };

  const photoCheckouts = bookings.filter((b) => b.status === 'checked_out');

  return (
    <div className="space-y-5 max-w-5xl mx-auto text-xs">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#14171d] border border-[#242933] p-3.5 rounded-xl shadow-sm">
          <div className="text-[11px] text-stone-400 font-medium">Bookings</div>
          <div className="text-xl font-bold text-stone-100 mt-0.5">{bookings.length}</div>
        </div>

        <div className="bg-[#14171d] border border-[#242933] p-3.5 rounded-xl shadow-sm">
          <div className="text-[11px] text-stone-400 font-medium">Licensed Members</div>
          <div className="text-xl font-bold text-stone-100 mt-0.5">{licensedUsers.length}</div>
        </div>

        <div className="bg-[#14171d] border border-[#242933] p-3.5 rounded-xl shadow-sm">
          <div className="text-[11px] text-stone-400 font-medium">Clean Room Photos</div>
          <div className="text-xl font-bold text-stone-100 mt-0.5">{photoCheckouts.length}</div>
        </div>

        <div className="bg-[#14171d] border border-[#242933] p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span>Concert Mode</span>
            <button
              onClick={onToggleConcertMode}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                isConcertMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#1b1f28] text-stone-400 border border-[#282d38]'
              }`}
            >
              {isConcertMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            {isConcertMode ? 'Bands prioritized' : 'Normal booking'}
          </div>
        </div>
      </div>

      {/* License Roster Management */}
      <div className="bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-stone-300" />
              <span>Licensing Registry</span>
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Verified members in Abbey Licensed group.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1e232d] hover:bg-[#252b37] text-stone-200 border border-[#2e3544] font-medium text-xs transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-stone-300" />
              <span>Batch Add Handles</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-white text-stone-950 font-medium text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, @handle, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#181c24] border border-[#282d38] rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
            />
          </div>

          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            className="bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-stone-400"
          >
            <option value="All">All Houses</option>
            <option value="Shan">Shan</option>
            <option value="Ora">Ora</option>
            <option value="Gaja">Gaja</option>
            <option value="Tancho">Tancho</option>
            <option value="Ponya">Ponya</option>
          </select>
        </div>

        {/* Registry Table */}
        <div className="border border-[#262b35] rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181c24] text-stone-400 border-b border-[#262b35]">
              <tr>
                <th className="p-2.5">Telegram Handle</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">House</th>
                <th className="p-2.5">License</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#212530]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#181c24]/50 transition-colors">
                  <td className="p-2.5 font-mono text-stone-200 font-medium">{user.telegramHandle}</td>
                  <td className="p-2.5 text-stone-300">{user.name}</td>
                  <td className="p-2.5 text-stone-400">{user.house}</td>
                  <td className="p-2.5 text-stone-400">{user.licenseAY}</td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => onDeleteLicense(user.id)}
                      className="p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors"
                      title="Remove License"
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

      {/* Upkeep & Check-out Photo Log */}
      <div className="bg-[#14171d] border border-[#242933] rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-stone-300" />
          <span>Room Check-out Photos</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {photoCheckouts.length > 0 ? (
            photoCheckouts.map((b) => (
              <div
                key={b.id}
                className="bg-[#181c24] border border-[#262b35] rounded-lg p-2.5 flex items-center gap-2.5"
              >
                <div className="w-12 h-12 rounded bg-[#202530] border border-[#2e3544] flex items-center justify-center text-xl flex-shrink-0">
                  📸
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-stone-200">{b.bandName}</div>
                  <div className="text-stone-400 text-[11px]">
                    {b.residentName} ({b.telegramHandle})
                  </div>
                  <div className="text-[10px] text-emerald-400">
                    Checked out at {b.endTime}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-4 text-xs text-stone-500 bg-[#181c24] rounded-lg border border-[#262b35]">
              No room photos logged yet today.
            </div>
          )}
        </div>
      </div>

      {/* Batch Import Handles Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14171d] border border-[#282d38] rounded-2xl p-4 w-full max-w-lg shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#242933] pb-3">
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-stone-300" />
                <span>Batch Add Handles from Abbey Licensed</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">
                  Paste Telegram Handles (separated by spaces, commas, or newlines)
                </label>
                <textarea
                  rows={6}
                  placeholder={`@sarah_arts, @marcus_jam\n@alex_drummer\n@chloe_vox`}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg p-2.5 text-xs text-stone-200 font-mono placeholder-stone-500 focus:outline-none focus:border-stone-400"
                  required
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Existing handles will automatically be skipped to prevent duplicates.
                </p>
              </div>

              {batchSuccessCount !== null && (
                <div className="bg-[#152119] border border-emerald-600/30 text-emerald-300 p-2.5 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {batchSuccessCount > 0
                      ? `Successfully imported ${batchSuccessCount} handles into the registry!`
                      : 'All handles already exist in the registry.'}
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-3 py-1.5 text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-stone-200 hover:bg-white text-stone-950 font-medium rounded-lg shadow-sm transition-colors"
                >
                  Import Handles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14171d] border border-[#282d38] rounded-2xl p-4 w-full max-w-md shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#242933] pb-3">
              <h3 className="text-sm font-semibold text-stone-100">Add Licensed Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-medium mb-1">Telegram Handle *</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={newTele}
                  onChange={(e) => setNewTele(e.target.value)}
                  required
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Jeremy Tan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-medium mb-1">House</label>
                <select
                  value={newHouse}
                  onChange={(e) => setNewHouse(e.target.value as TembusuHouse)}
                  className="w-full bg-[#181c24] border border-[#282d38] rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-stone-400"
                >
                  <option value="Shan">Shan</option>
                  <option value="Ora">Ora</option>
                  <option value="Gaja">Gaja</option>
                  <option value="Tancho">Tancho</option>
                  <option value="Ponya">Ponya</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-stone-200 hover:bg-white text-stone-950 font-medium rounded-lg shadow-sm transition-colors"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
