# Ambulance Dispatch, Live GPS Tracking, and Backward-Scheduled Pickup

## Summary

This feature adds a new ambulance-dispatch subsystem to the hospital operations platform: a public patient pickup-booking flow, a background scheduler that auto-dispatches ambulances at the correct moment based on the patient's requested pickup time, a Google-Maps-powered live tracking view (with haversine fallback when no API key is set), stop/arrival auto-detection from driver GPS pings, three new conflict rules (CF-7/8/9) that feed the existing Active Data Conflicts panel, and the three new frontend surfaces (driver dashboard, admin operations widget + fleet map, public patient tracking page). **A live fleet map must render every Medicover hospital branch (Hyderabad / Bengaluru / Visakhapatnam / Mumbai) as a unique building icon, with that branch's deployed ambulance fleet rendered as unique vehicle icons on the same map — both icon styles must be visually distinct from each other and from any patient-tracking marker so an admin can read the fleet at a glance.**

The backend is already largely implemented in working-tree files (models, routes, scheduler, conflict service, Google Maps service). The remaining work is almost entirely on the **frontend** (Stages 7–10): the patient-booking pickup toggle, the ambulance driver dashboard with `navigator.geolocation` pings, the admin Ambulance Operations widget + Live Fleet Map (with branch building icons + per-branch fleet vehicle icons), the public token-based tracking page, and the supporting role-routing + API client glue. **An additional login screen entry (and an expanded seeder + branch passkey) is needed so an admin can issue ambulance-role invite passkeys per branch and a real ambulance driver can register with one of those passkeys — the driver dashboard must then show the details of the fleet at *their* branch.**

## Current state of the repo (verified by reading the code)

### Already implemented (do not redo)

- **Stage 1 — Data model**
  - `backend/app/models/ambulance.py` defines `Ambulance`, `AmbulanceTrip`, `TripEvent`, `LocationPing`, plus `AmbulanceStatus`, `TripStatus`, `TripEventType`, `VehicleType` enums.
  - `UserRole.AMBULANCE` added to `backend/app/models/user.py`.
  - `ConflictType` enum extended with `NO_AMBULANCE_AVAILABLE`, `DISPATCH_DELAY`, `UNUSUAL_STOP_DURATION` in `backend/app/models/conflict.py`.
  - `ConflictLog.related_trip_id` FK + relationship in place.
  - All four models exported from `backend/app/models/__init__.py`.
  - `Base.metadata.create_all` in `main.py` will create the new tables on startup.
  - Seed: `seed_data.py` creates 2 ambulance driver users and 3 ambulances for Hitech City, plus `AMBULANCE-{branch}-2026` invite codes.

- **Stage 2 — Core backend routes**
  - `backend/app/routes/ambulances.py`: list / create / get / patch / patch-status / `POST /api/ambulances/ping` / `GET /{id}/pings` / `GET /{id}/route`.
  - `backend/app/routes/trips.py`: `POST /api/trips/ambulance-booking` (public, returns `trip_token`), `GET /api/trips`, `GET /api/trips/{id}`, `GET /api/trips/{id}/events`, `GET /api/trips/{id}/live`, `GET /api/trips/public/{trip_token}/live` (public, no auth), `POST /api/trips/{id}/start`, `/patient-onboard`, `/complete`, `/cancel`.
  - `trip_token` is `secrets.token_urlsafe(24)` (32 base64 chars), unique-indexed.
  - `auth.py` passkey generation already produces `AMBULANCE-{code}` for the ambulance role.
  - `core/deps.py` already defines `require_ambulance = require_roles(ADMIN, AMBULANCE)`.

- **Stage 3 — Backward-scheduling dispatcher**
  - `backend/app/services/ambulance_scheduler.py` runs 3 APScheduler jobs in `main.py` lifespan:
    - `dispatch_ready_trips` every 30s — flips `scheduled` → `dispatched` once `calculated_departure_time <= now`, logs event, broadcasts WS, calls CF-8.
    - `check_active_trip_health` every 60s — runs CF-8 on dispatched trips, CF-9 on active trips.
    - `recompute_long_horizon_trips` every 10min — re-fetches Directions for trips > 30 min out.
  - State is always re-derived from DB; no in-memory state held across runs.
  - The initial-on-startup pass is a known gap (see Open Questions).

