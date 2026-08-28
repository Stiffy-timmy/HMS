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
  CheckCircle2
} from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('hms_remember_me') !== 'false');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await login({ email, password }, rememberMe);
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (user.role === 'hod') {
        navigate('/dashboard/hod');
      } else {
        navigate('/dashboard/staff');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError(null);
  };

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
              High-Availability Clinical Portal
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

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Real-time Multi-Ward Bed Tracking & Synchronization</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Role-Enforced Workflows (Admin, HOD, Ward Staff)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-md bg-blue-900/80 border border-blue-700/50 flex items-center justify-center text-blue-300 flex-shrink-0 text-[11px]">
                  ✓
                </div>
                <span>Passkey-Verified Cryptographic Authentication</span>
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
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#0A2540] flex items-center justify-center text-white font-bold text-sm">
                ✚
              </div>
              <span className="text-base font-bold text-slate-900">Medicover Hospital Ops</span>
            </div>

            {/* Header */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Please sign in to your clinical dashboard.
              </p>
            </div>

            {/* Quick Demo Access Shortcut */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Quick Demo Access</h4>
                  <p className="text-[11px] text-slate-500">No credentials needed — jump straight into a live dashboard</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@medicover.com', 'admin')}
                  className="w-full px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-slate-800 text-xs font-semibold flex items-center justify-between shadow-xs transition-all group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span>Operations Lead</span>
                  </span>
                  <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('staff.cardio1@medicover.com', 'staff')}
                  className="w-full px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-800 text-xs font-semibold flex items-center justify-between shadow-xs transition-all group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Ward Staff</span>
                  </span>
                  <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Options Row (Remember me & Forgot Password) */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className="group-hover:text-slate-900 transition-colors font-medium">
                    Remember me
                  </span>
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0A2540] hover:bg-[#071d33] active:bg-[#051524] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Ops</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Navigation Toggle */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need system access?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                Request Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

