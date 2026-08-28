import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Lock, 
  Mail, 
  User, 
  Key, 
  Briefcase, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
    department: 'Cardiology',
    invite_code: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password || !formData.invite_code) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailTrimmed = formData.email.toLowerCase().trim();
    if (!emailTrimmed.endsWith('@gmail.com')) {
      setError('Only @gmail.com email addresses are permitted for registration.');
      return;
    }

    if (formData.role !== 'admin' && !formData.department) {
      setError('Please specify your department.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await signup({
        hospital_id: 1,
        full_name: formData.full_name.trim(),
        email: emailTrimmed,
        password: formData.password,
        role: formData.role,
        department: formData.role === 'admin' ? null : formData.department,
        invite_code: formData.invite_code.trim().toUpperCase()
      });

      if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (user.role === 'hod') {
        navigate('/dashboard/hod');
      } else {
        navigate('/dashboard/staff');
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.response?.data?.detail || 'Failed to create account. Please verify your passkey.');
    } finally {
      setLoading(false);
    }
  };

  const fillInviteKey = (key) => {
    setFormData(prev => ({ ...prev, invite_code: key }));
    setError(null);
  };

  const isRoleAdmin = formData.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-medicover-600/20 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medicover-500 to-medicover-700 flex items-center justify-center shadow-xl shadow-medicover-500/25 text-white">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-3 text-center text-2xl font-extrabold tracking-tight text-white">
          Clinical Account Registration
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Medicover Hospital Operations &bull; Passkey-Verified Access
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-7 px-6 sm:px-8 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Full Name
              </label>
              <div className="mt-1 relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email Address (@gmail.com only)
                </label>
                <span className="text-[10px] text-medicover-400 font-mono">Gmail required</span>
              </div>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Must be a valid @gmail.com account for identity verification.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-medicover-500"
                >
                  <option value="staff">Staff Member</option>
                  <option value="hod">Head of Dept (HOD)</option>
                  <option value="admin">Hospital Admin</option>
                </select>
              </div>

              {!isRoleAdmin && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-medicover-500"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dynamic Passkey Input - Admin Pass Key vs Invite Passkey */}
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {isRoleAdmin ? 'Admin Pass Key' : 'Invite Passkey'}
                </label>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isRoleAdmin ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {isRoleAdmin ? 'Admin Security' : 'Provided by Admin'}
                </span>
              </div>
              <div className="mt-1 relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.invite_code}
                  onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                  placeholder={
                    isRoleAdmin 
                      ? 'ADMIN-SECURE-2026' 
                      : formData.role === 'hod' 
                      ? 'Enter HOD Passkey (e.g. HOD-DEPT-2026)' 
                      : 'Enter Staff Passkey (e.g. STAFF-OP-2026)'
                  }
                  className="w-full pl-9 pr-3 py-2 font-mono text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-medicover-500 uppercase"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {isRoleAdmin 
                  ? 'Master key required for hospital administrative privileges.'
                  : 'Obtain this passkey from your Hospital Administrator.'}
              </p>
            </div>

            {/* Quick Demo Helper */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Default Passkeys:</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, role: 'admin' })); fillInviteKey('ADMIN-SECURE-2026'); }}
                  className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60 hover:bg-purple-900/50"
                >
                  Admin Key: ADMIN-SECURE-2026
                </button>
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, role: 'hod' })); fillInviteKey('HOD-DEPT-2026'); }}
                  className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 hover:bg-blue-900/50"
                >
                  HOD Passkey: HOD-DEPT-2026
                </button>
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, role: 'staff' })); fillInviteKey('STAFF-OP-2026'); }}
                  className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/50"
                >
                  Staff Passkey: STAFF-OP-2026
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-medicover-600 to-medicover-700 hover:from-medicover-500 hover:to-medicover-600 shadow-lg shadow-medicover-600/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Validating Passkey...' : (isRoleAdmin ? 'Verify Admin Pass Key & Register' : 'Validate Passkey & Register Account')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-medicover-400 hover:text-medicover-300 font-semibold">
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
