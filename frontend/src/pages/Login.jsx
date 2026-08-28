import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Building2, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Stethoscope, Users, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-medicover-600/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-purple-600/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medicover-500 to-medicover-700 flex items-center justify-center shadow-xl shadow-medicover-500/25 text-white">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          MEDICOVER OPERATIONS
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-400">
          Unified Hospital Management &bull; Phase 1 Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="mt-1.5 relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-medicover-400 hover:text-medicover-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500 transition-colors"
                />
              </div>
            </div>

            {/* Remember Session Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-medicover-600 focus:ring-medicover-500 focus:ring-offset-slate-950 accent-medicover-600 cursor-pointer"
                />
                <span className="group-hover:text-white transition-colors font-medium">
                  Remember my session on this device
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-medicover-600 to-medicover-700 hover:from-medicover-500 hover:to-medicover-600 shadow-lg shadow-medicover-600/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Autofill Selector */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Accounts (Password: Password@123)
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@medicover.com', 'admin')}
                className="w-full px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/40 text-purple-200 text-xs font-semibold flex items-center justify-between transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <strong>Hospital Admin</strong> (Dr. Rajesh Sharma)
                </span>
                <span className="text-[10px] font-mono text-purple-300">admin@...</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('hod.cardio@medicover.com', 'hod')}
                className="w-full px-3 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/40 text-blue-200 text-xs font-semibold flex items-center justify-between transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                  <strong>HOD Cardiology</strong> (Dr. Ananya Rao)
                </span>
                <span className="text-[10px] font-mono text-blue-300">hod.cardio@...</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('staff.cardio1@medicover.com', 'staff')}
                className="w-full px-3 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/40 text-cyan-200 text-xs font-semibold flex items-center justify-between transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>Staff Cardiology</strong> (Nurse Priya Patel)
                </span>
                <span className="text-[10px] font-mono text-cyan-300">staff.cardio1@...</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Need a new clinical account?{' '}
              <Link to="/signup" className="text-medicover-400 hover:text-medicover-300 font-semibold">
                Sign up with Role Invite Code &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
