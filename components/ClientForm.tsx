import React, { useState, useEffect } from 'react';
import { ClientProfile } from '../types';
import { clientService } from '../services/clientService';
import { dbService } from '../services/dbService';
import { auth } from '../services/firebase';

interface ClientFormProps {
  initialData?: ClientProfile;
  onSave: () => void;
  onCancel: () => void;
}

const PODS = [
  'The Peas',
  'Advengers',
  'Cakota',
  'PSTQ',
  "Charland's Angels"
];

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    pod: PODS[0],
    monthlySpend: '',
    duration: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        pod: initialData.pod || PODS[0],
        monthlySpend: initialData.monthlySpend,
        duration: initialData.duration,
        notes: initialData.notes
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (initialData) {
        await dbService.updateClient(initialData.id, formData);
      } else {
        await dbService.addClient(auth.currentUser.uid, formData);
      }
      onSave();
    } catch (error) {
      console.error("Failed to save client", error);
      alert("Failed to save client. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-6 flex justify-center">
        <div className="text-2xl font-bold tracking-tighter font-sans text-white flex items-center gap-1">
          ADCLASS <span className="text-brand-cyan">.</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {initialData ? 'Edit Client Profile' : 'Add New Client'}
      </h2>

      <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-muted rounded-xl p-8 backdrop-blur-sm space-y-6 shadow-2xl">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Client Name</label>
            <input
              type="text"
              required
              className="w-full bg-brand-dark border border-brand-muted rounded-lg p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all placeholder-brand-muted/50"
              placeholder="e.g. Acme Corp"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Assigned Pod</label>
            <select
              className="w-full bg-brand-dark border border-brand-muted rounded-lg p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all appearance-none"
              value={formData.pod}
              onChange={e => setFormData({ ...formData, pod: e.target.value })}
            >
              {PODS.map(pod => (
                <option key={pod} value={pod}>{pod}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Relationship Duration</label>
            <input
              type="text"
              required
              className="w-full bg-brand-dark border border-brand-muted rounded-lg p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all placeholder-brand-muted/50"
              placeholder="e.g. 18 months"
              value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Average Spend</label>
            <input
              type="text"
              required
              className="w-full bg-brand-dark border border-brand-muted rounded-lg p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all placeholder-brand-muted/50"
              placeholder="e.g. $15,000/mo"
              value={formData.monthlySpend}
              onChange={e => setFormData({ ...formData, monthlySpend: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-brand-cyan uppercase mb-1">Permanent Strategic Context (AI Memory)</label>
          <p className="text-xs text-brand-muted mb-2">This context will be automatically included in every analysis for this client.</p>
          <textarea
            className="w-full h-32 bg-brand-dark border border-brand-muted rounded-lg p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none transition-all resize-none placeholder-brand-muted/50"
            placeholder="e.g. They are extremely metric-focused. CFO is skeptical of our agency. They value speed over perfection..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-muted/30">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-md text-brand-muted hover:text-white hover:bg-brand-dark transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-2 bg-brand-cyan hover:bg-brand-cyan/80 text-brand-dark font-bold rounded-md transition-all shadow-lg shadow-brand-cyan/20"
          >
            Save Profile
          </button>
        </div>

      </form>
    </div>
  );
};
