import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { BedGrid } from '../components/BedGrid';
import { PatientStaysList } from '../components/PatientStaysList';
import { LabOrdersList } from '../components/LabOrdersList';
import { ConflictPanel } from '../components/ConflictPanel';
import { ActivityFeed } from '../components/ActivityFeed';
import { LiveNotificationToast } from '../components/LiveNotificationToast';
import { 
  bedApi, 
  stayApi, 
  labApi, 
  conflictApi, 
  activityApi, 
  dashboardApi 
} from '../api';
import { 
  Bed as BedIcon, 
  Users, 
  FlaskConical, 
  AlertTriangle, 
  RefreshCw,
  Layers,
  Stethoscope,
  Clock,
  UserCheck
} from 'lucide-react';

export const DashboardHOD = () => {
  const { user } = useAuth();
  const department = user?.department || 'Cardiology';

  const [activeView, setActiveView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [beds, setBeds] = useState([]);
  const [stays, setStays] = useState([]);
  const [labs, setLabs] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statsData, bedsData, staysData, labsData, conflictsData, activitiesData] = await Promise.all([
        dashboardApi.getHODStats(department),
        bedApi.getBeds({ department }),
        stayApi.getStays({ department, status: 'active' }),
        labApi.getLabs({ department }),
        conflictApi.getConflicts({ department }),
        activityApi.getActivities({ department, limit: 30 })
      ]);

      setStats(statsData);
      setBeds(bedsData);
      setStays(staysData);
      setLabs(labsData);
      setConflicts(conflictsData);
      setActivities(activitiesData);
    } catch (err) {
      console.error("HOD dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [department]);

  const handleRealtimeEvent = useCallback((event) => {
    fetchData(true);
  }, [fetchData]);

  const { isConnected, notification, clearNotification } = useWebSocket(handleRealtimeEvent);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingLabsCount = labs.filter(l => l.status === 'pending' || l.status === 'in_progress').length;

  const navItems = [
    { 
      id: 'overview', 
      label: 'Department Overview', 
      icon: Layers, 
      desc: 'KPI cards & clinical summary' 
    },
    { 
      id: 'beds', 
      label: 'Department Beds', 
      icon: BedIcon, 
      badge: `${beds.length}`,
      desc: 'Live occupancy & status grid' 
    },
    { 
      id: 'stays', 
      label: 'Active Inpatients', 
      icon: UserCheck, 
      badge: `${stays.length}`,
      desc: 'Admitted patients & bed assignments' 
    },
    { 
      id: 'labs', 
      label: 'Diagnostic Lab Orders', 
      icon: FlaskConical, 
      badge: pendingLabsCount > 0 ? `${pendingLabsCount}` : null,
      badgeColor: 'amber',
      desc: 'Specimen orders & turnaround' 
    },
    { 
      id: 'conflicts', 
      label: 'Department Conflicts', 
      icon: AlertTriangle, 
      badge: conflicts.length > 0 ? `${conflicts.length}` : null,
      badgeColor: 'rose',
      desc: 'Departmental billing/bed desyncs' 
    },
    { 
      id: 'audit', 
      label: 'Staff Activity Log', 
      icon: Clock, 
      desc: 'Department actions audit trail' 
    },
  ];

  return (
    <DashboardLayout
      title={`HOD • ${department}`}
      subtitle="Clinical Department Operations"
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* 1. OVERVIEW VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Welcome Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" />
                  HEAD OF DEPARTMENT (HOD)
                </span>
                <span className="text-xs text-slate-400">&bull; {department} Division</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Welcome back, {user?.full_name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Departmental bed availability, patient admissions, and pending diagnostic orders.
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

          {/* Department KPI Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Department Beds"
              value={stats ? `${stats.occupied_beds}/${stats.total_beds}` : '--'}
              subtitle={stats ? `${stats.available_beds} currently available` : ''}
              icon={BedIcon}
              color="blue"
              badge={stats ? `${Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100)}% Full` : ''}
            />
            <StatCard
              title="Active Inpatients"
              value={stats?.active_stays_count ?? '--'}
              subtitle="Admitted under this department"
              icon={Users}
              color="emerald"
            />
            <StatCard
              title="Pending Lab Tests"
              value={stats?.pending_labs_count ?? '--'}
              subtitle="Awaiting specimen or result"
              icon={FlaskConical}
              color="amber"
              badge={stats?.pending_labs_count > 0 ? "In Progress" : "Clear"}
            />
            <StatCard
              title="Department Conflicts"
              value={stats?.unresolved_conflicts_count ?? '--'}
              subtitle="Operational data discrepancies"
              icon={AlertTriangle}
              color="rose"
              badge={stats?.unresolved_conflicts_count > 0 ? "Review Required" : "All Clean"}
            />
          </div>

          {/* Quick action shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              onClick={() => setActiveView('beds')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <BedIcon className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Department Beds Matrix &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Review live bed status in {department}.</p>
            </button>

            <button
              onClick={() => setActiveView('stays')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <UserCheck className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Active Inpatients ({stays.length}) &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">View current admissions and bed assignments.</p>
            </button>

            <button
              onClick={() => setActiveView('labs')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <FlaskConical className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Lab Orders ({labs.length}) &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Track pending blood work, scans and test results.</p>
            </button>
          </div>
        </div>
      )}

      {/* 2. BEDS VIEW */}
      {activeView === 'beds' && (
        <div className="space-y-6 animate-fadeIn">
          <BedGrid
            beds={beds}
            onBedUpdated={() => fetchData(true)}
            title={`${department} Bed Matrix`}
            subtitle="Click any bed to update its status • Instant WebSocket push"
          />
        </div>
      )}

      {/* 3. ACTIVE INPATIENT STAYS VIEW */}
      {activeView === 'stays' && (
        <div className="space-y-6 animate-fadeIn">
          <PatientStaysList
            stays={stays}
            title={`Active Inpatient Admissions (${department})`}
          />
        </div>
      )}

      {/* 4. LAB ORDERS VIEW */}
      {activeView === 'labs' && (
        <div className="space-y-6 animate-fadeIn">
          <LabOrdersList
            labs={labs}
            onLabUpdated={() => fetchData(true)}
            title={`${department} Diagnostic Lab Queue`}
          />
        </div>
      )}

      {/* 5. CONFLICTS VIEW */}
      {activeView === 'conflicts' && (
        <div className="space-y-6 animate-fadeIn">
          <ConflictPanel
            conflicts={conflicts}
            title={`${department} Operational Conflicts`}
          />
        </div>
      )}

      {/* 6. AUDIT TRAIL VIEW */}
      {activeView === 'audit' && (
        <div className="space-y-6 animate-fadeIn">
          <ActivityFeed
            activities={activities}
            title={`${department} Clinical Staff Audit Trail`}
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
