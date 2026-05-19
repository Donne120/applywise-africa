import { useState, useMemo } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Plus, PenTool, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Scholarship } from '../types';
import AddScholarshipModal from '../components/AddScholarshipModal';
import { computeReadiness, toneLabel } from '../utils/readiness';

const STATUS_FILTERS = ['All', 'High', 'Medium', 'Not Started', 'In Progress', 'Submitted', 'AI Systems Engineering', 'AI Governance & Safety'];

// Map common country codes to themed Unsplash photo IDs (campuses / landmarks).
// Fallback to a generic "study" image. All photos hotlinked from Unsplash CDN.
const COUNTRY_IMAGES: Record<string, string> = {
  GB: 'photo-1526129318478-62ed807ebdf9', // UK / Oxford-ish
  US: 'photo-1498243691581-b145c3f54a5a', // US campus
  CA: 'photo-1503614472-8c93d56e92ce', // Canada
  DE: 'photo-1467269204594-9661b134dd2b', // Germany
  FR: 'photo-1502602898657-3e91760cbb34', // France
  AU: 'photo-1523482580672-f109ba8cb9be', // Australia
  NL: 'photo-1512470876302-972faa2aa9a4', // Netherlands / Amsterdam
  CH: 'photo-1530122037265-a5f1f91d3b99', // Switzerland
  RW: 'photo-1518998053901-5348d3961a04', // Africa
  CM: 'photo-1518998053901-5348d3961a04',
  ZA: 'photo-1577086664693-894d8405334a', // South Africa
};
const FALLBACK_IMAGE = 'photo-1523240795612-9a054b0db644'; // graduation

function getScholarshipImage(s: Scholarship): string {
  const id = COUNTRY_IMAGES[s.countryCode] || FALLBACK_IMAGE;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;
}

