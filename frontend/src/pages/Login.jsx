import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Stethoscope, 
  Sparkles,
  Building2,
  Calendar,
  User,
  HeartPulse,
  Wrench,
  Sparkle,
  Zap,
  CheckCircle2,
  Brush
} from 'lucide-react';

const BRANCHES = [
  { id: 1, name: 'Medicover Hospitals - Hitech City (Hyderabad)', code: 'MC-HTC', city: 'Hyderabad', shortName: 'Hitech City' },
  { id: 2, name: 'Medicover Hospitals - Whitefield (Bengaluru)', code: 'MC-BLR', city: 'Bengaluru', shortName: 'Whitefield' },
  { id: 3, name: 'Medicover Hospitals - MVP Colony (Visakhapatnam)', code: 'MC-VZP', city: 'Visakhapatnam', shortName: 'MVP Colony' },
  { id: 4, name: 'Medicover Hospitals - Navi Mumbai (Mumbai)', code: 'MC-MUM', city: 'Mumbai', shortName: 'Navi Mumbai' },
];

const DEMO_ACCOUNTS_BY_BRANCH = {
  1: { // Hitech City
    admin: { email: 'admin@medicover.com', label: 'Master Admin', role: 'admin', badge: 'Full Ops' },
    hodCardio: { email: 'hod.cardio@medicover.com', label: 'HOD Cardio', role: 'hod', badge: 'Cardio' },
    hodOrtho: { email: 'hod.ortho@medicover.com', label: 'HOD Ortho', role: 'hod', badge: 'Ortho' },
    staffCardio: { email: 'staff.cardio1@medicover.com', label: 'Ward Staff', role: 'staff', badge: 'Cardio Ward' },
    biomedPharm: { email: 'tech.pharmacist@medicover.com', label: 'Tech & Pharmacist', role: 'technician_pharmacist', badge: 'Biomed & Pharm' },
    housekeeping: { email: 'staff.housekeeping@medicover.com', label: 'Housekeeping', role: 'staff', badge: 'Bed Cleaning' }
  },
  2: { // Whitefield
    admin: { email: 'admin@medicover.com', label: 'Master Admin', role: 'admin', badge: 'Full Ops' },
    hodCardio: { email: 'hod.cardio.blr@medicover.com', label: 'HOD Cardio', role: 'hod', badge: 'Cardio' },
    hodOrtho: { email: 'hod.ortho@medicover.com', label: 'HOD Ortho', role: 'hod', badge: 'Ortho' },
    staffCardio: { email: 'staff.cardio1@medicover.com', label: 'Ward Staff', role: 'staff', badge: 'Cardio Ward' },
    biomedPharm: { email: 'tech.pharmacist@medicover.com', label: 'Tech & Pharmacist', role: 'technician_pharmacist', badge: 'Biomed & Pharm' },
    housekeeping: { email: 'staff.housekeeping@medicover.com', label: 'Housekeeping', role: 'staff', badge: 'Bed Cleaning' }
  },
  3: { // MVP Colony
    admin: { email: 'admin@medicover.com', label: 'Master Admin', role: 'admin', badge: 'Full Ops' },
    hodCardio: { email: 'hod.cardio.vzp@medicover.com', label: 'HOD Cardio', role: 'hod', badge: 'Cardio' },
    hodOrtho: { email: 'hod.ortho@medicover.com', label: 'HOD Ortho', role: 'hod', badge: 'Ortho' },
    staffCardio: { email: 'staff.cardio1@medicover.com', label: 'Ward Staff', role: 'staff', badge: 'Cardio Ward' },
    biomedPharm: { email: 'tech.pharmacist@medicover.com', label: 'Tech & Pharmacist', role: 'technician_pharmacist', badge: 'Biomed & Pharm' },
    housekeeping: { email: 'staff.housekeeping@medicover.com', label: 'Housekeeping', role: 'staff', badge: 'Bed Cleaning' }
  },
  4: { // Navi Mumbai
    admin: { email: 'admin@medicover.com', label: 'Master Admin', role: 'admin', badge: 'Full Ops' },
    hodCardio: { email: 'hod.cardio@medicover.com', label: 'HOD Cardio', role: 'hod', badge: 'Cardio' },
    hodOrtho: { email: 'hod.ortho.mum@medicover.com', label: 'HOD Ortho', role: 'hod', badge: 'Ortho' },
    staffCardio: { email: 'staff.cardio1@medicover.com', label: 'Ward Staff', role: 'staff', badge: 'Cardio Ward' },
    biomedPharm: { email: 'tech.pharmacist@medicover.com', label: 'Tech & Pharmacist', role: 'technician_pharmacist', badge: 'Biomed & Pharm' },
    housekeeping: { email: 'staff.housekeeping@medicover.com', label: 'Housekeeping', role: 'staff', badge: 'Bed Cleaning' }
  }
};

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [selectedBranch, setSelectedBranch] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('hms_remember_me') !== 'false');
  const [loading, setLoading] = useState(false);
  const [demoLoginLoadingRole, setDemoLoginLoadingRole] = useState(null);
  const [error, setError] = useState(null);

  const performLogin = async (userEmail, userPassword) => {
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email: userEmail, password: userPassword }, rememberMe);
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (user.role === 'hod') {
        navigate('/dashboard/hod');
      } else if (user.role === 'technician_pharmacist') {
        navigate('/dashboard/tech-pharmacist');
      } else {
        navigate('/dashboard/staff');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
      setDemoLoginLoadingRole(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    await performLogin(email, password);
  };

  // 1-Click Instant Demo Login
  const handleQuickDemoLogin = async (roleKey, demoAccount) => {
    setEmail(demoAccount.email);
    setPassword('Password@123');
    setDemoLoginLoadingRole(roleKey);
    await performLogin(demoAccount.email, 'Password@123');
  };

  const activeBranchObj = BRANCHES.find(b => b.id === selectedBranch) || BRANCHES[0];
  const branchDemoAccounts = DEMO_ACCOUNTS_BY_BRANCH[selectedBranch] || DEMO_ACCOUNTS_BY_BRANCH[1];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Main Split-Screen Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col lg:flex-row min-h-[640px]">
        
        {/* Left Panel: Hero Banner (Dark Theme) */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-10 xl:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
          {/* Subtle Grid & Glow Background */}
          <div 
            className="absolute inset-0 bg-[linear-gradient(to_right,#38a9f70d_1px,transparent_1px),linear-gradient(to_bottom,#38a9f70d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" 
          />
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand / Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white font-bold text-lg">
                ✚
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Medicover
                  <span className="text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                    Multi-Branch
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">Enterprise Hospital Operations</p>
              </div>
            </div>
          </div>

          {/* Center Hero Content */}
          <div className="relative z-10 my-auto py-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Multi-Branch Operations Platform
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Operational Excellence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
                Clinical Precision.
              </span>
            </h1>
            <p className="mt-3 text-slate-300 text-xs xl:text-sm leading-relaxed max-w-md">
              Secure multi-branch access to patient flow, ward synchronization, and real-time clinical resources.
            </p>

            {/* Feature Highlights */}
            <div className="mt-6 space-y-2.5 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Strict Branch Data Isolation & Multi-Tenancy</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Real-Time Push Updates Filtered per Hospital Branch</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Role-Based Passkey Access (Admin, HOD, Staff, Tech)</span>
              </div>
            </div>
          </div>

          {/* Footer Tag */}
          <div className="relative z-10 pt-4 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>4 CONNECTED BRANCHES</span>
            <span>SECURE GATEWAY V3.5</span>
          </div>
        </div>

        {/* Right Panel: Form Container */}
        <div className="w-full lg:w-7/12 xl:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white overflow-y-auto">
          <div>
            {/* Header */}
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Welcome Back
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select your Medicover branch to access your clinical dashboard.
              </p>
            </div>

            {/* Public Patient Booking Banner (No Auth Needed) */}
            <div className="my-3.5 p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-blue-50 border border-rose-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Patient Appointment Booking</h4>
                  <p className="text-[10px] text-slate-600">No login required • Auto-matches nearest branch</p>
                </div>
              </div>
              <Link
                to="/book-appointment"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex-shrink-0"
              >
                Book Now &rarr;
              </Link>
            </div>

            {/* Quick Demo Access Center for ALL ROLES & Hospital Branches */}
            <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Demo Access (All Roles)
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  1-Click Instant Login
                </span>
              </div>

              {/* Branch Selector Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Choose Hospital Branch:
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(parseInt(e.target.value, 10))}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1-Click Role Login Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {/* 1. Master Admin */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('admin', branchDemoAccounts.admin)}
                  className="p-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Master Admin</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{branchDemoAccounts.admin.badge}</p>
                </button>

                {/* 2. HOD Cardiology */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('hodCardio', branchDemoAccounts.hodCardio)}
                  className="p-2 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">HOD Cardio</span>
                    <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{activeBranchObj.shortName}</p>
                </button>

                {/* 3. HOD Orthopedics */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('hodOrtho', branchDemoAccounts.hodOrtho)}
                  className="p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700">HOD Ortho</span>
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{activeBranchObj.shortName}</p>
                </button>

                {/* 4. Ward Staff */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('staffCardio', branchDemoAccounts.staffCardio)}
                  className="p-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Ward Staff</span>
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">Cardio Ward 3B</p>
                </button>

                {/* 5. Biomedical Tech & Pharmacist */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('biomedPharm', branchDemoAccounts.biomedPharm)}
                  className="p-2 rounded-xl bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-700">Tech & Pharm</span>
                    <Wrench className="w-3.5 h-3.5 text-cyan-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">Equip & Pharma</p>
                </button>

                {/* 6. Housekeeping Staff */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin('housekeeping', branchDemoAccounts.housekeeping)}
                  className="p-2 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left transition-all shadow-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-teal-700">Housekeeping</span>
                    <Brush className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">Bed Cleaning</p>
                </button>
              </div>

              {demoLoginLoadingRole && (
                <div className="flex items-center justify-center gap-2 py-1 text-xs font-bold text-blue-700 animate-pulse">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Logging in as {demoLoginLoadingRole}...</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-3.5" onSubmit={handleSubmit}>
              {/* Branch Dropdown in Form */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Hospital Branch *
                  </label>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {activeBranchObj.code}
                  </span>
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(parseInt(e.target.value, 10))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs cursor-pointer"
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Corporate Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="firstname.lastname@medicover.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Options Row (Remember me & Forgot Password) */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className="group-hover:text-slate-900 transition-colors font-medium text-xs">
                    Remember me
                  </span>
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-[#0A2540] hover:bg-[#071d33] active:bg-[#051524] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to {activeBranchObj.city}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Navigation Toggle */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need system access?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                Register with Role Passkey
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
