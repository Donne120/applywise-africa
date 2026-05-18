import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, ExternalLink, Calendar, PenTool, ChevronRight,
  Sparkles, Heart, ChevronLeft, CheckCircle2,
} from 'lucide-react';
import VoiceInput from './VoiceInput';
import { useApp } from '../context/AppContext';
import { computeReadiness, toneLabel } from '../utils/readiness';
import { formatDeadline, generateId } from '../utils/helpers';
import type { Scholarship } from '../types';

/**
 * Mobile-only workspace: horizontal snap sections (Overview → Tasks → Writing → Status → Reflection).
 * Progress bar + dots at the top. Desktop layout is rendered separately and unaffected.
 */

const SECTIONS = ['Overview', 'Tasks', 'Writing', 'Status', 'Reflect'] as const;

const COUNTRY_IMAGES: Record<string, string> = {
  GB: 'photo-1526129318478-62ed807ebdf9', US: 'photo-1498243691581-b145c3f54a5a',
  CA: 'photo-1503614472-8c93d56e92ce',    DE: 'photo-1467269204594-9661b134dd2b',
  FR: 'photo-1502602898657-3e91760cbb34', AU: 'photo-1523482580672-f109ba8cb9be',
  NL: 'photo-1512470876302-972faa2aa9a4', CH: 'photo-1530122037265-a5f1f91d3b99',
};
const FALLBACK_IMG = 'photo-1523240795612-9a054b0db644';
const heroImg = (code: string) =>
  `https://images.unsplash.com/${COUNTRY_IMAGES[code] || FALLBACK_IMG}?auto=format&fit=crop&w=900&q=75`;

