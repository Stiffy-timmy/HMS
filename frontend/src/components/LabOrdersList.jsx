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

export const LabOrdersList = ({ labs = [], onLabUpdated, title = "Lab Order Workstation" }) => {
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
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500">Specimen collection & turnaround tracking</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {labs.map((lab) => {
          const isPending = lab.status === 'pending';
          const isInProgress = lab.status === 'in_progress';

          return (
            <div
              key={lab.id}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{lab.test_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(lab.status)}`}>
                    {lab.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Patient: <strong className="text-slate-800">{lab.patient_name}</strong> &bull; Dept: <strong className="text-slate-800">{lab.department}</strong>
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ordered: {new Date(lab.ordered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Status transition action buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {isPending && (
                  <button
                    type="button"
                    disabled={updatingId === lab.id}
                    onClick={() => handleUpdateStatus(lab.id, 'in_progress')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                  >
                    {updatingId === lab.id ? 'Starting...' : 'Start Processing'}
                  </button>
                )}

                {isInProgress && (
                  <button
                    type="button"
                    disabled={updatingId === lab.id}
                    onClick={() => handleUpdateStatus(lab.id, 'completed')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    {updatingId === lab.id ? 'Completing...' : 'Mark Completed ✓'}
                  </button>
                )}

                {lab.status === 'completed' && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified Done
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {labs.length === 0 && (
          <div className="py-8 text-center text-slate-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">No pending lab orders in queue.</p>
          </div>
        )}
      </div>
    </div>
  );
};
