import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Building2, Ambulance, MapPin } from 'lucide-react';

// Fix Leaflet default-icon path issues (we use divIcons only, but be safe)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Build a "branch building" divIcon — blue rounded rectangle with a "H" glyph
 * and the branch code, distinct from any vehicle or patient marker.
 */
const buildBranchIcon = (branch) => {
  return L.divIcon({
    className: 'leaflet-branch-icon',
    html: `
      <div style="
        display:flex; align-items:center; gap:4px;
        background:#1d4ed8; color:#fff;
        border:2px solid #bfdbfe; border-radius:8px;
        padding:4px 7px; font-size:11px; font-weight:800;
        box-shadow:0 4px 10px rgba(29,78,216,0.35);
        white-space:nowrap;
      ">
        <span style="font-size:13px; line-height:1;">🏥</span>
        <span>${branch.branch_code || `MC-${branch.id}`}</span>
      </div>
    `,
    iconSize: [80, 28],
    iconAnchor: [40, 14],
  });
};

/**
 * Status color map for the vehicle icon — distinct from the patient pin.
 */
const STATUS_STYLE = {
  idle:        { bg: '#16a34a', glow: 'rgba(22,163,74,0.4)' },
  dispatched:  { bg: '#d97706', glow: 'rgba(217,119,6,0.4)' },
  en_route:    { bg: '#2563eb', glow: 'rgba(37,99,235,0.4)' },
  on_scene:    { bg: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
  at_pickup:   { bg: '#0d9488', glow: 'rgba(13,148,136,0.4)' },
  at_hospital: { bg: '#0891b2', glow: 'rgba(8,145,178,0.4)' },
  returning:   { bg: '#475569', glow: 'rgba(71,85,105,0.4)' },
  offline:     { bg: '#6b7280', glow: 'rgba(107,114,128,0.3)' },
};

const buildVehicleIcon = (vehicle) => {
  const style = STATUS_STYLE[vehicle.status] || STATUS_STYLE.idle;
  return L.divIcon({
    className: 'leaflet-vehicle-icon',
    html: `
      <div style="
        display:flex; align-items:center; gap:3px;
        background:${style.bg}; color:#fff;
        border:2px solid #fff; border-radius:6px;
        padding:3px 5px; font-size:10px; font-weight:800;
        box-shadow:0 0 0 4px ${style.glow}, 0 4px 10px rgba(0,0,0,0.25);
        white-space:nowrap;
        animation: vehiclePulse 2.2s ease-in-out infinite;
      ">
        <span style="font-size:11px; line-height:1;">🚑</span>
        <span>${vehicle.vehicle_number || `#${vehicle.id}`}</span>
      </div>
    `,
    iconSize: [110, 24],
    iconAnchor: [55, 12],
  });
};

/**
 * Patient pin — a teal pin with a "P" glyph. Used only on the patient
 * tracking page. Visually distinct from the branch building and the vehicle.
 */
const buildPatientIcon = () => {
  return L.divIcon({
    className: 'leaflet-patient-icon',
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center;
        background:#0d9488; color:#fff;
        border:2px solid #fff; border-radius:50%;
        width:28px; height:28px;
        font-size:13px; font-weight:900;
        box-shadow:0 0 0 4px rgba(13,148,136,0.3), 0 4px 10px rgba(0,0,0,0.25);
      ">P</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

/**
 * FitBounds helper — re-centers the map when the data shape changes.
 * Runs once on mount and again when bounds change. Does NOT re-mount the map
 * (the MapContainer is not keyed on data — that was causing the slow tiles).
 */
const FitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    // Single-point case: fitBounds with one point has zero area, so use setView
    if (bounds.length === 1) {
      const [lat, lng] = bounds[0];
      if (typeof lat === 'number' && typeof lng === 'number') {
        map.setView([lat, lng], 14, { animate: false });
      }
      return;
    }
    const b = L.latLngBounds(bounds);
    if (b.isValid()) {
      map.fitBounds(b, { padding: [40, 40], maxZoom: 14, animate: false });
    }
  }, [bounds, map]);
  return null;
};

/**
 * AmbulanceLiveMap
 *
 * Two render modes:
 *  - mode="fleet" → shows all branches (buildings) + all deployed ambulances (vehicles).
 *  - mode="trip"  → shows the pickup pin, the hospital pin, and the live vehicle position
 *                   with an optional route polyline.
 *
 * Props
 *  - mode: 'fleet' | 'trip'
 *  - branches: [{ id, branch_code, latitude, longitude, name }]
 *  - ambulances: [{ id, vehicle_number, status, current_lat, current_lng }]
 *  - trip: { pickup_lat, pickup_lng, hospital_lat, hospital_lng, current_lat, current_lng, route_polyline? }
 *  - focusVehicleId: number | null — if set, fits bounds to that single vehicle
 *  - height: CSS length (default '500px')
 */
export const AmbulanceLiveMap = ({
  mode = 'fleet',
  branches = [],
  ambulances = [],
  trip = null,
  focusVehicleId = null,
  height = '500px',
}) => {
  // Compute bounds but DO NOT key the MapContainer on it (keying forces a full
  // tile reload every time data changes — which is what made the map feel slow).
  const bounds = useMemo(() => {
    if (mode === 'trip' && trip) {
      const points = [];
      if (trip.pickup_lat && trip.pickup_lng) points.push([trip.pickup_lat, trip.pickup_lng]);
      if (trip.hospital_lat && trip.hospital_lng) points.push([trip.hospital_lat, trip.hospital_lng]);
      if (trip.current_lat && trip.current_lng) points.push([trip.current_lat, trip.current_lng]);
      return points;
    }
    const points = [];
    branches.forEach(b => {
      if (b.latitude && b.longitude) points.push([b.latitude, b.longitude]);
    });
    ambulances.forEach(a => {
      if (a.current_lat && a.current_lng) points.push([a.current_lat, a.current_lng]);
    });
    if (focusVehicleId) {
      const v = ambulances.find(a => a.id === focusVehicleId);
      if (v && v.current_lat && v.current_lng) return [[v.current_lat, v.current_lng]];
    }
    return points;
  }, [mode, trip, branches, ambulances, focusVehicleId]);

  // Initial center — prefer the first known point so we don't show a low-zoom
  // flash of India. Default zoom is 12 (street-level) so tiles render fast and
  // the user can immediately see context.
  const defaultCenter = [17.4474, 78.3762]; // Hitech City (Hyderabad) as a sensible default
  const center = (bounds && bounds.length > 0 && Array.isArray(bounds[0]))
    ? bounds[0]
    : defaultCenter;

  // Polyline for trip mode (if a polyline was supplied from the backend)
  const polylinePoints = useMemo(() => {
    if (mode !== 'trip' || !trip?.route_polyline) return [];
    // If the backend returned a Google-encoded polyline, we expect a future
    // improvement to decode it. For now we just draw a straight line from
    // pickup to hospital so the patient sees the planned route shape.
    const out = [];
    if (trip.pickup_lat && trip.pickup_lng) out.push([trip.pickup_lat, trip.pickup_lng]);
    if (trip.hospital_lat && trip.hospital_lng) out.push([trip.hospital_lat, trip.hospital_lng]);
    return out;
  }, [mode, trip]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100" style={{ height }}>
      <MapContainer
        center={center}
        zoom={12}
        minZoom={3}
        maxZoom={18}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        preferCanvas
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
          maxZoom={20}
          updateWhenZooming={false}
          keepBuffer={2}
        />

        <FitBounds bounds={bounds} />

        {/* === FLEET MODE: branches as buildings + vehicles === */}
        {mode === 'fleet' && (
          <>
            {branches.map(b => (
              b.latitude && b.longitude && (
                <Marker
                  key={`branch-${b.id}`}
                  position={[b.latitude, b.longitude]}
                  icon={buildBranchIcon(b)}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                    <div className="text-[10px] font-bold">
                      <Building2 className="inline w-3 h-3 mr-1 text-blue-700" />
                      {b.name}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold text-blue-700">{b.branch_code} — {b.name}</div>
                      <div className="text-slate-600 mt-1">Branch Hospital (deployment base)</div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {ambulances
              .filter(a => a.current_lat && a.current_lng)
              .map(a => (
                <Marker
                  key={`amb-${a.id}`}
                  position={[a.current_lat, a.current_lng]}
                  icon={buildVehicleIcon(a)}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                    <div className="text-[10px] font-bold">
                      <Ambulance className="inline w-3 h-3 mr-1" />
                      {a.vehicle_number} — {a.status}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">{a.vehicle_number}</div>
                      <div className="text-slate-600">Type: {a.vehicle_type || 'N/A'}</div>
                      <div className="text-slate-600">Status: {a.status}</div>
                      <div className="text-slate-600">Branch: {a.hospital_branch_code || `MC-${a.hospital_id}`}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </>
        )}

        {/* === TRIP MODE: pickup + hospital + live vehicle + route === */}
        {mode === 'trip' && trip && (
          <>
            {trip.pickup_lat && trip.pickup_lng && (
              <Marker
                position={[trip.pickup_lat, trip.pickup_lng]}
                icon={buildPatientIcon()}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div className="text-[10px] font-bold">
                    <MapPin className="inline w-3 h-3 mr-1" />
                    Pickup: {trip.pickup_address || 'Patient location'}
                  </div>
                </Tooltip>
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold text-teal-700">Patient Pickup</div>
                    <div className="text-slate-600">{trip.pickup_address}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {trip.hospital_lat && trip.hospital_lng && (
              <Marker
                position={[trip.hospital_lat, trip.hospital_lng]}
                icon={buildBranchIcon({ branch_code: trip.hospital_branch_code || 'HOSP', id: trip.hospital_id })}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div className="text-[10px] font-bold">
                    <Building2 className="inline w-3 h-3 mr-1 text-blue-700" />
                    {trip.hospital_name || 'Destination Hospital'}
                  </div>
                </Tooltip>
                <Popup>
                  <div className="text-xs">
                    <div className="font-bold text-blue-700">{trip.hospital_name || 'Hospital'}</div>
                    <div className="text-slate-600">Drop-off destination</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {trip.current_lat && trip.current_lng && (
              <Marker
                position={[trip.current_lat, trip.current_lng]}
                icon={buildVehicleIcon({ id: trip.ambulance_id, vehicle_number: trip.vehicle_number, status: trip.trip_status })}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                  <div className="text-[10px] font-bold">
                    <Ambulance className="inline w-3 h-3 mr-1" />
                    {trip.vehicle_number || 'Ambulance'} — {trip.trip_status}
                  </div>
                </Tooltip>
              </Marker>
            )}

            {polylinePoints.length >= 2 && (
              <Polyline
                positions={polylinePoints}
                pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '6 6' }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* CSS keyframes for vehicle pulse animation */}
      <style>{`
        @keyframes vehiclePulse {
          0%, 100% { box-shadow: 0 0 0 4px var(--glow, rgba(37,99,235,0.4)), 0 4px 10px rgba(0,0,0,0.25); }
          50%      { box-shadow: 0 0 0 8px var(--glow, rgba(37,99,235,0.4)), 0 4px 12px rgba(0,0,0,0.3); }
        }
        .leaflet-branch-icon, .leaflet-vehicle-icon, .leaflet-patient-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};
