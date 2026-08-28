import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { BedGrid } from '../components/BedGrid';
import { ConflictPanel } from '../components/ConflictPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { StaffManagementList } from '../components/StaffManagementList';
import { PasskeyManagerWidget } from '../components/PasskeyManagerWidget';
import { ParticipantGridWidget } from '../components/ParticipantGridWidget';
import { LiveNotificationToast } from '../components/LiveNotificationToast';
import { 
  bedApi, 
  conflictApi, 
  activityApi, 
  dashboardApi 
} from '../api';
import { 
  Bed as BedIcon, 
  Users, 
  UserCheck, 
  Clock, 
  FlaskConical, 
  AlertTriangle, 
  IndianRupee, 
  TrendingUp, 
  RefreshCw,
  Layers,
  Sparkles,
  ShieldCheck,
  Building,
  Info,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  FileText
} from 'lucide-react';

export const DashboardAdmin = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [beds, setBeds] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [hospitalUsers, setHospitalUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statsData, bedsData, conflictsData, activitiesData, usersData] = await Promise.all([
        dashboardApi.getAdminStats(),
        bedApi.getBeds(),
        conflictApi.getConflicts(),
        activityApi.getActivities({ limit: 40 }),
        dashboardApi.getHospitalUsers()
      ]);

      setStats(statsData);
      setBeds(bedsData);
      setConflicts(conflictsData);
      setActivities(activitiesData);
      setHospitalUsers(usersData);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRealtimeEvent = useCallback((event) => {
    fetchData(true);
  }, [fetchData]);

  const { isConnected, notification, clearNotification } = useWebSocket(handleRealtimeEvent);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const navItems = [
    { 
      id: 'overview', 
      label: 'Dashboard', 
      icon: Layers, 
      desc: 'KPI stats & room rates' 
    },
    { 
      id: 'beds', 
      label: 'Bed Grid', 
      icon: BedIcon, 
      badge: `${beds.length}`,
      desc: 'Interactive occupancy matrix' 
    },
    { 
      id: 'participants', 
      label: 'Patient Stays & Directory', 
      icon: Users, 
      badge: `${hospitalUsers.length}`,
      desc: 'Staff roster & database records' 
    },
    { 
      id: 'passkeys', 
      label: 'Passkey Management', 
      icon: Sparkles, 
      desc: 'Issue & store invite passkeys' 
    },
    { 
      id: 'conflicts', 
      label: 'Active Data Conflicts', 
      icon: AlertTriangle, 
      badge: conflicts.length > 0 ? `${conflicts.length}` : null,
      badgeColor: 'rose',
      desc: 'Cross-dept billing & bed sync' 
    },
    { 
      id: 'audit', 
      label: 'Live Staff Activity', 
      icon: Clock, 
      desc: 'Real-time clinical event log' 
    },
  ];

  return (
    <DashboardLayout
      title="Hospital Ops"
      subtitle="Clinical Administrator"
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* 1. EXECUTIVE OVERVIEW VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider border border-blue-200">
                  EXECUTIVE OVERVIEW
                </span>
                <span className="text-xs text-slate-400">&bull; Hospital-Wide Operations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
                Welcome back, {user?.full_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live hospital occupancy, turnaround metrics, and revenue risk audit.
              </p>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              {refreshing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Top Row: Metric Cards matching White Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: BED CAPACITY */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  BED CAPACITY
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <BedIcon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {stats ? `${stats.occupied_beds}` : '--'}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    / {stats ? `${stats.total_beds} Total` : '--'}
                  </span>
                </div>
              </div>

              {/* Sub-Metrics column blocks */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">AVAILABLE</span>
                  <span className="font-bold text-blue-600 text-sm">{stats ? stats.available_beds : '--'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">OCCUPIED</span>
                  <span className="font-bold text-slate-800 text-sm">{stats ? stats.occupied_beds : '--'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">OCCUPANCY</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {stats ? `${Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100)}%` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: ADMISSIONS TODAY */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  ADMISSIONS TODAY
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {stats?.current_admissions_count ?? '--'}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    &bull; Active
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Discharges processed today:</span>
                <strong className="text-slate-800">{stats ? stats.discharges_today_count : 0}</strong>
              </div>
            </div>

            {/* Card 3: DISCHARGES & AVG LAB TURNAROUND */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  DISCHARGES & LAB TURNAROUND
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <FlaskConical className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {stats ? `${Math.round(stats.avg_lab_turnaround_minutes)}` : '--'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">mins avg</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Tests pending completion:</span>
                <strong className="text-amber-600 font-bold">{stats ? stats.pending_labs_count : 0} tests</strong>
              </div>
            </div>
          </div>

          {/* Middle Split-Screen Section (Matching White Screenshot Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 7/12 Column */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Active Data Conflicts Card (Matching White Pic) */}
              <ConflictPanel
                conflicts={conflicts}
                revenueAtRisk={stats?.revenue_at_risk_per_day || 0}
                title="Active Data Conflicts"
                onConflictResolved={() => fetchData(true)}
                onViewAll={() => setActiveView('conflicts')}
              />

              {/* Sub-Metrics Row (Matching White Pic Bottom Row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PENDING LAB RESULTS */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    <span>PENDING LAB RESULTS</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-slate-900">{stats?.pending_labs_count || 0}</span>
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">tests in queue</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#0284c7] h-full rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 text-right">65% processing capacity</p>
                </div>

                {/* AVG TURNAROUND TIME */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>AVG TURNAROUND TIME</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {stats ? (stats.avg_lab_turnaround_minutes / 60).toFixed(1) : '4.2'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">hours</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <span>↘ -0.3h from yesterday</span>
                  </div>
                </div>
              </div>

              {/* Room Types & Pricing Structure (Matching Black UI widget in White Clinical Theme) */}
              {stats?.room_type_breakdown && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Room Types & Pricing Structure</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Multi-tier hospital rates</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {stats.room_type_breakdown.map((rt) => (
                      <div 
                        key={rt.room_type}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase">{rt.room_type}</span>
                          <span className="font-mono text-xs font-bold text-emerald-700">{formatPrice(rt.price_per_day)}/day</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Capacity:</span>
                          <span className="font-bold text-slate-800">{rt.total} Total</span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {rt.available} Available
                          </span>
                          <span className="text-rose-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {rt.occupied} Occupied
                          </span>
                        </div>

                        <div className="mt-2.5 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-rose-500 h-full" 
                            style={{ width: `${(rt.occupied / (rt.total || 1)) * 100}%` }} 
                            title={`Occupied: ${rt.occupied}`}
                          />
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${(rt.available / (rt.total || 1)) * 100}%` }} 
                            title={`Available: ${rt.available}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveView('beds')}
                  className="p-4 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 text-left transition-all group shadow-xs cursor-pointer"
                >
                  <BedIcon className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Manage Bed Grid</span>
                    <span>&rarr;</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">Live status, room allocation and maintenance controls.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('participants')}
                  className="p-4 rounded-2xl bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 text-left transition-all group shadow-xs cursor-pointer"
                >
                  <Users className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Participants Directory</span>
                    <span>&rarr;</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">View all registered accounts with database deletion.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('passkeys')}
                  className="p-4 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all group shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Passkey Management</span>
                    <span>&rarr;</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">Generate passkeys stored in database for handover.</p>
                </button>
              </div>
            </div>

            {/* Right 4/12 Column (Matching White Pic Right Column) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Card 1: Revenue at Risk Box (Matching White Pic) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                    <span className="text-sm font-black text-rose-600">₹</span>
                    <span>REVENUE AT RISK</span>
                  </div>
                  <Info className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {stats ? formatPrice(stats.revenue_at_risk_per_day) : '₹40,000'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Due to unresolved conflicts (48h+) &bull; {conflicts.filter(c => c.status !== 'resolved').length} open
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveView('conflicts')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs text-center cursor-pointer"
                  >
                    Generate Risk Report &rarr;
                  </button>
                </div>
              </div>

              {/* Card 2: Live Staff Activity (Matching White Pic) */}
              <ActivityFeed
                activities={activities}
                title="LIVE STAFF ACTIVITY"
                onViewAll={() => setActiveView('audit')}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. BED MATRIX & OCCUPANCY VIEW */}
      {activeView === 'beds' && (
        <div className="space-y-6 animate-fadeIn">
          <BedGrid
            beds={beds}
            onBedUpdated={() => fetchData(true)}
            title="Hospital-Wide Bed Operations Matrix"
            subtitle="Click any bed to update status • Real-time WebSocket push enabled"
          />
        </div>
      )}

      {/* 3. PARTICIPANTS DIRECTORY VIEW */}
      {activeView === 'participants' && (
        <div className="space-y-6 animate-fadeIn">
          <ParticipantGridWidget
            users={hospitalUsers}
            loading={loading}
            onRefresh={() => fetchData(true)}
            onUserDeleted={(deletedId) => {
              setHospitalUsers(prev => prev.filter(u => u.id !== deletedId));
            }}
          />
        </div>
      )}

      {/* 4. PASSKEY MANAGEMENT VIEW */}
      {activeView === 'passkeys' && (
        <div className="space-y-6 animate-fadeIn">
          <PasskeyManagerWidget
            onPasskeyCreated={() => fetchData(true)}
          />
        </div>
      )}

      {/* 5. OPERATIONAL CONFLICTS VIEW */}
      {activeView === 'conflicts' && (
        <div className="space-y-6 animate-fadeIn">
          <ConflictPanel
            conflicts={conflicts}
            revenueAtRisk={stats?.revenue_at_risk_per_day || 0}
            title="Cross-Department Operational Desync Logs"
            onConflictResolved={() => fetchData(true)}
          />
        </div>
      )}

      {/* 6. ACTIVITY AUDIT TRAIL VIEW */}
      {activeView === 'audit' && (
        <div className="space-y-6 animate-fadeIn">
          <ActivityFeed
            activities={activities}
            title="Hospital Audit Trail & Event Logs"
          />
        </div>
      )}

      {/* Live Push Notification Toast */}
      {notification && (
        <LiveNotificationToast
          notification={notification}
          onClose={clearNotification}
        />
      )}
    </DashboardLayout>
  );
};
