import { useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LearningResource, LearningStatus } from '../types';
import { generateId } from '../utils/helpers';

const FILTERS: (LearningStatus | 'All')[] = ['All', 'Not Started', 'In Progress', 'Completed'];

// Topical Unsplash images for learning resources, keyed loosely by topic keyword.
const TOPIC_IMAGES: { match: RegExp; img: string }[] = [
  { match: /ai|machine|ml|safety|deep/i,        img: 'photo-1677442136019-21780ecad995' },
  { match: /data|stat|python|analytics/i,        img: 'photo-1551288049-bebda4e38f71' },
  { match: /web|frontend|javascript|react/i,     img: 'photo-1517180102446-f3ece451e9d8' },
  { match: /research|paper|academ/i,             img: 'photo-1532012197267-da84d127e765' },
  { match: /writing|essay|english|language/i,    img: 'photo-1455390582262-044cdead277a' },
  { match: /math|stats|calc/i,                   img: 'photo-1635070041078-e363dbe005cb' },
];
const DEFAULT_TOPIC_IMAGE = 'photo-1513475382585-d06e58bcb0e0';

function getTopicImage(r: LearningResource): string {
  const text = `${r.title} ${r.topic}`;
  const match = TOPIC_IMAGES.find(t => t.match.test(text));
  return `https://images.unsplash.com/${match?.img || DEFAULT_TOPIC_IMAGE}?auto=format&fit=crop&w=500&q=70`;
}

export default function Learning() {
  const { resources, updateResourceStatus, addResource } = useApp();
  const [filter, setFilter] = useState<LearningStatus | 'All'>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filter === 'All' ? resources : resources.filter(r => r.status === filter);
  const done = resources.filter(r => r.status === 'Completed').length;

  // Brand-new state: no learning resources at all.
  if (resources.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Learning</h1>
            <p className="page-subtitle">Close the gaps that stand between you and yes.</p>
          </div>
        </div>
        <div className="empty applications-empty">
          <div className="empty-emoji">🌱</div>
          <h2>Build the skills your applications need.</h2>
          <p>
            Add courses, books, papers, or anything you're learning. We'll connect them to your
            applications — so the work you put in shows up in your{' '}
            <strong>readiness score</strong> and the essays you write.
          </p>
          <div className="applications-empty-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Add my first resource
            </button>
          </div>
        </div>
        {showAdd && <AddResourceModal onClose={() => setShowAdd(false)} addResource={addResource} />}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Learning</h1>
          <p className="page-subtitle">{done}/{resources.length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Resource
        </button>
      </div>

      <div className="filter-bar">
        {FILTERS.map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="learning-grid">
        {filtered.map(r => (
          <LearningCard key={r.id} resource={r} onStatusChange={updateResourceStatus} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-emoji">📚</div>
          <h3>No resources match this filter</h3>
          <p>Add learning resources to grow your skills alongside your applications.</p>
          <button className="btn btn-primary mt-2" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add a resource
          </button>
        </div>
      )}

      {showAdd && <AddResourceModal onClose={() => setShowAdd(false)} addResource={addResource} />}
    </div>
  );
}

function LearningCard({ resource: r, onStatusChange }: { resource: LearningResource; onStatusChange: (id: string, s: LearningStatus) => void }) {
  const statuses: LearningStatus[] = ['Not Started', 'In Progress', 'Completed'];
  return (
    <div className="learning-card">
      <div className="learning-thumb" aria-hidden="true">
        <img src={getTopicImage(r)} alt="" loading="lazy" />
        <span className="learning-emoji-badge">{r.emoji}</span>
      </div>
      <div className="learning-card-body">
        <div className="learning-title">{r.title}</div>
        <div className="learning-provider">{r.provider}</div>
        <div className="learning-tags">
          <span className={`status-pill status-${r.status.toLowerCase().replace(' ', '-')}`}>{r.status}</span>
          <span className={`level-pill level-${r.level.toLowerCase()}`}>{r.level}</span>
          <span className="badge">🕐 {r.duration}</span>
          <span className={`badge ${r.cost === 'Free' ? 'badge-success' : 'badge-warning'}`}>{r.cost}</span>
          <span className="badge badge-rose">{r.topic}</span>
        </div>
        <div className="learning-actions">
          <select
            value={r.status}
            onChange={e => onStatusChange(r.id, e.target.value as LearningStatus)}
            className="learning-status-select"
            aria-label="Update status"
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
              <ExternalLink size={14} /> Open
            </a>
          ) : (
            <button className="btn btn-secondary" disabled><ExternalLink size={14} /> Open</button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddResourceModal({ onClose, addResource }: { onClose: () => void; addResource: (r: LearningResource) => void }) {
  const [form, setForm] = useState({
    title: '', provider: '', level: 'Intermediate' as LearningResource['level'],
    duration: '', cost: 'Free' as LearningResource['cost'], topic: '', url: '', emoji: '📚',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addResource({ id: generateId(), ...form, status: 'Not Started' });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Learning Resource</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row two-col">
            <div className="form-field">
              <label>Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI Safety Fundamentals" />
            </div>
            <div className="form-field">
              <label>Provider *</label>
              <input required value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Coursera" />
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Level</label>
              <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as LearningResource['level'] }))}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div className="form-field">
              <label>Cost</label>
              <select value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value as LearningResource['cost'] }))}>
                <option>Free</option>
                <option>Paid</option>
              </select>
            </div>
          </div>
          <div className="form-row two-col">
            <div className="form-field">
              <label>Duration</label>
              <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 8 weeks" />
            </div>
            <div className="form-field">
              <label>Topic</label>
              <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. AI Safety" />
            </div>
          </div>
          <div className="form-field">
            <label>URL</label>
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Resource</button>
          </div>
        </form>
      </div>
    </div>
  );
}
