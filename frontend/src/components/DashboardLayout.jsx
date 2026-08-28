import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Stethoscope, 
  Users,
  Activity,
  Layers
} from 'lucide-react';

export const DashboardLayout = ({
  title,
  subtitle,
  navItems = [],
  activeView,
  onViewChange,
  isConnected,
  children
}) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <ShieldCheck className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'hod':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Stethoscope className="w-3 h-3" />
            HOD • {user?.department || 'Dept'}
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Users className="w-3 h-3" />
            STAFF • {user?.department || 'Dept'}
          </span>
        );
    }
  };

  const getAvatarBg = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-950/60 border-purple-500/40 text-purple-300';
      case 'hod':
        return 'bg-blue-950/60 border-blue-500/40 text-blue-300';
      case 'staff':
      default:
        return 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300';
    }
  };

  const activeItemObj = navItems.find(item => item.id === activeView);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* LEFT SIDE PANEL (SIDEBAR) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950/95 lg:bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header in Sidebar */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-medicover-500 to-medicover-700 flex items-center justify-center shadow-lg shadow-medicover-500/25 text-white flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-white text-base">MEDICOVER</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-medicover-950 text-medicover-300 border border-medicover-800 font-bold">
                    OPS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Super Specialty Hospital</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Navigation Header */}
          <div className="px-5 pt-4 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation Views
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-medicover-600/90 to-medicover-700/90 text-white shadow-lg shadow-medicover-600/20 border border-medicover-500/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                    }`}>
                      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    </div>
                    <div className="truncate">
                      <div className="truncate font-medium">{item.label}</div>
                      {item.desc && (
                        <div className={`text-[10px] font-normal truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {item.desc}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge !== null && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0 ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/80'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card in Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs flex-shrink-0 ${getAvatarBg(user?.role)}`}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name}</p>
                <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Connection status */}
          <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {isConnected ? 'Real-time WebSocket' : 'Reconnecting...'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">v1.0</span>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{title || 'Dashboard'}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-200 font-semibold">{activeItemObj?.label || 'View'}</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {activeItemObj?.label || 'Overview'}
              </h1>
            </div>
          </div>

          {/* Live Sync Status Pill */}
          <div className="flex items-center gap-3">
            <div 
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
                isConnected 
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="hidden sm:inline">
                {isConnected ? 'Real-Time Sync Active' : 'Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Main View Body */}
        <main className="p-4 sm:p-6 flex-1 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
};