- **Stage 4 — Maps + fallback**
  - `backend/app/services/google_maps_service.py`: `geocode_address`, `get_directions`, `haversine_distance`. Uses `GOOGLE_MAPS_API_KEY` env var; falls back to city-name lookup for geocode and haversine + 1.4x detour + 10 m/s for duration when key is unset. Server logs which mode is active via `logger.warning`.
  - All key reads are env-driven (no hardcoded keys).

- **Stage 5 — Stop/arrival detection**
  - `check_stop_and_arrival` in `ambulance_scheduler.py` runs after every `POST /api/ambulances/ping`:
    - Stop threshold: 20m / 2 min, emits `stopped` event once and `resumed` when movement exceeds threshold again.
    - Geofence: 100m at pickup → auto `AT_PICKUP`, 100m at hospital → auto `AT_HOSPITAL`.

- **Stage 6 — Conflict rules CF-7/8/9**
  - `backend/app/services/ambulance_conflict_service.py`: `check_cf7_no_ambulance_available` (raised at booking if no idle ambulance), `check_cf8_dispatch_delay` (escalating warning→critical after 2× grace), `check_cf9_unusual_stop_duration` (>8 min stationary = warning). All three write to `ConflictLog`, broadcast WS, and auto-resolve when the underlying condition clears.
  - `ConflictLog` model already has `related_trip_id`; the existing `ConflictPanel` and conflicts API will render the new types as soon as the frontend recognizes them.

### Missing (this plan's work)

