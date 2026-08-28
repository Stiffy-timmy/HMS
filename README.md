# 🏥 Unified Hospital Operations Platform — Phase 1

A modern, real-time hospital operations management web application built for multi-department clinical environments. It resolves operational data fragmentation (bed management, admissions, lab specimen turnaround, billing mismatches, and data conflicts) across departments with instant WebSocket push synchronizations.

---

## 🏗️ Architecture & Multi-Hospital Design Principle

- **Multi-Hospital Schema Isolation:** Every table includes a `hospital_id` foreign key. No hospital logic or names are hardcoded outside seed data, ensuring multi-tenancy scalability.
- **Real-Time Push Updates:** Native WebSocket connection (`/ws/updates`) scoped by `hospital_id` and `department`. Database write operations broadcast simple change payloads (`{ "table": "Bed", "action": "update", "id": 12 }`), prompting clients to update widgets without page refreshes.
- **Role-Based Access Control (RBAC):** Strict backend JWT authorization guards and frontend view encapsulation across three clinical roles:
  1. **Admin:** Hospital-wide executive dashboard, pricing tiers, admissions & discharges, lab turnaround analysis, data conflicts panel, revenue-at-risk indicator, and staff directory.
  2. **Head of Department (HOD):** Department-scoped bed occupancy, active admissions, pending lab order actions, departmental conflict logs, and staff audit trail.
  3. **Staff:** Rapid-action department bed grid status controller, inpatient list, and lab specimen collection / result action queue.

---

## 💻 Tech Stack

- **Backend:** Python 3.14+, FastAPI, SQLAlchemy ORM, Uvicorn
- **Database:** SQLite3 (`backend/hospital.db`)
- **Real-Time Stream:** Native WebSockets
- **Authentication & Security:** JWT tokens (8-hour expiry), passwords hashed with `bcrypt`, invite code validation with `bcrypt` hashes, token-based password reset simulation
- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v7

---

## 📁 Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database engine, security & JWT deps
│   │   ├── models/         # SQLAlchemy models (Hospital, User, Bed, PatientStay, Billing, LabOrder, ConflictLog, ActivityLog)
│   │   ├── routes/         # FastAPI routers (auth, beds, stays, billing, labs, conflicts, activity, dashboard, websocket)
│   │   ├── schemas/        # Pydantic validation schemas
│   │   ├── services/       # WebSocket connection manager & activity audit logger
│   │   └── seed/           # Standalone database seeder script (seed_data.py)
│   ├── hospital.db         # Central SQLite3 database file
│   ├── requirements.txt    # Python dependencies
│   ├── test_suite.py       # Automated API & RBAC test suite
│   ├── test_ws.py          # Real-time WebSocket verification script
│   └── main.py             # FastAPI entrypoint
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API clients & endpoints
│   │   ├── components/     # Reusable UI widgets (Header, BedGrid, ConflictPanel, StatCard, etc.)
│   │   ├── hooks/          # useAuth & useWebSocket hooks
│   │   ├── pages/          # Login, Signup, ForgotPassword, ResetPassword, DashboardAdmin, DashboardHOD, DashboardStaff
│   │   ├── App.jsx         # Route hierarchy & ProtectedRoute guard
│   │   └── main.jsx        # App mounting point
│   ├── package.json        # Frontend dependencies
│   └── tailwind.config.js  # Tailwind CSS configuration
└── README.md
```

---

## 🔑 Demo Credentials & Invite Codes

### 1. Pre-Seeded Accounts (Password: `Password@123`)

| Role | Name | Email | Department |
| :--- | :--- | :--- | :--- |
| **Admin** | Dr. Rajesh Sharma | `admin@medicover.com` | Hospital-wide |
| **HOD** | Dr. Ananya Rao | `hod.cardio@medicover.com` | Cardiology |
| **HOD** | Dr. Vikram Sethi | `hod.ortho@medicover.com` | Orthopedics |
| **Staff** | Nurse Priya Patel | `staff.cardio1@medicover.com` | Cardiology |
| **Staff** | Tech Arjun Kumar | `staff.cardio2@medicover.com` | Cardiology |
| **Staff** | Nurse Sneha Reddy | `staff.ortho1@medicover.com` | Orthopedics |
| **Staff** | Tech Rohan Joshi | `staff.ortho2@medicover.com` | Orthopedics |

> *The Login screen includes one-click demo login buttons to auto-fill credentials for fast evaluation.*

### 2. Role Invite Codes for Signup

When registering a new account, the user must provide a matching role invite code:

- **Admin Invite Code:** `ADMIN-SECURE-2026`
- **HOD Invite Code:** `HOD-DEPT-2026`
- **Staff Invite Code:** `STAFF-OP-2026`

---

## 🚀 Quickstart Guide

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Seed the database with realistic hospital data
python -m app.seed.seed_data

# Run the automated backend test suite
python test_suite.py

# Start the FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now running at `http://127.0.0.1:8000`. Interactive API Docs are available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Testing Features

1. **Real-Time Status Synchronization:**
   - Open two browser tabs side-by-side: Tab 1 logged in as **Staff** (`staff.cardio1@medicover.com`), Tab 2 as **Admin** (`admin@medicover.com`).
   - In Tab 1, click on any bed in the Bed Grid and change its status (e.g. `Available` ➔ `Occupied`).
   - Observe Tab 2 instantly receive a WebSocket notification banner and refresh its bed occupancy and metrics without reloading the page.

2. **Lab Specimen Workflow:**
   - On the Staff / HOD dashboard, navigate to the **Lab Order Queue**.
   - Click **Collect Sample** (transitions to `in_progress` with collection timestamp).
   - Click **Mark Result Ready** (transitions to `completed` with completion timestamp, calculating turnaround time).

3. **Role-Based Security:**
   - Attempting to access `/dashboard/admin` with a Staff JWT returns `HTTP 403 Forbidden` and redirects to `/unauthorized`.
