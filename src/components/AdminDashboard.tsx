'use client';

import React, { useState } from 'react';
import { Booking, LicensedUser, TembusuHouse } from '@/lib/types';
import {
  ShieldCheck,
  Sparkles,
  Users,
  Camera,
  Search,
  Plus,
  Key,
  CheckCircle2,
  Trash2,
  Download,
} from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  licensedUsers: LicensedUser[];
  onAddLicense: (user: Omit<LicensedUser, 'id'>) => void;
  onDeleteLicense: (id: string) => void;
  isConcertMode: boolean;
  onToggleConcertMode: () => void;
}

export default function AdminDashboard({
  bookings,
  licensedUsers,
  onAddLicense,
  onDeleteLicense,
  isConcertMode,
  onToggleConcertMode,
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New License Form state
  const [newName, setNewName] = useState('');
  const [newTele, setNewTele] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newHouse, setNewHouse] = useState<TembusuHouse>('Shan');

  // Filtered licenses
  const filteredUsers = licensedUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.telegramHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nusEmail.toLowerCase().includes(searchTerm.toLowerCase());
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

  const claimedDoorCount = bookings.filter((b) => b.doorOpenerHandle).length;
  const photoCheckouts = bookings.filter((b) => b.status === 'checked_out');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Bookings</div>
          <div className="text-2xl font-bold text-white mt-1">{bookings.length}</div>
          <div className="text-[11px] text-amber-400 mt-1">This semester</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Arts CC Duty Claim Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {bookings.length > 0 ? Math.round((claimedDoorCount / bookings.length) * 100) : 100}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Door openers automated</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Licensed Musicians</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{licensedUsers.length}</div>
          <div className="text-[11px] text-sky-400/80 mt-1">AY26/27 Certified</div>
        </div>

        {/* Concert Mode Switcher */}
        <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Concert Crunch Mode</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-bold ${isConcertMode ? 'text-red-400' : 'text-slate-400'}`}>
              {isConcertMode ? 'ACTIVE (Prioritize Bands)' : 'OFF (Normal FCFS)'}
            </span>
            <button
              onClick={onToggleConcertMode}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                isConcertMode
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-[#21262d] text-slate-300 hover:text-white border border-[#30363d]'
              }`}
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      {/* License Roster Management */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>AY26/27 Abbey Licensing Registry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Only residents with an active AY license are authorized to book The Abbey.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Licensed Member</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, @telegram, or NUS email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
        <div className="border border-[#30363d] rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-slate-400 border-b border-[#30363d]">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Telegram Handle</th>
                <th className="p-3">House</th>
                <th className="p-3">License Period</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#21262d]/50 transition-colors">
                  <td className="p-3 font-medium text-white">{user.name}</td>
                  <td className="p-3 font-mono text-amber-300">{user.telegramHandle}</td>
                  <td className="p-3 text-slate-300">{user.house}</td>
                  <td className="p-3 text-slate-400">{user.licenseAY}</td>
                  <td className="p-3">
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Active
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDeleteLicense(user.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
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

      {/* Upkeep & Check-out Photo Log Audit */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-400" />
          <span>Abbey Upkeep & Photo Audit Stream</span>
        </h2>
        <p className="text-xs text-slate-400">
          Timestamped photo submissions sent by bands via Telegram upon ending their sessions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {photoCheckouts.length > 0 ? (
            photoCheckouts.map((b) => (
              <div
                key={b.id}
                className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-16 h-16 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                  📸
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white">{b.bandName}</div>
                  <div className="text-slate-400">
                    Booker: {b.residentName} ({b.telegramHandle})
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    ✓ Clean room verified at {b.endTime}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-xs text-slate-500 bg-[#0d1117] rounded-xl border border-[#30363d]">
              No photo check-outs logged yet today. Use the Telegram Duty Drawer to simulate one!
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Licensed Member</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Student Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jeremy Tan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Telegram Handle *</label>
                <input
                  type="text"
                  placeholder="@telegram"
                  value={newTele}
                  onChange={(e) => setNewTele(e.target.value)}
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">NUS Email</label>
                <input
                  type="email"
                  placeholder="e0123456@u.nus.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">House</label>
                <select
                  value={newHouse}
                  onChange={(e) => setNewHouse(e.target.value as TembusuHouse)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
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
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
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
