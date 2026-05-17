import { useState } from 'react';
import {
  Users, Plus, Mail, Sparkles, Trash2, Edit3, X, Copy, Check,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Recommender, RecommenderStatus, RecommenderRelation } from '../types';
import { generateId } from '../utils/helpers';
import { getFieldHero } from '../utils/fieldAssets';
import VoiceInput from '../components/VoiceInput';
import UpgradeModal from '../components/UpgradeModal';
import { generateRecommenderLetter } from '../services/gemini';

const STATUSES: RecommenderStatus[] = ['Not asked', 'Asked', 'Agreed', 'Drafted', 'Submitted', 'Declined'];
const RELATIONS: RecommenderRelation[] = [
  'Professor', 'Supervisor / Manager', 'Mentor', 'Coach',
  'Employer', 'Religious / Community leader', 'Other',
];

export default function Recommenders() {
  const {
    recommenders, addRecommender, updateRecommender, deleteRecommender,
    scholarships, studentProfile, stories,
  } = useApp();
  const [editing, setEditing] = useState<Recommender | null>(null);
  const [showNew, setShowNew] = useState(false);

  const stats = {
    total: recommenders.length,
    agreed: recommenders.filter(r => r.status === 'Agreed' || r.status === 'Drafted' || r.status === 'Submitted').length,
    submitted: recommenders.filter(r => r.status === 'Submitted').length,
  };

  return (
    <div className="page recommenders-page">
      {/* Hero */}
      <div className="recommenders-hero">
        <div className="recommenders-hero-text">
          <div className="recommenders-hero-eyebrow"><Users size={13} /> Letters of recommendation</div>
          <h1 className="recommenders-hero-title">
            The people who'll <em>vouch</em> for you — managed in one place.
          </h1>
          <p className="recommenders-hero-sub">
            More scholarships fail from missing or weak recommendation letters than from weak essays.
            Track every recommender. Draft the letter <em>for them</em>. Send gentle nudges before deadlines.
          </p>
          <button className="btn btn-primary mt-2" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Add a recommender
          </button>
        </div>
        <div className="recommenders-hero-art" aria-hidden="true">
          <img src={getFieldHero(studentProfile.fieldCategory, 700)} alt="" loading="lazy" />
          <div className="recommenders-hero-art-fade" />
        </div>
      </div>

      {/* Stats */}
      <div className="recommenders-stats">
        <div className="rec-stat">
          <span className="rec-stat-val">{stats.total}</span>
          <span className="rec-stat-label">Total recommenders</span>
        </div>
        <div className="rec-stat">
          <span className="rec-stat-val">{stats.agreed}</span>
          <span className="rec-stat-label">Agreed to help</span>
        </div>
        <div className="rec-stat">
          <span className="rec-stat-val">{stats.submitted}</span>
          <span className="rec-stat-label">Letters submitted</span>
        </div>
      </div>

      {recommenders.length === 0 ? (
        <div className="recommenders-empty">
          <div className="recommenders-empty-art" aria-hidden="true">
            <Users size={48} />
          </div>
          <h2>Start with people who already believe in you.</h2>
          <p>
            Add 3–5 potential recommenders now, even if you haven't asked them yet.
            We'll help you write the ask, draft the letter, and follow up.
          </p>
          <button className="btn btn-primary mt-2" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Add your first recommender
          </button>
        </div>
      ) : (
        <div className="recommenders-list">
          {recommenders.map(r => (
            <RecommenderCard
              key={r.id}
              recommender={r}
              scholarships={scholarships}
              onEdit={() => setEditing(r)}
              onStatusChange={(s) => updateRecommender(r.id, { status: s })}
              onDelete={() => {
                if (confirm(`Remove ${r.name}? This won't unsend any emails.`)) deleteRecommender(r.id);
              }}
            />
          ))}
        </div>
      )}

      <div className="recommenders-tip mt-3">
        <AlertCircle size={16} />
        <div>
          <strong>The 6-week rule.</strong> Ask recommenders <strong>at least 6 weeks before</strong> any
          deadline. They're busy, they'll miss yours, and a rushed letter helps no one. Plan backward.
        </div>
      </div>

      {(showNew || editing) && (
        <RecommenderEditor
          recommender={editing}
          scholarships={scholarships}
          studentName={studentProfile.fullName}
          studentProfile={studentProfile}
          stories={stories}
          onSave={(data) => {
            if (editing) {
              updateRecommender(editing.id, data);
              setEditing(null);
            } else {
              addRecommender({
                id: generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastNudgedAt: '',
                ...data,
              } as Recommender);
              setShowNew(false);
            }
          }}
          onClose={() => { setEditing(null); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function RecommenderCard({ recommender: r, scholarships, onEdit, onStatusChange, onDelete }: {
  recommender: Recommender;
  scholarships: ReturnType<typeof useApp>['scholarships'];
  onEdit: () => void;
  onStatusChange: (s: RecommenderStatus) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const linked = scholarships.filter(s => r.linkedScholarshipIds.includes(s.id));
  const initials = r.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const copyDraft = () => {
    if (!r.draftLetter) return;
    navigator.clipboard.writeText(r.draftLetter).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rec-card">
      <div className="rec-card-header">
        <div className="rec-avatar">{initials || '?'}</div>
        <div className="rec-card-info">
          <div className="rec-card-name">{r.name}</div>
          <div className="rec-card-sub">{r.relation} · {r.organization}</div>
          {r.yearsKnown > 0 && (
            <div className="rec-card-meta">Known for {r.yearsKnown} year{r.yearsKnown === 1 ? '' : 's'}</div>
          )}
        </div>
        <select
          className={`rec-status-select status-${r.status.toLowerCase().replace(/[ &/]/g, '-')}`}
          value={r.status}
          onChange={e => onStatusChange(e.target.value as RecommenderStatus)}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {linked.length > 0 && (
        <div className="rec-card-scholarships">
          <span className="rec-card-label">Vouching for:</span>
          {linked.map(s => (
            <span key={s.id} className="badge badge-rose">{s.countryCode} · {s.name}</span>
          ))}
        </div>
      )}

      {r.strengthsTheySawInYou && (
        <div className="rec-card-strengths">
          <div className="rec-card-label"><Sparkles size={11} /> What they saw in you</div>
          <p>{r.strengthsTheySawInYou}</p>
        </div>
      )}

      {r.draftLetter ? (
        <div className="rec-draft-block">
          <div className="rec-card-label">
            <Mail size={11} /> Draft letter (send to recommender for editing & signing)
          </div>
          <pre className="rec-draft-preview">{r.draftLetter.slice(0, 220)}{r.draftLetter.length > 220 ? '…' : ''}</pre>
          <button className="btn btn-secondary btn-sm" onClick={copyDraft}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy draft</>}
          </button>
        </div>
      ) : (
        <div className="rec-no-draft">
          No draft yet. Edit this recommender to add notes — we'll help draft a letter from them.
        </div>
      )}

      <div className="rec-card-actions">
        {r.email && (
          <a href={`mailto:${r.email}`} className="btn btn-secondary btn-sm">
            <Mail size={12} /> Email
          </a>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Edit3 size={12} /> Edit
        </button>
        <button className="aw-delete-btn" onClick={onDelete} title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function RecommenderEditor({ recommender, scholarships, studentName, studentProfile, stories, onSave, onClose }: {
  recommender: Recommender | null;
  scholarships: ReturnType<typeof useApp>['scholarships'];
  studentName: string;
  studentProfile: ReturnType<typeof useApp>['studentProfile'];
  stories: ReturnType<typeof useApp>['stories'];
  onSave: (data: Partial<Recommender>) => void;
  onClose: () => void;
}) {
  const { consumeLetter, lettersRemaining, lettersCapped } = useApp();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [form, setForm] = useState({
    name: recommender?.name ?? '',
    email: recommender?.email ?? '',
    relation: recommender?.relation ?? 'Professor' as RecommenderRelation,
    organization: recommender?.organization ?? '',
    yearsKnown: recommender?.yearsKnown ?? 1,
    strengthsTheySawInYou: recommender?.strengthsTheySawInYou ?? '',
    draftLetter: recommender?.draftLetter ?? '',
    status: recommender?.status ?? 'Not asked' as RecommenderStatus,
    linkedScholarshipIds: recommender?.linkedScholarshipIds ?? [] as string[],
    notes: recommender?.notes ?? '',
  });

  const toggleScholarship = (id: string) => {
    setForm(f => ({
      ...f,
      linkedScholarshipIds: f.linkedScholarshipIds.includes(id)
        ? f.linkedScholarshipIds.filter(x => x !== id)
        : [...f.linkedScholarshipIds, id],
    }));
  };

  // Fallback scaffold used if no API key is set or AI call fails.
  const buildOfflineScaffold = () => {
    const studentFirst = (studentName || 'this student').split(' ')[0];
    const strengths = form.strengthsTheySawInYou.trim() ||
      'their curiosity, persistence, and ability to elevate everyone around them';
    return `To the Selection Committee,

I am writing to recommend ${studentName || studentFirst} for your scholarship program — without reservation, and with genuine enthusiasm.

I have known ${studentFirst} for ${form.yearsKnown || 'several'} year${form.yearsKnown === 1 ? '' : 's'} in my capacity as their ${form.relation.toLowerCase()} at ${form.organization || '[organization]'}. In that time, what has stood out most is ${strengths}.

[Recommender: add one specific moment or project that illustrates the above. Concrete beats glowing every time.]

${studentFirst} brings a rare combination of intellect and humility. They do the work, they ask the hard questions, and they make the people around them better. I have watched them [recommender: add a brief sentence on a meaningful contribution or growth moment].

I recommend ${studentFirst} for your program in the strongest possible terms. They will repay the investment with seriousness and grace.

Sincerely,
[Your name]
[Your title], [Your organization]
[Your email] · [Your phone]
`;
  };

  const hasApiKey = !!(import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim()
    || !!(import.meta.env.VITE_OPENROUTER_KEY as string | undefined)?.trim();

  const generateDraft = async () => {
    setGenError('');
    // Plan-gating: AI-generated letters count against the monthly quota.
    // The offline scaffold is always free and doesn't consume.
    if (hasApiKey) {
      if (!consumeLetter()) {
        setUpgradeOpen(true);
        return;
      }
    }
    if (!hasApiKey) {
      // Offline: use scaffold so it still does something useful.
      setForm(f => ({ ...f, draftLetter: buildOfflineScaffold() }));
      return;
    }
    setGenerating(true);
    try {
      const linkedScholarship = scholarships.find(s => form.linkedScholarshipIds.includes(s.id));
      const scholarshipContext = linkedScholarship
        ? `${linkedScholarship.name} (${linkedScholarship.country}) — ${linkedScholarship.fundingType}, ${linkedScholarship.focusArea}`
        : undefined;
      const draft = await generateRecommenderLetter({
        recommender: {
          id: recommender?.id || '',
          name: form.name,
          email: form.email,
          relation: form.relation,
          organization: form.organization,
          yearsKnown: form.yearsKnown,
          strengthsTheySawInYou: form.strengthsTheySawInYou,
          draftLetter: '',
          status: form.status,
          linkedScholarshipIds: form.linkedScholarshipIds,
          lastNudgedAt: '',
          notes: form.notes,
          createdAt: '',
          updatedAt: '',
        },
        profile: studentProfile,
        stories,
        scholarshipContext,
      });
      setForm(f => ({ ...f, draftLetter: draft }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI draft failed.';
      setGenError(msg);
      // Still drop in a scaffold so the student isn't stuck.
      setForm(f => ({ ...f, draftLetter: buildOfflineScaffold() }));
    } finally {
      setGenerating(false);
    }
  };

  const canSave = form.name.trim().length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal recommender-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recommender ? 'Edit recommender' : 'Add a recommender'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-form">
          <div className="form-row two-col">
            <div className="form-field">
              <label>Name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Dr. Marie Uwase"
              />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="marie@university.rw"
              />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-field">
              <label>Relationship</label>
              <select value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value as RecommenderRelation }))}>
                {RELATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Organization</label>
              <input
                value={form.organization}
                onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                placeholder="e.g. African Leadership University"
              />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-field">
              <label>Years known</label>
              <input
                type="number"
                min={0}
                value={form.yearsKnown}
                onChange={e => setForm(f => ({ ...f, yearsKnown: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RecommenderStatus }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>What did they see in you? — notes only you would know</label>
            <VoiceInput value={form.strengthsTheySawInYou} onChange={v => setForm(f => ({ ...f, strengthsTheySawInYou: v }))} />
            <textarea
              rows={3}
              value={form.strengthsTheySawInYou}
              onChange={e => setForm(f => ({ ...f, strengthsTheySawInYou: e.target.value }))}
              placeholder='e.g. "Supervised my robotics project. Said my willingness to fail publicly was rare."'
            />
          </div>

          {scholarships.length > 0 && (
            <div className="form-field">
              <label>Which scholarships are they recommending you for?</label>
              <div className="field-grid">
                {scholarships.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`field-chip ${form.linkedScholarshipIds.includes(s.id) ? 'active' : ''}`}
                    onClick={() => toggleScholarship(s.id)}
                  >
                    {s.countryCode} · {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-field">
            <label>
              Draft letter
              {hasApiKey && lettersCapped && (
                <span className="aw-context-chip" style={{ marginLeft: 8 }}>
                  <Sparkles size={11} /> <strong>{lettersRemaining}</strong> AI letter{lettersRemaining === 1 ? '' : 's'} left this month
                </span>
              )}
              <button
                type="button"
                className="link-btn ml-auto"
                onClick={generateDraft}
                disabled={generating}
              >
                <Sparkles size={11} />
                {generating ? 'Drafting with AI…' : hasApiKey ? 'Generate with AI' : 'Generate starting scaffold'}
              </button>
            </label>
            <textarea
              rows={8}
              value={form.draftLetter}
              onChange={e => setForm(f => ({ ...f, draftLetter: e.target.value }))}
              placeholder="Click 'Generate' above, then edit. Send this to the recommender so they have a starting point — not the final letter."
            />
            {genError && (
              <div className="aw-error">
                <AlertCircle size={13} /> {genError}
              </div>
            )}
            <div className="form-hint">
              {hasApiKey
                ? 'The AI uses your profile, Story Vault, and the recommender\'s notes to draft a real letter — not a template. They edit it in their voice.'
                : 'No AI key configured — using offline scaffold. Add VITE_GEMINI_API_KEY to .env for AI-powered drafts.'}
            </div>
          </div>

          <div className="form-field">
            <label>Private notes</label>
            <VoiceInput value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} compact />
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything you want to remember about working with this person."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSave}
              onClick={() => onSave(form)}
            >
              {recommender ? 'Save changes' : 'Add recommender'}
            </button>
          </div>
        </div>
      </div>
      {upgradeOpen && <UpgradeModal reason="letter" onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}

