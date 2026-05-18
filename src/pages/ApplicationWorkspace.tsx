import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, ExternalLink, Calendar, PenTool, AlertCircle,
  ChevronRight, Sparkles, Heart, X,
} from 'lucide-react';
import { generateId } from '../utils/helpers';
import VoiceInput from '../components/VoiceInput';
import MobileWorkspace from '../components/MobileWorkspace';
import { useApp } from '../context/AppContext';
import { computeReadiness, toneLabel } from '../utils/readiness';
import type { PillarScore } from '../utils/readiness';
import { formatDeadline } from '../utils/helpers';
import { getFieldHero } from '../utils/fieldAssets';

const COUNTRY_IMAGES: Record<string, string> = {
  GB: 'photo-1526129318478-62ed807ebdf9',
  US: 'photo-1498243691581-b145c3f54a5a',
  CA: 'photo-1503614472-8c93d56e92ce',
  DE: 'photo-1467269204594-9661b134dd2b',
  FR: 'photo-1502602898657-3e91760cbb34',
  AU: 'photo-1523482580672-f109ba8cb9be',
  NL: 'photo-1512470876302-972faa2aa9a4',
  CH: 'photo-1530122037265-a5f1f91d3b99',
};
const FALLBACK_IMG = 'photo-1523240795612-9a054b0db644';
const heroImg = (code: string) =>
  `https://images.unsplash.com/${COUNTRY_IMAGES[code] || FALLBACK_IMG}?auto=format&fit=crop&w=1200&q=80`;

