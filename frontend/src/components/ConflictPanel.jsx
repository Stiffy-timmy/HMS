import React from 'react';
import { 
  AlertTriangle, 
  IndianRupee, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export const ConflictPanel = ({ conflicts = [], revenueAtRisk = 0, title = "Data Conflicts & Operational Desync" }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const getConflictTypeBadge = (type) => {
    switch (type) {
      case 'bed_status_mismatch':
        return {
          label: 'Bed Status Mismatch',
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        };
      case 'discharge_bed_mismatch':
        return {
          label: 'Discharge / Bed Desync',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        };
      case 'lab_unbilled':
        return {
          label: 'Unbilled Lab Test',
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
        };
      case 'occupied_no_billing':
        return {
          label: 'Occupied Without Billing',
          bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30'
        };
      default:
        return {
          label: type.replace(/_/g, ' '),
          bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
        };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'under_review':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const openCount = conflicts.filter(c => c.status !== 'resolved').length;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">Cross-department disagreement tracking log</p>
          </div>
        </div>

        {/* Revenue at Risk Banner */}
        {revenueAtRisk > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300">
            <IndianRupee className="w-4 h-4 text-rose-400" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-rose-400 leading-none">Revenue At Risk</div>
              <div className="text-sm font-extrabold font-mono text-white leading-tight">{formatPrice(revenueAtRisk)}<span className="text-[10px] text-rose-400 font-normal">/day</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Conflict Log List */}
      <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {conflicts.map((item) => {
          const typeBadge = getConflictTypeBadge(item.conflict_type);
          const detectedDate = new Date(item.detected_at).toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-900/90 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${typeBadge.bg}`}>
                    {typeBadge.label}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getStatusBadge(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {detectedDate}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-slate-200">
                {item.description}
              </p>

              {/* Related metadata footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <div className="flex items-center gap-3">
                  {item.related_bed_id && (
                    <span>
                      Bed: <strong className="text-slate-200">#{item.related_bed_id}</strong> ({item.bed_ward})
                    </span>
                  )}
                  {item.patient_name && (
                    <span>
                      Patient: <strong className="text-slate-200">{item.patient_name}</strong>
                    </span>
                  )}
                </div>
                {item.assigned_to_name && (
                  <span className="text-slate-400">
                    Assigned: <strong className="text-slate-300">{item.assigned_to_name}</strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {conflicts.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
            <p className="text-xs">No active operational conflicts detected.</p>
          </div>
        )}
      </div>
    </div>
  );
};
