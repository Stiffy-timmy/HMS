import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  Gauge
} from 'lucide-react';
import { sensorApi } from '../api';

export const IoTSimulatorWidget = ({ 
  beds = [], 
  onSignalSent 
}) => {
  const [transmittingBedId, setTransmittingBedId] = useState(null);
  const [lastSignalLog, setLastSignalLog] = useState(null);
  const [filterWard, setFilterWard] = useState('ALL');

  const wards = ['ALL', ...Array.from(new Set(beds.map(b => b.ward).filter(Boolean)))];

  const filteredBeds = filterWard === 'ALL' 
    ? beds 
    : beds.filter(b => b.ward === filterWard);

  const handleSimulateSignal = async (bed, isBreached) => {
    setTransmittingBedId(bed.id);
    const pressureValue = isBreached ? 18.5 : 0.2; // kPa
    try {
      const reading = await sensorApi.sendReading({
        bed_id: bed.id,
        sensor_type: 'pressure',
        value: pressureValue,
        unit: 'kPa'
      });

      const logEntry = {
        bedId: bed.id,
        ward: bed.ward,
        value: reading.value,
        unit: reading.unit,
        isBreached: reading.threshold_breached,
        timestamp: new Date().toLocaleTimeString()
      };
      setLastSignalLog(logEntry);

      if (onSignalSent) {
        onSignalSent(reading);
      }
    } catch (err) {
      console.error('Failed to transmit simulated sensor reading:', err);
    } finally {
      setTransmittingBedId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'occupied':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cleaning_pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">IoT Signal Simulator</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                CF-6 TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Simulate physical bed load cell sensor signals to test software vs hardware desync detection
            </p>
          </div>
        </div>

        {/* Ward Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Ward:</span>
          <select
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {wards.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-Time Telemetry Feedback Bar */}
      {lastSignalLog && (
        <div className={`px-5 py-2.5 border-b flex items-center justify-between text-xs transition-all ${
          lastSignalLog.isBreached 
            ? 'bg-rose-50/80 border-rose-200 text-rose-800' 
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            {lastSignalLog.isBreached ? (
              <Zap className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>
              Telemetry Sent: <strong>Bed #{lastSignalLog.bedId} ({lastSignalLog.ward})</strong> &rarr; Load: <strong>{lastSignalLog.value} {lastSignalLog.unit}</strong> ({lastSignalLog.isBreached ? 'Threshold Breached - Occupancy Detected' : 'Threshold Normal - Bed Empty'})
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-75">{lastSignalLog.timestamp}</span>
        </div>
      )}

      {/* Bed List Simulator Table */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xs border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-5">BED / LOCATION</th>
              <th className="py-2.5 px-4">DEPARTMENT</th>
              <th className="py-2.5 px-4">SOFTWARE STATE</th>
              <th className="py-2.5 px-5 text-right">SIMULATE HARDWARE SIGNAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBeds.map((bed) => {
              const isTransmitting = transmittingBedId === bed.id;
              return (
                <tr key={bed.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-bold text-slate-900">Bed #{bed.id}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{bed.ward}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {bed.department}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${getStatusBadge(bed.current_status)}`}>
                      {bed.current_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Simulate Pressure Breach (Occupancy Detected) */}
                      <button
                        type="button"
                        disabled={isTransmitting}
                        onClick={() => handleSimulateSignal(bed, true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                        title="Transmits 18.5 kPa load reading. If bed is Available or Cleaning Pending, triggers CF-6."
                      >
                        <Zap className="w-3.5 h-3.5 text-rose-600" />
                        Simulate Pressure Signal
                      </button>

                      {/* Simulate Clear / Empty Signal */}
                      <button
                        type="button"
                        disabled={isTransmitting}
                        onClick={() => handleSimulateSignal(bed, false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        title="Transmits 0.2 kPa baseline reading. Auto-resolves CF-6 if active."
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Clear / Empty
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredBeds.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  <p className="text-xs">No beds found matching filter.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