export default function ApplicationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    scholarships, tasks, writingDocuments, studentProfile, updateTask,
    stories, recommenders, updateScholarshipStatus, addRetrospective, retrospectives,
  } = useApp();

  const scholarship = scholarships.find(s => s.id === id);

  const readiness = useMemo(() => {
    if (!scholarship) return null;
    return computeReadiness(scholarship, studentProfile, tasks, writingDocuments, stories, recommenders);
  }, [scholarship, studentProfile, tasks, writingDocuments, stories, recommenders]);

  if (!scholarship || !readiness) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-emoji">🌸</div>
          <h3>Application not found</h3>
          <p>This workspace may have been removed. Head back to your applications.</p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/applications')}>
            <ArrowLeft size={14} /> Back to My Applications
          </button>
        </div>
      </div>
    );
  }

  const linkedTasks = tasks.filter(t => t.scholarshipId === scholarship.id);
  const linkedDocs = writingDocuments.filter(
    d => d.linkedScholarshipId === scholarship.id || d.scholarshipName === scholarship.name
  );
  const retro = retrospectives.find(r => r.scholarshipId === scholarship.id);
  const showRetroPrompt = scholarship.status === 'Rejected' && !retro;
  const [retroOpen, setRetroOpen] = useState(false);

  return (
    <>
      <div className="workspace-mobile-only">
        <MobileWorkspace scholarship={scholarship} />
      </div>
      <div className="workspace-desktop-only">
    <div className="page workspace-page">
      <button className="workspace-back" onClick={() => navigate('/applications')}>
        <ArrowLeft size={14} /> All applications
      </button>

      {/* Hero */}
      <div className="workspace-hero">
        <img
          className="workspace-hero-img"
          src={heroImg(scholarship.countryCode)}
          alt=""
          loading="lazy"
        />
        <div className="workspace-hero-fade" />
        <div className="workspace-hero-body">
          <div className="workspace-hero-eyebrow">
            <MapPin size={12} /> {scholarship.institution} · {scholarship.country}
          </div>
          <h1 className="workspace-hero-title">{scholarship.name}</h1>
          <div className="workspace-hero-meta">
            <span className={`status-pill status-${scholarship.status.toLowerCase().replace(/ /g, '-')}`}>
              {scholarship.status}
            </span>
            <span className="badge badge-rose">💰 {scholarship.funding || scholarship.fundingType}</span>
            {scholarship.isPastDue
              ? <span className="days-badge past-due">Past due</span>
              : scholarship.daysLeft !== null && (
                  <span className={`days-badge ${scholarship.daysLeft <= 30 ? 'urgent' : scholarship.daysLeft <= 90 ? 'warning' : 'ok'}`}>
                    <Calendar size={11} /> {scholarship.daysLeft} days left · {formatDeadline(scholarship.deadline)}
                  </span>
                )}
          </div>
          <div className="workspace-hero-actions">
            {scholarship.url && (
              <a href={scholarship.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <ExternalLink size={14} /> Visit program
              </a>
            )}
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
            >
              <PenTool size={14} /> Write for this scholarship
            </button>
          </div>
        </div>
      </div>

      {/* Readiness */}
      <div className="workspace-readiness">
        <div className="readiness-ring-wrap">
          <ReadinessRing total={readiness.total} tone={readiness.tone} />
          <div className="readiness-tone">{toneLabel(readiness.tone)}</div>
        </div>
        <div className="readiness-narrative">
          <div className="readiness-headline">{readiness.headline}</div>
          <p className="readiness-explainer">
            We compute this from your profile, your writing, your tasks, and the time you have left.
            It updates the moment anything changes. The fastest way up is to focus on the weakest pillar below.
          </p>
        </div>
      </div>

      {/* Pillars */}
      <div className="workspace-section-title">
        <Sparkles size={15} /> Your readiness, pillar by pillar
      </div>
      <div className="workspace-pillars">
        {readiness.pillars.map(p => <PillarCard key={p.key} pillar={p} />)}
      </div>

      {/* Tasks for this scholarship */}
      <div className="workspace-section-title mt-3">
        <Calendar size={15} /> Tasks for {scholarship.name.split(' ').slice(0, 3).join(' ')}…
      </div>
      <div className="workspace-tasks">
        {linkedTasks.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🌷</div>
            <h3>No tasks yet</h3>
            <p>Break the requirements into small actions so nothing slips between the cracks.</p>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/tasks')}>
              Add tasks
            </button>
          </div>
        ) : (
          linkedTasks.map(t => (
            <div key={t.id} className={`task-row ${t.status === 'Completed' ? 'completed' : ''}`}>
              <button
                className={`task-check ${t.status === 'Completed' ? 'checked' : ''}`}
                onClick={() => updateTask(t.id, t.status === 'Completed' ? 'Pending' : 'Completed')}
              >
                {t.status === 'Completed' && <span>✓</span>}
              </button>
              <div className="task-row-content">
                <div className="task-row-title">{t.title}</div>
                <div className="task-row-meta">
                  <span className={`cat-badge cat-${t.category.toLowerCase()}`}>{t.category}</span>
                  <span className="task-due">🕐 {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Writing for this scholarship */}
      <div className="workspace-section-title mt-3">
        <PenTool size={15} /> Writing for this application
      </div>
      <div className="workspace-docs">
        {linkedDocs.length === 0 ? (
          <div className="workspace-doc-empty">
            <div className="workspace-doc-art" aria-hidden="true">
              <img src={getFieldHero(studentProfile.fieldCategory, 500)} alt="" />
              <div className="workspace-doc-art-fade" />
            </div>
            <div>
              <h3>Your story hasn't been written yet</h3>
              <p>Open Writing Studio with this scholarship pre-filled. Tell the AI your raw thoughts — let it shape your essay around <em>your</em> voice.</p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
              >
                <PenTool size={14} /> Start in Writing Studio
              </button>
            </div>
          </div>
        ) : (
          <div className="workspace-doc-grid">
            {linkedDocs.map(d => (
              <button
                key={d.id}
                className="workspace-doc-card"
                onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
              >
                <div className="workspace-doc-icon">📝</div>
                <div className="workspace-doc-info">
                  <div className="workspace-doc-title">{d.title || d.writingType}</div>
                  <div className="workspace-doc-meta">
                    <span className="badge">{d.status}</span>
                    <span className="badge badge-rose">{d.writingType}</span>
                  </div>
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Retro prompt for rejected applications */}
      {showRetroPrompt && (
        <div className="retro-prompt mt-3">
          <Heart size={18} />
          <div className="retro-prompt-body">
            <h3>This one didn't land. That's information, not a verdict.</h3>
            <p>
              Take three minutes to write down what happened. Future-you will thank present-you.
              We'll use this to make your next applications stronger.
            </p>
            <button className="btn btn-primary mt-2" onClick={() => setRetroOpen(true)}>
              <Sparkles size={14} /> Write a quick retrospective
            </button>
          </div>
        </div>
      )}

      {retro && (
        <div className="workspace-section-title mt-3">
          <Heart size={15} /> Your retrospective
        </div>
      )}
      {retro && (
        <div className="retro-saved">
          {retro.feedbackReceived && (
            <div className="retro-block">
              <span className="retro-label">Feedback received</span>
              <p>{retro.feedbackReceived}</p>
            </div>
          )}
          {retro.whatYouWouldChange && (
            <div className="retro-block">
              <span className="retro-label">What you'd change next time</span>
              <p>{retro.whatYouWouldChange}</p>
            </div>
          )}
          {retro.emotionalNote && (
            <div className="retro-block retro-emotional">
              <span className="retro-label">For you</span>
              <p>{retro.emotionalNote}</p>
            </div>
          )}
        </div>
      )}

      {/* Status changer — small bar at the bottom */}
      <div className="workspace-status-bar mt-3">
        <span className="workspace-status-label">Application status:</span>
        {(['Not Started', 'In Progress', 'Submitted', 'Accepted', 'Rejected'] as const).map(s => (
          <button
            key={s}
            className={`status-btn ${scholarship.status === s ? 'active' : ''}`}
            onClick={() => updateScholarshipStatus(scholarship.id, s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Coach */}
      <div className="workspace-coach mt-3">
        <AlertCircle size={16} />
        <div>
          <strong>Why this matters.</strong> Students who keep one focused workspace per scholarship
          submit 8 days earlier on average and apply to <strong>3× more programs</strong> over a year.
          One pillar at a time, every day, beats a frantic week before deadline.
        </div>
      </div>

      {retroOpen && (
        <RetroModal
          scholarshipId={scholarship.id}
          scholarshipName={scholarship.name}
          onSave={(data) => {
            addRetrospective({
              id: generateId(),
              scholarshipId: scholarship.id,
              createdAt: new Date().toISOString(),
              ...data,
            });
            setRetroOpen(false);
          }}
          onClose={() => setRetroOpen(false)}
        />
      )}
    </div>
      </div>
    </>
  );
}

function RetroModal({ scholarshipId, scholarshipName, onSave, onClose }: {
  scholarshipId: string;
  scholarshipName: string;
  onSave: (data: { feedbackReceived: string; whatYouWouldChange: string; emotionalNote: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    feedbackReceived: '',
    whatYouWouldChange: '',
    emotionalNote: '',
  });
  void scholarshipId;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Retrospective · {scholarshipName}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-form">
          <p className="retro-modal-intro">
            Three honest answers. No one else will see this. This is how you turn a "no" into the
            foundation of your next "yes."
          </p>
          <div className="form-field">
            <label>Did you get any feedback? Even guessed?</label>
            <VoiceInput value={form.feedbackReceived} onChange={v => setForm(f => ({ ...f, feedbackReceived: v }))} compact />
            <textarea
              rows={3}
              value={form.feedbackReceived}
              onChange={e => setForm(f => ({ ...f, feedbackReceived: e.target.value }))}
              placeholder='e.g. "They said my SOP was generic." or "No feedback, but my IELTS was 0.5 below their cutoff."'
            />
          </div>
          <div className="form-field">
            <label>What would you change about your application?</label>
            <VoiceInput value={form.whatYouWouldChange} onChange={v => setForm(f => ({ ...f, whatYouWouldChange: v }))} compact />
            <textarea
              rows={3}
              value={form.whatYouWouldChange}
              onChange={e => setForm(f => ({ ...f, whatYouWouldChange: e.target.value }))}
              placeholder='e.g. "Asked Prof X earlier. Rewrote the opening paragraph. Cut the cliché about leadership."'
            />
          </div>
          <div className="form-field">
            <label>For you — what do you want to remember? (skip if nothing)</label>
            <VoiceInput value={form.emotionalNote} onChange={v => setForm(f => ({ ...f, emotionalNote: v }))} compact />
            <textarea
              rows={2}
              value={form.emotionalNote}
              onChange={e => setForm(f => ({ ...f, emotionalNote: e.target.value }))}
              placeholder='Permission to feel disappointed for a day, then keep moving. You’re not your application.'
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSave(form)}
            >
              Save retrospective
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadinessRing({ total, tone }: { total: number; tone: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (total / 100) * circumference;

  return (
    <svg className={`readiness-ring tone-${tone}`} width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="readiness-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C97F89" />
          <stop offset="100%" stopColor="#C9A66B" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={radius} className="ring-bg" />
      <circle
        cx="64" cy="64" r={radius}
        className="ring-fg"
        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
      />
      <text x="64" y="62" className="ring-number">{total}</text>
      <text x="64" y="84" className="ring-suffix">/100</text>
    </svg>
  );
}

function PillarCard({ pillar }: { pillar: PillarScore }) {
  const navigate = useNavigate();
  const pct = pillar.score / pillar.max;
  return (
    <div className={`pillar-card tone-${pillar.tone}`}>
      <div className="pillar-card-top">
        <div className="pillar-card-label">{pillar.label}</div>
        <div className="pillar-card-score">
          <span className="pillar-card-score-val">{pillar.score}</span>
          <span className="pillar-card-score-max">/ {pillar.max}</span>
        </div>
      </div>
      <div className="pillar-bar-wrap">
        <div className="pillar-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="pillar-card-note">{pillar.note}</div>
      <div className="pillar-card-action">
        <Sparkles size={11} /> {pillar.action}
      </div>
      {pillar.cta && (
        <button className="pillar-card-cta" onClick={() => navigate(pillar.cta!.to)}>
          {pillar.cta.label} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}
