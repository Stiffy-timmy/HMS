import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  Calendar,
  BedDouble,
  LogOut,
  Search,
  Building,
  CheckCircle2,
  X,
  Filter,
  Layers,
  Hash,
  ChevronRight,
  Activity,
  Stethoscope
} from 'lucide-react';
import { stayApi } from '../api';

export const AdminPatientWardWidget = ({
  stays = [],
  onStayDischarged,
  onRefresh,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedStayForDischarge, setSelectedStayForDischarge] = useState(null);
  const [dischargingId, setDischargingId] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const handleDischargeConfirm = async () => {
    if (!selectedStayForDischarge) return;
    setDischargingId(selectedStayForDischarge.id);
    try {
      const updated = await stayApi.dischargePatient(selectedStayForDischarge.id);
      setSuccessBanner(
        `Patient ${selectedStayForDischarge.patient_name} discharged successfully from Bed #${selectedStayForDischarge.bed_id}!`
      );
      if (onStayDischarged) {
        onStayDischarged(updated);
      }
      setSelectedStayForDischarge(null);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      console.error('Discharge failed:', err);
      alert(err.response?.data?.detail || 'Failed to discharge patient');
    } finally {
      setDischargingId(null);
    }
  };

  // Department list from stays
  const deptList = useMemo(() => {
    const set = new Set();
    stays.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [stays]);

  // Filter logic
  const filteredStays = stays.filter((s) => {
    if (selectedDept !== 'ALL' && s.department !== selectedDept) return false;
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.patient_name?.toLowerCase().includes(q);
      const matchRef = s.patient_ref_id?.toLowerCase().includes(q);
      const matchBed = String(s.bed_id)?.includes(q);
      const matchWard = s.ward?.toLowerCase().includes(q);
      const matchDept = s.department?.toLowerCase().includes(q);
      return matchName || matchRef || matchBed || matchWard || matchDept;
    }
    return true;
  });

  // Summary stats
  const stats = useMemo(() => {
    const active = stays.filter((s) => s.status === 'active').length;
    const discharged = stays.filter((s) => s.status === 'discharged').length;
    const byDept = {};
    stays.forEach((s) => {
      if (s.status === 'active') {
        const d = s.department || 'Unassigned';
        byDept[d] = (byDept[d] || 0) + 1;
      }
    });
    return { active, discharged, byDept };
  }, [stays]);

  const getDeptColor = (dept) => {
    const d = (dept || '').toLowerCase();
    if (d.includes('cardio')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (d.includes('ortho')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (d.includes('neuro')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (d.includes('emergency')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hospital-Wide Patient Ward Status
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                {stays.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Administrative oversight of all admitted inpatients across hospital wards and bed assignments
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Status
          </button>
        )}
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Inpatients</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1 block">{stats.active}</span>
          <span className="text-[10px] text-emerald-600 font-medium">Currently admitted</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Discharged</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.discharged}</span>
          <span className="text-[10px] text-slate-500 font-medium">Completed encounters</span>
        </div>
        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80">
          <span className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider">Cardiology</span>
          <span className="text-2xl font-extrabold text-rose-800 mt-1 block">
            {stats.byDept['Cardiology'] || 0}
          </span>
          <span className="text-[10px] text-rose-600 font-medium">Active in dept</span>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
          <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">Orthopedics</span>
          <span className="text-2xl font-extrabold text-blue-800 mt-1 block">
            {stats.byDept['Orthopedics'] || 0}
          </span>
          <span className="text-[10px] text-blue-600 font-medium">Active in dept</span>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="flex-1">{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'active', 'discharged'].map((s) => {
            const count =
              s === 'ALL'
                ? stays.length
                : stays.filter((x) => x.status === s).length;
            const isSelected = selectedStatus === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A2540] text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{s === 'ALL' ? 'All Status' : s.toUpperCase()}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer appearance-none"
            >
              {deptList.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, ref ID, bed..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <th className="py-3 px-4 font-bold">PATIENT</th>
              <th className="py-3 px-4 font-bold">REF ID</th>
              <th className="py-3 px-4 font-bold">DEPARTMENT</th>
              <th className="py-3 px-4 font-bold">WARD / BED</th>
              <th className="py-3 px-4 font-bold">ADMITTED BY</th>
              <th className="py-3 px-4 font-bold">ADMITTED</th>
              <th className="py-3 px-4 font-bold">EXP. DISCHARGE</th>
              <th className="py-3 px-4 font-bold">STATUS</th>
              <th className="py-3 px-4 font-bold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStays.map((stay) => {
              const isActive = stay.status === 'active';
              return (
                <tr key={stay.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {stay.patient_name.charAt(0)}
                      </div>
                      <span>{stay.patient_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">
                    {stay.patient_ref_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getDeptColor(
                        stay.department
                      )}`}
                    >
                      <Stethoscope className="w-2.5 h-2.5" />
                      {stay.department || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-900">#{stay.bed_id}</span>
                    </div>
                    <span className="text-slate-500 block text-[11px] flex items-center gap-1 mt-0.5">
                      <Building className="w-2.5 h-2.5" />
                      {stay.ward}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-[11px] font-medium">
                        {stay.admitted_by_name || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(stay.admitted_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(stay.expected_discharge_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(
                        stay.status
                      )}`}
                    >
                      {stay.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => setSelectedStayForDischarge(stay)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Discharge</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredStays.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No patient stays match your filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try adjusting the search query or department selector
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Discharge Confirmation Modal */}
      {selectedStayForDischarge && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <LogOut className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Discharge Inpatient (Admin)</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStayForDischarge(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Patient:</span>
                <strong className="text-slate-900 text-sm">{selectedStayForDischarge.patient_name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Reference ID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedStayForDischarge.patient_ref_id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-slate-900">{selectedStayForDischarge.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-slate-900">
                  Bed #{selectedStayForDischarge.bed_id} ({selectedStayForDischarge.ward})
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              As administrator, discharging this patient will finalize their inpatient stay and transition the
              bed status to <strong className="text-purple-700 font-bold">Cleaning Pending</strong> for
              Housekeeping sanitation.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStayForDischarge(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={dischargingId === selectedStayForDischarge.id}
                onClick={handleDischargeConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {dischargingId === selectedStayForDischarge.id
                  ? 'Processing...'
                  : 'Confirm Patient Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
