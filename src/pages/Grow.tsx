import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout, Target, ArrowRight, BookOpen, Sparkles, TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeReadiness } from '../utils/readiness';
import type { PillarScore } from '../utils/readiness';
import { getFieldHero } from '../utils/fieldAssets';
import Learning from './Learning';

interface Quest {
  id: string;
  title: string;
  why: string;                  // human, specific
  pillar: PillarScore['key'];
  scholarshipNames: string[];   // which apps it lifts
  potentialBoost: number;       // estimated points it can add to readiness
  resourceHint: string;         // one concrete first step
}

export default function Grow() {
  const {
    scholarships, studentProfile, tasks, writingDocuments,
    stories, recommenders, resources,
  } = useApp();
  const navigate = useNavigate();

  // Compute readiness for each scholarship, then find each app's weakest pillar.
  const quests = useMemo<Quest[]>(() => {
    const byPillar = new Map<string, Quest>();

    scholarships
      .filter(s => !s.isPastDue)
      .forEach(s => {
        const r = computeReadiness(s, studentProfile, tasks, writingDocuments, stories, recommenders);
        // The most gainful pillar = where the gap (max - score) is biggest.
        const sorted = [...r.pillars].sort((a, b) => (b.max - b.score) - (a.max - a.score));
        for (const weak of sorted.slice(0, 2)) {
          if (weak.max - weak.score < 3) continue; // skip near-full pillars
          const key = weak.key;
          const existing = byPillar.get(key);
          const boost = weak.max - weak.score;
          if (existing) {
            existing.scholarshipNames = Array.from(new Set([...existing.scholarshipNames, s.name]));
            existing.potentialBoost = Math.max(existing.potentialBoost, boost);
          } else {
            byPillar.set(key, makeQuest(key, weak, s.name));
          }
        }
      });

    return Array.from(byPillar.values()).sort((a, b) => b.potentialBoost - a.potentialBoost);
  }, [scholarships, studentProfile, tasks, writingDocuments, stories, recommenders]);

  const inProgress = resources.filter(r => r.status === 'In Progress').length;
  const completed = resources.filter(r => r.status === 'Completed').length;

  return (
    <div className="page grow-page">
      {/* Hero */}
      <div className="grow-hero">
        <div className="grow-hero-text">
          <div className="grow-hero-eyebrow"><Sprout size={13} /> Close your gaps</div>
          <h1 className="grow-hero-title">
            Grow into the candidate you <em>need</em> to be.
          </h1>
          <p className="grow-hero-sub">
            Your weakest pillar is your fastest gain. We've turned each one into a focused quest —
            do the work, watch your readiness scores rise across every application.
          </p>
          <div className="grow-hero-stats">
            <span><strong>{quests.length}</strong> active quests</span>
            <span><strong>{inProgress}</strong> in progress</span>
            <span><strong>{completed}</strong> completed</span>
          </div>
        </div>
        <div className="grow-hero-art" aria-hidden="true">
          <img src={getFieldHero(studentProfile.fieldCategory, 700)} alt="" loading="lazy" />
          <div className="grow-hero-art-fade" />
        </div>
      </div>

      {/* Quests */}
      {quests.length > 0 ? (
        <>
          <div className="grow-section-title">
            <Target size={15} /> Your gap-closing quests
          </div>
          <div className="grow-quests">
            {quests.map(q => (
              <QuestCard key={q.id} quest={q} onNav={navigate} />
            ))}
          </div>
        </>
      ) : scholarships.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🌱</div>
          <h3>Add scholarships first</h3>
          <p>Track at least one scholarship and we'll generate the exact gaps to close, ranked by impact.</p>
          <button className="btn btn-primary mt-2" onClick={() => navigate('/discover')}>
            Discover scholarships <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grow-all-strong">
          <Sparkles size={24} />
          <h3>Every pillar is strong across your applications.</h3>
          <p>Nothing urgent to chase — keep polishing what you have, and submit early.</p>
        </div>
      )}

      {/* Existing learning resources below the quests */}
      <div className="grow-section-title mt-4">
        <BookOpen size={15} /> All learning resources
      </div>
      <Learning />
    </div>
  );
}

