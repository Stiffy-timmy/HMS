# IoT Pressure Sensor / CF-6 Conflict Feature Audit & Inventory

**Date:** 2026-08-30  
**Target:** IoT Pressure Sensor Presence Conflict (CF-6) Feature  
**Status:** Audit & Reproduction Complete — Ready for Implementation

---

## Step 0: Detailed Component Inventory

### 1. Database Layer
- **Status:** **EXISTS BUT INCOMPLETE & UNAPPLIED**
- **Findings:**
  - `backend/app/models/sensor.py` exists and defines `SensorType` (PRESSURE, TEMPERATURE, OXYGEN_FLOW) and `SensorReading` (`id`, `hospital_id`, `bed_id`, `sensor_type`, `value`, `unit`, `threshold_breached`, `recorded_at`).
  - `SensorReading` is **NOT imported** in `backend/app/models/__init__.py`.
  - In `Hospital` (`backend/app/models/hospital.py`) and `Bed` (`backend/app/models/bed.py`), the inverse relationship `sensor_readings` is **missing**, which causes mapper configuration warnings/errors when bidirectional relationships are traversed.
  - **Live SQLite Database (`hospital.db`):** Inspected directly via SQLite query `SELECT name FROM sqlite_master WHERE type='table'`. The `sensor_readings` table **DOES NOT EXIST** in the live SQLite database. Because `SensorReading` was not imported in `__init__.py` or `main.py`, SQLAlchemy's `Base.metadata.create_all` during startup never created the table.

---

### 2. Backend Endpoint (`/api/sensors/reading`)
- **Status:** **EXISTS BUT BROKEN & UNREGISTERED (HTTP 404)**
- **Findings:**
  - `backend/app/routes/sensors.py` exists and defines `POST /sensors/reading` and `GET /sensors/readings`.
  - However, importing `app.routes.sensors` crashes with `ImportError: cannot import name 'check_cf6_sensor_presence_mismatch' from 'app.services.conflict_service'`.
  - `sensors.router` is **NOT included** in `backend/app/main.py` (`app.include_router(sensors.router, prefix=settings.API_V1_STR)` was omitted).
  - **Live Endpoint Test:** Executing `POST http://127.0.0.1:8000/api/sensors/reading` returns **HTTP 404 Not Found**.

---

### 3. Conflict Detection Logic (CF-6)
- **Status:** **MISSING / BROKEN**
- **Findings:**
  - `ConflictType` in `backend/app/models/conflict.py` **lacks** the `SENSOR_PRESENCE_MISMATCH = "sensor_presence_mismatch"` enum member.
  - `check_cf6_sensor_presence_mismatch` **does not exist** anywhere in `backend/app/services/conflict_service.py`.
  - `resolve_conflict_manually` in `backend/app/services/conflict_service.py` **lacks** handling for `SENSOR_PRESENCE_MISMATCH` and resolution actions (`confirmed_occupied` vs `false_alarm`).
  - `ConflictResolveRequest` in `backend/app/schemas/conflict.py` only defines `resolution_notes` and is **missing** `resolution_action: Optional[str]`.
  - `calculate_conflict_revenue_risk` does not explicitly map `SENSOR_PRESENCE_MISMATCH` to bed daily price rate.

---

### 4. Frontend Simulator Widget (`IoTSimulatorWidget`)
- **Status:** **EXISTS AS ORPHANED COMPONENT WITH MISSING API BINDING**
- **Findings:**
  - `frontend/src/components/IoTSimulatorWidget.jsx` exists and is cleanly implemented with bed filtering, simulated 18.5 kPa (breached) and 0.2 kPa (clear) signal buttons.
  - `IoTSimulatorWidget.jsx` imports `sensorApi` from `../api` (`frontend/src/api/index.js`), but `sensorApi` is **NOT defined or exported** in `frontend/src/api/index.js`.
  - `IoTSimulatorWidget` is **NEVER imported or rendered** anywhere in `frontend/src/pages/DashboardAdmin.jsx` or any other page/route component in the entire frontend.

---

### 5. Conflict Panel Wiring & Data Flow
- **Status:** **EXISTS AS ORPHANED COMPONENT & BACKEND ROUTE STUBBED OUT**
- **Findings:**
  - `frontend/src/components/ConflictPanel.jsx` exists with resolve/review modal flows, but is **NOT imported or rendered** anywhere in `DashboardAdmin.jsx` or any page.
  - `backend/app/routes/conflicts.py` has `GET /api/conflicts` hardcoded to `return []` (stubbed out in a previous commit).
  - `ConflictPanel.jsx` lacks type badge formatting and the dual-outcome resolution UI ("Confirmed Occupied" vs "False Alarm — Sensor Cleared") required for `sensor_presence_mismatch`.
  - `GET /api/dashboard/admin` in `backend/app/routes/dashboard.py` returns `open_conflicts_count=0` and `revenue_at_risk_per_day=0.0` as static zeros rather than aggregating from `ConflictLog`.

---

## Step 1: Direct Failure Reproduction Summary

