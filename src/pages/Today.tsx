import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, AlertCircle, PenTool, GraduationCap,
  Search, BookOpen, CheckSquare, Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDeadline } from '../utils/helpers';
import { getFieldHero, FIELD_GREETING } from '../utils/fieldAssets';

export default function Today() {
  const { studentProfile, scholarships, tasks, writingDocuments, resources } = useApp();
  const navigate = useNavigate();

  const firstName = studentProfile.fullName.split(' ')[0] || 'there';

  // Surface the 3 most important actions across the whole platform.
  const actions = useMemo(() => {
    const list: { id: string; title: string; sub: string; cta: string; to: string; tone: 'urgent' | 'normal' | 'good'; icon: React.ReactNode }[] = [];

    // 1. Most-urgent scholarship deadline
    const upcoming = [...scholarships]
      .filter(s => !s.isPastDue && s.daysLeft !== null && s.status !== 'Submitted' && s.status !== 'Accepted')
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))[0];
    if (upcoming) {
      list.push({
        id: 'deadline',
        title: `${upcoming.name} closes in ${upcoming.daysLeft} days`,
        sub: `${upcoming.institution} · ${formatDeadline(upcoming.deadline)}`,
        cta: 'Open workspace',
        to: `/applications/${upcoming.id}`,
        tone: (upcoming.daysLeft ?? 99) <= 14 ? 'urgent' : 'normal',
        icon: <GraduationCap size={16} />,
      });
    }

    // 2. Pending tasks
    const pending = tasks.filter(t => t.status !== 'Completed');
    if (pending.length > 0) {
      list.push({
        id: 'tasks',
        title: `${pending.length} task${pending.length === 1 ? '' : 's'} waiting on you`,
        sub: pending[0].title + (pending.length > 1 ? ` · +${pending.length - 1} more` : ''),
        cta: 'See tasks',
        to: '/tasks',
        tone: 'normal',
        icon: <CheckSquare size={16} />,
      });
    }

    // 3. Drafts in progress
    const drafts = writingDocuments.filter(d => d.status === 'Draft' || d.status === 'Generated');
    if (drafts.length > 0) {
      list.push({
        id: 'drafts',
        title: `Continue your ${drafts[0].writingType.toLowerCase()}`,
        sub: drafts[0].title,
        cta: 'Open Writing Studio',
        to: '/writing',
        tone: 'normal',
        icon: <PenTool size={16} />,
      });
    }

    // 4. Onboarding nudge if profile incomplete (academic story bits)
    if (studentProfile.onboardingComplete && !studentProfile.careerGoals) {
      list.push({
        id: 'profile',
        title: 'Tell us your career goal',
        sub: 'A clear "why" makes every essay 3× stronger.',
        cta: 'Add to profile',
        to: '/profile',
        tone: 'good',
        icon: <Sparkles size={16} />,
      });
    }

    // 5. Fallback: explore
    if (list.length === 0) {
      list.push({
        id: 'discover',
        title: 'Start by finding scholarships that fit you',
        sub: `${FIELD_GREETING[studentProfile.fieldCategory]} — let's discover where you belong.`,
        cta: 'Discover',
        to: '/discover',
        tone: 'good',
        icon: <Search size={16} />,
      });
    }

    return list.slice(0, 3);
  }, [scholarships, tasks, writingDocuments, studentProfile]);

  const stats = {
    apps: scholarships.length,
    submitted: scholarships.filter(s => s.status === 'Submitted' || s.status === 'Accepted').length,
    drafts: writingDocuments.length,
    learning: resources.filter(r => r.status !== 'Completed').length,
  };

  return (
    <div className="page today-page">
      {/* Hero */}
      <div className="today-hero">
        <div className="today-hero-text">
          <div className="today-hero-eyebrow">
            <Sparkles size={13} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="today-hero-title">
            Good {timeOfDay()}, <em>{firstName}</em>.
          </h1>
          <p className="today-hero-sub">
            {FIELD_GREETING[studentProfile.fieldCategory]}.
            {' '}Here's what matters most today — focused, not overwhelming.
          </p>
        </div>
        <div className="today-hero-art" aria-hidden="true">
          <img src={getFieldHero(studentProfile.fieldCategory, 800)} alt="" loading="lazy" />
          <div className="today-hero-art-fade" />
        </div>
      </div>

      {/* Actions */}
      <div className="today-section-title">
        <Calendar size={16} /> Your focus today
      </div>
      <div className="today-actions">
        {actions.map(a => (
          <button
            key={a.id}
            type="button"
            className={`today-action tone-${a.tone}`}
            onClick={() => navigate(a.to)}
          >
            <div className="today-action-icon">{a.icon}</div>
            <div className="today-action-body">
              <div className="today-action-title">{a.title}</div>
              <div className="today-action-sub">{a.sub}</div>
            </div>
            <div className="today-action-cta">
              {a.cta} <ArrowRight size={14} />
            </div>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="today-section-title mt-3">At a glance</div>
      <div className="today-stats">
        <div className="today-stat-card" onClick={() => navigate('/applications')}>
          <GraduationCap size={18} className="today-stat-icon" />
          <div className="today-stat-val">{stats.apps}</div>
          <div className="today-stat-label">Applications tracked</div>
        </div>
        <div className="today-stat-card" onClick={() => navigate('/applications')}>
          <Sparkles size={18} className="today-stat-icon" />
          <div className="today-stat-val">{stats.submitted}</div>
          <div className="today-stat-label">Submitted</div>
        </div>
        <div className="today-stat-card" onClick={() => navigate('/writing')}>
          <PenTool size={18} className="today-stat-icon" />
          <div className="today-stat-val">{stats.drafts}</div>
          <div className="today-stat-label">Writing drafts</div>
        </div>
        <div className="today-stat-card" onClick={() => navigate('/grow')}>
          <BookOpen size={18} className="today-stat-icon" />
          <div className="today-stat-val">{stats.learning}</div>
          <div className="today-stat-label">Learning in progress</div>
        </div>
      </div>

      {/* Why a tracker — coachmark */}
      <div className="today-coach">
        <AlertCircle size={16} />
        <div>
          <strong>Why track all this?</strong> Students who manage scholarships in one place apply to{' '}
          <strong>3× more programs</strong> and submit a week earlier than those juggling spreadsheets.
          Showing up daily is the cheat code.
        </div>
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
