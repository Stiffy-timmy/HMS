import React, { useState } from 'react';
import { 
  AlertTriangle, 
  IndianRupee, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  ArrowUpRight,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { conflictApi } from '../api';

export const ConflictPanel = ({ 
  conflicts = [], 
  revenueAtRisk = 0, 
  title = "Active Data Conflicts",
  onConflictResolved,
  onViewAll
}) => {
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedConflict, setSelectedConflict] = useState(null);

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
        return 'Physical Bed Occupied, System Empty';
      case 'discharge_bed_mismatch':
        return 'Discharge recorded, patient still present';
      case 'lab_unbilled':
        return 'Unbilled Labs (48h+ delay)';
      case 'occupied_no_billing':
        return 'Occupied Bed without Billing Encounter';
      default:
        return type ? type.replace(/_/g, ' ') : 'Data Desync';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return {
          label: 'CRITICAL',
          className: 'bg-red-50 text-red-700 border border-red-200'
        };
      case 'under_review':
        return {
          label: 'WARNING',
          className: 'bg-amber-50 text-amber-700 border border-amber-200'
        };
      case 'resolved':
        return {
          label: 'RESOLVED',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        };
      default:
        return {
          label: 'PENDING',
          className: 'bg-slate-100 text-slate-700 border border-slate-200'
        };
    }
  };

  const handleQuickResolve = async (conflictId) => {
    setResolvingId(conflictId);
    try {
      const updated = await conflictApi.resolveConflict(conflictId, {
        resolution_notes: 'Resolved via single reconciled executive action.'
      });
      if (onConflictResolved) {
        onConflictResolved(updated);
      }
      setSelectedConflict(null);
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const openCount = conflicts.filter(c => c.status !== 'resolved').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header matching White Screenshot */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {openCount} Open
            </span>
          </div>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            View All
          </button>
        )}
      </div>

      {/* Conflicts Table matching White Screenshot layout */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-5">LOCATION / ID</th>
              <th className="py-3 px-4">ISSUE TYPE</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-5 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {conflicts.map((item) => {
              const statusInfo = getStatusBadge(item.status);
              const isResolved = item.status === 'resolved';

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Location / ID */}
                  <td className="py-3.5 px-5 font-semibold text-slate-800">
                    <span className="font-mono text-slate-900 font-bold">
                      {item.bed_id ? `Bed-${item.bed_id}` : item.patient_stay_id ? `PT-${item.patient_stay_id}` : `CF-${item.id}`}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-normal">
                      {item.department || 'Ward Ops'}
                    </span>
                  </td>

                  {/* Issue Type */}
                  <td className="py-3.5 px-4 text-slate-600 font-medium max-w-xs">
                    <div className="truncate text-slate-800 font-medium">{getConflictTypeBadge(item.conflict_type)}</div>
                    <div className="text-[11px] text-slate-400 truncate">{item.description}</div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-5 text-right">
                    {isResolved ? (
                      <span className="text-emerald-600 text-xs font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={resolvingId === item.id}
                          onClick={() => handleQuickResolve(item.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {resolvingId === item.id ? 'Saving...' : 'Resolve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedConflict(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {conflicts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="font-semibold text-xs text-slate-700">Zero active operational conflicts!</p>
                  <p className="text-[11px] text-slate-400">All cross-department data is synchronized.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal Dialog */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold text-slate-900">Conflict Details & Audit</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Location / Entity:</span>
                <span className="text-slate-900 font-semibold">{selectedConflict.bed_id ? `Bed #${selectedConflict.bed_id}` : `Conflict #${selectedConflict.id}`} ({selectedConflict.department || 'Ward'})</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Issue Description:</span>
                <span className="text-slate-800">{selectedConflict.description}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Detected At:</span>
                <span className="font-mono text-slate-700">{new Date(selectedConflict.detected_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={resolvingId === selectedConflict.id}
                onClick={() => handleQuickResolve(selectedConflict.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] shadow-sm disabled:opacity-50"
              >
                {resolvingId === selectedConflict.id ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
