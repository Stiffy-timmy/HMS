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
        role: role,
        department: role === 'admin' ? null : department,
        code: customCode ? customCode.trim().toUpperCase() : null
      };

      const newPasskey = await authApi.createPasskey(payload);
      setSuccessMsg(`New passkey generated & stored: ${newPasskey.code}`);
      setCustomCode('');
      fetchPasskeys();

      if (onPasskeyCreated) {
        onPasskeyCreated(newPasskey);
      }
    } catch (err) {
      console.error("Passkey creation failed:", err);
      setError(err.response?.data?.detail || "Failed to generate passkey.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPasskeys = passkeys.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchCode = (p.code || '').toLowerCase().includes(q);
    const matchRole = (p.role || '').toLowerCase().includes(q);
    const matchDept = (p.department || '').toLowerCase().includes(q);
    return matchCode || matchRole || matchDept;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Passkey & Invite Code Management
            </h3>
            <p className="text-xs text-slate-500">
              Generate cryptographic role passkeys for new clinician onboarding
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPasskeys}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          Refresh Keys
        </button>
      </div>

      {/* Success / Error Message */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout: Generator on Left, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Create Form */}
        <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Key className="w-4 h-4 text-purple-600" />
            <span>Generate New Passkey</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Target Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value="staff">Staff Member</option>
                <option value="technician_pharmacist">Technician cum Pharmacist</option>
                <option value="hod">Head of Dept (HOD)</option>
                <option value="admin">Hospital Admin</option>
              </select>
            </div>

            {role !== 'admin' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Biomedical & Pharmacy">Biomedical & Pharmacy</option>
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Custom Code (Optional)
                </label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-[10px] text-purple-700 font-bold hover:underline"
                >
                  Generate Format
                </button>
              </div>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g. STAFF-8921"
                className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0A2540] hover:bg-[#071d33] shadow-xs transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              {creating ? 'Storing Passkey...' : 'Create & Store Passkey →'}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Passkeys List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Passkeys ({filteredPasskeys.length})
            </span>
            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredPasskeys.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.code || 'HASHED_KEY'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {p.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {p.department ? `Department: ${p.department}` : 'Hospital-Wide Security Key'}
                  </p>
                </div>

                {p.code && (
                  <button
                    type="button"
                    onClick={() => handleCopy(p.code)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Copy Passkey"
                  >
                    {copiedCode === p.code ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}

            {filteredPasskeys.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Key className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs">No active passkeys found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
