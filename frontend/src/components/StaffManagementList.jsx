import React from 'react';
import { Users, Shield, Stethoscope, CheckCircle, Mail, Building } from 'lucide-react';

export const StaffManagementList = ({ users = [], title = "Hospital Staff & HOD Directory" }) => {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">ADMIN</span>;
      case 'hod':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">HOD</span>;
      case 'staff':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">STAFF</span>;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">{users.length} active registered clinical accounts</p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-3 font-semibold">User</th>
              <th className="pb-3 font-semibold">Email</th>
              <th className="pb-3 font-semibold">Role</th>
              <th className="pb-3 font-semibold">Department</th>
              <th className="pb-3 font-semibold">Registered Passkey</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                    {u.full_name.charAt(0)}
                  </div>
                  <span>{u.full_name}</span>
                </td>
                <td className="py-3 font-mono text-slate-400">{u.email}</td>
                <td className="py-3">{getRoleBadge(u.role)}</td>
                <td className="py-3 text-slate-300">{u.department || 'Hospital-wide'}</td>
                <td className="py-3 font-mono text-[11px]">
                  {u.registered_passkey ? (
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-medicover-300">
                      {u.registered_passkey}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
