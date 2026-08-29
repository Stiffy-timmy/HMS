import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Stethoscope, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Phone, 
  ChevronRight, 
  User, 
  FileText, 
  ShieldCheck, 
  Printer, 
  RefreshCw,
  Search,
  Activity
} from 'lucide-react';
import { appointmentApi, hospitalApi } from '../api';

const SPECIALITIES = [
  { id: 'Cardiology', label: 'Cardiology', icon: '❤️', desc: 'Heart, Chest Pain, BP & Cardiac Care' },
  { id: 'Orthopedics', label: 'Orthopedics', icon: '🦴', desc: 'Bones, Joints, Knee, Spine & Trauma' },
  { id: 'Neurology', label: 'Neurology', icon: '🧠', desc: 'Brain, Migraine, Nerves & Stroke' },
  { id: 'General Medicine', label: 'General Medicine', icon: '🩺', desc: 'Fever, Diabetes, Infections & OPD' },
  { id: 'Pulmonology', label: 'Pulmonology', icon: '🫁', desc: 'Lungs, Asthma, Breathing & Critical Care' },
];

const CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Visakhapatnam',
  'Mumbai',
  'Other / Nearby Location'
];

export const PatientBookingPortal = () => {
  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientAge, setPatientAge] = useState(32);
  const [patientGender, setPatientGender] = useState('Male');
  const [patientCity, setPatientCity] = useState('Hyderabad');
  const [illnessDescription, setIllnessDescription] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('Cardiology');

  // Search / Recommendation State
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedBranchOption, setSelectedBranchOption] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('11:30 AM');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Booking & Confirmation State
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [error, setError] = useState(null);

  // Hospital Network Stats
  const [networkHospitals, setNetworkHospitals] = useState([]);

  useEffect(() => {
    fetchNetworkHospitals();
    fetchRecommendations('Cardiology', 'Hyderabad', '');
  }, []);

  const fetchNetworkHospitals = async () => {
    try {
      const data = await hospitalApi.getHospitals();
      setNetworkHospitals(data);
    } catch (err) {
      console.error("Failed to load hospital branches:", err);
    }
  };

  const fetchRecommendations = async (spec, city, illness) => {
    setLoadingRecs(true);
    setError(null);
    try {
      const data = await appointmentApi.getRecommendations({
        patient_city: city || 'Hyderabad',
        illness_description: illness || '',
        speciality_requested: spec || null
      });
      setRecommendations(data);
      if (data && data.length > 0) {
        setSelectedBranchOption(data[0]);
        if (data[0].available_slots && data[0].available_slots.length > 0) {
          setSelectedSlot(data[0].available_slots[0]);
        }
      } else {
        setSelectedBranchOption(null);
      }
    } catch (err) {
      console.error("Failed to get recommendations:", err);
      setError("Unable to compute nearest branch recommendation. Please try again.");
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSpecialityChange = (spec) => {
    setSelectedSpeciality(spec);
    fetchRecommendations(spec, patientCity, illnessDescription);
  };

  const handleCityChange = (city) => {
    setPatientCity(city);
    fetchRecommendations(selectedSpeciality, city, illnessDescription);
  };

  const handleIllnessBlur = () => {
    fetchRecommendations(selectedSpeciality, patientCity, illnessDescription);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!patientName || !patientPhone) {
      setError("Please provide patient name and contact phone number.");
      return;
    }
    if (!selectedBranchOption) {
      setError("Please select a recommended hospital branch and specialist.");
      return;
    }

    setBookingLoading(true);
    setError(null);
    try {
      const payload = {
        hospital_id: selectedBranchOption.hospital_id,
        doctor_id: selectedBranchOption.doctor_id,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || null,
        patient_age: parseInt(patientAge, 10) || 30,
        patient_gender: patientGender,
        patient_city: patientCity,
        illness_description: illnessDescription || `Consultation for ${selectedSpeciality}`,
        speciality_requested: selectedSpeciality,
        appointment_date: new Date(appointmentDate).toISOString(),
        time_slot: selectedSlot
      };

      const booking = await appointmentApi.bookAppointment(payload);
      setConfirmedBooking(booking);
    } catch (err) {
      console.error("Appointment booking error:", err);
      setError(err.response?.data?.detail || "Booking failed. Please check details and try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              ✚
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Medicover
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  4 Branches
                </span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Public Patient Appointment Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Instant Zero-Login Booking
            </span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              Staff / Admin Login
            </Link>
          </div>
        </div>
      </header>

      {/* Confirmation Slip View */}
      {confirmedBooking ? (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl p-6 sm:p-10 relative overflow-hidden">
            {/* Header Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

            <div className="text-center pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono mb-2">
                Booking Confirmed & Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Digital Appointment Pass
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Please present this token at the reception desk upon your arrival.
              </p>
            </div>

            {/* Token Highlight Box */}
            <div className="my-6 p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white text-center shadow-xl relative">
              <span className="text-xs font-medium uppercase tracking-widest text-blue-300">Appointment Token Number</span>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-wider text-white mt-1">
                {confirmedBooking.appointment_token}
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-blue-200">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(confirmedBooking.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {confirmedBooking.time_slot}
                </span>
              </div>
            </div>

            {/* Appointment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-sm border-b border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Consulting Specialist</span>
                <p className="font-bold text-slate-900 mt-0.5 text-base">{confirmedBooking.doctor_name}</p>
                <p className="text-xs text-slate-600">{confirmedBooking.doctor_qualification}</p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {confirmedBooking.speciality_requested}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Hospital Branch</span>
                <p className="font-bold text-slate-900 mt-0.5 text-base">{confirmedBooking.hospital_name}</p>
                <p className="text-xs text-slate-600 flex items-start gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 mt-0.5" />
                  {confirmedBooking.hospital_address}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Patient Name</span>
                <p className="font-bold text-slate-900 mt-0.5">{confirmedBooking.patient_name}</p>
                <p className="text-xs text-slate-500">Age: {confirmedBooking.patient_age} | {confirmedBooking.patient_gender} | {confirmedBooking.patient_city}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase">Contact & Status</span>
                <p className="font-bold text-slate-900 mt-0.5 font-mono">{confirmedBooking.patient_phone}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmed & Ready
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                Print / Save Pass
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  setPatientName('');
                  setPatientPhone('');
                  setIllnessDescription('');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
              >
                Book Another Appointment
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* Main Booking View */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Banner */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Smart Multi-Branch Healthcare Network
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Book a Specialist Doctor
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Select your speciality or illness. Our smart network algorithm automatically checks on-duty doctors across all 4 branches and recommends the nearest available branch.
            </p>
          </div>

          {/* Network Branch Indicator Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {networkHospitals.map((branch) => (
              <div key={branch.id} className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{branch.city || branch.name}</p>
                  <p className="text-[10px] text-slate-500">
                    <strong className="text-emerald-600">{branch.on_duty_doctors_count}</strong> Docs On Duty
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Booking Container: 2-Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (5 Cols): Patient Info & Symptoms */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  1. Patient Details & Illness
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1 of 2</span>
              </div>

              {/* Speciality Selector Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Specialist Department *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPECIALITIES.map((spec) => (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => handleSpecialityChange(spec.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedSpeciality === spec.id
                          ? 'bg-blue-50/80 border-2 border-blue-600 text-blue-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{spec.icon}</span>
                        <span className="text-xs font-bold">{spec.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{spec.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient City Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Your Current City / Location *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={patientCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs cursor-pointer"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used by our AI algorithm to match with the closest Medicover hospital branch.
                </p>
              </div>

              {/* Illness / Symptoms Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Describe Symptoms / Illness (Optional)
                </label>
                <textarea
                  rows={2}
                  value={illnessDescription}
                  onChange={(e) => setIllnessDescription(e.target.value)}
                  onBlur={handleIllnessBlur}
                  placeholder="e.g. Chest pain since morning, knee joint pain, persistent headache..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all"
                />
              </div>

              {/* Patient Name & Contact */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Age & Gender
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        className="w-16 px-2 py-2.5 text-sm text-center bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs"
                      />
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                        className="flex-1 px-2 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (7 Cols): Smart Nearest Branch Recommendations & Slot Booking */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      2. Recommended Nearest Branch & Specialist
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Matched for <strong>{selectedSpeciality}</strong> near <strong>{patientCity}</strong>
                    </p>
                  </div>
                  {loadingRecs && (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  )}
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Recommendations List */}
                <div className="space-y-3">
                  {recommendations.map((option, idx) => {
                    const isSelected = selectedBranchOption?.doctor_id === option.doctor_id && selectedBranchOption?.hospital_id === option.hospital_id;
                    const isOnDuty = option.duty_status === 'on_duty';

                    return (
                      <div
                        key={`${option.hospital_id}-${option.doctor_id}`}
                        onClick={() => {
                          setSelectedBranchOption(option);
                          if (option.available_slots?.length > 0) {
                            setSelectedSlot(option.available_slots[0]);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-blue-50/70 border-2 border-blue-600 shadow-md ring-2 ring-blue-100'
                            : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        {/* Recommendation Reason Pill */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            option.is_primary_match
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {option.distance_badge}
                          </span>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isOnDuty
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {isOnDuty ? 'On Duty Today' : 'On Leave'}
                          </span>
                        </div>

                        {/* Hospital & Doctor Details */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900">{option.doctor_name}</h3>
                            <p className="text-xs text-slate-600">{option.doctor_qualification}</p>
                            <p className="text-xs text-blue-700 font-semibold flex items-center gap-1 mt-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {option.hospital_name} ({option.city})
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {option.room_number} • Shift: {option.shift_timings}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-slate-400 font-medium">Consultation</span>
                            <div className="text-base font-extrabold text-slate-900">
                              ₹{option.consultation_fee?.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Why this recommendation */}
                        <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span>{option.recommendation_reason}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Appointment Date & Time Slots for Selected Branch */}
                {selectedBranchOption && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Select Preferred Date
                      </label>
                      <input
                        type="date"
                        value={appointmentDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Available Consultation Slots
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {selectedBranchOption.available_slots?.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-1 text-xs rounded-xl font-bold transition-all text-center cursor-pointer ${
                              selectedSlot === slot
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Booking Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={bookingLoading || !selectedBranchOption}
                    onClick={handleBookAppointment}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Verified Appointment Token...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Verified Appointment (No Sign-In Needed)
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Instant Token Generation • Priority OPD Admission
                  </p>
                </div>

              </div>

            </div>

          </div>
        </main>
      )}
    </div>
  );
};
