import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Lock, 
  Mail, 
  User, 
  Key, 
  Briefcase, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Users,
  CheckCircle2,
  Sparkles,
  Info
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Main Split-Screen Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col lg:flex-row min-h-[640px]">
        
        {/* Left Panel: Hero Banner (Dark Theme - Hidden on Mobile/Tablet) */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-10 xl:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
          {/* Translucent Corridor Image Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity scale-105 pointer-events-none"
            style={{ backgroundImage: `url('/clinical_corridor.jpg')` }}
          />
          
          {/* Subtle Clinical Grid Background */}
          <div 
            className="absolute inset-0 bg-[linear-gradient(to_right,#38a9f70d_1px,transparent_1px),linear-gradient(to_bottom,#38a9f70d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" 
          />
          
          {/* Ambient Glows */}
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand / Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/90 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white font-bold text-lg">
                <span className="text-xl leading-none">✚</span>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Medicover
                  <span className="text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                    Ops
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">Hospital Operations Platform</p>
              </div>
            </div>
          </div>

          {/* Center Hero Content */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Identity & Role Onboarding
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Operational Excellence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
                Clinical Precision.
              </span>
            </h1>
            <p className="mt-4 text-slate-300 text-sm xl:text-base leading-relaxed max-w-md">
              Secure access to hospital operations, patient flow management, and clinical resource allocation.
            </p>

            {/* Verification highlights */}
            <div className="mt-8 space-y-3 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Role-Specific Security Passkey Authorization</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Strict Departmental Boundary Enforcement</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Automated Real-Time Audit Log Tracking</span>
              </div>
            </div>
          </div>

          {/* Footer Tag */}
          <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              AUTHORIZED PERSONNEL ONLY &bull; V3.4.1 SECURE CONNECTION
            </span>
          </div>
        </div>

        {/* Right Panel: Clean White Form Container */}
        <div className="w-full lg:w-7/12 xl:w-1/2 p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white overflow-y-auto">
          <div>
            {/* Mobile Header Branding (Shown on Small Devices Only) */}
            <div className="lg:hidden flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#0A2540] flex items-center justify-center text-white font-bold text-sm">
                ✚
              </div>
              <span className="text-base font-bold text-slate-900">Medicover Hospital Ops</span>
            </div>

            {/* Header */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Create Account
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Register for access to the Medicover Ops portal.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              
              {/* Row 1: Two-Column Grid (Full Name & Hospital Email) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Dr. Jane Smith"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Hospital Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane.smith@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Role Selector Tabs (Segmented Button Group) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Role
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Admin Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'admin' }));
                      if (error) setError(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                      formData.role === 'admin'
                        ? 'bg-blue-50/80 border-2 border-blue-600 text-blue-700 shadow-xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <ShieldCheck className={`w-5 h-5 mb-1 ${formData.role === 'admin' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-xs">Admin</span>
                  </button>

                  {/* HOD Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'hod' }));
                      if (error) setError(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                      formData.role === 'hod'
                        ? 'bg-blue-50/80 border-2 border-blue-600 text-blue-700 shadow-xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <Users className={`w-5 h-5 mb-1 ${formData.role === 'hod' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-xs">HOD</span>
                  </button>

                  {/* Staff Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'staff' }));
                      if (error) setError(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                      formData.role === 'staff'
                        ? 'bg-blue-50/80 border-2 border-blue-600 text-blue-700 shadow-xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80 font-medium'
                    }`}
                  >
                    <Briefcase className={`w-5 h-5 mb-1 ${formData.role === 'staff' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-xs">Staff</span>
                  </button>
                </div>
              </div>

              {/* Department Dropdown (Omitted for Admin) */}
              {!isRoleAdmin ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs cursor-pointer"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-700 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-600" />
                  <span>Department selection is omitted for Administrative accounts. Enter master security key to grant hospital-wide oversight.</span>
                </div>
              )}

              {/* Role Invite Code Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isRoleAdmin ? 'Admin Pass Key *' : 'Role Invite Code *'}
                  </label>
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    {isRoleAdmin ? 'Hospital-Wide Admin Overseer' : formData.role === 'hod' ? 'Department Leadership' : 'Clinical / Nursing Staff'}
                  </span>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.invite_code}
                    onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                    placeholder={
                      isRoleAdmin
                        ? 'Master Admin Security Key (e.g. ADM-KEY-9900)'
                        : 'E.G. ADM-8921'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 uppercase transition-all shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-0.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    The Invite Code <strong>must match your selected role</strong> ({formData.role === 'admin' ? 'Admin' : formData.role === 'hod' ? 'HOD' : 'Staff'}). Contact IT Support if you do not have a code.
                  </span>
                </p>

                {/* Quick Autofill Helper Buttons */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-medium">Quick Test Keys:</span>
                  <button
                    type="button"
                    onClick={() => fillInviteKey('ADMIN-SECURE-2026')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-purple-700 font-mono transition-colors cursor-pointer"
                  >
                    Admin Key
                  </button>
                  <button
                    type="button"
                    onClick={() => fillInviteKey('HOD-DEPT-2026')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-mono transition-colors cursor-pointer"
                  >
                    HOD Passkey
                  </button>
                  <button
                    type="button"
                    onClick={() => fillInviteKey('STAFF-OP-2026')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-700 font-mono transition-colors cursor-pointer"
                  >
                    Staff Passkey
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0A2540] hover:bg-[#071d33] active:bg-[#051524] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validating & Registering...</span>
                    </>
                  ) : (
                    <>
                      <span>REGISTER ACCOUNT &rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Navigation Toggle */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

