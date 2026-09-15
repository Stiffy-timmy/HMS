import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { ambulanceApi, tripApi } from '../api';
import { DashboardLayout } from '../components/DashboardLayout';
import { AmbulanceLiveMap } from '../components/AmbulanceLiveMap';
import { LiveNotificationToast } from '../components/LiveNotificationToast';
import {
  Ambulance,
  MapPin,
  Clock,
  Play,
  UserCheck,
  CheckCircle2,
  Power,
  PowerOff,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  Truck,
  XCircle,
  Building2,
  ShieldCheck,
} from 'lucide-react';

const TRIP_STATUS_META = {
  scheduled:     { label: 'Scheduled',   color: 'bg-slate-100 text-slate-700 border-slate-200',      next: 'dispatched' },
  dispatched:    { label: 'Dispatched',  color: 'bg-amber-100 text-amber-800 border-amber-200',     next: 'en_route' },
  en_route:      { label: 'En Route',    color: 'bg-blue-100 text-blue-800 border-blue-200',         next: 'at_pickup' },
  at_pickup:     { label: 'At Pickup',  color: 'bg-teal-100 text-teal-800 border-teal-200',         next: 'at_hospital' },
  at_hospital:   { label: 'At Hospital', color: 'bg-cyan-100 text-cyan-800 border-cyan-200',         next: 'completed' },
  completed:     { label: 'Completed',   color: 'bg-emerald-100 text-emerald-800 border-emerald-200', next: null },
  cancelled:     { label: 'Cancelled',   color: 'bg-rose-100 text-rose-700 border-rose-200',         next: null },
};

const TRIP_EVENT_FOR_NEXT = {
  dispatched:  'en_route_dispatched',
  en_route:    'en_route_started',
  at_pickup:   'patient_onboard',
  at_hospital: 'arrived_hospital',
  completed:   'trip_completed',
};

/**
 * Driver Dashboard
 *  - Secure-context banner
 *  - My current trip card (Start / Patient Onboard / Complete)
 *  - Geolocation ping start/stop
 *  - Branch-fleet panel (DriverFleetCard style)
 *  - Live position mini-map
 */
