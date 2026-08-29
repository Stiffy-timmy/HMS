# Implementation Plan: Refactor to Prevent-vs-Detect Architecture

Refactor the Hospital Management System state machine to prevent artificial double-entry conflicts by design, while detecting real, asynchronous cross-department timing discrepancies.

---

## Architectural Principles

1. **Prevent Structurally (Same Actor, Same App):**
   - Quick Admit atomically writes `PatientStay(active)` + `Billing(not_started)` + `Bed(occupied)`.
   - Beds with active inpatients (`occupied`) or awaiting sanitation (`cleaning_pending`) have manual status toggles locked.
   - `cleaning_pending` beds cannot be selected in Quick Admit.
2. **Detect Cross-Department Gaps (Independent Departments):**
   - **CF-3 (Ward vs. Billing):** Active stay occupying bed with `Billing.status = not_started` past threshold.
   - **CF-2 (Lab vs. Billing):** Completed diagnostic lab order unattached/unbilled to Billing account.
   - **CF-4 (Clinical vs. Housekeeping):** Bed left in `cleaning_pending` past threshold awaiting sanitation.
   - **CF-5 (Cashier vs. Ward ADT):** Billing account closed/active while inpatient clinical stay is still open in ADT.

---

## User Review Required

> [!IMPORTANT]
> - **Removal of Artificial CF-1:** `bed_status_mismatch` is completely eliminated. Quick Admit automatically sets bed status to `occupied`.
> - **New Bed Lifecycle State:** `cleaning_pending` is introduced. Discharging an inpatient transitions the bed to `cleaning_pending`, locking it until Housekeeping marks it clean.
> - **Housekeeping Queue:** Staff and Admin can view the Housekeeping queue and click "Mark Clean" to return beds to `available`.
> - **Real Conflict Engine:** Implements CF-2, CF-3, CF-4, and CF-5 with live WebSocket updates and real Revenue at Risk calculations.

---

## Proposed Changes

### Backend

#### [MODIFY] [bed.py](file:///c:/Users/Prajurjya/Desktop/HMS/backend/app/models/bed.py)
- Add `CLEANING_PENDING = "cleaning_pending"` to `BedStatus` enum.

#### [MODIFY] [conflict.py](file:///c:/Users/Prajurjya/Desktop/HMS/backend/app/models/conflict.py)
- Add `HOUSEKEEPING_DELAY = "housekeeping_delay"` and `DISCHARGE_BILLING_MISMATCH = "discharge_billing_mismatch"` to `ConflictType` enum.
- Deprecate old `BED_STATUS_MISMATCH` and `DISCHARGE_BED_MISMATCH`.

#### [MODIFY] [stays.py](file:///c:/Users/Prajurjya/Desktop/HMS/backend/app/routes/stays.py)
- Refactor `POST /stays/quick-admit`:
  - Validates `Bed.current_status == BedStatus.AVAILABLE`.
  - Atomically writes `PatientStay` (`active`), `Billing` (`not_started`), and sets `Bed.current_status = BedStatus.OCCUPIED`.
  - Broadcasts WebSocket events for `PatientStay` and `Bed`.
  - Runs CF-3 check.
- Refactor `POST /stays/{stay_id}/discharge`:
  - Sets `PatientStay.status = StayStatus.DISCHARGED`, `actual_discharge_at = datetime.now()`.
  - Sets `Bed.current_status = BedStatus.CLEANING_PENDING`.
  - Broadcasts WebSocket events for `PatientStay` and `Bed`.
  - Runs CF-4 / CF-5 checks.

#### [MODIFY] [beds.py](file:///c:/Users/Prajurjya/Desktop/HMS/backend/app/routes/beds.py)
- Refactor `PATCH /beds/{bed_id}/status`:
  - Rejects manual toggles if bed is `occupied` (locked by active inpatient) or `cleaning_pending` (locked by housekeeping).
  - Truly empty beds (`available`, `reserved`, `maintenance`) retain free-form toggles.
