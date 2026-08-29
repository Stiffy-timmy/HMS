import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  MapPin, 
  Activity, 
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  Calendar,
  UserCheck,
  Plus
} from 'lucide-react';
import { equipmentApi } from '../api';

const STATUS_CONFIG = {
  operational: {
    label: 'Running Fine',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2
  },
  maintenance: {
    label: 'Under Maintenance',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
    icon: Wrench
  },
  calibrating: {
    label: 'Calibration Due',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    dotClass: 'bg-cyan-500',
    icon: Clock
  },
  decommissioned: {
    label: 'Out of Order',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
    icon: AlertTriangle
  }
};

export const EquipmentGrid = ({ onDataChange, refreshKey }) => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected equipment for modal status edit
  const [selectedEq, setSelectedEq] = useState(null);
  const [editStatus, setEditStatus] = useState('operational');
  const [editNotes, setEditNotes] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const data = await equipmentApi.getEquipments();
      setEquipments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load equipments:', err);
      setError('Failed to load medical equipment inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [refreshKey]);

  const handleOpenEdit = (eq) => {
    setSelectedEq(eq);
    setEditStatus(eq.status);
    setEditNotes(eq.maintenance_notes || '');
    setEditRoom(eq.location_room || '');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!selectedEq) return;

    setUpdating(true);
    try {
      await equipmentApi.updateStatus(selectedEq.id, {
        status: editStatus,
        maintenance_notes: editNotes.trim(),
        location_room: editRoom.trim()
      });

      setSelectedEq(null);
      await fetchEquipments();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('Failed to update equipment status:', err);
      alert(err.response?.data?.detail || 'Failed to update equipment status.');
    } finally {
      setUpdating(false);
    }
  };

  // Filtered equipments
  const filtered = equipments.filter(eq => {
    const matchesStatus = filterStatus === 'ALL' || eq.status === filterStatus;
    const matchesDept = filterDept === 'ALL' || eq.department.toLowerCase().includes(filterDept.toLowerCase());
    const matchesSearch = !searchQuery.trim() || 
      eq.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.location_room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.category && eq.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesDept && matchesSearch;
  });

  const operationalCount = equipments.filter(e => e.status === 'operational').length;
  const maintenanceCount = equipments.filter(e => e.status === 'maintenance').length;
  const calibratingCount = equipments.filter(e => e.status === 'calibrating').length;

  return (
    <div className="space-y-4">
      {/* Top Controls: Filter Pills & Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `All (${equipments.length})` },
            { id: 'operational', label: `Running Fine (${operationalCount})`, color: 'text-emerald-700' },
            { id: 'maintenance', label: `Maintenance (${maintenanceCount})`, color: 'text-amber-700' },
            { id: 'calibrating', label: `Calibrating (${calibratingCount})`, color: 'text-cyan-700' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={filterStatus === f.id ? 'text-white' : f.color}>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Right side Search & Dept dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tag, device, room..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
            />
          </div>

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Orthopedics">Orthopedics</option>
          </select>

          <button
            onClick={fetchEquipments}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh Equipment Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading biomedical equipment matrix...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
          <Stethoscope className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No medical equipments found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(eq => {
            const cfg = STATUS_CONFIG[eq.status] || STATUS_CONFIG.operational;
            const StatusIcon = cfg.icon;

            return (
              <div
                key={eq.id}
                className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  {/* Top Bar: Asset Tag & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg tracking-wider">
                      {eq.asset_tag}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Device Name */}
                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {eq.equipment_name}
                  </h4>

                  {/* Category & Department */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                      {eq.category || 'General Device'}
                    </span>
                    <span>•</span>
                    <span className="text-[11px] font-medium text-slate-600">
                      {eq.department}
                    </span>
                  </div>

                  {/* Room Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <span className="text-slate-800 font-bold truncate">
                      {eq.location_room}
                    </span>
                  </div>

                  {/* Maintenance Notes (if any) */}
                  {eq.maintenance_notes && (
                    <div className="mt-2.5 text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 line-clamp-2 italic">
                      "{eq.maintenance_notes}"
                    </div>
                  )}
                </div>

                {/* Footer Actions & Last Inspection */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    <span>Inspected: </span>
                    <span className="text-slate-600 font-semibold">
                      {new Date(eq.last_inspected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(eq)}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer shadow-xs"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Update Status</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Equipment Status Modal */}
      {selectedEq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  Update Equipment Status
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEq.equipment_name} <span className="font-mono text-blue-600 font-bold">[{selectedEq.asset_tag}]</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedEq(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              {/* Status Radio Buttons */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Operating Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'operational', label: 'Running Fine', icon: CheckCircle2, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200' },
                    { id: 'maintenance', label: 'Under Maintenance', icon: Wrench, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-500 ring-2 ring-amber-200' },
                    { id: 'calibrating', label: 'Calibration Due', icon: Clock, color: 'text-cyan-600', activeBg: 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-200' },
                    { id: 'decommissioned', label: 'Out of Order', icon: AlertTriangle, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-500 ring-2 ring-rose-200' },
                  ].map(s => {
                    const Icon = s.icon;
                    const active = editStatus === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEditStatus(s.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? `${s.activeBg} text-slate-900 shadow-xs`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${s.color}`} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Room */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Current Room / Location *
                </label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={e => setEditRoom(e.target.value)}
                  placeholder="e.g. Cardiac ICU Room 1, Biomedical Workshop..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
                  required
                />
              </div>

              {/* Maintenance Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Technician / Maintenance Notes
                </label>
                <textarea
                  rows="3"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Details of inspection, sensor replacement, calibration certificate..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedEq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Status & Sync</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
