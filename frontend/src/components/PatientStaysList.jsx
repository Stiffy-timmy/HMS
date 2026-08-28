import React from 'react';
import { Users, User, Calendar, BedDouble, CheckCircle } from 'lucide-react';

export const PatientStaysList = ({ stays = [], title = "Active Patient Inpatients" }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500">{stays.length} active admitted encounters</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 font-bold">PATIENT</th>
              <th className="py-3 px-4 font-bold">REF ID</th>
              <th className="py-3 px-4 font-bold">LOCATION / BED</th>
              <th className="py-3 px-4 font-bold">ADMITTED</th>
              <th className="py-3 px-4 font-bold">EXP. DISCHARGE</th>
              <th className="py-3 px-4 font-bold text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stays.map((stay) => (
              <tr key={stay.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {stay.patient_name.charAt(0)}
                  </div>
                  <span>{stay.patient_name}</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{stay.patient_ref_id}</td>
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
                <td className="py-3.5 px-4 text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    stay.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {stay.status}
                  </span>
                </td>
              </tr>
            ))}

            {stays.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No active patient stays in ward.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
