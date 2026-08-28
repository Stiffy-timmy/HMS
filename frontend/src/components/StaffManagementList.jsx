import React from 'react';
import { Users, Shield, Stethoscope, CheckCircle, Mail, Building } from 'lucide-react';

export const StaffManagementList = ({ users = [], title = "Hospital Staff & HOD Directory" }) => {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">ADMIN</span>;
      case 'hod':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">HOD</span>;
      case 'staff':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">STAFF</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500">{users.length} active registered clinical accounts</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 font-bold">USER</th>
              <th className="py-3 px-4 font-bold">EMAIL</th>
              <th className="py-3 px-4 font-bold">ROLE</th>
              <th className="py-3 px-4 font-bold">DEPARTMENT</th>
              <th className="py-3 px-4 font-bold">REGISTERED PASSKEY</th>
              <th className="py-3 px-4 font-bold text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                    {u.full_name.charAt(0)}
                  </div>
                  <span>{u.full_name}</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{u.email}</td>
                <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                <td className="py-3.5 px-4 text-slate-700">{u.department || 'Hospital-Wide'}</td>
                <td className="py-3.5 px-4 font-mono text-[11px]">
                  {u.registered_passkey ? (
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                      {u.registered_passkey}
                    </span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
