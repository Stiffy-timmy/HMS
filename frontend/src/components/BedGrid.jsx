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
  ArrowRight,
  TrendingUp,
  Building
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
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          cardBorder: 'border-l-4 border-l-emerald-500 hover:border-slate-300',
          indicator: 'bg-emerald-500',
          icon: CheckCircle2
        };
      case 'occupied':
        return {
          label: 'Occupied',
          badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
          cardBorder: 'border-l-4 border-l-rose-500 hover:border-slate-300',
          indicator: 'bg-rose-500',
          icon: UserCheck
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
          cardBorder: 'border-l-4 border-l-amber-500 hover:border-slate-300',
          indicator: 'bg-amber-500',
          icon: Clock
        };
      case 'maintenance':
      default:
        return {
          label: 'Maintenance',
          badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
          cardBorder: 'border-l-4 border-l-slate-400 hover:border-slate-300',
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
      const matchWard = (bed.ward || '').toLowerCase().includes(q);
      const matchDept = (bed.department || '').toLowerCase().includes(q);
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
    }).format(price || 0);
  };

  const counts = {
    all: beds.length,
    available: beds.filter(b => b.current_status === 'available').length,
    occupied: beds.filter(b => b.current_status === 'occupied').length,
    reserved: beds.filter(b => b.current_status === 'reserved').length,
    maintenance: beds.filter(b => b.current_status === 'maintenance').length,
  };

  return (
    <div className="space-y-5">
      {/* Controls & Filter Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'available'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200'
            }`}
          >
            Available ({counts.available})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('occupied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'occupied'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200'
            }`}
          >
            Occupied ({counts.occupied})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('reserved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'reserved'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200'
            }`}
          >
            Reserved ({counts.reserved})
          </button>
        </div>
      </div>

      {/* Bed Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const status = getStatusBadge(bed.current_status);
          const Icon = status.icon;

          return (
            <div
              key={bed.id}
              onClick={() => setSelectedBed(bed)}
              className={`bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${status.cardBorder}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    <BedIcon className="w-4 h-4 text-slate-400" />
                    Bed #{bed.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${status.badgeClass}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Ward / Floor:</span>
                    <strong className="text-slate-800">{bed.ward}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Department:</span>
                    <strong className="text-slate-800">{bed.department}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Room Type:</span>
                    <strong className="text-blue-600 uppercase font-semibold">{bed.room_type}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-900">
                  {formatPrice(bed.price_per_day)}<span className="text-[10px] text-slate-400 font-normal">/day</span>
                </span>
                <span className="text-[11px] text-blue-600 font-semibold hover:underline">
                  Action &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBeds.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
          <BedIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No beds found matching filters.</p>
        </div>
      )}

      {/* Bed Status Update Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BedIcon className="w-5 h-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">Bed #{selectedBed.id} Controls</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ward: <strong className="text-slate-800">{selectedBed.ward}</strong> &bull; Dept: <strong className="text-slate-800">{selectedBed.department}</strong>
            </p>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Change Status:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('available')}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Available
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('occupied')}
                  className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Occupied
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('reserved')}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reserved
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('maintenance')}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Maintenance
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
