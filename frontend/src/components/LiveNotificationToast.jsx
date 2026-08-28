import React from 'react';
import { Bell, X, Activity, Bed, FlaskConical, AlertTriangle } from 'lucide-react';

export const LiveNotificationToast = ({ notification, onClose }) => {
  if (!notification) return null;

  const getIcon = (table) => {
    switch (table) {
      case 'Bed':
        return <Bed className="w-4 h-4 text-emerald-600" />;
      case 'LabOrder':
        return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case 'ConflictLog':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl backdrop-blur-md flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0">
          {getIcon(notification.table)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 font-mono">
              Live Event: {notification.table}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{notification.timestamp}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800 leading-snug">
            {notification.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
