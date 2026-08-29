import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  RefreshCw, 
  Loader2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { equipmentApi } from '../api';

export const AdminEquipmentWidget = ({ onNavigateToEquipments }) => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const data = await equipmentApi.getEquipments();
      setEquipments(data);
    } catch (err) {
      console.error('Failed to load equipments for admin widget:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const totalCount = equipments.length;
  const operationalCount = equipments.filter(e => e.status === 'operational').length;
  const maintenanceCount = equipments.filter(e => e.status === 'maintenance').length;
  const calibratingCount = equipments.filter(e => e.status === 'calibrating').length;
  const decommissionedCount = equipments.filter(e => e.status === 'decommissioned').length;

  const operationalPct = totalCount > 0 ? Math.round((operationalCount / totalCount) * 100) : 100;
  const attentionList = equipments.filter(e => e.status !== 'operational');

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-2xl">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Biomedical Equipment Health
              {maintenanceCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {maintenanceCount} In Maintenance
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Hospital-wide medical equipment status & maintenance readiness
            </p>
          </div>
        </div>

        <button
          onClick={fetchEquipments}
          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Refresh Equipment Health"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Gauges & Operational Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 font-medium">Hospital Operational Rate</span>
          <span className="font-bold text-emerald-700">{operationalPct}% Operational ({operationalCount}/{totalCount})</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
          <div 
            style={{ width: `${operationalPct}%` }}
            className="bg-emerald-500 transition-all duration-500" 
          />
          <div 
            style={{ width: `${(maintenanceCount / (totalCount || 1)) * 100}%` }}
            className="bg-amber-500 transition-all duration-500" 
          />
          <div 
            style={{ width: `${(calibratingCount / (totalCount || 1)) * 100}%` }}
            className="bg-cyan-500 transition-all duration-500" 
          />
          <div 
            style={{ width: `${(decommissionedCount / (totalCount || 1)) * 100}%` }}
            className="bg-rose-500 transition-all duration-500" 
          />
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Running Fine</p>
          <p className="text-base font-black text-emerald-600">{operationalCount}</p>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Maintenance</p>
          <p className="text-base font-black text-amber-600">{maintenanceCount}</p>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Calibrating</p>
          <p className="text-base font-black text-cyan-600">{calibratingCount}</p>
        </div>
      </div>

      {/* Attention Equipment List */}
      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
          Equipment Under Maintenance / Calibration:
        </p>

        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-1" />
            <p className="text-[11px] text-slate-400">Checking device health...</p>
          </div>
        ) : attentionList.length === 0 ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>All {totalCount} medical devices across ICU & Wards are running fine with zero maintenance delays.</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {attentionList.map(eq => (
              <div 
                key={eq.id}
                className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {eq.asset_tag}
                    </span>
                    <span className="font-bold text-slate-900">{eq.equipment_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {eq.department} • <span className="text-slate-700 font-medium">{eq.location_room}</span>
                  </p>
                  {eq.maintenance_notes && (
                    <p className="text-[10px] text-slate-600 italic truncate max-w-xs">
                      {eq.maintenance_notes}
                    </p>
                  )}
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex-shrink-0 ${
                  eq.status === 'maintenance'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : eq.status === 'calibrating'
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {eq.status === 'maintenance' ? 'Maintenance' : eq.status === 'calibrating' ? 'Calibrating' : 'Out of Order'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
