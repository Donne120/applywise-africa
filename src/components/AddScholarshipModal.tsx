import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId, calcDaysLeft } from '../utils/helpers';
import type { Scholarship } from '../types';

export default function AddScholarshipModal({ onClose }: { onClose: () => void }) {
  const { addScholarship } = useApp();
  const [form, setForm] = useState({
    name: '', institution: '', country: '', countryCode: '',
    focusArea: 'AI Systems Engineering' as Scholarship['focusArea'],
    priority: 'High' as Scholarship['priority'],
    funding: '', fundingType: 'Fully Funded' as Scholarship['fundingType'],
    deadline: '', requirements: '', notes: '', url: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const daysLeft = calcDaysLeft(form.deadline);
    addScholarship({
      id: generateId(),
      ...form,
      status: 'Not Started',
      daysLeft: daysLeft !== null && daysLeft < 0 ? null : daysLeft,
      isPastDue: daysLeft !== null && daysLeft < 0,
      eligibilityConfirmed: false,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Scholarship</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-field">
              <label>Scholarship Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gates Cambridge Scholarship" />
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Institution *</label>
              <input required value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g. University of Cambridge" />
            </div>
            <div className="form-field">
              <label>Country *</label>
              <input required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. UK" />
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Country Code *</label>
              <input required maxLength={2} value={form.countryCode} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value.toUpperCase() }))} placeholder="e.g. GB" />
            </div>
            <div className="form-field">
              <label>Deadline *</label>
              <input type="date" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Focus Area</label>
              <select value={form.focusArea} onChange={e => setForm(f => ({ ...f, focusArea: e.target.value as Scholarship['focusArea'] }))}>
                <option>AI Systems Engineering</option>
                <option>AI Governance & Safety</option>
                <option>Machine Learning</option>
                <option>Computer Science</option>
                <option>Data Science</option>
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Scholarship['priority'] }))}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Funding Amount</label>
              <input value={form.funding} onChange={e => setForm(f => ({ ...f, funding: e.target.value }))} placeholder="e.g. Full cost of study" />
            </div>
            <div className="form-field">
              <label>Funding Type</label>
              <select value={form.fundingType} onChange={e => setForm(f => ({ ...f, fundingType: e.target.value as Scholarship['fundingType'] }))}>
                <option>Fully Funded</option>
                <option>Partial</option>
                <option>Tuition Only</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Requirements</label>
            <textarea rows={2} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="List key requirements..." />
          </div>
          <div className="form-field">
            <label>Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
          </div>
          <div className="form-field">
            <label>Application URL</label>
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Scholarship</button>
          </div>
        </form>
      </div>
    </div>
  );
}
