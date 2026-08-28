import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', badge }) => {
  const colorMap = {
    blue: {
      glow: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      border: 'hover:border-blue-500/40',
      text: 'text-blue-400'
    },
    emerald: {
      glow: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      border: 'hover:border-emerald-500/40',
      text: 'text-emerald-400'
    },
    rose: {
      glow: 'from-rose-500/20 to-rose-600/5',
      iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      border: 'hover:border-rose-500/40',
      text: 'text-rose-400'
    },
    amber: {
      glow: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      border: 'hover:border-amber-500/40',
      text: 'text-amber-400'
    },
    purple: {
      glow: 'from-purple-500/20 to-purple-600/5',
      iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      border: 'hover:border-purple-500/40',
      text: 'text-purple-400'
    },
    indigo: {
      glow: 'from-indigo-500/20 to-indigo-600/5',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
      border: 'hover:border-indigo-500/40',
      text: 'text-indigo-400'
    }
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden rounded-2xl glass-panel p-5 glass-panel-hover ${currentTheme.border}`}>
      {/* Background soft glow gradient */}
      <div className={`absolute -right-6 -bottom-6 w-28 h-28 bg-gradient-to-br ${currentTheme.glow} rounded-full blur-2xl pointer-events-none`} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{value}</span>
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-400 font-medium flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl border ${currentTheme.iconBg} shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
