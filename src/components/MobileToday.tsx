import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, Clock, ChevronRight, GraduationCap, PenTool, CheckSquare,
  Sparkles, Search, AlertCircle, Sprout, BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDeadline } from '../utils/helpers';
import { FIELD_GREETING } from '../utils/fieldAssets';

/**
 * Mobile-only "Today" feed.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │ Streak ring · Countdown hero│  gamified glance
 *   ├─────────────────────────────┤
 *   │ Focus cards (horizontal)    │  swipe through actions
 *   ├─────────────────────────────┤
 *   │ Discover strip (horizontal) │  3 scholarships
 *   ├─────────────────────────────┤
 *   │ At-a-glance stat tiles      │  taps deep-link
 *   └─────────────────────────────┘
 */

const STREAK_KEY = 'udonpass-streak-v1';

function loadStreak(): { count: number; lastDay: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, lastDay: '' };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function useStreak(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const s = loadStreak();
    const today = todayKey();
    if (s.lastDay === today) { setCount(s.count); return; }
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    const next = { count: s.lastDay === yKey ? s.count + 1 : 1, lastDay: today };
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setCount(next.count);
  }, []);
  return count;
}

/** Live countdown that re-renders every minute. */
function useNow(): number {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return Date.now();
}

function formatCountdown(deadlineISO: string, now: number): { value: string; unit: string; urgent: boolean } {
  const ms = new Date(deadlineISO).getTime() - now;
  if (ms <= 0) return { value: 'Past', unit: 'due', urgent: true };
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 2) return { value: String(days), unit: days === 1 ? 'day' : 'days', urgent: days <= 14 };
  if (hours >= 2) return { value: String(hours), unit: 'hours', urgent: true };
  return { value: String(mins), unit: 'min', urgent: true };
}

