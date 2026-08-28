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
  Building
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
      label: 'Executive Overview', 
      icon: Layers, 
      desc: 'KPI stats & room rates' 
    },
    { 
      id: 'beds', 
      label: 'Bed Matrix & Rates', 
      icon: BedIcon, 
      badge: `${beds.length}`,
      desc: 'Interactive occupancy matrix' 
    },
    { 
      id: 'participants', 
      label: 'Participants Directory', 
      icon: Users, 
      badge: `${hospitalUsers.length}`,
      desc: 'Staff roster & database deletion' 
    },
    { 
      id: 'passkeys', 
      label: 'Passkey Management', 
      icon: Sparkles, 
      desc: 'Issue & store invite passkeys' 
    },
    { 
      id: 'conflicts', 
      label: 'Operational Conflicts', 
      icon: AlertTriangle, 
      badge: conflicts.length > 0 ? `${conflicts.length}` : null,
      badgeColor: 'rose',
      desc: 'Cross-dept billing & bed sync' 
    },
    { 
      id: 'audit', 
      label: 'Activity Audit Trail', 
      icon: Clock, 
      desc: 'Real-time clinical event log' 
    },
  ];

  return (
    <DashboardLayout
      title="Hospital Administration"
      subtitle="Executive Management & Clinical Ops"
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* 1. EXECUTIVE OVERVIEW VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Welcome Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-500/20 text-purple-400 text-xs font-mono font-bold uppercase">
                  EXECUTIVE OVERVIEW
                </span>
                <span className="text-xs text-slate-400">&bull; Hospital-Wide Operations</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Welcome back, {user?.full_name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live hospital occupancy, turnaround metrics, and revenue risk audit.
              </p>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-medicover-400' : ''}`} />
              {refreshing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Capacity"
              value={stats ? `${stats.total_beds} Beds` : '--'}
              subtitle={stats ? `${stats.available_beds} available • ${stats.occupied_beds} occupied` : ''}
              icon={BedIcon}
              color="blue"
              badge={stats ? `${Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100)}% Occupancy` : ''}
            />
            <StatCard
              title="Admissions Today"
              value={stats?.current_admissions_count ?? '--'}
              subtitle={stats ? `${stats.discharges_today_count} discharges processed today` : ''}
              icon={UserCheck}
              color="emerald"
            />
            <StatCard
              title="Avg Lab Turnaround"
              value={stats ? `${Math.round(stats.avg_lab_turnaround_minutes)} mins` : '--'}
              subtitle={stats ? `${stats.pending_labs_count} tests pending completion` : ''}
              icon={FlaskConical}
              color="amber"
            />
            <StatCard
              title="Revenue at Risk"
              value={stats ? formatPrice(stats.revenue_at_risk_per_day) : '--'}
              subtitle={stats ? `${stats.unresolved_conflicts_count} active desync conflicts` : ''}
              icon={IndianRupee}
              color="rose"
              badge={stats?.unresolved_conflicts_count > 0 ? "Requires Attention" : "Nominal"}
            />
          </div>

          {/* Pricing Tiers & Room Capacity Matrix */}
          {stats?.room_type_breakdown && (
            <div className="glass-panel p-5 rounded-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-medicover-400" />
                  <h3 className="text-sm font-bold text-slate-200">Room Types & Pricing Structure</h3>
                </div>
                <span className="text-xs text-slate-400">Multi-tier hospital rates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {stats.room_type_breakdown.map((rt) => (
                  <div 
                    key={rt.room_type}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase">{rt.room_type}</span>
                      <span className="font-mono text-xs font-bold text-emerald-400">{formatPrice(rt.price_per_day)}/day</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Capacity:</span>
                      <span className="font-bold text-slate-200">{rt.total} Total</span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {rt.available} Available
                      </span>
                      <span className="text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {rt.occupied} Occupied
                      </span>
                    </div>

                    <div className="mt-2.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
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

          {/* Quick shortcuts to other views */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              onClick={() => setActiveView('beds')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <BedIcon className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Manage Bed Matrix &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Live status, room allocation and maintenance controls.</p>
            </button>

            <button
              onClick={() => setActiveView('participants')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <Users className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Participants Directory &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">View all registered accounts with instant database deletion.</p>
            </button>

            <button
              onClick={() => setActiveView('passkeys')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <Sparkles className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Issue Onboarding Passkey &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Generate passkeys stored in database for in-person handover.</p>
            </button>
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
            onUserDeleted={(deletedId) => {
              setHospitalUsers(prev => prev.filter(u => u.id !== deletedId));
              fetchData(true);
            }}
            onRefresh={() => fetchData(true)}
            loading={loading}
          />
        </div>
      )}

      {/* 4. PASSKEY & ONBOARDING VIEW */}
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
            revenueAtRisk={stats?.revenue_at_risk_per_day}
            title="Hospital-Wide Operational Conflicts"
          />
        </div>
      )}

      {/* 6. ACTIVITY AUDIT TRAIL VIEW */}
      {activeView === 'audit' && (
        <div className="space-y-6 animate-fadeIn">
          <ActivityFeed
            activities={activities}
            title="Hospital Staff & Operational Audit Trail"
          />
        </div>
      )}

      {/* Floating Real-Time WebSocket Toast Notification */}
      <LiveNotificationToast
        notification={notification}
        onClose={clearNotification}
      />
    </DashboardLayout>
  );
};
