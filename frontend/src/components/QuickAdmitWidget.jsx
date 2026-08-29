import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Bed as BedIcon, 
  Hash, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  ChevronDown,
  Activity,
  AlertTriangle,
  Info,
  ShieldCheck
} from 'lucide-react';
import { stayApi } from '../api';

export const QuickAdmitWidget = ({ 
  beds = [], 
  stays = [],
  department = 'Cardiology',
  onAdmitted,
  selectedBedId = null
}) => {
  const generateRefId = () => `PT-${Math.floor(100000 + Math.random() * 900000)}`;

  const getLocalDatetimeString = (date = new Date()) => {
    const pad = (num) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getFutureDateString = (daysAhead = 3) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const [patientName, setPatientName] = useState('');
  const [patientRefId, setPatientRefId] = useState(generateRefId());
  const [bedId, setBedId] = useState('');
  const [admittedAt, setAdmittedAt] = useState(getLocalDatetimeString());
  const [expectedDischarge, setExpectedDischarge] = useState(getFutureDateString(3));
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filter department beds
  const deptBeds = beds.filter(b => 
    !department || (b.department && b.department.toLowerCase() === department.toLowerCase())
  );

  const availableBeds = deptBeds.filter(b => b.current_status === 'available');

  // Set default bed selection when beds load or selectedBedId changes
  useEffect(() => {
    if (selectedBedId && availableBeds.some(b => String(b.id) === String(selectedBedId))) {
      setBedId(String(selectedBedId));
    } else if (availableBeds.length > 0) {
      // If current selected bedId is no longer available, select first available
      if (!bedId || !availableBeds.some(b => String(b.id) === String(bedId))) {
        setBedId(String(availableBeds[0].id));
      }
    } else {
      setBedId('');
    }
  }, [selectedBedId, availableBeds.length]);


  const selectedBedObj = deptBeds.find(b => String(b.id) === String(bedId));
  const isSelectedBedAvailable = selectedBedObj?.current_status === 'available';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setErrorMessage("Please enter patient full name");
      return;
    }
    if (!bedId) {
      setErrorMessage("Please select a bed in your ward");
      return;
    }
    if (selectedBedObj && selectedBedObj.current_status !== 'available') {
      setErrorMessage(`Bed #${selectedBedObj.id} is currently ${selectedBedObj.current_status}. Only Available beds can be assigned.`);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        patient_name: patientName.trim(),
        patient_ref_id: patientRefId.trim() || generateRefId(),
        bed_id: parseInt(bedId, 10),
        admitted_at: admittedAt ? new Date(admittedAt).toISOString() : new Date().toISOString(),
        expected_discharge_at: expectedDischarge ? new Date(`${expectedDischarge}T12:00:00`).toISOString() : null
      };

      const result = await stayApi.quickAdmit(payload);

      const targetBed = deptBeds.find(b => String(b.id) === String(bedId));
      const bedDesc = targetBed ? `Bed #${targetBed.id} (${targetBed.ward})` : `Bed #${bedId}`;
      
      setSuccessMessage(`Patient ${patientName.trim()} admitted to ${bedDesc}! Bed marked Occupied atomically.`);

      // Reset form
      setPatientName('');
      setPatientRefId(generateRefId());
      setAdmittedAt(getLocalDatetimeString());
      setExpectedDischarge(getFutureDateString(3));

      // Re-select next available bed if any
      const nextAvail = deptBeds.find(b => b.current_status === 'available' && String(b.id) !== String(bedId));
      if (nextAvail) {
        setBedId(String(nextAvail.id));
      }

      if (onAdmitted) {
        onAdmitted(result);
      }

      // Auto-clear success banner after 6s
      setTimeout(() => {
        setSuccessMessage(null);
      }, 6000);
    } catch (err) {
      console.error("Quick Admit submission failed:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to process admission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Quick Admit Patient</h3>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                Atomic Bed Assignment
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly creates inpatient encounter, initializes billing, and locks physical bed status to Occupied.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            {availableBeds.length} Beds Available
          </span>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Field 1: Patient Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Patient Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Field 2: Patient Reference ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Reference ID <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setPatientRefId(generateRefId())}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                title="Generate new ID"
              >
                Auto-gen
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs font-mono font-bold">
                #
              </span>
              <input
                type="text"
                required
                value={patientRefId}
                onChange={(e) => setPatientRefId(e.target.value)}
                className="w-full pl-6 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Field 3: Bed Selection - ONLY Available Beds */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Assign Department Bed <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                disabled={availableBeds.length === 0}
                className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {availableBeds.length === 0 ? (
                  <option value="" disabled>-- No Available Beds in {department} (All Occupied/Cleaning) --</option>
                ) : (
                  <>
                    <option value="" disabled>-- Select Available Bed ({availableBeds.length} Available) --</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        Bed #{b.id} • {b.ward} ({b.room_type?.toUpperCase()}) — ₹{Number(b.price_per_day).toLocaleString('en-IN')}/day
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>


          {/* Field 4: Admitted At */}
          <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Admission Timestamp
            </label>
            <input
              type="datetime-local"
              value={admittedAt}
              onChange={(e) => setAdmittedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Field 5: Expected Discharge */}
          <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Expected Discharge (Est.)
            </label>
            <input
              type="date"
              value={expectedDischarge}
              onChange={(e) => setExpectedDischarge(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Selected Bed Helper */}
        {selectedBedObj && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600">
                Selected <strong className="text-slate-900">Bed #{selectedBedObj.id} ({selectedBedObj.ward})</strong>:
                Bed status is <strong className={isSelectedBedAvailable ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{selectedBedObj.current_status.toUpperCase()}</strong>.
              </span>
            </div>
            <div className="text-[11px] font-semibold">
              {isSelectedBedAvailable ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ready for Inpatient Admission
                </span>
              ) : (
                <span className="text-rose-700 font-bold">
                  Bed cannot be assigned in '{selectedBedObj.current_status}' state
                </span>
              )}
            </div>
          </div>
        )}

        {/* Submit Footer Row */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Single atomic transaction updates Bed, ADT, and Billing</span>
          </div>

          <button
            type="submit"
            disabled={loading || (selectedBedObj && !isSelectedBedAvailable)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#071d33] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{loading ? 'Admitting Patient...' : 'Quick Admit Patient'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

