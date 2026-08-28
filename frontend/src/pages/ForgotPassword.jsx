import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Building2, Mail, ArrowLeft, AlertCircle, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-medicover-600/20 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medicover-500 to-medicover-700 flex items-center justify-center shadow-xl shadow-medicover-500/25 text-white">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-white">
          Reset Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your registered email to generate a secure reset token
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-8 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Reset Token Generated!
                </div>
                <p>
                  As per Phase 1 simulation requirements, the reset link has been logged to the server console.
                </p>
                {result.reset_token && (
                  <div className="mt-2 pt-2 border-t border-emerald-800/60 space-y-1 font-mono">
                    <span className="text-[10px] text-emerald-400 uppercase">Token:</span>
                    <div className="p-2 rounded bg-slate-950 border border-emerald-900 break-all text-slate-200 text-[11px]">
                      {result.reset_token}
                    </div>
                  </div>
                )}
              </div>

              {result.reset_token && (
                <Link
                  to={`/reset-password?token=${result.reset_token}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-medicover-600 hover:bg-medicover-500 shadow-md transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Proceed to Reset Password Screen &rarr;
                </Link>
              )}

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Registered Email Address
                </label>
                <div className="mt-1.5 relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-medicover-600 to-medicover-700 hover:from-medicover-500 hover:to-medicover-600 shadow-lg shadow-medicover-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Generating Token...' : 'Send Reset Link'}
                </button>
              </div>

              <div className="pt-3 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
