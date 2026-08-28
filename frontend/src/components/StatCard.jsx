import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', badge }) => {
  const colorMap = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      text: 'text-blue-600'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      text: 'text-emerald-600'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      text: 'text-rose-600'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      text: 'text-amber-600'
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      text: 'text-purple-600'
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      text: 'text-indigo-600'
    }
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${currentTheme.iconBg} shadow-xs`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

