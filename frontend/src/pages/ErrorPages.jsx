import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Unauthorized = () => {
  const { user } = useAuth();
  
  const getHomeLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/dashboard/admin';
    if (user.role === 'hod') return '/dashboard/hod';
    return '/dashboard/staff';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-white">403 — Access Restricted</h1>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        You do not have permission to view this department or administrative console.
      </p>
      <div className="mt-6">
        <Link
          to={getHomeLink()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-medicover-600 hover:bg-medicover-500 text-white text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Your Assigned Dashboard
        </Link>
      </div>
    </div>
  );
};

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-extrabold text-white">404</h1>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        The requested page does not exist in the hospital operations system.
      </p>
      <div className="mt-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-medicover-600 hover:bg-medicover-500 text-white text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Sign In
        </Link>
      </div>
    </div>
  );
};
