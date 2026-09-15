import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicTripApi } from '../api';
import { AmbulanceLiveMap } from '../components/AmbulanceLiveMap';
import {
  Ambulance,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Activity,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Stethoscope,
  Building2,
} from 'lucide-react';

const STATUS_META = {
  scheduled:    { label: 'Scheduled',   color: 'bg-slate-100 text-slate-700',  icon: Clock,        message: 'Your ambulance is on standby. We will dispatch at the scheduled time.' },
  dispatched:   { label: 'Dispatched',  color: 'bg-amber-100 text-amber-800',  icon: Activity,     message: 'An ambulance has been assigned and is heading to the pickup point.' },
  en_route:     { label: 'En Route',   color: 'bg-blue-100 text-blue-800',    icon: Activity,     message: 'Your ambulance is on the way. Please be ready at the pickup address.' },
  at_pickup:    { label: 'At Pickup',  color: 'bg-teal-100 text-teal-800',    icon: MapPin,       message: 'The ambulance has arrived at your location. Please board safely.' },
  at_hospital:  { label: 'At Hospital', color: 'bg-cyan-100 text-cyan-800',    icon: Building2,    message: 'You have reached the hospital. Care team will take over shortly.' },
  completed:    { label: 'Completed',  color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, message: 'Trip complete. We hope you have a smooth recovery.' },
  cancelled:    { label: 'Cancelled',  color: 'bg-rose-100 text-rose-700',     icon: AlertCircle,  message: 'This trip was cancelled. If you need help, please contact the hospital.' },
};

/**
 * Public patient live-tracking page.
 *
 * No auth wrapper. Uses the trip_token in the URL to fetch live trip data
 * from the unauthenticated endpoint `/api/trips/public/{token}/live`.
 */
export const PatientTripTracker = () => {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLive = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await publicTripApi.getPublicLive(token);
      setTrip(data);
      setError(null);
    } catch (err) {
      console.error('Trip fetch error:', err);
      setError('Could not load trip. Please check your link or try again in a moment.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchLive();
  }, [token, fetchLive]);

  // Poll every 15 seconds for live updates (no auth, so no WebSocket)
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => fetchLive(true), 15000);
    return () => clearInterval(id);
  }, [token, fetchLive]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-bold">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-amber-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-rose-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Trip Not Available</h1>
          <p className="text-sm text-slate-500">{error || 'We could not find your trip.'}</p>
          <div className="mt-4">
            <Link
              to="/book-appointment"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Book a new appointment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[trip.trip_status] || STATUS_META.scheduled;
  const StatusIcon = meta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top header */}
        <div className="flex items-center justify-between">
          <Link
            to="/book-appointment"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Medicover
          </Link>
          <button
            onClick={() => fetchLive()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status hero card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Live Trip
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color} text-slate-900`}>
                {meta.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {trip.hospital_name || 'Medicover Hospital'}
            </h1>
            <p className="text-xs text-blue-100 mt-1 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />
              Appointment at {trip.appointment_time_slot || 'scheduled time'}
              {trip.doctor_name && ` with ${trip.doctor_name}`}
            </p>
          </div>

          <div className="p-5 flex items-start gap-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{meta.message}</p>
              {trip.eta_minutes !== undefined && trip.eta_minutes !== null && (
                <p className="text-xs text-slate-500 mt-0.5">Estimated arrival: <span className="font-mono font-bold text-slate-700">{trip.eta_minutes} min</span></p>
              )}
            </div>
          </div>

          {/* Trip details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <MapPin className="w-3 h-3 text-teal-600" />
                Pickup
              </div>
              <div className="text-xs font-semibold text-slate-900">{trip.pickup_address || '—'}</div>
              {trip.pickup_lat && trip.pickup_lng && (
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  ({parseFloat(trip.pickup_lat).toFixed(4)}, {parseFloat(trip.pickup_lng).toFixed(4)})
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <Building2 className="w-3 h-3 text-blue-600" />
                Drop-off
              </div>
              <div className="text-xs font-semibold text-slate-900">{trip.hospital_name || 'Hospital'}</div>
              {trip.hospital_branch_code && (
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{trip.hospital_branch_code}</div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <Clock className="w-3 h-3 text-amber-600" />
                Requested Pickup
              </div>
              <div className="text-xs font-mono font-semibold text-slate-900">
                {trip.requested_pickup_time ? new Date(trip.requested_pickup_time).toLocaleString() : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <Ambulance className="w-3 h-3 text-rose-600" />
                Vehicle
              </div>
              <div className="text-xs font-semibold text-slate-900">{trip.vehicle_number || '—'}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Driver: {trip.driver_name || 'Assigned'}</div>
            </div>
          </div>
        </div>

        {/* Live map */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Live Map
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <AmbulanceLiveMap
            mode="trip"
            trip={{
              ...trip,
              hospital_lat: trip.hospital_lat,
              hospital_lng: trip.hospital_lng,
              hospital_branch_code: trip.hospital_branch_code,
            }}
            height="360px"
          />
        </div>

        {/* Help footer */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-900">Need help?</p>
            <p className="text-[10px] text-slate-500">Call the hospital helpline: <span className="font-mono font-bold text-slate-700">1057</span> (24/7) or your branch's emergency number.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