export default function Scholarships() {
  const { scholarships, updateScholarshipStatus, studentProfile, tasks, writingDocuments, stories, recommenders } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const readinessById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeReadiness>>();
    scholarships.forEach(s => {
      map.set(s.id, computeReadiness(s, studentProfile, tasks, writingDocuments, stories, recommenders));
    });
    return map;
  }, [scholarships, studentProfile, tasks, writingDocuments, stories, recommenders]);

  const filtered = scholarships.filter(s => {
    if (filter === 'All') return true;
    if (filter === 'High' || filter === 'Medium') return s.priority === filter;
    if (filter === 'Not Started' || filter === 'In Progress' || filter === 'Submitted') return s.status === filter;
    return s.focusArea === filter;
  });

  // First-run experience: empty state with a clear path to Discover.
  if (scholarships.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>My Applications</h1>
            <p className="page-subtitle">Every scholarship you're tracking, in one place.</p>
          </div>
        </div>
        <div className="empty applications-empty">
          <img src="/apply-empty.png" alt="" className="mobile-empty-image" aria-hidden="true" />
          <div className="empty-emoji">🌍</div>
          <h2>Your scholarship journey starts here.</h2>
          <p>
            You haven't tracked any scholarships yet. Use <strong>Discover</strong> to
            find programs that fit your field, country, and degree — then add them here so we can
            score your readiness and plan your timeline together.
          </p>
          <div className="applications-empty-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/discover')}>
              <Sparkles size={15} /> Discover scholarships
            </button>
            <button className="btn btn-ghost" onClick={() => setShowModal(true)}>
              Or add one manually
            </button>
          </div>
        </div>

        {showModal && <AddScholarshipModal onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Applications</h1>
          <p className="page-subtitle">{scholarships.length} programs tracked · {filtered.length} matching</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Scholarship
        </button>
      </div>

      <div className="filter-bar">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="scholarship-list">
        {filtered.map(s => (
          <ScholarshipCard
            key={s.id}
            scholarship={s}
            isExpanded={expanded === s.id}
            readiness={readinessById.get(s.id)!}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
            onStatusChange={updateScholarshipStatus}
            onWriteFor={() => navigate(`/writing?scholarship=${s.id}`)}
            onOpenWorkspace={() => navigate(`/applications/${s.id}`)}
          />
        ))}
      </div>

      {showModal && <AddScholarshipModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function ScholarshipCard({ scholarship: s, isExpanded, readiness, onToggle, onStatusChange, onWriteFor, onOpenWorkspace }: {
  scholarship: Scholarship;
  isExpanded: boolean;
  readiness: ReturnType<typeof computeReadiness>;
  onToggle: () => void;
  onStatusChange: (id: string, status: Scholarship['status']) => void;
  onWriteFor: () => void;
  onOpenWorkspace: () => void;
}) {
  const statuses: Scholarship['status'][] = ['Not Started', 'In Progress', 'Submitted', 'Accepted'];

  return (
    <div className={`scholarship-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="scholarship-card-header">
        <div
          className="scholarship-thumb scholarship-thumb-clickable"
          onClick={onOpenWorkspace}
          role="button"
          tabIndex={0}
          aria-label={`Open workspace for ${s.name}`}
        >
          <img src={getScholarshipImage(s)} alt="" loading="lazy" />
          <span className="scholarship-thumb-flag">{s.countryCode}</span>
        </div>
        <div className="scholarship-card-left">
          <button className="scholarship-name-btn" type="button" onClick={onOpenWorkspace}>
            <span className="scholarship-name">{s.name}</span>
          </button>
          <div className="scholarship-sub">
            <MapPin size={11} /> {s.institution} · {s.country}
          </div>
          <div className="scholarship-pills">
            <span className={`readiness-chip readiness-${readiness.tone}`} title={readiness.headline}>
              <span className="readiness-chip-num">{readiness.total}</span>
              <span className="readiness-chip-label">{toneLabel(readiness.tone)}</span>
            </span>
            <span className={`status-pill status-${s.status.toLowerCase().replace(/ /g, '-')}`}>{s.status}</span>
            <span className="funding-badge">{s.funding || s.fundingType}</span>
            {s.isPastDue
              ? <span className="days-badge past-due">Past due</span>
              : s.daysLeft !== null && (
                  <span className={`days-badge ${s.daysLeft <= 30 ? 'urgent' : s.daysLeft <= 90 ? 'warning' : 'ok'}`}>
                    {s.daysLeft}d left
                  </span>
                )}
            <span className={`priority-dot ${s.priority.toLowerCase()}`} title={`${s.priority} priority`} />
          </div>
        </div>
        <button
          className="scholarship-card-right"
          type="button"
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand details'}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="scholarship-details">
          <div className="details-grid">
            <div className="detail-field">
              <div className="detail-label">Focus Area</div>
              <div className="detail-value">{s.focusArea}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Funding</div>
              <div className="detail-value">{s.fundingType}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Deadline</div>
              <div className="detail-value">{new Date(s.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Eligibility Confirmed</div>
              <div className="detail-value">{s.eligibilityConfirmed ? '✅ Yes' : '❌ No'}</div>
            </div>
            <div className="detail-field full-width">
              <div className="detail-label">Requirements</div>
              <div className="detail-value">{s.requirements}</div>
            </div>
            <div className="detail-field full-width">
              <div className="detail-label">Notes</div>
              <div className="detail-value">{s.notes}</div>
            </div>
          </div>
          <div className="scholarship-actions">
            {statuses.map(st => (
              <button
                key={st}
                className={`status-btn ${s.status === st ? 'active' : ''}`}
                onClick={() => onStatusChange(s.id, st)}
              >
                {st}
              </button>
            ))}
            <button className="btn btn-secondary" onClick={onOpenWorkspace}>
              <ArrowRight size={14} /> Open workspace
            </button>
            <button className="btn btn-primary btn-write-scholarship" onClick={onWriteFor}>
              <PenTool size={14} /> Write for this Scholarship
            </button>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <ExternalLink size={14} /> Apply Now
              </a>
            ) : (
              <button className="btn btn-secondary" disabled title="No application URL set">
                <ExternalLink size={14} /> Apply Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
