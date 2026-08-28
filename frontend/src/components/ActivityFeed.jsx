import React from 'react';
import { History, ShieldCheck, Stethoscope, Users, Clock, Radio, Activity, ArrowRight } from 'lucide-react';

export const ActivityFeed = ({ 
  activities = [], 
  title = "LIVE STAFF ACTIVITY", 
  onViewAll 
}) => {
  const getNodeColor = (role, action = '') => {
    const act = action.toLowerCase();
    if (act.includes('conflict') || act.includes('mismatch') || act.includes('alert')) {
      return {
        dot: 'bg-rose-500 ring-4 ring-rose-100',
        text: 'text-rose-600'
      };
    }
    if (role === 'admin') {
      return {
        dot: 'bg-purple-600 ring-4 ring-purple-100',
        text: 'text-purple-600'
      };
    }
    if (role === 'hod') {
      return {
        dot: 'bg-blue-600 ring-4 ring-blue-100',
        text: 'text-blue-600'
      };
    }
    return {
      dot: 'bg-sky-500 ring-4 ring-sky-100',
      text: 'text-sky-600'
    };
  };

  const formatRelativeTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header matching White Screenshot */}
      <div>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live</span>
          </div>
        </div>

        {/* Timeline list */}
        <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
          {activities.slice(0, 8).map((act, index) => {
            const nodeStyle = getNodeColor(act.user_role, act.action_description);
            const timeStr = formatRelativeTime(act.timestamp);
            const deptStr = act.department || (act.user_role === 'admin' ? 'HQ' : 'Ward');

            return (
              <div key={act.id || index} className="flex items-start gap-3 relative group">
                {/* Timeline node */}
                <div className="mt-1 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${nodeStyle.dot}`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 font-medium leading-snug">
                    {act.action_description}
                  </p>
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                    {timeStr} &bull; {deptStr}
                  </p>
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <Activity className="w-6 h-6 mx-auto mb-1.5 opacity-60 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">No recent operational logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA Button matching White Screenshot */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-center tracking-wider uppercase cursor-pointer"
        >
          View Full Audit Log &rarr;
        </button>
      </div>
    </div>
  );
};
