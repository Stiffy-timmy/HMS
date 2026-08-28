import React from 'react';
import { History, ShieldCheck, Stethoscope, Users, Clock } from 'lucide-react';

export const ActivityFeed = ({ activities = [], title = "Real-Time Audit Trail" }) => {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />;
      case 'hod':
        return <Stethoscope className="w-3.5 h-3.5 text-blue-400" />;
      case 'staff':
      default:
        return <Users className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">Live operational change logs</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70 transition-colors flex items-start gap-3"
          >
            <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
              {getRoleIcon(act.user_role)}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                {act.action_description}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(act.timestamp).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No activity logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
