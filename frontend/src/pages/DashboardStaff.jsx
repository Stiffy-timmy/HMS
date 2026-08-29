import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { DashboardLayout } from '../components/DashboardLayout';
import { StatCard } from '../components/StatCard';
import { BedGrid } from '../components/BedGrid';
import { QuickAdmitWidget } from '../components/QuickAdmitWidget';
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
  const isHousekeeping = department.toLowerCase() === 'housekeeping';

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
      const bedParams = isHousekeeping ? {} : { department };
      const stayParams = isHousekeeping ? { status: 'active' } : { department, status: 'active' };
      const labParams = isHousekeeping ? {} : { department };

      const [statsData, bedsData, staysData, labsData] = await Promise.all([
        dashboardApi.getStaffStats(department),
        bedApi.getBeds(bedParams),
        stayApi.getStays(stayParams),
        labApi.getLabs(labParams)
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
  }, [department, isHousekeeping]);


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
      title={`Ward • ${department}`}
      subtitle="Staff Operations Console"
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* 1. BEDS VIEW */}
      {activeView === 'beds' && (
        <div className="space-y-6 animate-fadeIn">
          <QuickAdmitWidget
            beds={beds}
            stays={stays}
            department={department}
            onAdmitted={() => fetchData(true)}
          />

          <BedGrid
            beds={beds}
            onBedUpdated={() => fetchData(true)}
            title={isHousekeeping ? "Hospital-Wide Housekeeping & Sanitation Matrix" : `${department} Ward Bed Operations`}
            subtitle={isHousekeeping ? "Sanitize and clear Cleaning Pending beds across all hospital wards" : "Rapid status updating: 1-click occupancy, reservation, and cleaning toggles"}
          />

        </div>
      )}

      {/* 2. ACTIVE INPATIENT STAYS VIEW */}
      {activeView === 'stays' && (
        <div className="space-y-6 animate-fadeIn">
          <PatientStaysList
            stays={stays}
            onStayDischarged={() => fetchData(true)}
            title={`Admitted Inpatients (${department})`}
          />
        </div>
      )}

      {/* 3. LAB ORDERS QUEUE VIEW */}
      {activeView === 'labs' && (
        <div className="space-y-6 animate-fadeIn">
          <LabOrdersList
            labs={labs}
            onLabUpdated={() => fetchData(true)}
            title={`${department} Lab Specimen & Tests Workstation`}
          />
        </div>
      )}

      {/* 4. WARD SUMMARY VIEW */}
      {activeView === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Welcome Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-xs font-bold uppercase border border-cyan-200">
                  STAFF WORKSTATION
                </span>
                <span className="text-xs text-slate-400">&bull; {department} Ward</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">
                Welcome, {user?.full_name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live department occupancy, admitted patient records, and lab collection queue.
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Ward Bed Occupancy"
              value={stats ? `${stats.occupied_beds}/${stats.total_beds}` : '--'}
              subtitle={stats ? `${stats.available_beds} beds free for admission` : ''}
              icon={BedIcon}
              color="blue"
              badge={stats ? `${Math.round((stats.occupied_beds / (stats.total_beds || 1)) * 100)}% Occupied` : ''}
            />
            <StatCard
              title="Active Inpatients"
              value={stats?.active_stays_count ?? '--'}
              subtitle="Current ward admissions"
              icon={UserCheck}
              color="emerald"
            />
            <StatCard
              title="Pending Diagnostic Tests"
              value={stats?.pending_labs_count ?? '--'}
              subtitle="Specimen collection required"
              icon={FlaskConical}
              color="amber"
              badge={stats?.pending_labs_count > 0 ? "Action Required" : "Up to date"}
            />
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
