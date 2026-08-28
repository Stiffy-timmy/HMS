import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { BedGrid } from '../components/BedGrid';
import { PatientStaysList } from '../components/PatientStaysList';
import { LabOrdersList } from '../components/LabOrdersList';
import { LiveNotificationToast } from '../components/LiveNotificationToast';
import { 
  bedApi, 
  stayApi, 
  labApi, 
  dashboardApi 
} from '../api';
import { 
  Bed as BedIcon, 
  Users, 
  FlaskConical, 
  RefreshCw,
  Layers,
  UserCheck
} from 'lucide-react';

export const DashboardStaff = () => {
  const { user } = useAuth();
  const department = user?.department || 'Cardiology';

  const [activeView, setActiveView] = useState('beds');
  const [stats, setStats] = useState(null);
  const [beds, setBeds] = useState([]);
  const [stays, setStays] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statsData, bedsData, staysData, labsData] = await Promise.all([
        dashboardApi.getStaffStats(department),
        bedApi.getBeds({ department }),
        stayApi.getStays({ department, status: 'active' }),
        labApi.getLabs({ department })
      ]);

      setStats(statsData);
      setBeds(bedsData);
      setStays(staysData);
      setLabs(labsData);
    } catch (err) {
      console.error("Staff dashboard fetch error:", err);
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
      id: 'beds', 
      label: 'Bed Operations Matrix', 
      icon: BedIcon, 
      badge: `${beds.length}`,
      desc: 'Rapid 1-click status updater' 
    },
    { 
      id: 'stays', 
      label: 'Inpatient Patients', 
      icon: UserCheck, 
      badge: `${stays.length}`,
      desc: 'Admitted patients in ward' 
    },
    { 
      id: 'labs', 
      label: 'Lab Workstation', 
      icon: FlaskConical, 
      badge: pendingLabsCount > 0 ? `${pendingLabsCount}` : null,
      badgeColor: 'amber',
      desc: 'Specimen collection queue' 
    },
    { 
      id: 'overview', 
      label: 'Ward Summary', 
      icon: Layers, 
      desc: 'Occupancy & workload stats' 
    },
  ];

  return (
    <DashboardLayout
      title={`Staff Desk • ${department}`}
      subtitle="Ward Operations & Specimen Queue"
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* 1. BED OPERATIONS MATRIX VIEW (Default for staff) */}
      {activeView === 'beds' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Department Stat Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Department Beds"
              value={stats ? `${stats.occupied_beds}/${stats.total_beds}` : '--'}
              subtitle={stats ? `${stats.available_beds} ready for admission` : ''}
              icon={BedIcon}
              color="blue"
              badge={stats ? `${Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100)}% Full` : ''}
            />
            <StatCard
              title="Active Inpatients"
              value={stats?.active_stays_count ?? '--'}
              subtitle="Admitted under ward care"
              icon={Users}
              color="emerald"
            />
            <StatCard
              title="Pending Lab Tests"
              value={stats?.pending_labs_count ?? '--'}
              subtitle="Awaiting specimen collection or results"
              icon={FlaskConical}
              color="amber"
              badge={stats?.pending_labs_count > 0 ? "Action Needed" : "Clear"}
            />
          </div>

          <BedGrid
            beds={beds}
            onBedUpdated={() => fetchData(true)}
            title={`${department} Bed Grid`}
            subtitle="Click any bed card to update its status (Available, Occupied, Cleaning, Maintenance)"
          />
        </div>
      )}

      {/* 2. INPATIENT STAYS VIEW */}
      {activeView === 'stays' && (
        <div className="space-y-6 animate-fadeIn">
          <PatientStaysList
            stays={stays}
            title={`${department} Admitted Inpatients`}
          />
        </div>
      )}

      {/* 3. LAB ORDERS WORKSTATION VIEW */}
      {activeView === 'labs' && (
        <div className="space-y-6 animate-fadeIn">
          <LabOrdersList
            labs={labs}
            onLabUpdated={() => fetchData(true)}
            title={`${department} Diagnostic Specimen Queue`}
          />
        </div>
      )}

      {/* 4. WARD SUMMARY VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-mono font-bold uppercase">
                  WARD SUMMARY
                </span>
                <span className="text-xs text-slate-400">&bull; {department} Department</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Hello, {user?.full_name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of current ward workload, bed allocation, and specimen tracking.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Department Beds"
              value={stats ? `${stats.occupied_beds}/${stats.total_beds}` : '--'}
              subtitle={stats ? `${stats.available_beds} ready for admission` : ''}
              icon={BedIcon}
              color="blue"
            />
            <StatCard
              title="Active Inpatients"
              value={stats?.active_stays_count ?? '--'}
              subtitle="Admitted under ward care"
              icon={Users}
              color="emerald"
            />
            <StatCard
              title="Pending Lab Tests"
              value={stats?.pending_labs_count ?? '--'}
              subtitle="Awaiting specimen collection or results"
              icon={FlaskConical}
              color="amber"
            />
          </div>

          {/* Quick shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <button
              onClick={() => setActiveView('beds')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <BedIcon className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Go to Bed Operations &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">One-click update bed status and room cleaning state.</p>
            </button>

            <button
              onClick={() => setActiveView('stays')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <UserCheck className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Go to Inpatients ({stays.length}) &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Review active patient records and admission dates.</p>
            </button>

            <button
              onClick={() => setActiveView('labs')}
              className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <FlaskConical className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-white">Go to Lab Queue ({labs.length}) &rarr;</h4>
              <p className="text-xs text-slate-400 mt-1">Mark samples collected or enter diagnostic results.</p>
            </button>
          </div>
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
