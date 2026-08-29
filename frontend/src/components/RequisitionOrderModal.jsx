import React, { useState } from 'react';
import { 
  X, 
  PackagePlus, 
  Stethoscope, 
  Pill, 
  AlertTriangle, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Loader2,
  Building2,
  FileText
} from 'lucide-react';
import { requisitionApi } from '../api';

const QUICK_SUGGESTIONS = [
  { type: 'equipment', name: 'Multiparameter Patient Monitor (ECG/SpO2/NIBP)', category: 'Patient Monitoring', unit: 'Units', cost: 90000, dept: 'Cardiology' },
  { type: 'equipment', name: 'Mindray Defibrillator Rechargeable Battery Pack', category: 'Life Support Spares', unit: 'Packs', cost: 12000, dept: 'Cardiology' },
  { type: 'equipment', name: 'Sterile Orthopedic Sagittal Saw Blades Set', category: 'Surgical Consumables', unit: 'Sets', cost: 8500, dept: 'Orthopedics' },
  { type: 'medicine', name: 'IV Paracetamol 1000mg/100ml Infusion', category: 'Analgesics', unit: 'Bottles', cost: 130, dept: 'Orthopedics' },
  { type: 'medicine', name: 'Inj. Enoxaparin Sodium 40mg/0.4ml Prefilled', category: 'Anticoagulants', unit: 'Packs', cost: 700, dept: 'Cardiology' },
  { type: 'medicine', name: 'Inj. Meropenem 1g IV Infusion Vials', category: 'Critical Care Antibiotics', unit: 'Vials', cost: 650, dept: 'Cardiology' },
];

export const RequisitionOrderModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    item_type: 'equipment',
    item_name: '',
    category: 'Patient Monitoring',
    quantity: 1,
    unit: 'Units',
    urgency: 'routine',
    department: 'Cardiology',
    estimated_cost: 50000,
    reason: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleApplySuggestion = (sug) => {
    setFormData(prev => ({
      ...prev,
      item_type: sug.type,
      item_name: sug.name,
      category: sug.category,
      unit: sug.unit,
      department: sug.dept,
      estimated_cost: sug.cost * prev.quantity
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      setError('Please provide an item or equipment name.');
      return;
    }
    if (formData.quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requisitionApi.createRequisition({
        item_type: formData.item_type,
        item_name: formData.item_name.trim(),
        category: formData.category?.trim() || null,
        quantity: parseInt(formData.quantity, 10),
        unit: formData.unit.trim(),
        urgency: formData.urgency,
        department: formData.department.trim(),
        estimated_cost: parseFloat(formData.estimated_cost) || 0.0,
        reason: formData.reason?.trim() || null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit requisition:', err);
      setError(err.response?.data?.detail || 'Failed to submit requisition order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                New Supply & Equipment Requisition
              </h3>
              <p className="text-xs text-slate-500">
                Raise an official hospital requisition for Medical Equipments or Pharmaceuticals
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 pt-4 pb-3 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            Quick Requisition Templates:
          </p>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {QUICK_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySuggestion(sug)}
                className="text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-1 rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex items-center gap-1.5 shadow-xs font-semibold cursor-pointer"
              >
                {sug.type === 'equipment' ? <Stethoscope className="w-3.5 h-3.5 text-cyan-600" /> : <Pill className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{sug.name.split(' ')[0]} {sug.name.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Item Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Requisition Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'equipment', label: 'Medical Equipment', icon: Stethoscope, color: 'text-cyan-700', activeClass: 'bg-cyan-50 border-cyan-500 ring-2 ring-cyan-200' },
                { id: 'medicine', label: 'Medicines / Pharmacy', icon: Pill, color: 'text-emerald-700', activeClass: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200' },
                { id: 'consumable', label: 'Surgical Consumables', icon: PackagePlus, color: 'text-amber-700', activeClass: 'bg-amber-50 border-amber-500 ring-2 ring-amber-200' },
              ].map((type) => {
                const Icon = type.icon;
                const active = formData.item_type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, item_type: type.id }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                      active 
                        ? `${type.activeClass} text-slate-900 shadow-xs` 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${type.color}`} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Item / Equipment Name *
              </label>
              <input 
                type="text"
                value={formData.item_name}
                onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g. 12-Lead ECG Machine, IV Paracetamol..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category / Sub-Type
              </label>
              <input 
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Diagnostics, Critical Care, Antibiotics..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
              />
            </div>
          </div>

          {/* Quantity, Unit, Estimated Cost */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Quantity *
              </label>
              <input 
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unit of Measure
              </label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 cursor-pointer"
              >
                <option value="Units">Units (Equipment)</option>
                <option value="Packs">Packs</option>
                <option value="Boxes">Boxes</option>
                <option value="Vials">Vials (Injectable)</option>
                <option value="Bottles">Bottles (Infusion)</option>
                <option value="Sets">Sets (Surgical)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Total Est. Cost (₹ INR)
              </label>
              <input 
                type="number"
                min="0"
                step="100"
                value={formData.estimated_cost}
                onChange={e => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-700 font-extrabold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
              />
            </div>
          </div>

          {/* Department & Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Destination Department / Ward *
              </label>
              <select
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70 cursor-pointer"
              >
                <option value="Cardiology">Cardiology (Ward 3A/3B & ICU)</option>
                <option value="Orthopedics">Orthopedics (Ward 2A/2B & OT)</option>
                <option value="Cardiac ICU">Cardiac ICU</option>
                <option value="Central Pharmacy">Central Pharmacy Store</option>
                <option value="Biomedical">Biomedical Engineering Bay</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Procurement Urgency *
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'routine', label: 'Routine', border: 'border-slate-200 text-slate-700 hover:bg-slate-50', active: 'bg-blue-600 border-blue-600 text-white' },
                  { id: 'urgent', label: 'Urgent', border: 'border-amber-200 text-amber-800 bg-amber-50/60', active: 'bg-amber-600 border-amber-600 text-white' },
                  { id: 'emergency', label: 'Emergency', border: 'border-red-200 text-red-800 bg-red-50/60', active: 'bg-red-600 border-red-600 text-white' },
                ].map(urg => (
                  <button
                    key={urg.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: urg.id })}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      formData.urgency === urg.id
                        ? urg.active
                        : urg.border
                    }`}
                  >
                    {urg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reason / Clinical Justification */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Clinical Justification / Reason for Requisition
            </label>
            <textarea
              rows="2"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Backup monitor for ICU bed expansion, or ward buffer stock replenishment..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100/70"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Requisition</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
