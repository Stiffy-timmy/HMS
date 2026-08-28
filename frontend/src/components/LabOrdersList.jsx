import React, { useState } from 'react';
import { 
  FlaskConical, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  Droplet, 
  CheckCheck,
  Loader2 
} from 'lucide-react';
import { labApi } from '../api';

export const LabOrdersList = ({ labs = [], onLabUpdated, title = "Lab Order Queue" }) => {
  const [updatingId, setUpdatingId] = useState(null);

  const handleUpdateStatus = async (labId, newStatus) => {
    setUpdatingId(labId);
    try {
      const updated = await labApi.updateStatus(labId, newStatus);
      if (onLabUpdated) {
        onLabUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to update lab order status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'in_progress':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">Specimen collection & turnaround tracking</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {labs.map((lab) => {
          const isPending = lab.status === 'pending';
          const isInProgress = lab.status === 'in_progress';
          const isCompleted = lab.status === 'completed';

          return (
            <div
              key={lab.id}
              className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{lab.test_name}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getStatusBadge(lab.status)}`}>
                    {lab.status.replace('_', ' ')}
                  </span>
                  {lab.billed ? (
                    <span className="text-[10px] text-emerald-400 font-medium">&bull; Billed</span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">&bull; Unbilled</span>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                  <span>Patient: <strong className="text-slate-200">{lab.patient_name}</strong></span>
                  <span>Ref: <span className="font-mono text-slate-300">{lab.patient_ref_id}</span></span>
                  {lab.ward && <span>Ward: <span className="text-slate-300">{lab.ward}</span></span>}
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                  <span>Ordered: {new Date(lab.ordered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {lab.sample_collected_at && (
                    <span>Sample: {new Date(lab.sample_collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  {lab.result_at && (
                    <span className="text-emerald-400 font-medium">Result Ready: {new Date(lab.result_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons for Staff/HOD */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPending && (
                  <button
                    disabled={updatingId === lab.id}
                    onClick={() => handleUpdateStatus(lab.id, 'in_progress')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {updatingId === lab.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Droplet className="w-3.5 h-3.5" />}
                    Collect Sample
                  </button>
                )}

                {isInProgress && (
                  <button
                    disabled={updatingId === lab.id}
                    onClick={() => handleUpdateStatus(lab.id, 'completed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {updatingId === lab.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                    Mark Result Ready
                  </button>
                )}

                {isCompleted && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {labs.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No pending or active lab orders.</p>
          </div>
        )}
      </div>
    </div>
  );
};