function QuestCard({ quest, onNav }: { quest: Quest; onNav: (to: string) => void }) {
  return (
    <div className={`quest-card pillar-tone-${quest.pillar}`}>
      <div className="quest-card-top">
        <div className="quest-card-pillar">{pillarLabel(quest.pillar)}</div>
        <div className="quest-card-boost">
          <TrendingUp size={12} /> +{quest.potentialBoost} pts available
        </div>
      </div>
      <h3 className="quest-card-title">{quest.title}</h3>
      <p className="quest-card-why">{quest.why}</p>
      <div className="quest-card-apps">
        {quest.scholarshipNames.slice(0, 3).map(n => (
          <span key={n} className="badge">{n}</span>
        ))}
        {quest.scholarshipNames.length > 3 && (
          <span className="badge">+{quest.scholarshipNames.length - 3} more</span>
        )}
      </div>
      <div className="quest-card-hint">
        <Sparkles size={11} /> {quest.resourceHint}
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => onNav(routeForPillar(quest.pillar))}
      >
        Start this quest <ArrowRight size={12} />
      </button>
    </div>
  );
}

function pillarLabel(key: PillarScore['key']): string {
  return ({
    academics:    'Academics',
    english:      'English & tests',
    story:        'Your story',
    recommenders: 'Recommenders',
    documents:    'Tasks & docs',
    time:         'Time pressure',
  })[key];
}

function routeForPillar(key: PillarScore['key']): string {
  return ({
    academics:    '/grow#resources',
    english:      '/grow#resources',
    story:        '/stories',
    recommenders: '/recommenders',
    documents:    '/tasks',
    time:         '/applications',
  })[key];
}

function makeQuest(key: PillarScore['key'], weak: PillarScore, scholarshipName: string): Quest {
  const boost = weak.max - weak.score;
  switch (key) {
    case 'academics':
      return {
        id: `q-${key}`,
        title: 'Build proof of late academic bloom',
        why: 'Strong projects, verified courses, or a published piece can shift the academic narrative — even when your GPA can\'t change.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Pick one verified course from the catalog below. Commit to 6 weeks.',
      };
    case 'english':
      return {
        id: `q-${key}`,
        title: 'Lock in your English test score',
        why: 'Most programs gate on an official IELTS or TOEFL score. Plan it now; don\'t let it become a deadline blocker.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Book a test date 8–12 weeks out, then add daily prep to your calendar.',
      };
    case 'story':
      return {
        id: `q-${key}`,
        title: 'Build your Story Vault — 5 stories, 3 themes',
        why: 'Essays sound generic when they\'re built from nothing. Capture raw stories once; they\'ll power every essay you write.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Open the Story Vault and capture one story today. Just one. Three minutes.',
      };
    case 'recommenders':
      return {
        id: `q-${key}`,
        title: 'Line up your recommenders early',
        why: 'Weak or missing letters kill more applications than weak essays do. The fix is calendar arithmetic, not magic.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Add 3 potential recommenders. We\'ll draft the ask email and the letter for you.',
      };
    case 'documents':
      return {
        id: `q-${key}`,
        title: 'Break the requirements into small tasks',
        why: 'Big applications fail in the small details — a missing transcript, an unsigned form. Decompose now, sleep better later.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Pull each requirement into Tasks. Aim for tasks under 30 minutes each.',
      };
    case 'time':
      return {
        id: `q-${key}`,
        title: 'Re-plan your backwards calendar',
        why: 'Tight timelines compound: one slip on recommenders cascades into rushed essays. Move what can move; cut what can\'t.',
        pillar: key,
        scholarshipNames: [scholarshipName],
        potentialBoost: boost,
        resourceHint: 'Open the application workspace and ruthlessly defer non-essentials.',
      };
  }
}
