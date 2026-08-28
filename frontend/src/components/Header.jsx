import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Activity, 
  Wifi, 
  WifiOff, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck,
  Stethoscope,
  Users
} from 'lucide-react';

export const Header = ({ isConnected }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'hod':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Stethoscope className="w-3 h-3" />
            HOD &bull; {user?.department || 'Dept'}
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Users className="w-3 h-3" />
            STAFF &bull; {user?.department || 'Dept'}
          </span>
        );
    }
  };

  return (
    <header className="glass-header sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Hospital Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medicover-500 to-medicover-700 flex items-center justify-center shadow-lg shadow-medicover-500/20 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-lg">MEDICOVER</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-medicover-900/80 text-medicover-300 border border-medicover-700 font-mono">
                OPS v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Super Specialty Hospital &bull; Cyberabad</p>
          </div>
        </div>

        {/* Right side: Real-time status indicator & User Info */}
        <div className="flex items-center gap-4">
          {/* WebSocket Status Indicator */}
          <div 
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isConnected 
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}
            title={isConnected ? 'Connected to live push updates' : 'Reconnecting to real-time service...'}
          >
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            {isConnected ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Live Sync
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>

          {/* User Profile info */}
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-semibold text-slate-200">{user?.full_name}</div>
              <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
