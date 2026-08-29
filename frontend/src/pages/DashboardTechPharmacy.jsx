import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Pill, 
  PackagePlus, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  LogOut, 
  RefreshCw, 
  Activity, 
  Plus, 
  Building2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Boxes,
  FileText,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { equipmentApi, requisitionApi, activityApi } from '../api';
import { EquipmentGrid } from '../components/EquipmentGrid';
import { RequisitionOrderModal } from '../components/RequisitionOrderModal';
import { LiveNotificationToast } from '../components/LiveNotificationToast';

const PHARMACY_CATALOG = [
  { id: 1, name: 'IV Paracetamol 1000mg/100ml Infusion', category: 'Analgesics', stock: 140, minStock: 50, unit: 'Bottles', price: 130, dept: 'Orthopedics' },
  { id: 2, name: 'Inj. Enoxaparin Sodium 40mg/0.4ml', category: 'Anticoagulants', stock: 25, minStock: 40, unit: 'Packs', price: 700, dept: 'Cardiology' },
  { id: 3, name: 'Inj. Meropenem 1g IV Infusion Vials', category: 'Antibiotics', stock: 45, minStock: 30, unit: 'Vials', price: 650, dept: 'Cardiology' },
  { id: 4, name: 'Aspirin 75mg Gastro-Resistant Tablets', category: 'Antiplatelet', stock: 500, minStock: 100, unit: 'Strips', price: 45, dept: 'Cardiology' },
  { id: 5, name: 'Inj. Cefoperazone + Sulbactam 1.5g', category: 'Antibiotics', stock: 80, minStock: 40, unit: 'Vials', price: 420, dept: 'Orthopedics' },
  { id: 6, name: 'Ringer Lactate (RL) 500ml IV Solution', category: 'IV Fluids', stock: 320, minStock: 100, unit: 'Bottles', price: 65, dept: 'Cardiology' },
];

