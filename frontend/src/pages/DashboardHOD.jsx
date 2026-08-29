import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { BedGrid } from '../components/BedGrid';
import { PatientStaysList } from '../components/PatientStaysList';
import { LabOrdersList } from '../components/LabOrdersList';
import { ActivityFeed } from '../components/ActivityFeed';
import { LiveNotificationToast } from '../components/LiveNotificationToast';
import { HODDoctorRosterWidget } from '../components/HODDoctorRosterWidget';
import { 
  bedApi, 
  stayApi, 
  labApi, 
  activityApi, 
  dashboardApi 
} from '../api';
import { 
  Bed as BedIcon, 
  Users, 
  FlaskConical, 
  Sparkles, 
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
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statsData, bedsData, staysData, labsData, activitiesData] = await Promise.all([
        dashboardApi.getHODStats(department),
        bedApi.getBeds({ department }),
        stayApi.getStays({ department, status: 'active' }),
        labApi.getLabs({ department }),
        activityApi.getActivities({ department, limit: 30 })
      ]);

      setStats(statsData);
      setBeds(bedsData);
      setStays(staysData);
      setLabs(labsData);
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
      id: 'doctors', 
      label: 'Doctor Roster & Duty Rota', 
      icon: Stethoscope, 
      desc: 'Specialist assignments & live On Duty toggle' 
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
      id: 'audit', 
      label: 'Live Staff Activity', 
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
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>{department} Clinical Dashboard</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {stats?.occupied_beds || 0}/{stats?.total_beds || 0} Beds Occupied
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time department throughput, doctor rota, lab queue and bed allocation.</p>
            </div>
            
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Ward Beds"
              value={stats?.total_beds ?? '--'}
              subtitle={`${stats?.available_beds ?? 0} available for admit`}
              icon={BedIcon}
              color="blue"
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
              title="Cleaning / Sanitizing"
              value={stats?.cleaning_pending_beds ?? 0}
              subtitle="Turnover awaiting Housekeeping"
              icon={Sparkles}
              color="purple"
              badge={stats?.cleaning_pending_beds > 0 ? "In Turnover" : "Ready"}
            />
          </div>

          {/* Doctor Roster Widget on Overview */}
          <HODDoctorRosterWidget
            department={department}
            hospitalId={user?.hospital_id}
            isCompact={false}
          />

          {/* Quick action shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <button
              onClick={() => setActiveView('beds')}
              className="p-4 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 text-left transition-all group shadow-xs cursor-pointer"
            >
              <BedIcon className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Department Beds Matrix</span>
                <span>&rarr;</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">Review live bed status in {department}.</p>
            </button>

            <button
              onClick={() => setActiveView('stays')}
              className="p-4 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all group shadow-xs cursor-pointer"
            >
              <UserCheck className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Active Inpatients ({stays.length})</span>
                <span>&rarr;</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">View current admissions and bed assignments.</p>
            </button>

            <button
              onClick={() => setActiveView('labs')}
              className="p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 text-left transition-all group shadow-xs cursor-pointer"
            >
              <FlaskConical className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Lab Orders ({labs.length})</span>
                <span>&rarr;</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">Track pending blood work, scans and test results.</p>
            </button>
          </div>
        </div>
      )}

      {/* 2. DOCTORS & DUTY ROSTER VIEW */}
      {activeView === 'doctors' && (
        <div className="space-y-6 animate-fadeIn">
          <HODDoctorRosterWidget
            department={department}
            hospitalId={user?.hospital_id}
            isCompact={false}
          />
        </div>
      )}

      {/* 3. BEDS VIEW */}
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

      {/* 4. ACTIVE INPATIENT STAYS VIEW */}
      {activeView === 'stays' && (
        <div className="space-y-6 animate-fadeIn">
          <PatientStaysList
            stays={stays}
            title={`Active Inpatient Admissions (${department})`}
          />
        </div>
      )}

      {/* 5. LAB ORDERS VIEW */}
      {activeView === 'labs' && (
        <div className="space-y-6 animate-fadeIn">
          <LabOrdersList
            labs={labs}
            onLabUpdated={() => fetchData(true)}
            title={`${department} Diagnostic Lab Queue`}
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
