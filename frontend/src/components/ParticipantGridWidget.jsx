import React, { useState } from 'react';
import { 
  Users, 
  Trash2, 
  Search, 
  ShieldCheck, 
  Stethoscope, 
  Building, 
  Mail, 
  Key, 
  Calendar, 
  AlertTriangle, 
  Check, 
  Copy, 
  RefreshCw, 
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { dashboardApi } from '../api';
import { useAuth } from '../hooks/useAuth';

export const ParticipantGridWidget = ({ 
  users = [], 
  onUserDeleted, 
  onRefresh,
  loading = false 
}) => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  // Deletion state
  const [targetUser, setTargetUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const confirmDelete = async () => {
    if (!targetUser) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await dashboardApi.deleteHospitalUser(targetUser.id);
      setSuccessToast(`Participant '${targetUser.full_name}' (${targetUser.email}) was permanently deleted.`);
      
      if (onUserDeleted) {
        onUserDeleted(targetUser.id);
      }
      
      setTargetUser(null);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error("Failed to delete participant:", err);
      setDeleteError(err.response?.data?.detail || "Failed to delete participant from database.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    if (selectedRole !== 'ALL' && u.role.toUpperCase() !== selectedRole) {
      return false;
    }
    if (selectedDept !== 'ALL' && u.department !== selectedDept) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.full_name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPasskey = u.registered_passkey?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPasskey || matchDept;
    }
    return true;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'hod':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Stethoscope className="w-3 h-3" />
            HOD
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Users className="w-3 h-3" />
            STAFF
          </span>
        );
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Active Member';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Active Member';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Hospital Participants Directory
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                {users.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive participants grid with real-time database management
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Grid
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'ADMIN', 'HOD', 'STAFF'].map((r) => {
            const count = r === 'ALL' 
              ? users.length 
              : users.filter(u => u.role.toUpperCase() === r).length;
            const isSelected = selectedRole === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A2540] text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{r === 'ALL' ? 'All Roles' : r}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Department Filter */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Neurology">Neurology</option>
            <option value="Emergency">Emergency</option>
          </select>

          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participants..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div>
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-50 border border-slate-200">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No participants match your filter</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or role selector</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((u) => {
              const isCurrentUser = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="rounded-2xl bg-white border border-slate-200/90 p-4 transition-all hover:shadow-md flex flex-col justify-between shadow-xs"
                >
                  {/* Top Section */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shadow-xs">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {u.full_name}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {u.department || 'Hospital-Wide'}
                          </span>
                        </div>
                      </div>
                      <div>
                        {getRoleBadge(u.role)}
                      </div>
                    </div>

                    {/* Email Card Row */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 mb-2 flex items-center justify-between text-xs font-mono text-slate-700">
                      <div className="flex items-center gap-1.5 truncate mr-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate text-[11px]" title={u.email}>{u.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(u.email)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedEmail === u.email ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Passkey and Join Date */}
                    <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-400" />
                          Passkey:
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                          {u.registered_passkey || 'ADMIN-PRESET'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Joined:
                        </span>
                        <span className="text-slate-600 font-medium">{formatDate(u.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Delete Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="text-[11px] text-slate-500 font-medium">
                        {isCurrentUser ? 'Your Session' : (u.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </div>

                    {isCurrentUser ? (
                      <span className="text-[11px] text-slate-400 font-semibold italic">
                        Current Admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setTargetUser(u);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Participant Deletion
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this participant from the hospital database?
                </p>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{targetUser.full_name}</div>
                  <div className="font-mono text-slate-600 text-[11px]">{targetUser.email}</div>
                  <div className="text-slate-500">Role: <strong className="uppercase text-slate-800">{targetUser.role}</strong> &bull; {targetUser.department || 'Hospital-Wide'}</div>
                </div>

                {deleteError && (
                  <p className="mt-2 text-xs text-rose-600 font-medium">{deleteError}</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Participant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
