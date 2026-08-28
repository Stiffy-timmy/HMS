import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  ShieldCheck, 
  Stethoscope, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Power,
  RefreshCw,
  Search
} from 'lucide-react';
import { authApi } from '../api/authApi';

export const PasskeyManagerWidget = ({ onPasskeyCreated }) => {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Form state
  const [role, setRole] = useState('staff');
  const [department, setDepartment] = useState('Cardiology');
  const [customCode, setCustomCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const data = await authApi.getPasskeys();
      setPasskeys(data);
    } catch (err) {
      console.error("Failed to load passkeys:", err);
      setError("Failed to load passkeys from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = role.toUpperCase();
    setCustomCode(`${prefix}-${rand}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        role,
        code: customCode.trim() ? customCode.trim().toUpperCase() : null,
        department: role === 'admin' ? null : department
      };

      const created = await authApi.createPasskey(payload);
      setSuccessMsg(`Passkey '${created.code}' created and stored in database! Give this passkey to the new ${role.toUpperCase()} user for their in-person registration.`);
      setCustomCode('');
      fetchPasskeys();

      if (onPasskeyCreated) {
        onPasskeyCreated(created);
      }
    } catch (err) {
      console.error("Failed to create passkey:", err);
      setError(err.response?.data?.detail || "Failed to create passkey.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await authApi.togglePasskey(id);
      fetchPasskeys();
    } catch (err) {
      console.error("Failed to toggle passkey:", err);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const filteredPasskeys = passkeys.filter((pk) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      pk.code.toLowerCase().includes(q) ||
      pk.role.toLowerCase().includes(q) ||
      (pk.department && pk.department.toLowerCase().includes(q))
    );
  });

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'hod':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Stethoscope className="w-3 h-3" />
            HOD
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Users className="w-3 h-3" />
            STAFF
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Onboarding Passkey Management
            </h3>
            <p className="text-xs text-slate-400">
              Generate invite passkeys stored in DB to hand over in-person to new staff and HODs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPasskeys}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Creation Form */}
      <form onSubmit={handleCreate} className="mt-5 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-medicover-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Issue New Passkey
          </span>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Role */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Designated Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-medicover-500"
            >
              <option value="staff">Clinical Staff</option>
              <option value="hod">Head of Department (HOD)</option>
              <option value="admin">Hospital Admin</option>
            </select>
          </div>

          {/* Department (if not admin) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Department
            </label>
            <select
              disabled={role === 'admin'}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-medicover-500 disabled:opacity-40"
            >
              <option value="Cardiology">Cardiology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Neurology">Neurology</option>
              <option value="Emergency">Emergency</option>
              <option value="General">General Medicine</option>
            </select>
          </div>

          {/* Custom or Auto Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Passkey Code
              </label>
              <button
                type="button"
                onClick={generateRandomCode}
                className="text-[10px] text-medicover-400 hover:text-medicover-300 font-semibold"
              >
                + Generate Random
              </button>
            </div>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder={`e.g. ${role.toUpperCase()}-98F1`}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 uppercase focus:outline-none focus:border-medicover-500 placeholder-slate-600"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-medicover-600 to-medicover-700 hover:from-medicover-500 hover:to-medicover-600 shadow-md transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Saving to Database...' : 'Save & Issue Passkey'}
          </button>
        </div>
      </form>

      {/* Passkey Database Table */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Active Passkeys Database ({passkeys.length})
          </span>
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code / role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2.5 font-semibold">Passkey Code</th>
                <th className="pb-2.5 font-semibold">Role</th>
                <th className="pb-2.5 font-semibold">Department</th>
                <th className="pb-2.5 font-semibold">Created By</th>
                <th className="pb-2.5 font-semibold">Status</th>
                <th className="pb-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPasskeys.map((pk) => (
                <tr key={pk.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 font-mono text-slate-100 flex items-center gap-2">
                    <span className="font-bold tracking-wider px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-medicover-300">
                      {pk.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(pk.code)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-medicover-400 transition-colors"
                      title="Copy Passkey to Clipboard"
                    >
                      {copiedCode === pk.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="py-2.5">{getRoleBadge(pk.role)}</td>
                  <td className="py-2.5 text-slate-300">{pk.department || 'Hospital-wide'}</td>
                  <td className="py-2.5 text-slate-400">{pk.created_by_name || 'Admin'}</td>
                  <td className="py-2.5">
                    {pk.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggle(pk.id)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        pk.is_active
                          ? 'text-rose-400 hover:bg-rose-950/40'
                          : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                    >
                      {pk.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPasskeys.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500 text-xs">
                    No passkeys found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
