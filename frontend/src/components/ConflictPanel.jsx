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
  ExternalLink,
  ShieldCheck,
  Bed as BedIcon,
  UserCheck
} from 'lucide-react';
import { conflictApi } from '../api';

export const ConflictPanel = ({ 
  conflicts = [], 
  revenueAtRisk = 0, 
  title = "Active Data Conflicts",
  onConflictResolved,
  onViewAll
}) => {
  const [resolvingConflict, setResolvingConflict] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);
  const [reviewingConflict, setReviewingConflict] = useState(null);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const getConflictTypeBadge = (type) => {
    switch (type) {
      case 'occupied_no_billing':
        return 'Occupied Bed without Billing (CF-3)';
      case 'lab_unbilled':
        return 'Unbilled Completed Lab (CF-2)';
      case 'housekeeping_delay':
        return 'Housekeeping Sanitization Pending (CF-4)';
      case 'discharge_billing_mismatch':
        return 'Discharge / Billing Timing Mismatch (CF-5)';
      case 'bed_status_mismatch':
        return 'Bed Status Desync';
      case 'discharge_bed_mismatch':
        return 'Discharge Bed Desync';
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

  const getResolutionActionInfo = (conflict) => {
    if (!conflict) return { label: 'Resolve Conflict', action: 'Update Record', buttonText: 'Confirm Resolution' };
    switch (conflict.conflict_type) {
      case 'housekeeping_delay':
        return {
          label: 'Sanitize Bed & Mark Available',
          action: 'Bed.status = Available',
          buttonText: 'Mark Bed Clean (Available)',
          defaultNote: 'Verified bed physical sanitation completed and returned bed to Available status.'
        };
      case 'occupied_no_billing':
        return {
          label: 'Activate Patient Billing Encounter',
          action: 'Billing.status = Active',
          buttonText: 'Activate Billing Account',
          defaultNote: 'Activated billing encounter for active patient stay.'
        };
      case 'lab_unbilled':
        return {
          label: 'Attach Completed Lab to Billing',
          action: 'Lab.billed = True',
          buttonText: 'Post Lab Charge to Account',
          defaultNote: 'Attached completed diagnostic lab item to patient billing account.'
        };
      case 'discharge_billing_mismatch':
        return {
          label: 'Finalize ADT Discharge Record',
          action: 'Stay.status = Discharged, Bed.status = Cleaning Pending',
          buttonText: 'Finalize ADT Discharge',
          defaultNote: 'Synchronized ADT discharge record and queued bed for housekeeping.'
        };
      default:
        return {
          label: 'Synchronize Data State',
          action: 'Resolve Conflict Entry',
          buttonText: 'Confirm Resolution',
          defaultNote: 'Cross-department verification completed and record synchronized.'
        };
    }
  };

  const openResolveModal = (conflict) => {
    const info = getResolutionActionInfo(conflict);
    setResolutionNotes(info.defaultNote);
    setResolvingConflict(conflict);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingConflict) return;
    setSubmittingResolve(true);
    try {
      const updated = await conflictApi.resolveConflict(resolvingConflict.id, {
        resolution_notes: resolutionNotes || 'Resolved and synchronized.'
      });
      if (onConflictResolved) {
        onConflictResolved(updated);
      }
      setResolvingConflict(null);
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    } finally {
      setSubmittingResolve(false);
    }
  };


  const openCount = conflicts.filter(c => c.status !== 'resolved').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header matching White Theme */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {openCount} Open &bull; {conflicts.length} Total Logs
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

      {/* Conflicts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-5">LOCATION / ID</th>
              <th className="py-3 px-4">ISSUE TYPE &amp; RISK</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-5 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {conflicts.map((item) => {
              const statusInfo = getStatusBadge(item.status);
              const isResolved = item.status === 'resolved';
              const locationLabel = item.bed_ward 
                ? `${item.bed_ward} • CF-${item.id}` 
                : (item.related_bed_id || item.bed_id ? `Bed #${item.related_bed_id || item.bed_id} • CF-${item.id}` : `CF-${item.id}`);

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Location / ID */}
                  <td className="py-3.5 px-5 font-semibold text-slate-800">
                    <span className="font-mono text-slate-900 font-bold">
                      {locationLabel}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-normal">
                      {item.bed_department || item.department || 'Ward Ops'}
                    </span>
                  </td>

                  {/* Issue Type & Risk */}
                  <td className="py-3.5 px-4 text-slate-600 font-medium max-w-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate text-slate-900 font-bold">{getConflictTypeBadge(item.conflict_type)}</span>
                      {item.revenue_at_risk && item.revenue_at_risk > 0 && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isResolved 
                            ? 'bg-slate-50 text-slate-500 border-slate-200 line-through'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          ₹{Number(item.revenue_at_risk).toLocaleString('en-IN')} Risk
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</div>
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
                          onClick={() => openResolveModal(item)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] transition-all shadow-xs cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingConflict(item)}
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

      {/* Manual Resolve Modal Dialog */}
      {resolvingConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Resolve Conflict CF-{resolvingConflict.id}</h4>
              </div>
              <button
                type="button"
                onClick={() => setResolvingConflict(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Impact Details Card */}
            {(() => {
              const info = getResolutionActionInfo(resolvingConflict);
              return (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Issue Type:</span>
                    <span className="font-bold text-slate-900">
                      {getConflictTypeBadge(resolvingConflict.conflict_type)}
                    </span>
                  </div>
                  {resolvingConflict.related_bed_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Target Bed:</span>
                      <span className="font-bold text-slate-900">
                        Bed #{resolvingConflict.related_bed_id} ({resolvingConflict.bed_ward || 'Ward'})
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Action on Confirm:</span>
                    <span className="font-bold px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200">
                      {info.label}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    {resolvingConflict.description}
                  </div>
                </div>
              );
            })()}

            {/* Resolution Note Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Resolution Audit Note
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution reason..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolvingConflict(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingResolve}
                onClick={handleConfirmResolve}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingResolve ? 'Syncing...' : getResolutionActionInfo(resolvingConflict).buttonText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Read-Only Review Modal Dialog */}
      {reviewingConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Conflict Details & Audit Review</h4>
              </div>
              <button
                type="button"
                onClick={() => setReviewingConflict(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Conflict Rule:</span>
                  <span className="font-mono font-bold text-slate-900">CF-{reviewingConflict.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Issue Classification:</span>
                  <span className="font-bold text-rose-700">{getConflictTypeBadge(reviewingConflict.conflict_type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Location & Bed:</span>
                  <span className="font-semibold text-slate-800">
                    Bed #{reviewingConflict.related_bed_id || reviewingConflict.bed_id} ({reviewingConflict.bed_ward || reviewingConflict.department || 'Ward'})
                  </span>
                </div>
                {reviewingConflict.patient_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Admitted Patient:</span>
                    <span className="font-semibold text-slate-900">{reviewingConflict.patient_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Detection Timestamp:</span>
                  <span className="font-mono text-slate-700">{new Date(reviewingConflict.detected_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Audit Log Description:</span>
                <p className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60 text-slate-800 font-medium">
                  {reviewingConflict.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingConflict(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close View
              </button>
              {reviewingConflict.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => {
                    const item = reviewingConflict;
                    setReviewingConflict(null);
                    openResolveModal(item);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] transition-all shadow-xs cursor-pointer"
                >
                  Proceed to Resolve &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