export const DashboardAmbulance = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [fleet, setFleet] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [myAmbulance, setMyAmbulance] = useState(null);
  const [myBranch, setMyBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pingActive, setPingActive] = useState(false);
  const [pingError, setPingError] = useState(null);
  const [secureOk, setSecureOk] = useState(true);
  const [lastPingTime, setLastPingTime] = useState(null);
  const watchIdRef = useRef(null);
  const pingLoopRef = useRef(null);

  // Detect secure context
  useEffect(() => {
    setSecureOk(typeof window !== 'undefined' ? !!window.isSecureContext : false);
  }, []);

  // Fetch fleet + my branch
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [ambulances, trips] = await Promise.all([
        ambulanceApi.getAmbulances().catch(() => []),
        tripApi.getTrips({ status: 'active' }).catch(() => []),
      ]);

      // Determine the branch: if user has a hospital_id, use that; else use the ambulance linked to driver_user_id
      const myAmb = (ambulances || []).find(a => a.driver_user_id === user?.id) || null;
      const branchId = user?.hospital_id || myAmb?.hospital_id;

      // Filter fleet to driver's branch
      const branchFleet = (ambulances || []).filter(a => a.hospital_id === branchId);

      setFleet(branchFleet);
      setMyAmbulance(myAmb);
      setMyBranch({
        id: branchId,
        name: branchId === 1 ? 'Hitech City (Hyderabad)'
          : branchId === 2 ? 'Whitefield (Bengaluru)'
          : branchId === 3 ? 'MVP Colony (Visakhapatnam)'
          : branchId === 4 ? 'Navi Mumbai (Mumbai)'
          : `Branch ${branchId}`,
        latitude: branchId === 1 ? 17.4474
          : branchId === 2 ? 12.9698
          : branchId === 3 ? 17.7412
          : branchId === 4 ? 19.0330
          : null,
        longitude: branchId === 1 ? 78.3762
          : branchId === 2 ? 77.7500
          : branchId === 3 ? 83.3340
          : branchId === 4 ? 73.0297
          : null,
      });

      // Find the driver's active trip
      const myActiveTrip = (trips || []).find(t => t.ambulance_id === myAmb?.id) || null;
      setActiveTrip(myActiveTrip);
    } catch (err) {
      console.error('Driver dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // WebSocket → refetch on relevant events
  const handleRealtimeEvent = useCallback((event) => {
    if (['AmbulanceTrip', 'AmbulancePing', 'TripEvent'].includes(event.table)) {
      fetchData(true);
    }
  }, [fetchData]);
  const { isConnected, notification, clearNotification } = useWebSocket(handleRealtimeEvent);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Send a single ping to the backend
  const sendPing = useCallback(async (lat, lng) => {
    if (!myAmbulance) return;
    try {
      await ambulanceApi.pingLocation(myAmbulance.id, {
        latitude: lat,
        longitude: lng,
        speed: null,
        heading: null,
        trip_id: activeTrip?.id || null,
      });
      setLastPingTime(new Date());
      setPingError(null);
    } catch (err) {
      console.warn('Ping failed:', err);
      setPingError('Could not send ping — check connection.');
    }
  }, [myAmbulance, activeTrip]);

  // Start continuous GPS pings via watchPosition (every successful fix -> send ping)
  const startPinging = useCallback(() => {
    if (!secureOk) {
      setPingError('GPS requires HTTPS or localhost. Open this page on https:// or http://localhost.');
      return;
    }
    if (!('geolocation' in navigator)) {
      setPingError('Geolocation not supported by this browser.');
      return;
    }
    if (!myAmbulance) {
      setPingError('No ambulance linked to your account. Contact admin.');
      return;
    }
    setPingError(null);
    setPingActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPing(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        console.warn('Geolocation error:', err);
        setPingError(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
    );
  }, [secureOk, myAmbulance, sendPing]);

  const stopPinging = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pingLoopRef.current) {
      clearInterval(pingLoopRef.current);
      pingLoopRef.current = null;
    }
    setPingActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPinging(), [stopPinging]);

  // Trip lifecycle: advance the active trip to the next status
  const advanceTrip = useCallback(async (nextStatus) => {
    if (!activeTrip) return;
    const eventType = TRIP_EVENT_FOR_NEXT[nextStatus];
    try {
      if (nextStatus === 'dispatched') {
        await tripApi.startTrip(activeTrip.id);
      } else if (nextStatus === 'at_pickup') {
        await tripApi.patientOnboard(activeTrip.id);
      } else if (nextStatus === 'at_hospital' || nextStatus === 'completed') {
        await tripApi.completeTrip(activeTrip.id);
      }
      // Re-fetch
      await fetchData(true);
    } catch (err) {
      console.error('Trip advance error:', err);
      setPingError(`Failed to advance trip: ${err.response?.data?.detail || err.message}`);
    }
  }, [activeTrip, fetchData]);

  const cancelTrip = useCallback(async () => {
    if (!activeTrip) return;
    if (!window.confirm('Cancel this trip? The patient will be notified.')) return;
    try {
      await tripApi.cancelTrip(activeTrip.id);
      await fetchData(true);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  }, [activeTrip, fetchData]);

  const handleLogout = () => { stopPinging(); logout(); navigate('/login'); };

  const navItems = [
    { id: 'overview', label: 'Current Trip', icon: Ambulance, desc: 'Active trip & GPS pings' },
    { id: 'fleet', label: 'Branch Fleet', icon: Truck, desc: 'My branch vehicles' },
    { id: 'map', label: 'Live Map', icon: MapPin, desc: 'Live fleet map' },
  ];
  const [activeView, setActiveView] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading driver dashboard...</span>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Driver Console"
      subtitle={`Ambulance Driver • ${myBranch?.name || 'Branch'}`}
      navItems={navItems}
      activeView={activeView}
      onViewChange={setActiveView}
      isConnected={isConnected}
    >
      {/* SECURE-CONTEXT BANNER */}
      {!secureOk && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 shadow-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-800">Live GPS requires HTTPS or localhost</p>
            <p className="text-xs text-rose-700 mt-0.5">
              Browsers only expose <code className="px-1 rounded bg-rose-100">navigator.geolocation</code> on a secure context.
              Open this page on <code className="px-1 rounded bg-rose-100">https://</code> or <code className="px-1 rounded bg-rose-100">http://localhost</code> to send live pings.
            </p>
          </div>
        </div>
      )}

      {/* MY AMBULANCE SUMMARY */}
      {myAmbulance ? (
        <div className="mb-5 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <Ambulance className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Vehicle</div>
              <div className="text-base font-black text-slate-900 tracking-tight">{myAmbulance.vehicle_number}</div>
              <div className="text-[11px] text-slate-500">
                {myAmbulance.vehicle_type || 'N/A'} • Status: {myAmbulance.status}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!pingActive ? (
              <button
                onClick={startPinging}
                disabled={!myAmbulance}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                Start Live GPS
              </button>
            ) : (
              <button
                onClick={stopPinging}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Stop Live GPS
              </button>
            )}
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">No ambulance linked to your account yet.</p>
            <p className="mt-0.5">Please ask your branch admin to assign you a vehicle before you start accepting trips.</p>
          </div>
        </div>
      )}

      {/* PING ERROR */}
      {pingError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {pingError}
        </div>
      )}

      {/* PING STATUS BAR */}
      {pingActive && (
        <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold">Live GPS active.</span>
          <span className="text-slate-500">
            Last ping: {lastPingTime ? lastPingTime.toLocaleTimeString() : '—'}
          </span>
        </div>
      )}

      {/* ============== OVERVIEW: CURRENT TRIP ============== */}
      {activeView === 'overview' && (
        <div className="space-y-5">
          {activeTrip ? (
            <div className="bg-white rounded-3xl border-2 border-blue-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">
                    ACTIVE TRIP
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    Trip #{activeTrip.id}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Patient: <span className="font-bold text-slate-700">{activeTrip.patient_name || 'Patient'}</span>
                    {activeTrip.patient_phone && ` • ${activeTrip.patient_phone}`}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TRIP_STATUS_META[activeTrip.trip_status]?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {TRIP_STATUS_META[activeTrip.trip_status]?.label || activeTrip.trip_status}
                </span>
              </div>

              {/* Trip details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Pickup</div>
                  <div className="font-semibold text-slate-900">{activeTrip.pickup_address || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Hospital</div>
                  <div className="font-semibold text-slate-900">{activeTrip.hospital_name || '—'}</div>
                </div>
                {activeTrip.requested_pickup_time && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Requested Pickup</div>
                    <div className="font-mono font-semibold text-slate-900">{new Date(activeTrip.requested_pickup_time).toLocaleString()}</div>
                  </div>
                )}
                {activeTrip.eta_minutes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">ETA</div>
                    <div className="font-mono font-semibold text-slate-900">{activeTrip.eta_minutes} min</div>
                  </div>
                )}
              </div>

              {/* Trip progression controls */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                {activeTrip.trip_status === 'scheduled' && (
                  <button
                    onClick={() => advanceTrip('dispatched')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Trip (Dispatch)
                  </button>
                )}
                {activeTrip.trip_status === 'dispatched' && (
                  <button
                    onClick={() => advanceTrip('en_route')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Begin Route
                  </button>
                )}
                {activeTrip.trip_status === 'en_route' && (
                  <button
                    onClick={() => advanceTrip('at_pickup')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Patient Onboard
                  </button>
                )}
                {(activeTrip.trip_status === 'at_pickup') && (
                  <button
                    onClick={() => advanceTrip('at_hospital')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Arrived at Hospital
                  </button>
                )}
                {activeTrip.trip_status === 'at_hospital' && (
                  <button
                    onClick={() => advanceTrip('completed')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete Trip
                  </button>
                )}

                <button
                  onClick={cancelTrip}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer ml-auto"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>

              {/* Public tracking link */}
              {activeTrip.trip_token && (
                <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                  <div className="text-[10px] font-bold uppercase text-blue-700 mb-1">Patient live-tracking link</div>
                  <code className="font-mono text-blue-900 break-all">/patient-portal/track/{activeTrip.trip_token.slice(0, 12)}…</code>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xs text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No active trip right now</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You'll see your assigned trip here once dispatch flips a scheduled trip to you. Make sure live GPS is running so dispatch can route to your position.
              </p>
              {!pingActive && myAmbulance && (
                <button
                  onClick={startPinging}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  Start Live GPS Now
                </button>
              )}
            </div>
          )}

          {/* Mini live position map */}
          {myAmbulance && myAmbulance.current_lat && myAmbulance.current_lng && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Your Live Position</span>
              </div>
              <AmbulanceLiveMap
                mode="fleet"
                branches={myBranch && myBranch.latitude ? [myBranch] : []}
                ambulances={[myAmbulance]}
                focusVehicleId={myAmbulance.id}
                height="320px"
              />
            </div>
          )}
        </div>
      )}

      {/* ============== FLEET VIEW ============== */}
      {activeView === 'fleet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                {myBranch?.name || 'Branch'} Fleet
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{fleet.length} vehicles deployed at your branch.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicle</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver</th>
                </tr>
              </thead>
              <tbody>
                {fleet.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No vehicles found for your branch.</td></tr>
                ) : (
                  fleet.map((amb, i) => (
                    <tr key={amb.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${amb.id === myAmbulance?.id ? 'bg-blue-50/50' : ''}`}>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Ambulance className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-900">{amb.vehicle_number}</span>
                          {amb.id === myAmbulance?.id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">YOU</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{amb.vehicle_type || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{amb.status}</td>
                      <td className="py-2.5 px-4 text-slate-600">{amb.driver_name || amb.driver_email || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== MAP VIEW ============== */}
      {activeView === 'map' && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Live Fleet Map — {myBranch?.name}
          </div>
          <AmbulanceLiveMap
            mode="fleet"
            branches={myBranch && myBranch.latitude ? [myBranch] : []}
            ambulances={fleet}
            focusVehicleId={myAmbulance?.id}
            height="500px"
          />
        </div>
      )}

      {notification && (
        <LiveNotificationToast notification={notification} onClose={clearNotification} />
      )}
    </DashboardLayout>
  );
};
