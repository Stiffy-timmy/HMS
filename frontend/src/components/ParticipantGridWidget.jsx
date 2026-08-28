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
      setSuccessToast(`Participant '${targetUser.full_name}' (${targetUser.email}) was permanently deleted from database.`);
      
      // Notify parent to update local state immediately
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
    // Role filter
    if (selectedRole !== 'ALL' && u.role.toUpperCase() !== selectedRole) {
      return false;
    }
    // Dept filter
    if (selectedDept !== 'ALL' && u.department !== selectedDept) {
      return false;
    }
    // Search query
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'hod':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Stethoscope className="w-3 h-3" />
            HOD
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Users className="w-3 h-3" />
            STAFF
          </span>
        );
    }
  };

  const getAvatarGlow = (role) => {
    switch (role) {
      case 'admin':
        return 'border-purple-500/40 text-purple-300 bg-purple-950/40';
      case 'hod':
        return 'border-blue-500/40 text-blue-300 bg-blue-950/40';
      case 'staff':
      default:
        return 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40';
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
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-medicover-600/20 to-blue-600/20 border border-medicover-500/30 text-medicover-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-white tracking-tight">
                Hospital Participants Directory
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono font-semibold text-slate-300">
                {users.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive participants grid with real-time database deletion
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Grid
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-medicover-600 text-white shadow-md shadow-medicover-600/25'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{r === 'ALL' ? 'All Roles' : r}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-medicover-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
            className="text-xs bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-medicover-500"
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
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
            />
          </div>
        </div>
      </div>

      {/* Participants Grid View */}
      <div className="mt-5">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800/60">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No participants match your filter</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search query or role selector</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((u) => {
              const isCurrentUser = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between"
                >
                  {/* Top Section */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-sm shadow-inner ${getAvatarGlow(u.role)}`}>
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors leading-tight">
                            {u.full_name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-500" />
                            {u.department || 'Hospital-Wide'}
                          </span>
                        </div>
                      </div>
                      <div>
                        {getRoleBadge(u.role)}
                      </div>
                    </div>

                    {/* Email Card Row */}
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-2 flex items-center justify-between text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1.5 truncate mr-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate text-[11px]" title={u.email}>{u.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(u.email)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Email"
                      >
                        {copiedEmail === u.email ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Passkey and Join Date */}
                    <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-500" />
                          Passkey:
                        </span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-950 text-medicover-300 font-semibold border border-slate-800">
                          {u.registered_passkey || 'ADMIN-PRESET'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          Joined:
                        </span>
                        <span className="text-slate-400">{formatDate(u.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Delete Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      <span className="text-[11px] text-slate-400">
                        {isCurrentUser ? 'Your Session' : (u.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </div>

                    {isCurrentUser ? (
                      <span className="text-[11px] text-slate-600 font-medium italic">
                        Current Admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setTargetUser(u);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
                        title="Permanently remove participant from database"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl glass-panel border border-slate-700/80 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Confirm Participant Deletion
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete this participant from the hospital database?
                </p>

                <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Participant:</span>
                    <span className="font-bold text-slate-200">{targetUser.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-300">{targetUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role & Dept:</span>
                    <span className="text-slate-300">{targetUser.role.toUpperCase()} • {targetUser.department || 'Hospital-Wide'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered Passkey:</span>
                    <span className="font-mono text-medicover-300">{targetUser.registered_passkey || '—'}</span>
                  </div>
                </div>

                {deleteError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {deleteError}
                  </div>
                )}

                <p className="text-[11px] text-rose-400/90 mt-3 font-medium">
                  &bull; This action is permanent and will remove access immediately.
                </p>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setTargetUser(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? 'Deleting from DB...' : 'Yes, Delete from Database'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