- Add `POST /beds/{bed_id}/mark-clean`:
  - Validates bed is in `cleaning_pending`.
  - Sets `Bed.current_status = BedStatus.AVAILABLE`.
  - Auto-resolves any open `housekeeping_delay` conflict.
  - Logs staff/housekeeping activity and broadcasts updates via WebSocket.

#### [MODIFY] [conflict_service.py](file:///c:/Users/Prajurjya/Desktop/HMS/backend/app/services/conflict_service.py)
- Remove old CF-1 `bed_status_mismatch` logic.
- Implement real cross-department detection checkers:
  - `check_cf3_occupied_no_billing`: Detects active stays with `BillingStatus.NOT_STARTED`.
  - `check_cf2_lab_unbilled`: Detects completed labs with `billed == False`.
  - `check_cf4_housekeeping_delay`: Detects beds sitting in `CLEANING_PENDING`.
  - `check_cf5_discharge_billing_mismatch`: Detects closed billings with active stays.
- Refactor `resolve_conflict_manually` to handle real conflict resolutions:
  - CF-2: Sets `lab.billed = True`.
  - CF-3: Sets `billing.status = BillingStatus.ACTIVE`.
  - CF-4: Sets `bed.current_status = BedStatus.AVAILABLE`.
  - CF-5: Closes active patient stay.
- Update `calculate_conflict_revenue_risk` to accurately compute financial impact for CF-2, CF-3, CF-4, and CF-5.

---

### Frontend

#### [MODIFY] [QuickAdmitWidget.jsx](file:///c:/Users/Prajurjya/Desktop/HMS/frontend/src/components/QuickAdmitWidget.jsx)
- Dropdown only allows selecting `AVAILABLE` beds.
- Disables `OCCUPIED` and `CLEANING_PENDING` beds with clear status labels.
- Submitting atomically updates bed state to occupied with zero artificial warnings.

#### [MODIFY] [BedGrid.jsx](file:///c:/Users/Prajurjya/Desktop/HMS/frontend/src/components/BedGrid.jsx)
- Visually locks `occupied` beds (indicating active patient encounter) and `cleaning_pending` beds (awaiting housekeeping).
- Adds a direct "Mark Clean (Housekeeping)" button on `cleaning_pending` bed cards.

#### [MODIFY] [PatientStaysList.jsx](file:///c:/Users/Prajurjya/Desktop/HMS/frontend/src/components/PatientStaysList.jsx)
- Discharging sets bed to `cleaning_pending` and triggers cross-widget refresh.

#### [MODIFY] [ConflictPanel.jsx](file:///c:/Users/Prajurjya/Desktop/HMS/frontend/src/components/ConflictPanel.jsx)
- Renders badges and descriptions for real cross-department conflict types:
  - `occupied_no_billing`: "Occupied Bed without Billing Encounter" (CF-3)
  - `lab_unbilled`: "Unbilled Completed Diagnostic Lab" (CF-2)
  - `housekeeping_delay`: "Housekeeping Sanitation Delay" (CF-4)
  - `discharge_billing_mismatch`: "Discharge / Billing Async Desync" (CF-5)
- Context-aware manual resolution dialog for each real conflict type.

#### [MODIFY] [api/index.js](file:///c:/Users/Prajurjya/Desktop/HMS/frontend/src/api/index.js)
- Add `bedApi.markClean(bedId)`.

---

## Verification Plan

### Automated Tests
- Run comprehensive new test suite `backend/test_prevent_vs_detect.py`:
  1. Quick Admit is atomic: stay created + bed set to `occupied` + billing `not_started` (0 artificial conflicts).
  2. Bed manual toggle is locked while `occupied`.
  3. CF-3 conflict raised for occupied bed with `not_started` billing.
  4. Discharge transitions bed to `cleaning_pending` and locks it from Quick Admit selection.
  5. CF-4 housekeeping delay conflict raised when bed sits in `cleaning_pending`.
  6. Housekeeping "Mark Clean" transitions bed to `available`, auto-resolves CF-4, and restores Quick Admit eligibility.
  7. CF-2 unbilled completed lab test detected and resolved.
  8. CF-5 billing closed while stay active detected and resolved.

### Manual / Demo Verification
- Execute full 5-step revised demo lifecycle in browser.
