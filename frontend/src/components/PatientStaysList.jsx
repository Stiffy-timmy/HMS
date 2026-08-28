import React from 'react';
import { Users, User, Calendar, BedDouble, CheckCircle } from 'lucide-react';

export const PatientStaysList = ({ stays = [], title = "Active Patient Stays" }) => {
  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">{stays.length} admitted encounters</p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-3 font-semibold">Patient</th>
              <th className="pb-3 font-semibold">Ref ID</th>
              <th className="pb-3 font-semibold">Location / Bed</th>
              <th className="pb-3 font-semibold">Admitted</th>
              <th className="pb-3 font-semibold">Exp. Discharge</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {stays.map((stay) => (
              <tr key={stay.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                    {stay.patient_name.charAt(0)}
                  </div>
                  <span>{stay.patient_name}</span>
                </td>
                <td className="py-3 font-mono text-slate-400">{stay.patient_ref_id}</td>
                <td className="py-3 text-slate-300">
                  <span className="font-semibold text-white">Bed #{stay.bed_id}</span>
                  <span className="text-slate-400 block text-[11px]">{stay.ward}</span>
                </td>
                <td className="py-3 text-slate-400">
                  {new Date(stay.admitted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </td>
                <td className="py-3 text-slate-400">
                  {new Date(stay.expected_discharge_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    stay.status === 'active' 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {stay.status}
                  </span>
                </td>
              </tr>
            ))}

            {stays.length === 0 && (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-500">
                  No active patient stays found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