export default function MobileWorkspace({ scholarship }: { scholarship: Scholarship }) {
  const navigate = useNavigate();
  const {
    tasks, writingDocuments, studentProfile, updateTask,
    stories, recommenders, updateScholarshipStatus, addRetrospective, retrospectives,
  } = useApp();

  const readiness = useMemo(
    () => computeReadiness(scholarship, studentProfile, tasks, writingDocuments, stories, recommenders),
    [scholarship, studentProfile, tasks, writingDocuments, stories, recommenders],
  );

  const linkedTasks = tasks.filter(t => t.scholarshipId === scholarship.id);
  const linkedDocs = writingDocuments.filter(
    d => d.linkedScholarshipId === scholarship.id || d.scholarshipName === scholarship.name,
  );
  const retro = retrospectives.find(r => r.scholarshipId === scholarship.id);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [section, setSection] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setSection(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function goto(i: number) {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  const completed = linkedTasks.filter(t => t.status === 'Completed').length;
  const taskPct = linkedTasks.length ? Math.round((completed / linkedTasks.length) * 100) : 0;

  return (
    <div className="mws">
      <button className="mws-back" onClick={() => navigate('/applications')}>
        <ArrowLeft size={14} /> All applications
      </button>

      {/* Section header strip */}
      <div className="mws-stepper">
        {SECTIONS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`mws-step ${i === section ? 'active' : ''} ${i < section ? 'done' : ''}`}
            onClick={() => goto(i)}
          >
            <span className="mws-step-dot">{i < section ? <CheckCircle2 size={10} /> : i + 1}</span>
            <span className="mws-step-label">{label}</span>
          </button>
        ))}
      </div>
      <div className="mws-progress">
        <div className="mws-progress-fill" style={{ width: `${((section + 1) / SECTIONS.length) * 100}%` }} />
      </div>

      <div className="mws-scroller" ref={scrollRef}>
        {/* ── Overview ─────────────────────────────────── */}
        <section className="mws-section">
          <div className="mws-hero">
            <img className="mws-hero-img" src={heroImg(scholarship.countryCode)} alt="" loading="lazy" />
            <div className="mws-hero-fade" />
            <div className="mws-hero-body">
              <div className="mws-hero-eyebrow">
                <MapPin size={11} /> {scholarship.institution} · {scholarship.country}
              </div>
              <h1 className="mws-hero-title">{scholarship.name}</h1>
              <div className="mws-hero-meta">
                <span className={`status-pill status-${scholarship.status.toLowerCase().replace(/ /g, '-')}`}>
                  {scholarship.status}
                </span>
                {scholarship.isPastDue
                  ? <span className="days-badge past-due">Past due</span>
                  : scholarship.daysLeft !== null && (
                      <span className={`days-badge ${scholarship.daysLeft <= 30 ? 'urgent' : scholarship.daysLeft <= 90 ? 'warning' : 'ok'}`}>
                        <Calendar size={10} /> {scholarship.daysLeft}d
                      </span>
                    )}
              </div>
            </div>
          </div>

          <div className="mws-readiness">
            <div className={`mws-readiness-ring tone-${readiness.tone}`}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" className="mws-ring-bg" />
                <circle
                  cx="40" cy="40" r="32"
                  className="mws-ring-fg"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - readiness.total / 100)}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <div className="mws-ring-num">{readiness.total}</div>
            </div>
            <div className="mws-readiness-body">
              <div className="mws-readiness-tone">{toneLabel(readiness.tone)}</div>
              <div className="mws-readiness-headline">{readiness.headline}</div>
            </div>
          </div>

          <div className="mws-deadline-card">
            <Calendar size={14} />
            <span>{formatDeadline(scholarship.deadline)}</span>
          </div>

          <div className="mws-quick-actions">
            {scholarship.url && (
              <a href={scholarship.url} target="_blank" rel="noreferrer" className="btn btn-secondary mws-action-btn">
                <ExternalLink size={14} /> Visit program
              </a>
            )}
            <button
              className="btn btn-primary mws-action-btn"
              onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
            >
              <PenTool size={14} /> Write for this
            </button>
          </div>

          <button className="mws-next" onClick={() => goto(1)}>
            See your tasks <ChevronRight size={14} />
          </button>
        </section>

        {/* ── Tasks ────────────────────────────────────── */}
        <section className="mws-section">
          <div className="mws-section-title">Tasks</div>
          {linkedTasks.length === 0 ? (
            <div className="mws-empty">
              <div className="mws-empty-emoji">🌷</div>
              <p>No tasks yet. Break the requirements into small actions so nothing slips.</p>
              <button className="btn btn-primary mt-2" onClick={() => navigate('/tasks')}>Add tasks</button>
            </div>
          ) : (
            <>
              <div className="mws-task-progress">
                <div className="mws-task-progress-label">{completed} / {linkedTasks.length} done · {taskPct}%</div>
                <div className="mws-task-progress-bar"><div style={{ width: `${taskPct}%` }} /></div>
              </div>
              {linkedTasks.map(t => (
                <div key={t.id} className={`mws-task ${t.status === 'Completed' ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className={`mws-task-check ${t.status === 'Completed' ? 'checked' : ''}`}
                    onClick={() => updateTask(t.id, t.status === 'Completed' ? 'Pending' : 'Completed')}
                    aria-label={t.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {t.status === 'Completed' && <CheckCircle2 size={14} />}
                  </button>
                  <div className="mws-task-body">
                    <div className="mws-task-title">{t.title}</div>
                    <div className="mws-task-meta">
                      <span className={`cat-badge cat-${t.category.toLowerCase()}`}>{t.category}</span>
                      <span className="mws-task-due">{new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          <button className="mws-next" onClick={() => goto(2)}>
            Next: Writing <ChevronRight size={14} />
          </button>
        </section>

        {/* ── Writing ──────────────────────────────────── */}
        <section className="mws-section">
          <div className="mws-section-title">Writing for this application</div>
          {linkedDocs.length === 0 ? (
            <div className="mws-empty">
              <div className="mws-empty-emoji">📝</div>
              <p>Your story hasn't been written yet. Open Writing Studio with this scholarship pre-filled.</p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
              >
                <PenTool size={14} /> Start in Writing Studio
              </button>
            </div>
          ) : (
            linkedDocs.map(d => (
              <button
                key={d.id}
                className="mws-doc"
                onClick={() => navigate(`/writing?scholarship=${scholarship.id}`)}
              >
                <div className="mws-doc-icon">📝</div>
                <div className="mws-doc-body">
                  <div className="mws-doc-title">{d.title || d.writingType}</div>
                  <div className="mws-doc-meta">
                    <span className="badge">{d.status}</span>
                    <span className="badge badge-rose">{d.writingType}</span>
                  </div>
                </div>
                <ChevronRight size={16} />
              </button>
            ))
          )}
          <button className="mws-next" onClick={() => goto(3)}>
            Next: Status <ChevronRight size={14} />
          </button>
        </section>

        {/* ── Status ───────────────────────────────────── */}
        <section className="mws-section">
          <div className="mws-section-title">Where is this application?</div>
          <div className="mws-status-grid">
            {(['Not Started', 'In Progress', 'Submitted', 'Accepted', 'Rejected'] as const).map(s => (
              <button
                key={s}
                className={`mws-status-btn ${scholarship.status === s ? 'active' : ''}`}
                onClick={() => updateScholarshipStatus(scholarship.id, s)}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mws-status-hint">
            Tap a status to update. Submitted apps stop showing in your daily focus.
          </p>
          <button className="mws-next" onClick={() => goto(4)}>
            Next: Reflect <ChevronRight size={14} />
          </button>
        </section>

        {/* ── Reflect ──────────────────────────────────── */}
        <section className="mws-section">
          <div className="mws-section-title">Reflection</div>
          {scholarship.status === 'Rejected' && !retro && (
            <RetroBlock
              onSave={(data) => {
                addRetrospective({
                  id: generateId(),
                  scholarshipId: scholarship.id,
                  createdAt: new Date().toISOString(),
                  ...data,
                });
              }}
            />
          )}
          {retro && (
            <>
              {retro.feedbackReceived && (
                <div className="mws-retro-block">
                  <span className="mws-retro-label">Feedback received</span>
                  <p>{retro.feedbackReceived}</p>
                </div>
              )}
              {retro.whatYouWouldChange && (
                <div className="mws-retro-block">
                  <span className="mws-retro-label">What you'd change</span>
                  <p>{retro.whatYouWouldChange}</p>
                </div>
              )}
              {retro.emotionalNote && (
                <div className="mws-retro-block emotional">
                  <span className="mws-retro-label">For you</span>
                  <p>{retro.emotionalNote}</p>
                </div>
              )}
            </>
          )}
          {scholarship.status !== 'Rejected' && !retro && (
            <div className="mws-empty">
              <div className="mws-empty-emoji">🌸</div>
              <p>Reflections unlock once an application closes. Until then — keep showing up.</p>
            </div>
          )}
          <div className="mws-coach">
            <Sparkles size={14} />
            <span>One pillar a day beats a frantic week before deadline.</span>
          </div>
          <button className="mws-next" onClick={() => goto(0)}>
            <ChevronLeft size={14} /> Back to overview
          </button>
        </section>
      </div>
    </div>
  );
}

function RetroBlock({
  onSave,
}: {
  onSave: (data: { feedbackReceived: string; whatYouWouldChange: string; emotionalNote: string }) => void;
}) {
  const [form, setForm] = useState({ feedbackReceived: '', whatYouWouldChange: '', emotionalNote: '' });
  return (
    <div className="mws-retro-form">
      <div className="mws-retro-intro">
        <Heart size={14} />
        <span>Three honest answers. No one else sees this.</span>
      </div>
      <div className="form-field">
        <label>Any feedback (real or guessed)?</label>
        <VoiceInput value={form.feedbackReceived} onChange={v => setForm(f => ({ ...f, feedbackReceived: v }))} compact />
        <textarea rows={3} value={form.feedbackReceived} onChange={e => setForm(f => ({ ...f, feedbackReceived: e.target.value }))} />
      </div>
      <div className="form-field">
        <label>What would you change?</label>
        <VoiceInput value={form.whatYouWouldChange} onChange={v => setForm(f => ({ ...f, whatYouWouldChange: v }))} compact />
        <textarea rows={3} value={form.whatYouWouldChange} onChange={e => setForm(f => ({ ...f, whatYouWouldChange: e.target.value }))} />
      </div>
      <div className="form-field">
        <label>For you — what to remember?</label>
        <VoiceInput value={form.emotionalNote} onChange={v => setForm(f => ({ ...f, emotionalNote: v }))} compact />
        <textarea rows={2} value={form.emotionalNote} onChange={e => setForm(f => ({ ...f, emotionalNote: e.target.value }))} />
      </div>
      <button className="btn btn-primary" onClick={() => onSave(form)}>
        Save retrospective
      </button>
    </div>
  );
}
