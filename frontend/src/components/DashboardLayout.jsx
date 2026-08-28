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
  Layers,
  Search,
  Bell,
  User as UserIcon,
  Radio
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
  const [searchQuery, setSearchQuery] = useState('');

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Clinical Administrator';
      case 'hod':
        return `Department Head • ${user?.department || 'Dept'}`;
      case 'staff':
      default:
        return `Ward Staff • ${user?.department || 'Dept'}`;
    }
  };

  const activeItemObj = navItems.find(item => item.id === activeView);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* LEFT SIDE PANEL (SIDEBAR) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 xl:w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shadow-xs ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header in Sidebar */}
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <span>✚</span>
              </div>
              <div className="truncate">
                <div className="font-extrabold tracking-tight text-slate-900 text-base leading-tight">
                  Hospital Ops
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {getRoleLabel(user?.role)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Navigation Header */}
          <div className="px-5 pt-5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operations Menu
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#e0f2fe] text-[#0369a1] font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#38bdf8] text-white shadow-xs' 
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    </div>
                    <div className="truncate">
                      <div className="truncate font-semibold">{item.label}</div>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge !== null && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-2 flex-shrink-0 ${
                      isActive
                        ? 'bg-[#0284c7] text-white'
                        : item.badgeColor === 'rose'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
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
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ON DUTY</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px]">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Patients, Beds, Labs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Hospital Center Name */}
            <div className="hidden xl:flex items-center gap-2 text-xs font-semibold text-slate-700 border-l border-slate-200 pl-4">
              <span>Medicover Super Specialty Hospital</span>
            </div>
          </div>

          {/* Right Action Tools: Notifications, Live Status & Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>

            {/* Live Sync Status Pill */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                isConnected 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600" />
                <span>Live</span>
              </span>
            </div>

            {/* User Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shadow-xs">
              <UserIcon className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </header>

        {/* Main View Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
};