- **Stage 7 — Frontend patient booking pickup toggle.** The current `PatientBookingPortal` has no ambulance-pickup option, no `trip_token` in the response, no separate "track" link.
- **Stage 8 — Frontend ambulance driver dashboard.** No `DashboardAmbulance.jsx`, no `/dashboard/ambulance` route, no `useGeolocation` ping loop, no secure-context check, no manual "Start trip / Patient onboard / Complete" controls. The dashboard must render the fleet of the driver's own branch (read from `GET /api/ambulances` and filtered to the driver's `hospital_id`).
- **Stage 9 — Frontend admin Ambulance Operations widget + Live Fleet Map.** No `AdminAmbulanceWidget.jsx`, no fleet status list, no embedded Leaflet/Google map showing all active trips, no trip filter on the activity feed. **The Live Fleet Map must render every Medicover branch (Hyderabad / Bengaluru / Visakhapatnam / Mumbai) as a unique building icon and each branch's deployed ambulance fleet as a unique vehicle icon — two visually distinct icon styles on one map.**
- **Stage 10 — Frontend patient tracking view.** No `/patient-portal/track/{token}` page, no public lookup of `GET /api/trips/public/{token}/live`, no map for the patient.
- **Stage 11 — Driver self-registration via admin-issued passkey.** The current demo only has driver accounts for Hitech City. We must expand the seeder so every branch has at least one driver user + an ambulance, and expose the per-branch `AMBULANCE-{branch}-2026` passkey in the login screen's demo grid.
- **Cross-cutting frontend glue**
  - `App.jsx` `RootRedirect` and the `Login` `performLogin` switch both fall through to `/dashboard/staff` for any unknown role — they need an `ambulance → /dashboard/ambulance` branch.
  - `frontend/src/api/index.js` has no `ambulanceApi` / `tripApi` (only beds, stays, billing, labs, conflicts, activity, dashboard, requisitions, equipment, hospital, doctor, appointment, sensor).
  - `useWebSocket.jsx` already derives the scheme from `window.location.protocol` — good, no change needed there.
  - `useWebSocket.jsx` does not format toast notifications for the new `AmbulanceTrip` / `AmbulancePing` / `TripEvent` table names — small tweak to make admin/patient/driver toasts informative.
  - `ConflictPanel.jsx` `getConflictTypeBadge` switch has no case for `no_ambulance_available` / `dispatch_delay` / `unusual_stop_duration` — falls through to `replace(/_/g, ' ')`. Needs prettier labels (and the panel may need a "Trip" location column when `related_trip_id` is set instead of a bed).
  - `useAuth.jsx` 401 interceptor currently does a hard `window.location.href = '/login'`; for the **public** patient tracking page we must not require auth, and the page must not redirect on 401. The route in `App.jsx` is registered outside `<ProtectedRoute>`, so the redirect only fires if a request 401s — fine for the public endpoint (it doesn't return 401), but worth verifying.

## Files this plan will add or change

### Frontend — new files

- `frontend/src/components/AdminAmbulanceWidget.jsx` — fleet status table (one row per ambulance in the admin's branch), dispatch link, "view on map" controls, and a Live Fleet Map showing all 4 Medicover branches as building icons + all deployed ambulances as vehicle icons. The map uses two distinct Leaflet `divIcon` styles so branches and vehicles are unmistakable.
- `frontend/src/components/AmbulanceLiveMap.jsx` — Leaflet map (OpenStreetMap tiles) that can render **either** (a) all branches + all vehicles for the admin view, or (b) a single trip (pickup → hospital) for the patient tracking page. Takes a `mode` prop: `'fleet' | 'trip'`.
- `frontend/src/components/AmbulanceStatusLog.jsx` — activity-feed-style trip event log, filterable by trip.
- `frontend/src/components/AmbulanceBookingToggle.jsx` — "Need ambulance pickup?" card, embedded inside the patient booking flow.
- `frontend/src/components/AmbulanceDriverFleetCard.jsx` — used inside `DashboardAmbulance.jsx` to render the driver's branch's fleet: vehicle numbers, types, statuses, current assigned driver.
- `frontend/src/pages/DashboardAmbulance.jsx` — driver dashboard: secure-context banner, current-trip card with "Start / Patient Onboard / Complete" buttons, geolocation ping start/stop, branch-fleet panel (`AmbulanceDriverFleetCard`), live position preview.
- `frontend/src/pages/PatientTripTracker.jsx` — public `/patient-portal/track/:token` page, polls `/api/trips/public/{token}/live` and listens on WS (if available) for live updates.

### Frontend — modified files

- `frontend/src/App.jsx`
  - Add `import { DashboardAmbulance } from './pages/DashboardAmbulance';`
  - Add `import { PatientTripTracker } from './pages/PatientTripTracker';`
  - In `RootRedirect`, add a `user.role === 'ambulance'` branch → `/dashboard/ambulance` before the staff fallback.
  - In `<Routes>`, add `<Route path="/dashboard/ambulance" element={<ProtectedRoute allowedRoles={['admin', 'ambulance']}><DashboardAmbulance /></ProtectedRoute>} />`.
  - Add `<Route path="/patient-portal/track/:token" element={<PatientTripTracker />} />` (no auth wrapper).
- `frontend/src/api/index.js`
  - Add `ambulanceApi` (`getAmbulances`, `createAmbulance`, `getAmbulanceRoute`, `getAmbulancePings`, `pingLocation`, `updateAmbulanceStatus`).
  - Add `tripApi` (`getTrips`, `getTrip`, `getTripEvents`, `getTripLive`, `startTrip`, `patientOnboard`, `completeTrip`, `cancelTrip`, `bookAmbulancePickup`).
  - Add `publicTripApi` (`getPublicLive(token)`).
- `frontend/src/pages/Login.jsx`
  - In `performLogin`, add `else if (user.role === 'ambulance') navigate('/dashboard/ambulance');` before the staff fallback.
  - Add a "Driver" demo account to **each** `DEMO_ACCOUNTS_BY_BRANCH[i]` pointing to the per-branch seeded driver (e.g. `driver.ambulance.hyd@medicover.com`, `driver.ambulance.blr@medicover.com`, …) so the demo grid surfaces the ambulance role for **all four branches**, not just Hyderabad. The screenshot the user uploaded already shows a branch selector at the top of the login page; the driver entry must appear under whichever branch is selected.
- `frontend/src/pages/DashboardAdmin.jsx`
  - Import `AdminAmbulanceWidget` and `AmbulanceStatusLog`.
  - Add two nav items: `ambulance-ops` (Ambulance Command — opens the widget with the Live Fleet Map) and `ambulance-log` (the activity-feed filter).
  - Render them in the overview right-column or as a dedicated view; reuse the same card/table styling as `ConflictPanel`.
  - The Live Fleet Map (inside `AdminAmbulanceWidget` → `AmbulanceLiveMap mode="fleet"`) must: (a) auto-fit bounds to include all 4 branches, (b) show each branch as a **building-shaped** `divIcon` with the branch code label, (c) show each ambulance as a **vehicle-shaped** `divIcon` with the vehicle number label and a color cue based on status (idle = green, dispatched = amber, en_route = blue, on-scene = purple, etc.), (d) be visually distinct from any patient marker in the existing PatientTracker page.
- `frontend/src/pages/PatientBookingPortal.jsx`
  - Add `AmbulanceBookingToggle` near the end of the booking flow.
  - On final submit, if the toggle is on, call `tripApi.bookAmbulancePickup({...})` after the appointment is created, and surface the returned `trip_token` + a "Track live" deep link to `/patient-portal/track/{token}`.
- `frontend/src/components/ConflictPanel.jsx`
  - Add `case 'no_ambulance_available'`, `'dispatch_delay'`, `'unusual_stop_duration'` to `getConflictTypeBadge`.
  - In the location cell, when `related_trip_id` is set, render `Trip #{related_trip_id}` instead of the bed cell.
- `frontend/src/hooks/useWebSocket.jsx`
  - Extend the message formatter to recognize `AmbulanceTrip`, `AmbulancePing`, `TripEvent` tables and produce readable toasts.

### Backend — small fixes / additions

- `backend/app/seed/seed_data.py` — expand seeder so **each of the 4 branches (Hyderabad, Bengaluru, Visakhapatnam, Mumbai)** gets at least 1 ambulance driver (`UserRole.AMBULANCE`) and 1 `Ambulance` (with a realistic `vehicle_type` and `status=IDLE`, linked to that driver). Each branch must also have an `AMBULANCE-{branch}-2026` invite code. The driver dashboard will show the branch's fleet; this is the data that lets the per-branch icon rendering work on the admin map.
- `backend/app/routes/auth.py` — in `performLogin` switch, add `else if (user.role === 'ambulance') navigate('/dashboard/ambulance');`.
- `backend/app/routes/ambulances.py` — minor `/ping` clarity: when the ping comes in, look up the active trip by `ambulance_id` and ensure the `trip_id` written to `LocationPing` is always that trip's id (not just whatever the client sent).
- `backend/app/routes/trips.py` — add a `check_cf7_no_ambulance_available` call after assigning an ambulance on booking (symmetry with cancel).
- `backend/app/main.py` — add `await dispatch_ready_trips()` once at startup inside `lifespan` after `_scheduler.start()` (prevents overdue trips after restart). Also make sure the `AMBULANCE` role is handled correctly in any seed-check logic.
- `backend/.env.example` and `README.md` — document `GOOGLE_MAPS_API_KEY`, the key-restriction guidance (HTTP-referrer on the frontend key; API-restricted to Directions + Geocoding on the backend key; no IP restriction), and the maps-fallback behavior. Per Stage 4 docs requirement.

### Plans file

- `plans/ambulance-tracking-plan.md` (this file). Update after each stage.

## New DB tables / enums

All already present and unchanged. No new schema changes needed. Re-stated for reference only:

- `ambulances`, `ambulance_trips`, `trip_events`, `location_pings` — already exist.
- `users.role` enum: `AMBULANCE` — already present.
- `conflict_logs.related_trip_id` FK — already present.
- `ConflictType` enum values: `no_ambulance_available`, `dispatch_delay`, `unusual_stop_duration` — already present.

## Open questions / assumptions

1. **Maps library choice for the frontend.** The existing project has no Leaflet/Mapbox/Google-Maps-JS dep installed. The user-supplied screenshots show Leaflet + OpenStreetMap for the Live Fleet Map, so we will use **Leaflet + OpenStreetMap tiles** (no API key required) for the *base* map, and use the **Google Maps Directions API polyline** (decoded via `@googlemaps/polyline-codec` or a tiny inline decoder) for the route line on top. This avoids needing two keys and matches the screenshot. The user-uploaded screenshots in this conversation show Leaflet markers already in use — we will follow that. If `GOOGLE_MAPS_API_KEY` is set we will additionally show the Google-Directions polyline; if not, the map still works with straight-line fallback (matches the existing haversine fallback).
2. **Initial-on-startup pass for the scheduler.** The current `main.py` adds the 30s interval job but does not call `dispatch_ready_trips()` once at startup. We will add that inside `lifespan` after `_scheduler.start()`. This is a one-line addition. Reasonable to do without asking.
3. **Where the new "Need ambulance pickup?" toggle sits in the booking flow.** Assume after the appointment details are entered and before the final submit (the user will see a confirmation card showing the planned pickup window). The existing `PatientBookingPortal` is 32 KB and has multiple steps; we'll add the toggle as a new step at the end so the patient can opt in without re-typing anything.
4. **Patient tracking page — auth?** Spec says "no login required, token must be unguessable". The page renders without an auth check and uses an unauthenticated API call. If the patient later navigates to the patient portal from a different tab, the page still works because the public endpoint doesn't require a token.
5. **Driver location reporting — secure context check.** The driver dashboard will display a banner if `window.isSecureContext` is false. We won't actively try to "fail" pings; the browser's geolocation API will just reject with a `PERMISSION_DENIED` or `POSITION_UNAVAILABLE` error, and we'll show that as a toast. (Per spec: "show an explicit message that live location requires HTTPS or localhost, rather than failing silently.")
6. **Demo login for ambulance role.** The seeded `driver.ambulance1@medicover.com` already exists for Hitech City. We will **expand the seeder** so all four branches have a driver user + an ambulance, and add **all four** to the Login page's demo grid (one per branch entry in `DEMO_ACCOUNTS_BY_BRANCH`). The branch selector at the top of the Login page (visible in the screenshot the user uploaded) must drive which driver appears in the demo grid.
7. **WS toast messages for the new tables.** Small extension to `useWebSocket.jsx` so admin/driver/patient get human-readable notifications when an ambulance dispatches / a ping arrives / a trip event fires.
8. **Map icon system for the Live Fleet Map.** Two distinct Leaflet `divIcon`s are required: (a) **branch building icon** — e.g. a blue rounded-rect `div` with an "H" glyph and the branch code (e.g. `MC-HTC`), used for the 4 Medicover hospital markers, and (b) **vehicle icon** — e.g. an amber rounded-rect with an ambulance-glyph and the vehicle number, color-coded by status (idle=green, dispatched=amber, en_route=blue, on_scene=purple). Patient-tracking markers on the same widget must use a third distinct style (a teal pin with a "P" glyph) so an admin never confuses a patient pin with a fleet vehicle or a hospital.
7. **WS toast messages for the new tables.** Small extension to `useWebSocket.jsx` so admin/driver/patient get human-readable notifications when an ambulance dispatches / a ping arrives / a trip event fires.

## Verification checklist (from the original brief)

1. `plans/ambulance-tracking-plan.md` exists, reflects actual implementation progress, and each stage is checked off as completed.
2. Removing `GOOGLE_MAPS_API_KEY` does not crash the app; map UI hides gracefully; scheduling still works via haversine fallback.
3. WebSocket scheme adapts automatically between `ws://` (localhost) and `wss://` (HTTPS) with no manual code change.
4. A booked trip with ambulance pickup enabled appears as `scheduled` on Admin's Ambulance Operations widget, auto-dispatches at the correct time, and a driver's live position updates on both Admin and patient tracking views with no manual refresh.
5. Stop/resume and arrival auto-detection fire correctly from real or simulated location pings.
6. `GET /health` returns `200 OK`.
7. The Live Fleet Map renders all 4 Medicover branches (Hyderabad / Bengaluru / Visakhapatnam / Mumbai) as unique building icons, and each branch's deployed ambulances as unique vehicle icons. The two icon styles are visually distinct from each other and from any patient-tracking marker.
8. The Login page's branch selector drives a "Driver" demo entry that logs in as that branch's driver; logging in lands on `/dashboard/ambulance` and the dashboard shows that branch's fleet.
9. The admin Ambulance Operations widget lists all ambulances at the admin's branch with status, current driver, current trip; selecting one focuses the Live Fleet Map on that vehicle.

---

## Stage checklist (will be ticked off as each stage is implemented)

- [x] **Stage 1 — Data model** (already present in working tree; verified)
- [x] **Stage 2 — Core backend routes** (already present; verified)
- [x] **Stage 3 — Backward-scheduling dispatcher** (already present; minor startup-pass fix needed in `main.py`)
- [x] **Stage 4 — Maps + fallback** (already present in service; docs/README need updating)
- [x] **Stage 5 — Stop/arrival detection** (already present; verified)
- [x] **Stage 6 — Conflict rules CF-7/8/9** (already present; verified — needs frontend labels)
- [x] **Stage 7 — Frontend: patient booking pickup toggle** (DONE — added `ambulanceApi`/`tripApi`/`publicTripApi` to `frontend/src/api/index.js`, created `frontend/src/components/AmbulanceBookingToggle.jsx`, and wired the toggle + post-booking `tripApi.bookAmbulancePickup` call + live-tracking deep link into `frontend/src/pages/PatientBookingPortal.jsx`. The confirmation slip now shows a teal "Ambulance Pickup Scheduled" card with a "Track your ambulance live" button when a trip_token is on the booking. The non-blocking warning banner is shown if the appointment is booked but the trip call fails. `vite build` passes. The next stage can start without re-reading the whole codebase.)
- [x] **Stage 8 — Frontend: ambulance driver dashboard** (DONE — `frontend/src/pages/DashboardAmbulance.jsx` + `App.jsx` `/dashboard/ambulance` route. Driver sees: secure-context banner, "My Vehicle" header with Start/Stop Live GPS, ping error toast, Active Trip card with `Start → Begin Route → Patient Onboard → Arrived at Hospital → Complete` buttons, branch-fleet table, live mini-map. Geolocation is a `navigator.geolocation.watchPosition` loop that posts to `ambulanceApi.pingLocation`. WS toasts handled via existing `useWebSocket`. `vite build` passes.)
- [x] **Stage 9 — Frontend: admin Ambulance Operations widget + live map** (DONE — `frontend/src/components/AdminAmbulanceWidget.jsx` + `frontend/src/components/AmbulanceLiveMap.jsx` (Leaflet + OSM, no API key required). The widget is embedded in the Admin Dashboard under a new "Ambulance Operations" nav item. It has three tabs (Fleet Table / Live Map / Active Trips). The map renders every Medicover branch (Hitech City / Whitefield / MVP Colony / Navi Mumbai) as a **branch building** divIcon (blue rounded-rect with the branch code) and each branch's deployed ambulance as a **vehicle** divIcon (rounded-rect with the vehicle number, color-coded by status: idle=green, dispatched=amber, en_route=blue, on_scene=purple, at_pickup=teal, at_hospital=cyan, returning=slate, offline=gray). A third style (teal "P" pin) is reserved for patient-tracking on the same map class. `vite build` passes.)
- [x] **Stage 10 — Frontend: patient tracking view** (DONE — `frontend/src/pages/PatientTripTracker.jsx` registered at `/patient-portal/track/:token` (no auth wrapper). Uses `publicTripApi.getPublicLive(token)`. Polls every 15s. Renders status hero card (with status-specific color + icon + message), pickup/hospital/vehicle grid, and `AmbulanceLiveMap` in `trip` mode (pickup pin, hospital pin, live vehicle, dashed polyline). `vite build` passes.)
- [x] **Stage 11 — Seeder expansion + branch driver demo accounts in login grid** (DONE — `backend/app/seed/seed_data.py` now creates one driver (`role=AMBULANCE`) and one ambulance per branch (Hitech City / Whitefield / MVP Colony / Navi Mumbai). Emails: `driver.ambulance.hyd@medicover.com`, `driver.ambulance.blr@medicover.com`, `driver.ambulance.vzp@medicover.com`, `driver.ambulance.mum@medicover.com` (and the legacy `driver.ambulance1@medicover.com` is kept on branch 1). All 4 are added to `frontend/src/pages/Login.jsx`'s `DEMO_ACCOUNTS_BY_BRANCH[i]` plus a 7th demo button in the quick-access grid. The branch selector at the top of the Login page now drives which driver appears. `vite build` passes.)
- [x] **Cross-cutting glue** (DONE — `App.jsx` `RootRedirect` adds `ambulance → /dashboard/ambulance`. `App.jsx` adds the protected route for the driver dashboard and a public route for the patient tracking page. `Login.jsx` `performLogin` redirects `role === 'ambulance'`. `useWebSocket.jsx` toasts now recognize `AmbulanceTrip` / `AmbulancePing` / `TripEvent` tables. `ConflictPanel.jsx` `getConflictTypeBadge` has cases for `no_ambulance_available` (CF-7) / `dispatch_delay` (CF-8) / `unusual_stop_duration` (CF-9); the location cell shows `Trip #{related_trip_id}` when the conflict is trip-related. `backend/app/main.py` `lifespan` now calls `await dispatch_ready_trips()` once at startup so overdue trips dispatch without waiting 30 s. `vite build` passes; `python -c "from app.main import app"` imports cleanly.)

> **Note (after Stage 11):** all 11 stages + cross-cutting glue are now complete. Verification: `vite build` passes (799.57 kB main, 59.03 kB CSS, 1721 modules, 2.71 s); `python -c "from app.main import app; from app.services.ambulance_scheduler import *; from app.seed.seed_data import seed_database"` imports cleanly. Demo flow: open `/login` → pick branch "Hitech City" → click the new "Driver" 1-click button → lands on `/dashboard/ambulance` showing `TS-09-AB-1001` and the Hitech City fleet. To test patient pickup: open `/book-appointment` in a separate tab, enable the ambulance toggle, and book; the confirmation slip has a "Track your ambulance live" button that opens `/patient-portal/track/{token}` (the public page). Re-seeding the database is required to materialize the per-branch drivers and ambulances.