export default function MobileToday() {
  const { studentProfile, scholarships, tasks, writingDocuments, resources } = useApp();
  const navigate = useNavigate();
  const streak = useStreak();
  const now = useNow();
  const firstName = (studentProfile.fullName || '').split(' ')[0] || 'there';

  const upcoming = useMemo(
    () => [...scholarships]
      .filter(s => !s.isPastDue && s.daysLeft !== null && s.status !== 'Submitted' && s.status !== 'Accepted')
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))[0],
    [scholarships],
  );

  const countdown = upcoming ? formatCountdown(upcoming.deadline, now) : null;

  // Build "focus cards" — one action per card, swipe-snap horizontally.
  const cards = useMemo(() => {
    type Card = {
      id: string;
      kind: 'deadline' | 'task' | 'draft' | 'profile' | 'discover' | 'grow';
      title: string;
      sub: string;
      cta: string;
      to: string;
      urgent?: boolean;
      icon: React.ReactNode;
    };
    const out: Card[] = [];

    if (upcoming) {
      out.push({
        id: `deadline-${upcoming.id}`,
        kind: 'deadline',
        title: upcoming.name,
        sub: `${upcoming.institution} · ${formatDeadline(upcoming.deadline)}`,
        cta: 'Open workspace',
        to: `/applications/${upcoming.id}`,
        urgent: (upcoming.daysLeft ?? 99) <= 14,
        icon: <GraduationCap size={18} />,
      });
    }

    const pending = tasks.filter(t => t.status !== 'Completed');
    if (pending.length > 0) {
      out.push({
        id: 'tasks',
        kind: 'task',
        title: `${pending.length} task${pending.length === 1 ? '' : 's'} on your plate`,
        sub: pending[0].title,
        cta: 'See tasks',
        to: '/tasks',
        icon: <CheckSquare size={18} />,
      });
    }

    const drafts = writingDocuments.filter(d => d.status === 'Draft' || d.status === 'Generated');
    if (drafts.length > 0) {
      out.push({
        id: 'drafts',
        kind: 'draft',
        title: `Finish your ${drafts[0].writingType.toLowerCase()}`,
        sub: drafts[0].title,
        cta: 'Open Writing Studio',
        to: '/writing',
        icon: <PenTool size={18} />,
      });
    }

    if (studentProfile.onboardingComplete && !studentProfile.careerGoals) {
      out.push({
        id: 'profile',
        kind: 'profile',
        title: 'Tell us your career goal',
        sub: 'A clear "why" makes every essay 3× stronger.',
        cta: 'Add to profile',
        to: '/profile',
        icon: <Sparkles size={18} />,
      });
    }

    const growing = resources.filter(r => r.status !== 'Completed');
    if (growing.length > 0) {
      out.push({
        id: 'grow',
        kind: 'grow',
        title: 'Keep growing',
        sub: growing[0].title,
        cta: 'Open Grow',
        to: '/grow',
        icon: <Sprout size={18} />,
      });
    }

    if (out.length === 0) {
      out.push({
        id: 'discover',
        kind: 'discover',
        title: 'Find scholarships that fit you',
        sub: FIELD_GREETING[studentProfile.fieldCategory],
        cta: 'Discover',
        to: '/discover',
        icon: <Search size={18} />,
      });
    }
    return out;
  }, [upcoming, tasks, writingDocuments, studentProfile, resources]);

  // Discover strip: top 3 not-yet-tracked-as-urgent scholarships
  const discover = useMemo(
    () => [...scholarships]
      .filter(s => !s.isPastDue && s.status !== 'Submitted' && s.status !== 'Accepted')
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
      .slice(0, 6),
    [scholarships],
  );

  // Track which focus card is centered for the dot-indicator
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeCard, setActiveCard] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth - 32));
      setActiveCard(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Streak ring math (out of 7-day goal)
  const ringPct = Math.min(1, streak / 7);
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;
  const submitted = scholarships.filter(s => s.status === 'Submitted' || s.status === 'Accepted').length;

  return (
    <div className="page mtoday">
      {/* Hero: streak ring + countdown */}
      <div className="mtoday-hero">
        <div className="mtoday-greet">
          <div className="mtoday-greet-eyebrow">Good {timeOfDay()}</div>
          <div className="mtoday-greet-name">{firstName}</div>
        </div>

        <div className="mtoday-hero-stats">
          <div className="mtoday-streak" aria-label={`${streak}-day streak`}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={ringR} className="mtoday-streak-track" />
              <circle
                cx="32" cy="32" r={ringR}
                className="mtoday-streak-fill"
                strokeDasharray={ringC}
                strokeDashoffset={ringC * (1 - ringPct)}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="mtoday-streak-inner">
              <Flame size={14} />
              <span>{streak}</span>
            </div>
          </div>

          <div className={`mtoday-countdown ${countdown?.urgent ? 'urgent' : ''}`}>
            <div className="mtoday-countdown-label">
              <Clock size={12} /> {upcoming ? 'Next deadline' : 'No deadlines yet'}
            </div>
            {countdown ? (
              <>
                <div className="mtoday-countdown-num">
                  <span className="mtoday-countdown-val">{countdown.value}</span>
                  <span className="mtoday-countdown-unit">{countdown.unit}</span>
                </div>
                <div className="mtoday-countdown-name">{upcoming!.name}</div>
              </>
            ) : (
              <div className="mtoday-countdown-empty">Add a scholarship to start the clock</div>
            )}
          </div>
        </div>
      </div>

      {/* Focus cards — horizontal snap scroll */}
      <div className="mtoday-section-head">
        <span>Your focus</span>
        <span className="mtoday-section-sub">{cards.length} {cards.length === 1 ? 'thing' : 'things'}</span>
      </div>

      <div className="mtoday-focus-scroller" ref={scrollRef}>
        {cards.map(c => (
          <button
            key={c.id}
            type="button"
            className={`mtoday-focus-card kind-${c.kind} ${c.urgent ? 'urgent' : ''}`}
            onClick={() => navigate(c.to)}
          >
            <div className="mtoday-focus-icon">{c.icon}</div>
            <div className="mtoday-focus-title">{c.title}</div>
            <div className="mtoday-focus-sub">{c.sub}</div>
            <div className="mtoday-focus-cta">
              {c.cta} <ChevronRight size={14} />
            </div>
          </button>
        ))}
      </div>
      {cards.length > 1 && (
        <div className="mtoday-dots" aria-hidden="true">
          {cards.map((_, i) => (
            <span key={i} className={i === activeCard ? 'active' : ''} />
          ))}
        </div>
      )}

      {/* Discover strip */}
      {discover.length > 0 && (
        <>
          <div className="mtoday-section-head">
            <span>Discover</span>
            <button className="mtoday-section-link" onClick={() => navigate('/discover')}>
              See all <ChevronRight size={12} />
            </button>
          </div>
          <div className="mtoday-discover-scroller">
            {discover.map(s => (
              <button
                key={s.id}
                type="button"
                className="mtoday-discover-card"
                onClick={() => navigate(`/applications/${s.id}`)}
              >
                <div className="mtoday-discover-badge">{s.daysLeft ?? '—'}d</div>
                <div className="mtoday-discover-name">{s.name}</div>
                <div className="mtoday-discover-inst">{s.institution}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Glance stats */}
      <div className="mtoday-section-head">
        <span>At a glance</span>
      </div>
      <div className="mtoday-glance">
        <button className="mtoday-glance-tile" onClick={() => navigate('/applications')}>
          <GraduationCap size={16} />
          <div className="mtoday-glance-val">{scholarships.length}</div>
          <div className="mtoday-glance-lbl">Tracked</div>
        </button>
        <button className="mtoday-glance-tile" onClick={() => navigate('/applications')}>
          <Sparkles size={16} />
          <div className="mtoday-glance-val">{submitted}</div>
          <div className="mtoday-glance-lbl">Submitted</div>
        </button>
        <button className="mtoday-glance-tile" onClick={() => navigate('/writing')}>
          <PenTool size={16} />
          <div className="mtoday-glance-val">{writingDocuments.length}</div>
          <div className="mtoday-glance-lbl">Drafts</div>
        </button>
        <button className="mtoday-glance-tile" onClick={() => navigate('/grow')}>
          <BookOpen size={16} />
          <div className="mtoday-glance-val">{resources.filter(r => r.status !== 'Completed').length}</div>
          <div className="mtoday-glance-lbl">Learning</div>
        </button>
      </div>

      <div className="mtoday-coach">
        <AlertCircle size={14} />
        <span>Showing up daily is the cheat code. 3× more apps, submitted a week earlier.</span>
      </div>
    </div>
  );
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
