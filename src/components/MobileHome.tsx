import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDeadline } from '../utils/helpers';

/**
 * MobileHome — "The Coach" (mobile-redesign-v2 §5.2)
 *
 * Replaces the old widget-dashboard "Today" screen on mobile.
 *
 * Philosophy:
 *   - One greeting.
 *   - One status sentence built from real state.
 *   - One primary CTA.
 *   - At most two "Next up" hints.
 *   - No grids, no carousels, no streak chrome, no glance tiles.
 *
 * Status sentence priority (top wins):
 *   1. Most-urgent upcoming scholarship deadline
 *   2. Has scholarships but no stories yet
 *   3. Has scholarships + stories but no drafts
 *   4. Has scholarships + stories + drafts
 *   5. No scholarships yet (empty state)
 *   6. Everything done ("all caught up")
 */

type Hint = { id: string; label: string; to: string };

export default function MobileHome() {
  const { studentProfile, scholarships, stories, writingDocuments, tasks } = useApp();
  const navigate = useNavigate();

  const firstName = (studentProfile.fullName || '').split(' ')[0] || 'there';
  const greeting = `Good ${timeOfDay()}, ${firstName}.`;

  const active = useMemo(
    () => scholarships.filter(s => s.status !== 'Submitted' && s.status !== 'Accepted'),
    [scholarships],
  );

  const upcoming = useMemo(
    () => [...active]
      .filter(s => !s.isPastDue && s.daysLeft !== null)
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))[0],
    [active],
  );

  const pendingDrafts = writingDocuments.filter(d => d.status === 'Draft' || d.status === 'Generated');
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');

  const view = useMemo(() => {
    // Case 1 — has an upcoming deadline
    if (upcoming) {
      const status = buildDeadlineStatus(upcoming, stories.length, pendingDrafts.length);
      const hints: Hint[] = [];

      // When the user has stories but no drafts yet, writing is the real next move.
      // Promote it to the primary CTA; the scholarship workspace becomes a hint.
      const promoteWriting = stories.length > 0 && pendingDrafts.length === 0;

      if (pendingDrafts[0]) {
        hints.push({
          id: 'draft',
          label: `Finish your ${pendingDrafts[0].writingType.toLowerCase()}`,
          to: '/writing',
        });
      }
      if (promoteWriting) {
        hints.push({
          id: 'workspace',
          label: `Open ${upcoming.name} workspace`,
          to: `/applications/${upcoming.id}`,
        });
      }
      if (stories.length < 3) {
        hints.push({
          id: 'story',
          label: stories.length === 0
            ? 'Add your first story'
            : 'Add another story to sharpen the AI',
          to: '/stories',
        });
      } else if (pendingTasks[0]) {
        hints.push({
          id: 'task',
          label: pendingTasks[0].title,
          to: `/applications/${upcoming.id}`,
        });
      }
      return {
        headline: upcoming.name,
        status,
        cta: promoteWriting
          ? { label: 'Start writing', to: `/writing?scholarship=${upcoming.id}` }
          : { label: 'Open workspace', to: `/applications/${upcoming.id}` },
        hints: hints.slice(0, 2),
      };
    }

    // Case 5 — no scholarships at all
    if (active.length === 0) {
      return {
        headline: null,
        status: "You haven't picked a scholarship yet. Let's find one that fits.",
        cta: { label: 'Find scholarships', to: '/discover' },
        hints: stories.length === 0
          ? [{ id: 'story', label: 'Or add a story first', to: '/stories' }] as Hint[]
          : [] as Hint[],
      };
    }

    // Case 6 — scholarships exist but none have a live countdown (all submitted/past)
    return {
      headline: null,
      status: "You're all caught up. Sleep well, or start the next one.",
      cta: { label: 'Find scholarships', to: '/discover' },
      hints: [] as Hint[],
    };
  }, [upcoming, active, stories.length, pendingDrafts, pendingTasks]);

  return (
    <div className="page mhome">
      <div className="mhome-greet-row">
        <img src="/home-coach.png" alt="" className="mhome-coach-portrait" aria-hidden="true" />
        <div className="mhome-greet">{greeting}</div>
      </div>

      {view.headline && (
        <h1 className="mhome-headline">{view.headline}</h1>
      )}

      <p className="mhome-status">{view.status}</p>

      <button
        type="button"
        className="mhome-cta"
        onClick={() => navigate(view.cta.to)}
      >
        <span>{view.cta.label}</span>
        <ArrowRight size={18} />
      </button>

      {view.hints.length > 0 && (
        <>
          <div className="mhome-divider"><span>Next up</span></div>
          <ul className="mhome-hints">
            {view.hints.map(h => (
              <li key={h.id}>
                <button
                  type="button"
                  className="mhome-hint"
                  onClick={() => navigate(h.to)}
                >
                  <span>{h.label}</span>
                  <ChevronRight size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

type UpcomingShape = {
  name: string;
  daysLeft: number | null;
  institution: string;
  deadline: string;
};

function buildDeadlineStatus(s: UpcomingShape, storyCount: number, draftCount: number): string {
  const days = s.daysLeft;
  const when = days === null
    ? formatDeadline(s.deadline)
    : days <= 0
      ? 'closes today'
      : days === 1
        ? 'closes tomorrow'
        : `closes in ${days} days`;

  const parts: string[] = [`${when}.`];
  if (draftCount > 0 && storyCount > 0) {
    parts.push(`You have ${draftCount === 1 ? 'one draft' : `${draftCount} drafts`} and ${storyCount === 1 ? 'one story' : `${storyCount} stories`} ready.`);
  } else if (draftCount > 0) {
    parts.push(`You have ${draftCount === 1 ? 'one draft' : `${draftCount} drafts`} in progress.`);
  } else if (storyCount > 0) {
    parts.push(`You have ${storyCount === 1 ? 'one story' : `${storyCount} stories`} ready to draw from.`);
  } else {
    parts.push('Start by adding a story — the AI will use it to write your essays.');
  }
  return parts.join(' ');
}