| Item | Expected Behavior | Observed Failure / Direct Evidence | Root Cause |
|---|---|---|---|
| **Database Table** | `sensor_readings` table exists in `hospital.db` | Table missing from `sqlite_master` | Model not imported in `models/__init__.py` or `main.py` during `Base.metadata.create_all`. |
| **API Endpoint** | `POST /api/sensors/reading` returns 201 Created | HTTP 404 Not Found & `ImportError` on route import | `sensors` router not mounted in `main.py`; `check_cf6_sensor_presence_mismatch` missing in `conflict_service.py`. |
| **Conflict Enum & Service** | `ConflictType.SENSOR_PRESENCE_MISMATCH` and CF-6 checker create conflict logs | Enum member and function undefined | Missing from `models/conflict.py` and `services/conflict_service.py`. |
| **IoT Simulator Widget** | Visible on Admin Dashboard with buttons | Completely absent from DOM and render tree | `IoTSimulatorWidget` never imported/mounted in `DashboardAdmin.jsx`. |
| **Sensor API Client** | `sensorApi.sendReading(...)` posts payload | `TypeError: sensorApi is undefined` | `sensorApi` missing from `frontend/src/api/index.js`. |
| **Active Conflict Panel** | Displays real-time critical conflict row on breach | Absent from Admin Dashboard; backend returns `[]` | `ConflictPanel` not mounted in `DashboardAdmin.jsx`; `GET /api/conflicts` hardcoded to empty list. |
| **Resolve Modal** | Prompts "Confirmed Occupied" vs "False Alarm" | Only single generic action supported | Dual outcome UI and backend payload support missing. |

---

## Step 2 & 3: Action Plan to Complete Implementation

1. **Database & Models:**
   - Add `SENSOR_PRESENCE_MISMATCH = "sensor_presence_mismatch"` to `ConflictType` in `backend/app/models/conflict.py`.
   - Update `Hospital` and `Bed` models with `sensor_readings = relationship("SensorReading", ...)` to complete bidirectional relationships.
   - Export `SensorReading` and `SensorType` in `backend/app/models/__init__.py`.
   - Ensure `sensor_readings` table is created in `hospital.db`.

2. **Conflict Service & Schemas:**
   - Implement `check_cf6_sensor_presence_mismatch(db, hospital_id, bed_id, trigger_user_id)` in `backend/app/services/conflict_service.py`:
     - Checks if bed is `available` or `cleaning_pending` with recent breached `SensorReading` within 10 minutes.
     - Creates `ConflictLog(conflict_type=ConflictType.SENSOR_PRESENCE_MISMATCH, status=ConflictStatus.OPEN, ...)` if not already open.
     - Auto-resolves if latest sensor reading is not breached (`threshold_breached == False`).
     - Logs activity and broadcasts `"ConflictLog"` create/update events over WebSocket.
   - Update `resolve_conflict_manually` in `conflict_service.py`:
     - If `conflict_type == ConflictType.SENSOR_PRESENCE_MISMATCH`:
       - If `resolution_action == "confirmed_occupied"`: sets `bed.current_status = BedStatus.OCCUPIED`, logs activity, broadcasts `Bed` update.
       - If `resolution_action == "false_alarm"`: leaves `bed.current_status = BedStatus.AVAILABLE`, logs activity, resolves conflict.
   - Update `calculate_conflict_revenue_risk` to calculate risk for `SENSOR_PRESENCE_MISMATCH` based on bed price per day.
   - Update `ConflictResolveRequest` in `backend/app/schemas/conflict.py` to add `resolution_action: Optional[str] = None`.

3. **Backend Routes & Dashboard Aggregation:**
   - Mount `sensors.router` in `backend/app/main.py`.
   - Fix `GET /api/conflicts` in `backend/app/routes/conflicts.py` to query `ConflictLog` with filters, calculate `revenue_at_risk`, and return active logs.
   - Update `GET /api/dashboard/admin` in `backend/app/routes/dashboard.py` to calculate `open_conflicts_count` and `revenue_at_risk_per_day` dynamically.

4. **Frontend API & Components:**
   - Export `sensorApi` in `frontend/src/api/index.js` (`sendReading`, `getReadings`).
   - Enhance `frontend/src/components/ConflictPanel.jsx`:
     - Add formatting for `sensor_presence_mismatch` (CF-6).
     - Provide dual resolution choices ("Confirmed Occupied" vs "False Alarm — Sensor Cleared") in the resolve modal.
   - Wire `ConflictPanel` and `IoTSimulatorWidget` into `frontend/src/pages/DashboardAdmin.jsx`:
     - Display `ConflictPanel` and `IoTSimulatorWidget` prominently on the Admin Dashboard Overview and in the navigation.
     - Ensure real-time WebSocket events refresh conflicts and bed stats seamlessly.

5. **End-to-End Verification:**
   - Run automated test script `backend/test_cf6_sensor_conflict.py` and comprehensive test suite.
   - Test live HTTP requests and WebSocket broadcast pipelines.
   - Verify UI rendering, simulation trigger, critical conflict display, and dual resolution flow.
