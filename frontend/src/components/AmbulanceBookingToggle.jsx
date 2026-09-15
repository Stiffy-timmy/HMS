import React from 'react';
import {
  Ambulance,
  MapPin,
  Clock,
  CalendarClock,
  CheckCircle2,
  Info,
  AlertCircle,
} from 'lucide-react';

/**
 * AmbulanceBookingToggle
 *
 * Controlled card for the patient booking flow's "Need ambulance pickup?" step.
 *
 * Props (all controlled by the parent so this component stays stateless and testable):
 *  - enabled                : boolean — whether the patient opted in
 *  - onToggle(value: bool)
 *  - pickupAddress          : string  — free-text address the ambulance should come to
 *  - onPickupAddressChange(value: string)
 *  - requestedPickupTime    : string  — ISO-local datetime string from <input type="datetime-local">
 *  - onRequestedPickupTimeChange(value: string)
 *  - city                   : string  — patient's current city (used for the "we'll route you
 *                                       to the nearest branch" hint and as the default
 *                                       pickup location if no address is typed)
 *  - cityCoords             : { lat: number, lng: number } | null — fallback geocoding from the
 *                                       parent's CITY_COORDS table. The backend re-geocodes
 *                                       the address anyway; this is just a sane default that
 *                                       satisfies the non-null schema constraint if the patient
 *                                       skips typing an address.
 *  - hospitalName           : string  — used to show "ambulance will bring you to <branch>"
 *  - appointmentDate        : string  — YYYY-MM-DD (the appointment's date). Used to suggest a
 *                                       default pickup time ~30 min before the appointment slot.
 *  - appointmentSlot        : string  — e.g. "11:30 AM". Used only to render the hint text.
 */
export const AmbulanceBookingToggle = ({
  enabled,
  onToggle,
  pickupAddress,
  onPickupAddressChange,
  requestedPickupTime,
  onRequestedPickupTimeChange,
  city,
  cityCoords,
  hospitalName,
  appointmentDate,
  appointmentSlot,
}) => {
  // Build a sensible default pickup time: the appointment date at the appointment slot
  // (interpreted as local time). We avoid relying on `new Date(slot)` parsing since the slot
  // string is human-readable and locale-dependent.
  const defaultPickupDateTime = React.useMemo(() => {
    if (!appointmentDate) return '';
    // Take the appointment date at, e.g., 10:30 local (30 min before a typical first slot of
    // 11:00). If no slot is supplied, default to 09:30 local on the appointment day.
    const fallbackHour = '09:30';
    return `${appointmentDate}T${fallbackHour}`;
  }, [appointmentDate]);

  // If the parent has not set a pickup time yet, suggest the default once the user toggles on.
  React.useEffect(() => {
    if (enabled && !requestedPickupTime && defaultPickupDateTime) {
      onRequestedPickupTimeChange(defaultPickupDateTime);
    }
  }, [enabled, requestedPickupTime, defaultPickupDateTime, onRequestedPickupTimeChange]);

  // Earliest selectable pickup time: 30 min from now (so a same-day urgent pickup still works).
  const minPickupTime = React.useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    // datetime-local needs YYYY-MM-DDTHH:MM in local time
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const hasAddress = pickupAddress && pickupAddress.trim().length > 0;
  const hasTime = requestedPickupTime && requestedPickupTime.length > 0;
  const ready = hasAddress && hasTime;

  return (
    <div
      className={`mt-2 rounded-2xl border transition-all ${
        enabled
          ? 'bg-emerald-50/50 border-emerald-200 shadow-xs'
          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Toggle Row */}
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="w-full p-3.5 flex items-center gap-3 text-left cursor-pointer"
        aria-pressed={enabled}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            enabled
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-white border border-slate-200 text-slate-500'
          }`}
        >
          <Ambulance className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-extrabold tracking-tight ${enabled ? 'text-emerald-900' : 'text-slate-900'}`}>
            Need ambulance pickup?
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {enabled
              ? 'Pickup details below — your trip token will be generated after booking.'
              : 'Optional. Pickup at your address, drop-off at the hospital.'}
          </p>
        </div>

        <div
          className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors flex-shrink-0 ${
            enabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </button>

      {/* Expanded Form */}
      {enabled && (
        <div className="px-3.5 pb-4 space-y-3 border-t border-emerald-200/60 pt-3">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-emerald-100 text-[11px] text-slate-600">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              We'll book a {city ? `${city} ` : ''}ambulance to your address and bring you to{' '}
              <strong>{hospitalName || 'the selected branch'}</strong>. You'll get a public live-tracking link after booking.
            </span>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pickup Address *
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => onPickupAddressChange(e.target.value)}
                placeholder={city ? `e.g. 12, MG Road, ${city}` : 'Enter the address where we should pick you up'}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            {cityCoords && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Default city pin: ({cityCoords.lat.toFixed(4)}, {cityCoords.lng.toFixed(4)})
              </p>
            )}
          </div>

          {/* Requested Pickup Time */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Requested Pickup Time *
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="datetime-local"
                value={requestedPickupTime}
                min={minPickupTime}
                onChange={(e) => onRequestedPickupTimeChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
              />
            </div>
            {appointmentSlot && (
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Your appointment slot is {appointmentSlot} — schedule pickup before that.
              </p>
            )}
          </div>

          {/* Validation hint */}
          {!ready && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
              <AlertCircle className="w-3 h-3" />
              Both pickup address and pickup time are required.
            </div>
          )}
          {ready && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Pickup details ready.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
