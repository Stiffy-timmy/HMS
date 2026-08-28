import React, { useState } from 'react';
import { 
  Bed as BedIcon, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  Wrench, 
  Filter, 
  Search, 
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { bedApi } from '../api';

export const BedGrid = ({ beds, onBedUpdated, title = "Live Bed Occupancy Grid", subtitle = "Interactive real-time bed management matrix" }) => {
  const [selectedBed, setSelectedBed] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          badgeClass: 'status-badge-available',
          cardBg: 'border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-950/10 hover:bg-emerald-950/20',
          indicator: 'bg-emerald-500',
          icon: CheckCircle2
        };
      case 'occupied':
        return {
          label: 'Occupied',
          badgeClass: 'status-badge-occupied',
          cardBg: 'border-rose-500/30 hover:border-rose-400/60 bg-rose-950/10 hover:bg-rose-950/20',
          indicator: 'bg-rose-500',
          icon: UserCheck
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeClass: 'status-badge-reserved',
          cardBg: 'border-amber-500/30 hover:border-amber-400/60 bg-amber-950/10 hover:bg-amber-950/20',
          indicator: 'bg-amber-500',
          icon: Clock
        };
      case 'maintenance':
      default:
        return {
          label: 'Maintenance',
          badgeClass: 'status-badge-maintenance',
          cardBg: 'border-slate-600/40 hover:border-slate-500/70 bg-slate-900/30 hover:bg-slate-900/50',
          indicator: 'bg-slate-500',
          icon: Wrench
        };
    }
  };

  const filteredBeds = beds.filter((bed) => {
    if (statusFilter !== 'all' && bed.current_status !== statusFilter) return false;
    if (typeFilter !== 'all' && bed.room_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchWard = bed.ward.toLowerCase().includes(q);
      const matchDept = bed.department.toLowerCase().includes(q);
      const matchId = String(bed.id).includes(q);
      if (!matchWard && !matchDept && !matchId) return false;
    }
    return true;
  });

  const handleStatusChange = async (newStatus) => {
    if (!selectedBed || selectedBed.current_status === newStatus) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await bedApi.updateStatus(selectedBed.id, newStatus);
      if (onBedUpdated) {
        onBedUpdated(updated);
      }
      setSelectedBed(null);
    } catch (err) {
      console.error("Failed to update bed:", err);
      setError(err.response?.data?.detail || "Failed to update bed status");
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BedIcon className="w-5 h-5 text-medicover-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ward or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-medicover-500"
          >
            <option value="all">All Statuses ({beds.length})</option>
            <option value="available">Available ({beds.filter(b => b.current_status === 'available').length})</option>
            <option value="occupied">Occupied ({beds.filter(b => b.current_status === 'occupied').length})</option>
            <option value="reserved">Reserved ({beds.filter(b => b.current_status === 'reserved').length})</option>
            <option value="maintenance">Maintenance ({beds.filter(b => b.current_status === 'maintenance').length})</option>
          </select>

          {/* Room Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-medicover-500"
          >
            <option value="all">All Room Types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="triple">Triple</option>
            <option value="icu">ICU</option>
          </select>
        </div>
      </div>

      {/* Grid of Bed Cards */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredBeds.map((bed) => {
          const info = getStatusBadge(bed.current_status);
          const StatusIcon = info.icon;

          return (
            <div
              key={bed.id}
              onClick={() => setSelectedBed(bed)}
              className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${info.cardBg}`}
            >
              {/* Top row: Bed # and Status pill */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${info.indicator}`} />
                  BED #{bed.id}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${info.badgeClass}`}>
                  {info.label}
                </span>
              </div>

              {/* Middle row: Ward & Department */}
              <div className="mt-2.5">
                <div className="text-sm font-semibold text-slate-200 group-hover:text-white truncate" title={bed.ward}>
                  {bed.ward}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {bed.department} &bull; <span className="uppercase text-[11px] font-medium text-slate-300">{bed.room_type}</span>
                </div>
              </div>

              {/* Bottom row: Price / day & Action hint */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-mono font-medium text-medicover-300">
                  {formatPrice(bed.price_per_day)}<span className="text-[10px] text-slate-500">/day</span>
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-medicover-400 flex items-center gap-0.5">
                  Change <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          );
        })}

        {filteredBeds.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <BedIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No beds match the selected filters.</p>
          </div>
        )}
      </div>

      {/* Bed Status Update Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedBed(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-medicover-500/20 border border-medicover-500/40 flex items-center justify-center text-medicover-400">
                <BedIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Update Bed #{selectedBed.id} Status</h4>
                <p className="text-xs text-slate-400">{selectedBed.ward} &bull; {selectedBed.department}</p>
              </div>
            </div>

            {/* Bed Specs */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Room Type:</span>
                <span className="font-semibold text-slate-200 uppercase">{selectedBed.room_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Billing Rate:</span>
                <span className="font-mono font-bold text-emerald-400">{formatPrice(selectedBed.price_per_day)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getStatusBadge(selectedBed.current_status).badgeClass}`}>
                  {selectedBed.current_status}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Status Options */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-slate-300 mb-2 block">
                Select New Status (Instant Live Broadcast):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'available', label: 'Available', color: 'hover:border-emerald-500 hover:bg-emerald-950/30 text-emerald-300' },
                  { id: 'occupied', label: 'Occupied', color: 'hover:border-rose-500 hover:bg-rose-950/30 text-rose-300' },
                  { id: 'reserved', label: 'Reserved', color: 'hover:border-amber-500 hover:bg-amber-950/30 text-amber-300' },
                  { id: 'maintenance', label: 'Maintenance', color: 'hover:border-slate-500 hover:bg-slate-800/60 text-slate-300' },
                ].map((s) => (
                  <button
                    key={s.id}
                    disabled={updating}
                    onClick={() => handleStatusChange(s.id)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                      selectedBed.current_status === s.id
                        ? 'border-medicover-500 bg-medicover-500/15 text-white ring-1 ring-medicover-500'
                        : `border-slate-700 bg-slate-800/50 ${s.color}`
                    } disabled:opacity-50`}
                  >
                    <span className="capitalize">{s.label}</span>
                    {selectedBed.current_status === s.id && (
                      <span className="text-[10px] text-medicover-400 font-normal">(Current)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
