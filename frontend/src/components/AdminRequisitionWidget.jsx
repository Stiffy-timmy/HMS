import React, { useState, useEffect } from 'react';
import { 
  PackagePlus, 
  Stethoscope, 
  Pill, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  Loader2, 
  RefreshCw,
  Building2,
  DollarSign,
  Send,
  MessageSquare
} from 'lucide-react';
import { requisitionApi } from '../api';

export const AdminRequisitionWidget = ({ onActionComplete }) => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'all'
  const [processingId, setProcessingId] = useState(null);
  
  // Note dialog state
  const [activeNoteReq, setActiveNoteReq] = useState(null);
  const [actionType, setActionType] = useState('approved'); // 'approved' or 'rejected'
  const [adminNote, setAdminNote] = useState('');

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      const data = await requisitionApi.getRequisitions();
      setRequisitions(data);
    } catch (err) {
      console.error('Failed to load requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const openActionModal = (req, type) => {
    setActiveNoteReq(req);
    setActionType(type);
    setAdminNote(type === 'approved' ? 'Approved for official hospital procurement.' : 'Requisition deferred due to current ward budget allocations.');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!activeNoteReq) return;

    setProcessingId(activeNoteReq.id);
    try {
      await requisitionApi.updateStatus(activeNoteReq.id, {
        status: actionType,
        admin_notes: adminNote.trim()
      });

      setActiveNoteReq(null);
      await fetchRequisitions();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error('Failed to update requisition status:', err);
      alert(err.response?.data?.detail || 'Failed to update requisition status.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = requisitions.filter(r => r.status === 'pending');
  const approvedList = requisitions.filter(r => r.status === 'approved' || r.status === 'delivered');
  const totalPendingCost = pendingList.reduce((acc, r) => acc + (r.estimated_cost || 0), 0);

  const displayedList = filter === 'pending' 
    ? pendingList 
    : filter === 'approved' 
      ? approvedList 
      : requisitions;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Supply & Equipment Approvals
              {pendingList.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  {pendingList.length} Pending
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Review & approve medical equipment and medicine requisitions raised by Biomedical & Pharmacy
            </p>
          </div>
        </div>

        {/* Filter Tabs & Refresh */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingList.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedList.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All History
            </button>
          </div>

          <button
            onClick={fetchRequisitions}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh Requisitions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Band */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Decision</p>
            <p className="text-xl font-black text-amber-600">{pendingList.length} Requisitions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Budget Exposure</p>
            <p className="text-xl font-black text-emerald-600">
              ₹{totalPendingCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">High Urgency Requests</p>
            <p className="text-xl font-black text-rose-600">
              {pendingList.filter(r => r.urgency === 'emergency' || r.urgency === 'urgent').length} Critical
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Requisitions List */}
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading supply orders...</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No requisitions in this queue</p>
          <p className="text-xs text-slate-500 mt-0.5">All biomedical equipment & medicine requests are up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map(req => {
            const isPending = req.status === 'pending';
            const isMedicine = req.item_type === 'medicine';
            const isEmergency = req.urgency === 'emergency';
            const isUrgent = req.urgency === 'urgent';

            return (
              <div
                key={req.id}
                className={`bg-slate-50/70 border rounded-2xl p-4 shadow-xs transition-all ${
                  isEmergency && isPending
                    ? 'border-red-300 bg-red-50/40'
                    : isPending
                      ? 'border-slate-200 hover:border-blue-300'
                      : 'border-slate-200 opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* Left Column: Icon & Details */}
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl border mt-0.5 flex-shrink-0 ${
                      isMedicine 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}>
                      {isMedicine ? <Pill className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {req.item_name}
                        </span>

                        {/* Type & Urgency Pills */}
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                          {req.quantity} {req.unit}
                        </span>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          isEmergency
                            ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                            : isUrgent
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {req.urgency}
                        </span>

                        <span className="text-xs font-bold text-emerald-700">
                          ₹{req.estimated_cost?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Request Info Bar */}
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                        <span className="text-slate-800 font-semibold">{req.department}</span>
                        <span>•</span>
                        <span>Requested by: <strong className="text-slate-700">{req.requested_by_name || 'Biomed/Pharm Team'}</strong></span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {new Date(req.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>

                      {/* Reason / Justification */}
                      {req.reason && (
                        <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200/80">
                          <strong className="text-slate-800">Reason: </strong> {req.reason}
                        </p>
                      )}

                      {/* Admin Notes if reviewed */}
                      {req.admin_notes && (
                        <p className="text-xs text-blue-800 bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                          <strong className="text-blue-900">Admin Remarks: </strong> {req.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Status / Action Buttons */}
                  <div className="flex items-center gap-2 self-end lg:self-center flex-shrink-0">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => openActionModal(req, 'approved')}
                          disabled={processingId === req.id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Requisition</span>
                        </button>

                        <button
                          onClick={() => openActionModal(req, 'rejected')}
                          disabled={processingId === req.id}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        req.status === 'approved' || req.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {req.status === 'delivered' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        {req.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        <span className="capitalize">{req.status}</span>
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Action Review Modal */}
      {activeNoteReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {actionType === 'approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  {actionType === 'approved' ? 'Approve Supply Requisition' : 'Reject Supply Requisition'}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeNoteReq.quantity} {activeNoteReq.unit} of {activeNoteReq.item_name} for {activeNoteReq.department}
                </p>
              </div>
              <button 
                onClick={() => setActiveNoteReq(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Estimated Cost:</span>
                  <span className="font-bold text-emerald-700">₹{activeNoteReq.estimated_cost?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Urgency Level:</span>
                  <span className="font-bold uppercase text-amber-700">{activeNoteReq.urgency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Admin Approval / Rejection Remarks
                </label>
                <textarea
                  rows="3"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Enter remarks, procurement instructions, or vendor PO authorization..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveNoteReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId !== null}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                    actionType === 'approved' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {processingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
