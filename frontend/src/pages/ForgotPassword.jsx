import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, KeyRound, ExternalLink, ArrowRight } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email);
      setResult(res);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.detail || 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Main Split-Screen Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col lg:flex-row min-h-[580px]">
        
        {/* Left Panel: Hero Banner (Dark Theme - Hidden on Mobile/Tablet) */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-10 xl:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity scale-105 pointer-events-none"
            style={{ backgroundImage: `url('/clinical_corridor.jpg')` }}
          />
          <div 
            className="absolute inset-0 bg-[linear-gradient(to_right,#38a9f70d_1px,transparent_1px),linear-gradient(to_bottom,#38a9f70d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" 
          />
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

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

          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure Account Recovery
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Operational Excellence. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200">
                Clinical Precision.
              </span>
            </h1>
            <p className="mt-4 text-slate-300 text-sm xl:text-base leading-relaxed max-w-md">
              Encrypted password recovery and reset token dispatch for authorized hospital personnel.
            </p>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              AUTHORIZED PERSONNEL ONLY &bull; V3.4.1 SECURE CONNECTION
            </span>
          </div>
        </div>

        {/* Right Panel: Clean White Card */}
        <div className="w-full lg:w-7/12 xl:w-1/2 p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white overflow-y-auto">
          <div>
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#0A2540] flex items-center justify-center text-white font-bold text-sm">
                ✚
              </div>
              <span className="text-base font-bold text-slate-900">Medicover Hospital Ops</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Reset Password
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Enter your registered corporate email to generate a secure reset token.
              </p>
            </div>

            {error && (
              <div className="my-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {result ? (
              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Reset Token Generated Successfully!
                  </div>
                  <p className="text-emerald-700">
                    As per Phase 1 simulation requirements, your secure reset link is ready:
                  </p>
                  {result.reset_token && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 space-y-1 font-mono">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold">Token:</span>
                      <div className="p-2.5 rounded-xl bg-white border border-emerald-300 break-all text-slate-800 text-[11px] font-medium">
                        {result.reset_token}
                      </div>
                    </div>
                  )}
                </div>

                {result.reset_token && (
                  <Link
                    to={`/reset-password?token=${result.reset_token}`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0A2540] hover:bg-[#071d33] shadow-md transition-all"
                  >
                    <span>Proceed to Reset Password Screen</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Registered Email Address *
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0A2540] hover:bg-[#071d33] active:bg-[#051524] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Generating Token...' : 'Generate Reset Token →'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

