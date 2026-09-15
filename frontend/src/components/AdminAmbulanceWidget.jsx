import React, { useState, useEffect, useCallback } from 'react';
import { ambulanceApi, tripApi } from '../api';
import { AmbulanceLiveMap } from './AmbulanceLiveMap';
import {
  Ambulance,
  MapPin,
  Clock,
  Radio,
  ChevronRight,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle2,
  Truck,
} from 'lucide-react';

const STATUS_META = {
  idle:         { label: 'Idle',         color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-500' },
  dispatched:   { label: 'Dispatched',   color: 'bg-amber-100 text-amber-800 border-amber-200',    icon: Clock,         dot: 'bg-amber-500' },
  en_route:     { label: 'En Route',    color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: MapPin,        dot: 'bg-blue-500' },
  on_scene:     { label: 'On Scene',    color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Activity,      dot: 'bg-purple-500' },
  at_pickup:    { label: 'At Pickup',  color: 'bg-teal-100 text-teal-800 border-teal-200',      icon: MapPin,        dot: 'bg-teal-500' },
  at_hospital:  { label: 'At Hospital', color: 'bg-cyan-100 text-cyan-800 border-cyan-200',      icon: CheckCircle2, dot: 'bg-cyan-500' },
  returning:    { label: 'Returning',    color: 'bg-slate-100 text-slate-700 border-slate-200',    icon: Truck,        dot: 'bg-slate-400' },
  offline:      { label: 'Offline',     color: 'bg-slate-100 text-slate-500 border-slate-200',   icon: AlertCircle,  dot: 'bg-slate-400' },
};

const VEHICLE_TYPE_ICON = {
  ALS: '⚡ ALS',
  BLS: '🔧 BLS',
  PT:  '♿ Patient Transport',
};

const BRANCH_NAMES = {
  1: 'Hitech City (Hyderabad)',
  2: 'Whitefield (Bengaluru)',
  3: 'MVP Colony (Visakhapatnam)',
  4: 'Navi Mumbai (Mumbai)',
};

/**
 * AdminAmbulanceWidget
 *
 * Embedded inside the Admin Dashboard (or any parent that provides a "setActiveView"
 * prop). Shows:
 *  - fleet status table (all ambulances across all branches with status badges)
 *  - Live Fleet Map (AmbulanceLiveMap mode="fleet")
 *  - active trips feed below the map
 *
 * Props
 *  - onViewMap: ()=>void  — optional, to focus the map panel
 */
export const AdminAmbulanceWidget = ({ onViewMap }) => {
  const [ambulances, setAmbulances] = useState([]);
  const [branches, setBranches] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAmbId, setSelectedAmbId] = useState(null);
  const [activeTab, setActiveTab] = useState('fleet'); // 'fleet' | 'trips'
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const [ambs, allTrips] = await Promise.all([
        ambulanceApi.getAmbulances().catch(() => []),
        tripApi.getTrips().catch(() => []),
      ]);
      setAmbulances(ambs || []);
      setTrips(allTrips || []);

      // Build branch list from ambulance hospital_ids
      const branchSet = new Map();
      (ambs || []).forEach(a => {
        if (a.hospital_id && !branchSet.has(a.hospital_id)) {
          branchSet.set(a.hospital_id, {
            id: a.hospital_id,
            branch_code: a.hospital_branch_code || `MC-${a.hospital_id}`,
            name: BRANCH_NAMES[a.hospital_id] || `Branch ${a.hospital_id}`,
            latitude: a.hospital_lat,
            longitude: a.hospital_lng,
          });
        }
      });
      setBranches(Array.from(branchSet.values()));
    } catch (err) {
      console.error('AdminAmbulanceWidget fetch error:', err);
      setError('Failed to load ambulance fleet data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group ambulances by branch for display
  const byBranch = ambulances.reduce((acc, amb) => {
    const bid = amb.hospital_id || 0;
    if (!acc[bid]) acc[bid] = [];
    acc[bid].push(amb);
    return acc;
  }, {});

  const activeTrips = trips.filter(t => ['scheduled', 'dispatched', 'en_route', 'at_pickup', 'at_hospital'].includes(t.trip_status));
  const idleCount = ambulances.filter(a => a.status === 'idle').length;
  const dispatchedCount = ambulances.filter(a => ['dispatched', 'en_route', 'at_pickup'].includes(a.status)).length;

  const selectedAmb = selectedAmbId ? ambulances.find(a => a.id === selectedAmbId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading fleet data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fleet Total</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{ambulances.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Idle</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{idleCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active</span>
          </div>
          <div className="text-2xl font-black text-amber-600">{dispatchedCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trips</span>
          </div>
          <div className="text-2xl font-black text-blue-600">{activeTrips.length}</div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => fetchData()} className="ml-auto underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Tabs: Fleet table | Map | Active Trips */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {['fleet', 'map', 'trips'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'fleet' ? 'Fleet Table' : tab === 'map' ? 'Live Map' : 'Active Trips'}
          </button>
        ))}
      </div>

      {/* FLEET TABLE */}
      {activeTab === 'fleet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicle</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Trip</th>
                </tr>
              </thead>
              <tbody>
                {ambulances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No ambulances found.</td>
                  </tr>
                ) : (
                  ambulances.map((amb, i) => {
                    const meta = STATUS_META[amb.status] || STATUS_META.offline;
                    const Icon = meta.icon;
                    const isSelected = selectedAmbId === amb.id;
                    return (
                      <tr
                        key={amb.id}
                        onClick={() => setSelectedAmbId(isSelected ? null : amb.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } hover:bg-blue-50`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <Ambulance className="w-4 h-4 text-slate-500" />
                            <span className="font-bold text-slate-900">{amb.vehicle_number}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {BRANCH_NAMES[amb.hospital_id] || `Branch ${amb.hospital_id}`}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {VEHICLE_TYPE_ICON[amb.vehicle_type] || amb.vehicle_type || '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {amb.driver_name || amb.driver_email || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[10px]">
                          {amb.current_lat && amb.current_lng
                            ? `${parseFloat(amb.current_lat).toFixed(4)}, ${parseFloat(amb.current_lng).toFixed(4)}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          {amb.current_trip_id
                            ? <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">Trip #{amb.current_trip_id}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIVE MAP */}
      {activeTab === 'map' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Live Fleet Map — {ambulances.length} vehicles across {branches.length} branches
            </div>
            <button
              onClick={() => fetchData(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[10px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1"><span className="font-bold text-blue-700">🏥</span> Branch Hospital</span>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                {v.label}
              </span>
            ))}
          </div>

          <AmbulanceLiveMap
            mode="fleet"
            branches={branches}
            ambulances={ambulances}
            focusVehicleId={selectedAmbId}
            height="420px"
          />

          {selectedAmb && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <Ambulance className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-900">{selectedAmb.vehicle_number}</span>
              <span className="text-slate-600">— {selectedAmb.status} at ({parseFloat(selectedAmb.current_lat || 0).toFixed(4)}, {parseFloat(selectedAmb.current_lng || 0).toFixed(4)})</span>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE TRIPS */}
      {activeTab === 'trips' && (
        <div className="space-y-3">
          {activeTrips.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No active trips right now.</div>
          ) : (
            activeTrips.map(trip => {
              const amb = ambulances.find(a => a.id === trip.ambulance_id);
              return (
                <div key={trip.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <Ambulance className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Trip #{trip.id}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">{trip.trip_status}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {trip.pickup_address || 'Pickup unknown'}
                      {amb ? ` — ${amb.vehicle_number}` : ''}
                    </div>
                  </div>
                  {trip.requested_pickup_time && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-slate-400">Pickup at</div>
                      <div className="text-[10px] font-mono font-bold text-slate-700">
                        {new Date(trip.requested_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Refresh footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>Auto-refreshes every 30s via WebSocket</span>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh now
        </button>
      </div>
    </div>
  );
};
