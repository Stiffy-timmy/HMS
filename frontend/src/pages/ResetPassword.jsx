import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Lock, Key, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) {
      setError('Please provide both the reset token and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.detail || 'Failed to reset password. The token may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-medicover-600/20 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-white">
          Set New Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your token and configure your new secure password
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

          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Password Updated!</h3>
              <p className="text-xs text-slate-400">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-medicover-600 hover:bg-medicover-500 shadow-md transition-all"
                >
                  Return to Sign In &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Reset Token
                </label>
                <div className="mt-1.5 relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste reset token here"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password
                </label>
                <div className="mt-1.5 relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-medicover-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm New Password
                </label>
                <div className="mt-1.5 relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
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
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>

              <div className="pt-2 text-center">
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
