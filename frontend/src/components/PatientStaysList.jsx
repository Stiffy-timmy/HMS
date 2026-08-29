import React, { useState } from 'react';
import { 
  Users, 
  User, 
  Calendar, 
  BedDouble, 
  CheckCircle, 
  LogOut, 
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { stayApi } from '../api';

export const PatientStaysList = ({ 
  stays = [], 
  title = "Active Patient Inpatients",
  onStayDischarged 
}) => {
  const [selectedStayForDischarge, setSelectedStayForDischarge] = useState(null);
  const [dischargingId, setDischargingId] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  const handleDischargeConfirm = async () => {
    if (!selectedStayForDischarge) return;
    setDischargingId(selectedStayForDischarge.id);
    try {
      const updated = await stayApi.dischargePatient(selectedStayForDischarge.id);
      setSuccessBanner(`Patient ${selectedStayForDischarge.patient_name} discharged successfully from Bed #${selectedStayForDischarge.bed_id}!`);
      
      if (onStayDischarged) {
        onStayDischarged(updated);
      }
      setSelectedStayForDischarge(null);

      setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);
    } catch (err) {
      console.error("Discharge failed:", err);
      alert(err.response?.data?.detail || "Failed to discharge patient");
    } finally {
      setDischargingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500">{stays.length} admitted patient encounter records</p>
          </div>
        </div>
      </div>

      {successBanner && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 font-bold">PATIENT</th>
              <th className="py-3 px-4 font-bold">REF ID</th>
              <th className="py-3 px-4 font-bold">LOCATION / BED</th>
              <th className="py-3 px-4 font-bold">ADMITTED</th>
              <th className="py-3 px-4 font-bold">EXP. DISCHARGE</th>
              <th className="py-3 px-4 font-bold">STATUS</th>
              <th className="py-3 px-4 font-bold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stays.map((stay) => {
              const isActive = stay.status === 'active';

              return (
                <tr key={stay.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {stay.patient_name.charAt(0)}
                    </div>
                    <div>
                      <span>{stay.patient_name}</span>
                      {stay.admitted_by_name && (
                        <span className="block text-[10px] text-slate-400 font-normal">By {stay.admitted_by_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">{stay.patient_ref_id}</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="font-bold text-slate-900">Bed #{stay.bed_id}</span>
                    <span className="text-slate-500 block text-[11px]">{stay.ward}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(stay.admitted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(stay.expected_discharge_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
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

            {stays.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No active patient stays in ward.
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
                <h4 className="text-sm font-bold text-slate-900">Discharge Inpatient</h4>
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
                <span className="font-mono font-bold text-slate-800">{selectedStayForDischarge.patient_ref_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-slate-900">Bed #{selectedStayForDischarge.bed_id} ({selectedStayForDischarge.ward})</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Discharging will finalize this inpatient stay in ADT and automatically transition the bed status to <strong className="text-purple-700 font-bold">Cleaning Pending</strong> for Housekeeping sanitation.
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
                {dischargingId === selectedStayForDischarge.id ? 'Processing...' : 'Confirm Patient Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
