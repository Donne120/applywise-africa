import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, BookHeart, Users, Sprout, Mic, Globe2,
  GraduationCap, Heart, Check, Crown, Zap, Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReveal } from '../utils/useReveal';
import MobileFirstOpen from '../components/MobileFirstOpen';

const FIRST_OPEN_KEY = 'udonpass-mobile-first-open-seen-v1';

// ── Hero imagery ──────────────────────────────────────────────────────
// Rich, specific African / world-campus photography. All Unsplash, hot-linked.
const HERO_IMAGES = [
  // Africa first (we lead with home), then the world
  'photo-1547471080-7cc2caa01a7e',     // young African student smiling
  'photo-1571260899304-425eee4c7efc',  // Kigali / Rwanda hills
  'photo-1518998053901-5348d3961a04',  // African student writing
  'photo-1526129318478-62ed807ebdf9',  // Oxford UK
  'photo-1498243691581-b145c3f54a5a',  // US campus
  'photo-1467269204594-9661b134dd2b',  // Germany
];

const UNSPLASH = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export default function Landing() {
  const navigate = useNavigate();
  const { configured: authConfigured, user } = useAuth();

  // Primary CTA: if auth is configured, route to /signin so the user creates
  // a real account. Otherwise drop straight into onboarding for local-only mode.
  /**
   * Universal CTA router for every "Begin / Sign in / Choose a plan" button
   * on the landing page. Mental model:
   *
   *   signed-in user  →  go straight to `next` (no friction)
   *   signed-out user, auth configured  →  /signin?next=...  (creates real account)
   *   signed-out user, auth NOT configured  →  go straight to `next` (local-only mode)
   *
   * This is what guarantees every plan a user picks (free or paid) is tied to
   * a real account they can come back to from any device.
   */
  const routeTo = (next: string) => {
    if (user || !authConfigured) {
      navigate(next);
    } else {
      navigate(`/signin?next=${encodeURIComponent(next)}`);
    }
  };

  // Generic CTA: "Begin", "Sign in", header CTA. Lands the user on /today.
  const begin = () => routeTo('/today');

  // "See it work first" — quick preview without signing in. Lands directly in the app.
  const skipToApp = () => {
    navigate('/today');
  };

  // Plan CTAs: every plan (free or paid) signs the user in first if needed,
  // then sends them to either /today (free) or /checkout (paid).
  const choosePlan = (plan: 'free' | 'starter' | 'pro' | 'founder', period: 'monthly' | 'yearly' | 'one-time') => {
    if (plan === 'free') {
      routeTo('/today');
      return;
    }
    routeTo(`/checkout?plan=${plan}&period=${period}`);
  };

  const [firstOpenSeen, setFirstOpenSeen] = useState<boolean>(() => {
    // ?first=1 force-shows the welcome (useful for review/QA)
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('first') === '1') {
      try { localStorage.removeItem(FIRST_OPEN_KEY); } catch { /* ignore */ }
      return false;
    }
    try { return localStorage.getItem(FIRST_OPEN_KEY) === '1'; } catch { return false; }
  });
  const dismissFirstOpen = () => {
    try { localStorage.setItem(FIRST_OPEN_KEY, '1'); } catch { /* ignore */ }
    setFirstOpenSeen(true);
    begin();
  };

  return (
    <div className="landing">
      {!firstOpenSeen && (
        <div className="landing-first-open-mobile">
          <MobileFirstOpen onBegin={dismissFirstOpen} />
        </div>
      )}
      <Topbar onBegin={begin} />
      <Hero onBegin={begin} onPeek={skipToApp} />
      <NumbersStrip />
      <MomentOne />
      <MomentTwo />
      <MomentThree />
      <MomentFour />
      <MomentFive />
      <Pricing onChoosePlan={choosePlan} />
      <ClosingCta onBegin={begin} />
      <LandingFooter />
    </div>
  );
}

