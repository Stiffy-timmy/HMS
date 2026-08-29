import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Building2, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  ShieldAlert, 
  Edit3, 
  UserCheck, 
  X,
  Plus
} from 'lucide-react';
import { doctorApi, appointmentApi } from '../api';

export const HODDoctorRosterWidget = ({ department, hospitalId, isCompact = false }) => {
  const [assignments, setAssignments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editModalAssignment, setEditModalAssignment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignData, aptData] = await Promise.all([
        doctorApi.getAssignments({ department: department || undefined, hospital_id: hospitalId || undefined }),
        appointmentApi.getAppointments({ hospital_id: hospitalId || undefined })
      ]);
      setAssignments(assignData || []);
      setAppointments(aptData || []);
    } catch (err) {
      console.error("Failed to load doctor roster:", err);
      setError("Unable to load doctor roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();

    // Listen for WebSocket live updates
    const handleWsUpdate = (e) => {
      const { table } = e.detail || {};
      if (table === 'DoctorDutyAssignment' || table === 'PatientAppointment') {
        fetchRoster();
      }
    };

    window.addEventListener('hms_ws_update', handleWsUpdate);
    return () => window.removeEventListener('hms_ws_update', handleWsUpdate);
  }, [department, hospitalId]);

  const handleDutyToggle = async (assignment, newStatus) => {
    setUpdatingId(assignment.id);
    try {
      await doctorApi.updateDutyStatus(assignment.id, {
        duty_status: newStatus,
        room_number: assignment.room_number,
        shift_timings: assignment.shift_timings
      });
      // Optimistic update
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, duty_status: newStatus } : a));
    } catch (err) {
      console.error("Duty status update failed:", err);
      alert("Failed to update duty status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!editModalAssignment) return;

    setUpdatingId(editModalAssignment.id);
    try {
      await doctorApi.updateDutyStatus(editModalAssignment.id, {
        duty_status: editModalAssignment.duty_status,
        room_number: editModalAssignment.room_number,
        shift_timings: editModalAssignment.shift_timings,
        department: editModalAssignment.department
      });
      setEditModalAssignment(null);
      fetchRoster();
    } catch (err) {
      console.error("Save details error:", err);
      alert("Failed to update doctor shift details.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.doctor_name?.toLowerCase().includes(q) ||
      a.hospital_name?.toLowerCase().includes(q) ||
      a.hospital_city?.toLowerCase().includes(q) ||
      a.doctor_speciality?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Department Doctor Roster & Duty Rota
              </h2>
              <p className="text-xs text-slate-500">
                Manage doctor specialities, consulting rooms, and live <strong>On Duty / On Leave</strong> status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctor or branch..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all w-48"
            />
          </div>

          <button
            type="button"
            onClick={fetchRoster}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Doctor Assignments Grid */}
      {loading && assignments.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-400">
          Loading department doctor roster...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          No doctor assignments found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const isOnDuty = assignment.duty_status === 'on_duty';
            const isOnLeave = assignment.duty_status === 'on_leave';
            const isEmergency = assignment.duty_status === 'emergency_on_call';
            const isUpdating = updatingId === assignment.id;

            return (
              <div
                key={assignment.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isOnDuty
                    ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300 shadow-xs'
                    : isOnLeave
                    ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                    : 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                }`}
              >
                <div>
                  {/* Top Status & Branch Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100/70 text-blue-800 border border-blue-200/80 truncate">
                      {assignment.hospital_city || assignment.branch_code || 'Main Branch'}
                    </span>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isOnDuty
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isOnLeave
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOnDuty ? 'bg-emerald-500' : isOnLeave ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} />
                      {isOnDuty ? 'On Duty' : isOnLeave ? 'On Leave' : 'Emergency Call'}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    {assignment.doctor_name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{assignment.doctor_qualification}</p>
                  <p className="text-[11px] font-semibold text-blue-700 mt-1">
                    Speciality: {assignment.doctor_speciality} [{assignment.department}]
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/70 text-[11px] space-y-1 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">OPD Room:</span>
                      <strong className="text-slate-800">{assignment.room_number}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Shift Timings:</span>
                      <strong className="text-slate-800">{assignment.shift_timings}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fee:</span>
                      <strong className="text-slate-800">₹{assignment.consultation_fee}</strong>
                    </div>
                  </div>
                </div>

                {/* Duty Toggle & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Set Live Duty Status:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={isUpdating || isOnDuty}
                      onClick={() => handleDutyToggle(assignment, 'on_duty')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                        isOnDuty
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      ✓ On Duty
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating || isOnLeave}
                      onClick={() => handleDutyToggle(assignment, 'on_leave')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                        isOnLeave
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      ⏸ On Leave
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditModalAssignment(assignment)}
                    className="w-full py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit OPD Room & Shift Timings
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Incoming Patient Appointments Section */}
      {!isCompact && appointments.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Incoming Patient Bookings ({appointments.length})
            </h3>
            <span className="text-[11px] text-slate-400">Real-time public portal stream</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Token</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Assigned Doctor</th>
                  <th className="py-2.5 px-3">Slot / Date</th>
                  <th className="py-2.5 px-3">Illness / Symptoms</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.slice(0, 5).map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{apt.appointment_token}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {apt.patient_name} <span className="text-[10px] text-slate-400">({apt.patient_age}y, {apt.patient_city})</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{apt.doctor_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(apt.appointment_date).toLocaleDateString()} • {apt.time_slot}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{apt.illness_description}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Room & Shift Timings Modal */}
      {editModalAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Update OPD Schedule
                </h3>
                <p className="text-xs text-slate-500">{editModalAssignment.doctor_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalAssignment(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  OPD Room Number *
                </label>
                <input
                  type="text"
                  required
                  value={editModalAssignment.room_number}
                  onChange={(e) => setEditModalAssignment({ ...editModalAssignment, room_number: e.target.value })}
                  placeholder="e.g. OPD Suite 102"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Shift Consulting Timings *
                </label>
                <input
                  type="text"
                  required
                  value={editModalAssignment.shift_timings}
                  onChange={(e) => setEditModalAssignment({ ...editModalAssignment, shift_timings: e.target.value })}
                  placeholder="e.g. 09:00 AM - 02:00 PM"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  Department Assigned *
                </label>
                <select
                  value={editModalAssignment.department}
                  onChange={(e) => setEditModalAssignment({ ...editModalAssignment, department: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pulmonology">Pulmonology</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalAssignment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId !== null}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  Save Shift Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
