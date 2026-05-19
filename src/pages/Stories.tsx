import { useState, useMemo } from 'react';
import {
  Plus, BookHeart, Sparkles, Trash2, Edit3, X, Heart, Calendar, Tag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Story, StoryTheme } from '../types';
import { generateId } from '../utils/helpers';
import { getFieldHero } from '../utils/fieldAssets';
import VoiceInput from '../components/VoiceInput';

const THEMES: StoryTheme[] = [
  'Resilience', 'Leadership', 'Curiosity', 'Service',
  'Failure & growth', 'Identity & culture', 'Loss', 'Breakthrough',
  'Family', 'Community impact', 'Creative', 'Other',
];

const PROMPTS = [
  '"A moment my view of the world cracked open…"',
  '"The first time I led without permission…"',
  '"Something I failed at that taught me more than success…"',
  '"A person who shaped me without realizing it…"',
  '"A thing about where I come from that strangers misunderstand…"',
  '"The smallest decision that ended up changing everything…"',
];

export default function Stories() {
  const { stories, addStory, updateStory, deleteStory, studentProfile } = useApp();
  const [editing, setEditing] = useState<Story | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filterTheme, setFilterTheme] = useState<StoryTheme | 'All'>('All');

  const filtered = useMemo(() =>
    filterTheme === 'All' ? stories : stories.filter(s => s.themes.includes(filterTheme as StoryTheme)),
    [stories, filterTheme]
  );

  const themeCounts = useMemo(() => {
    const map = new Map<StoryTheme, number>();
    stories.forEach(s => s.themes.forEach(t => map.set(t, (map.get(t) ?? 0) + 1)));
    return map;
  }, [stories]);

  return (
    <div className="page stories-page">
      <div className="mobile-hero-banner mobile-hero-story" aria-hidden="true">
        <img src="/story-hero.png" alt="" />
        <div className="mobile-hero-banner-fade" />
      </div>
      {/* Hero */}
      <div className="stories-hero">
        <div className="stories-hero-text">
          <div className="stories-hero-eyebrow"><BookHeart size={13} /> Your Story Vault</div>
          <h1 className="stories-hero-title">
            The same <em>true</em> stories power every essay you'll ever write.
          </h1>
          <p className="stories-hero-sub">
            Admissions consultants charge $3,000 to do this manually. Capture your raw stories once —
            the village trip, the failure, the breakthrough, the loss — and our AI will draw from them
            for every Statement of Purpose, motivation letter, or scholarship essay.
          </p>
          <button className="btn btn-primary mt-2" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Capture a story
          </button>
        </div>
        <div className="stories-hero-art" aria-hidden="true">
          <img src={getFieldHero(studentProfile.fieldCategory, 700)} alt="" loading="lazy" />
          <div className="stories-hero-art-fade" />
        </div>
      </div>

      {/* Stats / themes filter */}
      <div className="stories-meta-row">
        <div className="stories-stat">
          <span className="stories-stat-val">{stories.length}</span>
          <span className="stories-stat-label">{stories.length === 1 ? 'story' : 'stories'} captured</span>
        </div>
        <div className="stories-stat">
          <span className="stories-stat-val">{themeCounts.size}</span>
          <span className="stories-stat-label">{themeCounts.size === 1 ? 'theme' : 'themes'} covered</span>
        </div>
        <div className="stories-stat">
          <span className="stories-stat-val">∞</span>
          <span className="stories-stat-label">essays this fuels</span>
        </div>
      </div>

      {stories.length > 0 && (
        <div className="filter-bar">
          <button
            className={`filter-pill ${filterTheme === 'All' ? 'active' : ''}`}
            onClick={() => setFilterTheme('All')}
          >
            All ({stories.length})
          </button>
          {THEMES.filter(t => themeCounts.has(t)).map(t => (
            <button
              key={t}
              className={`filter-pill ${filterTheme === t ? 'active' : ''}`}
              onClick={() => setFilterTheme(t)}
            >
              {t} ({themeCounts.get(t)})
            </button>
          ))}
        </div>
      )}

      {/* Stories or empty state */}
      {stories.length === 0 ? (
        <div className="stories-empty">
          <div className="stories-empty-icon">
            <BookHeart size={36} />
          </div>
          <h2>Begin where every great essay begins.</h2>
          <p>
            One memory, told plainly. Don't try to write well — just <em>tell what happened</em>.
            Your essays will be better than 90% of applicants because they'll be specifically, undeniably,{' '}
            <strong>yours</strong>.
          </p>
          <div className="story-prompts">
            <div className="story-prompts-title">Try one of these to start:</div>
            {PROMPTS.slice(0, 4).map((p, i) => (
              <div key={i} className="story-prompt">{p}</div>
            ))}
          </div>
          <button className="btn btn-primary mt-2" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Start my first story
          </button>
        </div>
      ) : (
        <div className="stories-grid">
          {filtered.map(s => (
            <StoryCard
              key={s.id}
              story={s}
              onEdit={() => setEditing(s)}
              onDelete={() => {
                if (confirm(`Delete "${s.title}"? This can't be undone.`)) deleteStory(s.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Coach */}
      {stories.length > 0 && stories.length < 5 && (
        <div className="stories-coach mt-3">
          <Sparkles size={16} />
          <div>
            <strong>You're {5 - stories.length} stor{5 - stories.length === 1 ? 'y' : 'ies'} away from a complete vault.</strong>
            {' '}5+ stories across 3+ themes gives the AI enough material to write any essay in your voice.
          </div>
        </div>
      )}

      {(showNew || editing) && (
        <StoryEditor
          story={editing}
          onSave={(data) => {
            if (editing) {
              updateStory(editing.id, data);
              setEditing(null);
            } else {
              addStory({
                id: generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...data,
              } as Story);
              setShowNew(false);
            }
          }}
          onClose={() => { setEditing(null); setShowNew(false); }}
        />
      )}
    </div>
  );
}

function StoryCard({ story, onEdit, onDelete }: { story: Story; onEdit: () => void; onDelete: () => void }) {
  const emotionColors = ['', '🤍', '💛', '💗', '💜', '🤎'];
  const preview = story.body.split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 200);

  return (
    <div className="story-card">
      <div className="story-card-top">
        <h3 className="story-card-title">{story.title}</h3>
        <div className="story-card-emotion" title={`Emotional weight: ${story.emotion}/5`}>
          {emotionColors[story.emotion]}
        </div>
      </div>
      {story.whenItHappened && (
        <div className="story-card-when">
          <Calendar size={11} /> {story.whenItHappened}
        </div>
      )}
      <p className="story-card-body">{preview}{story.body.length > 200 ? '…' : ''}</p>
      {story.whyItMatters && (
        <div className="story-card-lesson">
          <Heart size={11} /> {story.whyItMatters}
        </div>
      )}
      <div className="story-card-themes">
        {story.themes.map(t => (
          <span key={t} className="badge badge-rose"><Tag size={9} /> {t}</span>
        ))}
      </div>
      <div className="story-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Edit3 size={12} /> Edit
        </button>
        <button className="aw-delete-btn" onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StoryEditor({ story, onSave, onClose }: {
  story: Story | null;
  onSave: (data: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> & { updatedAt?: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: story?.title ?? '',
    body: story?.body ?? '',
    themes: story?.themes ?? [] as StoryTheme[],
    emotion: story?.emotion ?? 3,
    whenItHappened: story?.whenItHappened ?? '',
    whyItMatters: story?.whyItMatters ?? '',
  });

  const toggleTheme = (t: StoryTheme) => {
    setForm(f => ({
      ...f,
      themes: f.themes.includes(t) ? f.themes.filter(x => x !== t) : [...f.themes, t],
    }));
  };

  const canSave = form.title.trim().length > 0 && form.body.trim().length > 20;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal story-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{story ? 'Edit story' : 'Capture a story'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-form">
          <div className="form-field">
            <label>Title — short, evocative</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder='e.g. "The night Papa lost the harvest"'
            />
          </div>

          <div className="form-field">
            <label>Tell what happened — plainly, like to a friend</label>
            <VoiceInput value={form.body} onChange={v => setForm(f => ({ ...f, body: v }))} />
            <textarea
              rows={8}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Don't try to sound impressive. Just write what actually happened — or tap 'Speak' and say it out loud."
            />
            <div className="story-counter">{form.body.trim().split(/\s+/).filter(Boolean).length} words</div>
          </div>

          <div className="form-row two-col">
            <div className="form-field">
              <label>When did it happen?</label>
              <input
                value={form.whenItHappened}
                onChange={e => setForm(f => ({ ...f, whenItHappened: e.target.value }))}
                placeholder='e.g. "Form 4, 2018"'
              />
            </div>
            <div className="form-field">
              <label>Emotional weight (1 = light, 5 = heavy)</label>
              <div className="emotion-picker">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`emotion-dot ${form.emotion === n ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, emotion: n }))}
                    aria-label={`Weight ${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-field">
            <label>
              Why it matters — one line. The lesson, the shift, the truth it left behind.
              <VoiceInput value={form.whyItMatters} onChange={v => setForm(f => ({ ...f, whyItMatters: v }))} compact />
            </label>
            <input
              value={form.whyItMatters}
              onChange={e => setForm(f => ({ ...f, whyItMatters: e.target.value }))}
              placeholder='e.g. "I learned that pride is sometimes just fear in a nicer shirt."'
            />
          </div>

          <div className="form-field">
            <label>Themes — pick all that apply</label>
            <div className="field-grid">
              {THEMES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`field-chip ${form.themes.includes(t) ? 'active' : ''}`}
                  onClick={() => toggleTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSave}
              onClick={() => onSave({ ...form, updatedAt: new Date().toISOString() })}
            >
              {story ? 'Save changes' : 'Save story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