export const DashboardTechPharmacy = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('equipments'); // 'equipments', 'requisitions', 'pharmacy', 'activity'
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);

  // Data states
  const [equipments, setEquipments] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pre-filled quick requisition state from pharmacy
  const [selectedPharmacyItem, setSelectedPharmacyItem] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [eqData, reqData, actData] = await Promise.all([
        equipmentApi.getEquipments(),
        requisitionApi.getRequisitions(),
        activityApi.getActivities({ limit: 10 })
      ]);
      setEquipments(eqData);
      setRequisitions(reqData);
      setActivities(actData);
    } catch (err) {
      console.error('Failed to load Tech/Pharm dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  const handleDataChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  // KPIs
  const totalEquipments = equipments.length;
  const maintenanceCount = equipments.filter(e => e.status === 'maintenance' || e.status === 'calibrating').length;
  const pendingRequisitions = requisitions.filter(r => r.status === 'pending').length;
  const totalRequisitionValue = requisitions.reduce((acc, r) => acc + (r.estimated_cost || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-12">
      {/* Live WebSocket Toast Listener */}
      <LiveNotificationToast onDataChanged={handleDataChange} />

      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                Medicover Hospitals Operations
              </h1>
              <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Biomedical & Pharmacy
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Technician cum Pharmacist Operations Control Center
            </p>
          </div>
        </div>

        {/* Right Actions: New Requisition Button + User Profile + Logout */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsRequisitionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Order Supplies / Equipment</span>
          </button>

          <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
              {user?.full_name?.charAt(0) || 'T'}
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-slate-900">{user?.full_name}</p>
              <p className="text-[10px] text-slate-500">Biomedical / Pharmacist</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Equipments */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Biomedical Devices</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalEquipments} Units</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{equipments.filter(e => e.status === 'operational').length} Running Fine</span>
              </p>
            </div>
            <div className="p-3.5 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-2xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: In Maintenance */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Under Maintenance</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{maintenanceCount} Devices</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {equipments.filter(e => e.status === 'calibrating').length} Calibration Due
              </p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Pending Requisitions */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Requisitions</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{pendingRequisitions} Pending</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {requisitions.filter(r => r.status === 'approved').length} Approved by Admin
              </p>
            </div>
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl">
              <PackagePlus className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Pharmacy Catalog Health */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pharmacy Dispensary</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">6 Formulary Items</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Buffer stocks healthy
              </p>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl">
              <Pill className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          {[
            { id: 'equipments', label: 'Biomedical Equipment Matrix', icon: Stethoscope, count: totalEquipments },
            { id: 'requisitions', label: 'Supply & Equipment Requisitions', icon: PackagePlus, count: requisitions.length },
            { id: 'pharmacy', label: 'Pharmacy Dispensary & Formulary', icon: Pill, count: PHARMACY_CATALOG.length },
            { id: 'activity', label: 'Clinical Activity Audit', icon: Activity, count: activities.length },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${active ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-600 font-bold'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Equipment Operations Matrix */}
        {activeTab === 'equipments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Biomedical Engineering & Equipment Status</h2>
                <p className="text-xs text-slate-500">
                  Update live device status (Running Fine, Under Maintenance, Calibration Due, Out of Order). Syncs in real time with Admin.
                </p>
              </div>
            </div>

            <EquipmentGrid 
              refreshKey={refreshKey} 
              onDataChange={handleDataChange} 
            />
          </div>
        )}

        {/* Tab 2: Requisitions & Supply Orders */}
        {activeTab === 'requisitions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Supply & Equipment Requisition Tracker</h2>
                <p className="text-xs text-slate-500">
                  Track requisition status, Admin approval decisions, and procurement remarks.
                </p>
              </div>

              <button
                onClick={() => setIsRequisitionModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" />
                <span>New Requisition</span>
              </button>
            </div>

            {/* Requisitions List Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
              {requisitions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <PackagePlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No requisitions submitted yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "New Requisition" above to order equipment or medicines.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requisitions.map(req => {
                    const isMedicine = req.item_type === 'medicine';
                    const isEmergency = req.urgency === 'emergency';
                    const isUrgent = req.urgency === 'urgent';

                    return (
                      <div
                        key={req.id}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs transition-all"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2.5 rounded-xl border mt-0.5 flex-shrink-0 ${
                            isMedicine ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {isMedicine ? <Pill className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-extrabold text-slate-900">{req.item_name}</span>
                              <span className="text-[10px] font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                                {req.quantity} {req.unit}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                isEmergency
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : isUrgent
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {req.urgency}
                              </span>
                              <span className="text-xs font-bold text-emerald-700">
                                ₹{req.estimated_cost?.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              {req.department} • Category: <strong className="text-slate-700">{req.category || 'General'}</strong> • Requested: {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>

                            {req.reason && (
                              <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                                <strong className="text-slate-800">Justification: </strong>{req.reason}
                              </p>
                            )}

                            {req.admin_notes && (
                              <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded-xl border border-blue-200">
                                <strong className="text-blue-900">Admin Remarks: </strong>{req.admin_notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="self-end md:self-center flex-shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            req.status === 'approved' || req.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : req.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {req.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {req.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                            {req.status === 'delivered' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                            <span className="capitalize">{req.status === 'pending' ? 'Pending Admin Approval' : req.status}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Pharmacy Dispensary Formulary */}
        {activeTab === 'pharmacy' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Hospital Pharmacy Formulary & Inventory</h2>
                <p className="text-xs text-slate-500">
                  Critical inpatient pharmaceutical buffer stock and one-click requisition re-order.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PHARMACY_CATALOG.map(med => (
                <div 
                  key={med.id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {med.category}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {med.dept}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">
                      {med.name}
                    </h4>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Current Stock</p>
                        <p className={`text-lg font-black ${med.stock <= med.minStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {med.stock} {med.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Unit Price</p>
                        <p className="text-sm font-extrabold text-slate-900">₹{med.price}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRequisitionModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Raise Requisition Order</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Activity Audit Logs */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Biomedical & Clinical Activity Audit Trail
            </h2>
            <div className="space-y-2">
              {activities.map(act => (
                <div key={act.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{act.action_description}</p>
                    <p className="text-[11px] text-slate-500">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-700 border border-blue-200">
                    LOG #{act.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Modal: Raise New Requisition */}
      <RequisitionOrderModal
        isOpen={isRequisitionModalOpen}
        onClose={() => setIsRequisitionModalOpen(false)}
        onSuccess={() => {
          handleDataChange();
          setActiveTab('requisitions');
        }}
      />
    </div>
  );
};