// ── Topbar (sticky, light) ────────────────────────────────────────────
function Topbar({ onBegin }: { onBegin: () => void }) {
  const navigate = useNavigate();
  const { configured: authConfigured } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`landing-topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="landing-topbar-inner">
        <div className="landing-brand">
          <span className="brand-icon">🎓</span>
          <span className="landing-brand-name">ApplyWise Africa</span>
        </div>
        <div className="landing-topbar-actions">
          <a href="#pricing" className="landing-topbar-link">Pricing</a>
          {authConfigured && (
            <button className="landing-topbar-link" onClick={() => navigate('/signin')}>
              Sign in
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onBegin}>
            Begin — free <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
function Hero({ onBegin, onPeek }: { onBegin: () => void; onPeek: () => void }) {
  return (
    <section className="landing-hero">
      <div className="landing-hero-bg" aria-hidden="true">
        <div className="landing-hero-blur landing-hero-blur-rose" />
        <div className="landing-hero-blur landing-hero-blur-gold" />
      </div>
      <div className="landing-hero-inner">
        <div className="landing-hero-text">
          <div className="landing-hero-eyebrow">
            <Sparkles size={13} /> Built in Kigali · for African students
          </div>
          <h1 className="landing-hero-title">
            From <em>Africa</em>, to the world's universities.
          </h1>
          <p className="landing-hero-sub">
            The first scholarship platform that <strong>knows your story before you write a word</strong>.
            Tell us once. Watch it power every essay you write.
          </p>
          <div className="landing-hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onBegin}>
              Begin your journey — free <ArrowRight size={15} />
            </button>
            <button className="btn btn-ghost" onClick={onPeek}>
              See it work first ↓
            </button>
          </div>
          <div className="landing-hero-meta">
            <span className="landing-hero-tick"><Check size={11} /> Free forever for core features</span>
            <span className="landing-hero-tick"><Check size={11} /> No card required</span>
            <span className="landing-hero-tick"><Check size={11} /> Speak any language</span>
          </div>
        </div>

        <div className="landing-hero-art" aria-hidden="true">
          <ReadinessRingDemo />
        </div>
      </div>
    </section>
  );
}

// ── Numbers strip + honesty line ──────────────────────────────────────
function NumbersStrip() {
  const { ref, revealed } = useReveal<HTMLElement>();
  const stats = [
    { val: '6',   label: 'Readiness pillars' },
    { val: '11',  label: 'Field specialties' },
    { val: '50+', label: 'Scholarships tracked' },
    { val: '∞',   label: 'Stories captured' },
  ];
  return (
    <section ref={ref} className={`numbers-strip ${revealed ? 'revealed' : ''}`}>
      <div className="numbers-strip-inner">
        <div className="numbers-strip-grid">
          {stats.map(s => (
            <div key={s.label} className="numbers-stat">
              <div className="numbers-stat-val">{s.val}</div>
              <div className="numbers-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="numbers-honesty">
          Not a US edtech bolt-on. <strong>Built in Kigali, by Africans, for Africans</strong> applying to anywhere in the world.
        </p>
      </div>
    </section>
  );
}

// ── Animated readiness ring demo ──────────────────────────────────────
function ReadinessRingDemo() {
  const [score, setScore] = useState(32);
  const [pillarStep, setPillarStep] = useState(0);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setInterval>;
    t1 = setTimeout(() => {
      let cur = 32;
      t2 = setInterval(() => {
        cur += 2;
        setScore(cur);
        if (cur >= 78) {
          clearInterval(t2);
        }
      }, 60);
    }, 400);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, []);

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    [600, 1200, 1800, 2400, 3000, 3600].forEach((d, i) => {
      ts.push(setTimeout(() => setPillarStep(i + 1), d));
    });
    return () => ts.forEach(clearTimeout);
  }, []);

  const pillars = [
    { label: 'Academics',       score: 16, max: 20, tone: 'good',     action: 'Strengthen with one verified course this quarter.' },
    { label: 'English & tests', score: 13, max: 15, tone: 'good',     action: 'Book your IELTS within 6 weeks.' },
    { label: 'Your story',      score: 18, max: 25, tone: 'building', action: 'Capture 2 more stories for depth.' },
    { label: 'Recommenders',    score: 9,  max: 15, tone: 'building', action: 'Add 2 recommenders this week. Biggest gain.' },
    { label: 'Tasks & docs',    score: 13, max: 15, tone: 'good',     action: 'Verify transcripts are sealed.' },
    { label: 'Time',            score: 9,  max: 10, tone: 'good',     action: 'You have runway — use it well.' },
  ];
  const [hovered, setHovered] = useState<number | null>(null);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="hero-card hero-card-readiness">
      <div className="hero-card-eyebrow">YOUR READINESS — LIVE</div>
      <div className="hero-card-ring-row">
        <svg className="hero-ring" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="hero-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C97F89" />
              <stop offset="100%" stopColor="#C9A66B" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} className="hero-ring-bg" />
          <circle
            cx="80" cy="80" r={radius}
            className="hero-ring-fg"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />
          <text x="80" y="78" className="hero-ring-num">{score}</text>
          <text x="80" y="100" className="hero-ring-suffix">/ 100</text>
        </svg>
        <div className="hero-pillars">
          {pillars.map((p, i) => (
            <div
              key={p.label}
              className={`hero-pillar ${i < pillarStep ? 'lit' : ''} ${hovered === i ? 'hovered' : ''} tone-${p.tone}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="hero-pillar-label">{p.label}</span>
              <div className="hero-pillar-bar">
                <span
                  className="hero-pillar-fill"
                  style={{ width: i < pillarStep ? `${(p.score / p.max) * 100}%` : '0%' }}
                />
              </div>
              <span className="hero-pillar-score">{p.score}/{p.max}</span>
              {hovered === i && (
                <div className="hero-pillar-tip">
                  <Sparkles size={11} /> {p.action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="hero-card-footer">
        <Sparkles size={12} /> Honest gaps · exact actions · for every application
      </div>
    </div>
  );
}

// ── Moment 1: Personalization ─────────────────────────────────────────
function MomentOne() {
  const { ref, revealed } = useReveal<HTMLElement>();
  const [activeField, setActiveField] = useState(0);
  const fields = [
    { name: 'Music & Performance', img: 'photo-1493225457124-a3eb161ffa5f' },
    { name: 'Medicine & Health',   img: 'photo-1576091160550-2173dba999ef' },
    { name: 'STEM',                img: 'photo-1517180102446-f3ece451e9d8' },
    { name: 'Business',            img: 'photo-1573164713988-8665fc963095' },
    { name: 'Law',                 img: 'photo-1505664194779-8beaceb93744' },
  ];

  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => {
      setActiveField(f => (f + 1) % fields.length);
    }, 1800);
    return () => clearInterval(t);
  }, [revealed, fields.length]);

  return (
    <section ref={ref} className={`landing-moment ${revealed ? 'revealed' : ''}`}>
      <div className="landing-moment-inner">
        <div className="landing-moment-text">
          <div className="landing-moment-num">01</div>
          <h2>We start with <em>who you are</em>.</h2>
          <p>
            Music student in Yaoundé. Medical student in Kigali. Future engineer in Lagos.
            Your space looks like you — the photos, the words, the scholarships we surface,
            the writing voice. <strong>Because no two students are the same.</strong>
          </p>
          <ul className="landing-tick-list">
            <li><Check size={14} /> 11 field profiles, each with its own visual language</li>
            <li><Check size={14} /> Hero imagery shifts with your specialty</li>
            <li><Check size={14} /> Writing voice tailored to your degree level & country</li>
          </ul>
        </div>
        <div className="landing-moment-art">
          <div className="moment1-card">
            <div className="moment1-art-img">
              <img src={UNSPLASH(fields[activeField].img, 700)} alt="" />
              <div className="moment1-art-fade" />
              <div className="moment1-art-pill">{fields[activeField].name}</div>
            </div>
            <div className="moment1-chips">
              {fields.map((f, i) => (
                <span key={f.name} className={`field-chip ${i === activeField ? 'active' : ''}`}>
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Moment 2: Story Vault ─────────────────────────────────────────────
function MomentTwo() {
  const { ref, revealed } = useReveal<HTMLElement>();
  const fullStory = "Mama sold her last necklace the day my school fees were due. She didn't tell me until years later. That necklace was my grandmother's — and the weight of it has shaped every decision I've made since.";
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!revealed) return;
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setTyped(fullStory.slice(0, i));
      if (i >= fullStory.length) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [revealed]);

  const essayUses = [
    { type: 'Statement of Purpose', preview: '…that necklace taught me my education is never solely my own. It carries the weight of those who made it possible.' },
    { type: 'Scholarship Essay',    preview: '…I have not forgotten the cost of opportunity. I am applying because I owe a debt only contribution can repay.' },
    { type: 'Motivation Letter',    preview: '…where I come from, education is a household sacrifice. I would honor it with serious work.' },
  ];

  return (
    <section ref={ref} className={`landing-moment landing-moment-alt ${revealed ? 'revealed' : ''}`}>
      <div className="landing-moment-inner reverse">
        <div className="landing-moment-art">
          <div className="moment2-vault">
            <div className="moment2-vault-head">
              <BookHeart size={14} /> Your Story Vault
            </div>
            <div className="moment2-story">
              <div className="moment2-story-title">The night Mama sold her last necklace</div>
              <div className="moment2-story-when">Form 4 · 2018</div>
              <p className="moment2-story-body">{typed}<span className="moment2-cursor">|</span></p>
              <div className="moment2-themes">
                <span className="badge badge-rose">Family</span>
                <span className="badge badge-rose">Resilience</span>
                <span className="badge badge-rose">Identity</span>
              </div>
            </div>
            <div className="moment2-arrow">↓ powers ↓</div>
            <div className="moment2-essays">
              {essayUses.map((e, i) => (
                <div key={e.type} className="moment2-essay" style={{ animationDelay: `${1.4 + i * 0.4}s` }}>
                  <div className="moment2-essay-type">{e.type}</div>
                  <p className="moment2-essay-preview">{e.preview}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="landing-moment-text">
          <div className="landing-moment-num">02</div>
          <h2>Your stories — captured <em>once</em>, used <em>forever</em>.</h2>
          <p>
            Consultants charge $3,000 to do this manually. Tell us your stories one time —
            the necklace, the failed startup, the village trip — and every essay you write
            draws from them. <strong>Specific. Personal. Undeniably yours.</strong>
          </p>
          <ul className="landing-tick-list">
            <li><Check size={14} /> Voice or type — in English, French, or your mother tongue</li>
            <li><Check size={14} /> Tagged by theme: resilience, leadership, loss, identity</li>
            <li><Check size={14} /> Auto-injected into every AI writing prompt</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Moment 3: Honest score ────────────────────────────────────────────
function MomentThree() {
  const { ref, revealed } = useReveal<HTMLElement>();
  return (
    <section ref={ref} className={`landing-moment ${revealed ? 'revealed' : ''}`}>
      <div className="landing-moment-inner">
        <div className="landing-moment-text">
          <div className="landing-moment-num">03</div>
          <h2>An honest score. A clear path to <em>yes</em>.</h2>
          <p>
            For each scholarship, we compute a Readiness Score from your real profile, your
            real writing, your real recommenders. <strong>No vague encouragement.</strong>{' '}
            We tell you exactly which pillar moves the needle most — and the single action
            to take this week.
          </p>
          <ul className="landing-tick-list">
            <li><Check size={14} /> Six pillars: academics, English, story, recommenders, tasks, time</li>
            <li><Check size={14} /> Updates the moment anything changes</li>
            <li><Check size={14} /> Direct links to the action that closes the gap</li>
          </ul>
        </div>
        <div className="landing-moment-art">
          <div className="moment3-card">
            <div className="moment3-pillar tone-strong">
              <div className="moment3-pillar-row">
                <span>Academics</span>
                <span className="moment3-num">16/20</span>
              </div>
              <div className="moment3-bar"><span style={{ width: revealed ? '80%' : '0%', transitionDelay: '0.2s' }} /></div>
              <div className="moment3-note">Solid academic foundation. Pair it with a sharp story.</div>
            </div>
            <div className="moment3-pillar tone-building">
              <div className="moment3-pillar-row">
                <span>Your story</span>
                <span className="moment3-num">18/25</span>
              </div>
              <div className="moment3-bar"><span style={{ width: revealed ? '72%' : '0%', transitionDelay: '0.4s' }} /></div>
              <div className="moment3-note">Strong raw material. Time to shape it into an essay.</div>
            </div>
            <div className="moment3-pillar tone-low">
              <div className="moment3-pillar-row">
                <span>Recommenders</span>
                <span className="moment3-num">5/15</span>
              </div>
              <div className="moment3-bar"><span style={{ width: revealed ? '33%' : '0%', transitionDelay: '0.6s' }} /></div>
              <div className="moment3-note">⚡ Biggest gain available — add 2 recommenders this week.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Moment 4: Voice ───────────────────────────────────────────────────
function MomentFour() {
  const { ref, revealed } = useReveal<HTMLElement>();
  const lines = [
    'In Cameroon we say...',
    "Je veux étudier l'ingénierie...",
    'I want to study because...',
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), 2000);
    return () => clearInterval(t);
  }, [revealed, lines.length]);

  return (
    <section ref={ref} className={`landing-moment landing-moment-alt ${revealed ? 'revealed' : ''}`}>
      <div className="landing-moment-inner reverse">
        <div className="landing-moment-art">
          <div className="moment4-card">
            <div className="moment4-mic">
              <Mic size={28} />
              <span className="moment4-pulse" />
              <span className="moment4-pulse moment4-pulse-2" />
            </div>
            <div className="moment4-wave">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="moment4-bar" style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <div className="moment4-transcript">"{lines[idx]}"</div>
            <div className="moment4-langs">
              <span className="badge">English</span>
              <span className="badge">Français</span>
              <span className="badge">Mother tongue, mixed</span>
            </div>
          </div>
        </div>
        <div className="landing-moment-text">
          <div className="landing-moment-num">04</div>
          <h2>Type? Or just <em>speak</em>?</h2>
          <p>
            English isn't every African student's first thinking language. Tap the mic —
            speak in English, French, Pidgin, mixed. We do the writing.{' '}
            <strong>Don't let language stand between you and the scholarship you've earned.</strong>
          </p>
          <ul className="landing-tick-list">
            <li><Check size={14} /> Voice input on every text field</li>
            <li><Check size={14} /> Editable transcript — you stay in control</li>
            <li><Check size={14} /> Works on phones too</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Moment 5: Every door at once ──────────────────────────────────────
function MomentFive() {
  const { ref, revealed } = useReveal<HTMLElement>();
  const cards = [
    { name: 'Gates Cambridge',     country: 'UK',      flag: '🇬🇧', funding: 'Fully Funded' },
    { name: 'DAAD Scholarship',    country: 'Germany', flag: '🇩🇪', funding: 'Fully Funded' },
    { name: 'Chevening',           country: 'UK',      flag: '🇬🇧', funding: 'Fully Funded' },
    { name: 'MasterCard Foundation', country: 'Canada', flag: '🇨🇦', funding: 'Fully Funded' },
    { name: 'Fulbright',           country: 'USA',     flag: '🇺🇸', funding: 'Fully Funded' },
    { name: 'Australia Awards',    country: 'Australia', flag: '🇦🇺', funding: 'Fully Funded' },
  ];
  return (
    <section ref={ref} className={`landing-moment ${revealed ? 'revealed' : ''}`}>
      <div className="landing-moment-inner">
        <div className="landing-moment-text">
          <div className="landing-moment-num">05</div>
          <h2>Every door at once. <em>Open them all.</em></h2>
          <p>
            Students who track in one place apply to <strong>3× more programs</strong> and
            submit a week earlier than those juggling spreadsheets. Showing up daily is the
            cheat code — one dashboard, every deadline visible, every essay ready in time.
          </p>
          <ul className="landing-tick-list">
            <li><Check size={14} /> AI-powered scholarship discovery worldwide</li>
            <li><Check size={14} /> Track recommenders, drafts, tasks per application</li>
            <li><Check size={14} /> Rejection? We turn it into the foundation of your next yes.</li>
          </ul>
        </div>
        <div className="landing-moment-art">
          <div className="moment5-grid">
            {cards.map((c, i) => (
              <div key={c.name} className="moment5-card" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="moment5-flag">{c.flag}</div>
                <div className="moment5-info">
                  <div className="moment5-name">{c.name}</div>
                  <div className="moment5-meta">{c.country} · {c.funding}</div>
                </div>
                <div className="moment5-days">42d</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────
function Pricing({ onChoosePlan }: {
  onChoosePlan: (plan: 'free' | 'starter' | 'pro' | 'founder', period: 'monthly' | 'yearly' | 'one-time') => void;
}) {
  const { ref, revealed } = useReveal<HTMLElement>();
  const [yearly, setYearly] = useState(false);
  const period = yearly ? 'yearly' : 'monthly';

  return (
    <section id="pricing" ref={ref} className={`landing-pricing ${revealed ? 'revealed' : ''}`}>
      <div className="landing-pricing-inner">
        <div className="landing-pricing-head">
          <div className="landing-moment-num">PRICING</div>
          <h2>Pay <em>once you believe</em> — not before.</h2>
          <p className="landing-pricing-sub">
            Free forever for what matters most. When you're ready for unlimited essays and the moat
            features that consultants charge thousands for — we're <strong>cheaper than the cheapest
            consultant</strong>, by a long way.
          </p>

          <div className="pricing-toggle" role="tablist" aria-label="Billing period">
            <button
              type="button"
              role="tab"
              aria-selected={!yearly}
              className={`pricing-toggle-btn ${!yearly ? 'active' : ''}`}
              onClick={() => setYearly(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={yearly}
              className={`pricing-toggle-btn ${yearly ? 'active' : ''}`}
              onClick={() => setYearly(true)}
            >
              Yearly <span className="pricing-save-pill">Save 27%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Free */}
          <div
            className="plan-card plan-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => onChoosePlan('free', period)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoosePlan('free', period); } }}
          >
            <div className="plan-card-top">
              <div className="plan-card-name">Free</div>
              <div className="plan-card-price">
                <span className="plan-card-price-val">$0</span>
                <span className="plan-card-price-unit">forever</span>
              </div>
              <p className="plan-card-tagline">Everything you need to start serious.</p>
            </div>
            <ul className="plan-features">
              <li><Check size={13} /> Unlimited scholarships, tasks & deadlines</li>
              <li><Check size={13} /> Unlimited Story Vault — capture forever</li>
              <li><Check size={13} /> Voice input everywhere</li>
              <li><Check size={13} /> Readiness Score on every application</li>
              <li><Check size={13} /> <strong>1 AI-generated essay</strong></li>
              <li><Check size={13} /> <strong>1 AI recommender letter</strong></li>
            </ul>
            <button
              className="btn btn-secondary plan-cta"
              onClick={e => { e.stopPropagation(); onChoosePlan('free', period); }}
            >
              Begin — free
            </button>
          </div>

          {/* Starter */}
          <div
            className="plan-card plan-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => onChoosePlan('starter', period)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoosePlan('starter', period); } }}
          >
            <div className="plan-card-top">
              <div className="plan-card-name">Starter</div>
              <div className="plan-card-price">
                <span className="plan-card-price-val">${yearly ? '2.92' : '4'}</span>
                <span className="plan-card-price-unit">/ month</span>
              </div>
              {yearly && <div className="plan-card-billed">Billed $35 yearly</div>}
              <p className="plan-card-tagline">For one serious application season.</p>
            </div>
            <ul className="plan-features">
              <li className="plan-feature-from">Everything in Free, plus:</li>
              <li><Check size={13} /> <strong>5 AI essays / month</strong></li>
              <li><Check size={13} /> <strong>3 recommender drafts / month</strong></li>
              <li><Check size={13} /> Quality scoring on every essay</li>
              <li><Check size={13} /> Gap-closing quests on Grow</li>
              <li><Check size={13} /> Email deadline reminders</li>
            </ul>
            <button
              className="btn btn-secondary plan-cta"
              onClick={e => { e.stopPropagation(); onChoosePlan('starter', period); }}
            >
              Start with Starter
            </button>
          </div>

          {/* Pro — most popular */}
          <div
            className="plan-card plan-card-featured plan-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => onChoosePlan('pro', period)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoosePlan('pro', period); } }}
          >
            <div className="plan-card-badge">
              <Star size={11} fill="currentColor" /> Most popular
            </div>
            <div className="plan-card-top">
              <div className="plan-card-name">Pro</div>
              <div className="plan-card-price">
                <span className="plan-card-price-val">${yearly ? '6.58' : '9'}</span>
                <span className="plan-card-price-unit">/ month</span>
              </div>
              {yearly && <div className="plan-card-billed">Billed $79 yearly</div>}
              <p className="plan-card-tagline">For students applying to many programs.</p>
            </div>
            <ul className="plan-features">
              <li className="plan-feature-from">Everything in Starter, plus:</li>
              <li><Check size={13} /> <strong>Unlimited AI essays</strong></li>
              <li><Check size={13} /> <strong>Unlimited recommender drafts</strong></li>
              <li><Check size={13} /> AI Discover — deep scholarship research</li>
              <li><Check size={13} /> Multi-language essay generation</li>
              <li><Check size={13} /> Export to PDF / DOCX</li>
              <li><Check size={13} /> Rejection retrospective AI analysis</li>
              <li><Check size={13} /> Priority support (&lt; 24h)</li>
            </ul>
            <button
              className="btn btn-primary plan-cta"
              onClick={e => { e.stopPropagation(); onChoosePlan('pro', period); }}
            >
              <Zap size={14} /> Go Pro
            </button>
          </div>

          {/* Founder's Circle */}
          <div
            className="plan-card plan-card-founder plan-card-clickable"
            role="button"
            tabIndex={0}
            onClick={() => onChoosePlan('founder', 'one-time')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoosePlan('founder', 'one-time'); } }}
          >
            <div className="plan-card-badge plan-card-badge-gold">
              <Crown size={11} fill="currentColor" /> Limited — 50 spots
            </div>
            <div className="plan-card-top">
              <div className="plan-card-name">Founder's Circle</div>
              <div className="plan-card-price">
                <span className="plan-card-price-val">$179</span>
                <span className="plan-card-price-unit">once · forever</span>
              </div>
              <p className="plan-card-tagline">For believers. For builders.</p>
            </div>
            <ul className="plan-features">
              <li className="plan-feature-from">Everything in Pro, plus:</li>
              <li><Check size={13} /> <strong>Pro forever</strong> — no monthly fees, ever</li>
              <li><Check size={13} /> First access to every new feature</li>
              <li><Check size={13} /> Founder's Circle badge on your profile</li>
              <li><Check size={13} /> Direct line to the founders</li>
              <li><Check size={13} /> Help shape what we build next</li>
            </ul>
            <button
              className="btn plan-cta plan-cta-founder"
              onClick={e => { e.stopPropagation(); onChoosePlan('founder', 'one-time'); }}
            >
              <Crown size={14} /> Claim your spot
            </button>
          </div>
        </div>

        <div className="pricing-fineprint">
          <p>
            <Check size={11} /> No card required to start ·
            <Check size={11} /> Mobile Money supported (MTN, Orange, M-Pesa) ·
            <Check size={11} /> Cancel any time ·
            <Check size={11} /> Pay in your local currency
          </p>
          <p className="pricing-honest">
            Honest comparison: A single in-person scholarship consultant in Lagos or Nairobi charges
            <strong> $200–$500</strong> for one essay. Pro is <strong>under $80 a year</strong> for
            unlimited everything. Math doesn't lie.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────
function ClosingCta({ onBegin }: { onBegin: () => void }) {
  const { ref, revealed } = useReveal<HTMLElement>();
  return (
    <section ref={ref} className={`landing-cta ${revealed ? 'revealed' : ''}`}>
      <div className="landing-cta-card">
        <Heart size={28} className="landing-cta-heart" />
        <h2>Your story is already there.</h2>
        <p className="landing-cta-sub">We're just here to help you tell it — to every university in the world.</p>
        <button className="btn btn-primary btn-lg" onClick={onBegin}>
          Begin — free <ArrowRight size={15} />
        </button>
        <div className="landing-cta-meta">
          <span><Check size={11} /> Free forever for core features</span>
          <span><Check size={11} /> No card required</span>
          <span><Check size={11} /> Built in Africa, for Africa, for the world</span>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <span className="brand-icon sm">🎓</span>
          <span>ApplyWise Africa</span>
        </div>
        <p>From Africa <Globe2 size={12} /> to the world's universities.</p>
        <div className="landing-footer-row">
          <span><GraduationCap size={11} /> Scholarships</span>
          <span><BookHeart size={11} /> Story Vault</span>
          <span><Users size={11} /> Recommenders</span>
          <span><Sprout size={11} /> Grow</span>
        </div>
        <p className="landing-footer-fine">
          Built with care in Kigali · for every student between here and yes.
        </p>
      </div>
    </footer>
  );
}

// keep these as no-op references so tree-shakers / lint don't strip used icons
void HERO_IMAGES; // referenced via UNSPLASH() if we later add a gallery
