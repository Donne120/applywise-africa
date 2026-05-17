import { useState } from 'react';
import { Sparkles, SlidersHorizontal, BookmarkPlus, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId, calcDaysLeft } from '../utils/helpers';
import { isTavilyConfigured, tavilySearch } from '../services/tavily';
import { summarizeScholarshipSearch, type DiscoveredScholarship } from '../services/gemini';
import type { Scholarship } from '../types';

// Expanded option lists. Years go out to 2030; fields broad enough for any
// African student (STEM, Humanities, Arts, etc.) — Discover is the universal
// entry point, not the in-app "AI Systems Engineering" niche.
const FIELDS = [
  // STEM
  'Computer Science', 'AI & Machine Learning', 'Data Science', 'Software Engineering',
  'Cybersecurity', 'Robotics', 'Electrical Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Biotechnology',
  // Health
  'Medicine', 'Public Health', 'Pharmacy', 'Nursing', 'Dentistry',
  // Business / Social
  'Business Administration / MBA', 'Economics', 'Finance', 'Accounting',
  'International Relations', 'Political Science', 'Public Policy', 'Law',
  // Humanities / Arts
  'Education', 'Psychology', 'Sociology', 'Anthropology',
  'Literature & Linguistics', 'History', 'Philosophy',
  'Architecture & Urban Planning', 'Fine Arts', 'Music', 'Film & Media',
  // Other
  'Agriculture & Food Science', 'Environmental Science & Climate', 'Sustainable Development',
  'Other',
];

const DEGREES = ['Bachelor\'s', 'Master\'s', 'PhD', 'Postdoc', 'Diploma / Certificate', 'Exchange / Short Course'];

const COUNTRIES = [
  'Any country...',
  'USA', 'UK', 'Germany', 'Netherlands', 'Canada', 'Australia', 'France',
  'Sweden', 'Switzerland', 'Belgium', 'Denmark', 'Norway', 'Finland', 'Ireland',
  'Italy', 'Spain', 'Portugal', 'Austria', 'Czech Republic', 'Hungary',
  'New Zealand', 'Singapore', 'Japan', 'South Korea', 'China',
  'South Africa', 'Rwanda', 'Kenya', 'Ghana', 'Egypt', 'Morocco', 'Nigeria',
];

const FUNDING = ['Any funding...', 'Fully Funded', 'Partial', 'Tuition Only', 'Living Stipend'];

const LANGUAGES = [
  'Any language...',
  'English', 'French', 'German', 'Dutch', 'Spanish', 'Portuguese',
  'Italian', 'Swedish', 'Norwegian', 'Danish', 'Japanese', 'Mandarin', 'Arabic',
];

const MONTHS = ['Any month...', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Generate the next 5 academic years dynamically so this never goes stale again.
const YEARS = (() => {
  const thisYear = new Date().getFullYear();
  const out = ['Any year...'];
  for (let y = thisYear; y <= thisYear + 4; y++) out.push(String(y));
  return out;
})();

const INTAKES = (() => {
  const thisYear = new Date().getFullYear();
  const out = ['Any intake...'];
  for (let y = thisYear; y <= thisYear + 3; y++) {
    out.push(`Fall ${y}`);
    out.push(`Spring ${y + 1}`);
  }
  return out;
})();

const TESTS = ['Any...', 'IELTS', 'TOEFL', 'GRE', 'GMAT', 'No test required'];

const FINDER_HERO_IMG = 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80';

const COUNTRY_CODE_MAP: Record<string, string> = {
  'USA': 'US', 'UK': 'GB', 'Germany': 'DE', 'Netherlands': 'NL',
  'Canada': 'CA', 'Australia': 'AU', 'France': 'FR',
  'Sweden': 'SE', 'Switzerland': 'CH', 'Belgium': 'BE', 'Denmark': 'DK',
  'Norway': 'NO', 'Finland': 'FI', 'Ireland': 'IE', 'Italy': 'IT',
  'Spain': 'ES', 'Portugal': 'PT', 'Austria': 'AT', 'Czech Republic': 'CZ',
  'Hungary': 'HU', 'New Zealand': 'NZ', 'Singapore': 'SG', 'Japan': 'JP',
  'South Korea': 'KR', 'China': 'CN',
  'South Africa': 'ZA', 'Rwanda': 'RW', 'Kenya': 'KE', 'Ghana': 'GH',
  'Egypt': 'EG', 'Morocco': 'MA', 'Nigeria': 'NG',
};

export default function Finder() {
  const { addScholarship, scholarships, studentProfile } = useApp();
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  // Form state
  const [field, setField] = useState('');
  const [degree, setDegree] = useState('');
  const [country, setCountry] = useState('Any country...');
  const [funding, setFunding] = useState('Any funding...');
  const [language, setLanguage] = useState('Any language...');
  const [month, setMonth] = useState('Any month...');
  const [year, setYear] = useState('Any year...');
  const [intake, setIntake] = useState('Any intake...');
  const [testReq, setTestReq] = useState('Any...');
  const [extra, setExtra] = useState('');

  // Results
  const [results, setResults] = useState<DiscoveredScholarship[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');

  const tavilyReady = isTavilyConfigured();

  const handleSearch = async () => {
    if (!field) return;
    setError('');
    setResults(null);
    setLoading(true);

    try {
      // Build a focused search query for the live web.
      const parts: string[] = [];
      parts.push(`scholarship "${field}"`);
      if (degree) parts.push(`for ${degree} students`);
      if (country !== 'Any country...') parts.push(`in ${country}`);
      if (funding !== 'Any funding...') parts.push(`${funding}`);
      if (language !== 'Any language...') parts.push(`taught in ${language}`);
      const yearStr = year !== 'Any year...' ? year : '';
      if (yearStr) parts.push(`deadline ${yearStr}`);
      if (intake !== 'Any intake...') parts.push(`intake ${intake}`);
      if (testReq !== 'Any...' && testReq !== 'No test required') parts.push(`${testReq} accepted`);
      if (testReq === 'No test required') parts.push('no English test required');
      parts.push('open to African students');
      if (extra.trim()) parts.push(extra.trim());
      const query = parts.join(' ');

      if (!tavilyReady) {
        setError('Live web search isn\'t configured. Add VITE_TAVILY_API_KEY to .env to enable real Discover. (Get a free key at tavily.com)');
        setLoading(false);
        return;
      }

      setLoadingStage('Searching the live web…');
      const webRes = await tavilySearch(query, { maxResults: 10, searchDepth: 'advanced' });

      if (!webRes.results.length) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoadingStage('Filtering and structuring real scholarships…');
      const cards = await summarizeScholarshipSearch({
        filters: {
          field, degree, country, funding, language, month, year, intake, testReq, extra,
        },
        webResults: webRes.results,
        profile: studentProfile,
        maxCards: 8,
      });

      setResults(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed. Try again.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleTrack = (r: DiscoveredScholarship) => {
    if (scholarships.some(s => s.name === r.name)) {
      setTracked(prev => new Set(prev).add(r.name));
      return;
    }
    // Try to parse the deadline. If it's a phrase, leave it as text.
    let deadlineIso = '';
    let days: number | null = null;
    const looksLikeDate = /^\d{4}-\d{2}-\d{2}/.test(r.deadline);
    if (looksLikeDate) {
      deadlineIso = r.deadline.slice(0, 10);
      days = calcDaysLeft(deadlineIso);
    } else {
      // 90-day fallback so the readiness engine still has a working deadline
      const fallback = new Date();
      fallback.setMonth(fallback.getMonth() + 3);
      deadlineIso = fallback.toISOString().slice(0, 10);
      days = calcDaysLeft(deadlineIso);
    }
    const code = r.countryCode || COUNTRY_CODE_MAP[r.country] || '';
    const newScholarship: Scholarship = {
      id: generateId(),
      name: r.name,
      institution: r.institution,
      country: r.country,
      countryCode: code,
      focusArea: 'AI Systems Engineering', // legacy enum — narrow set; default safe value
      status: 'Not Started',
      priority: 'Medium',
      funding: r.funding,
      fundingType: r.fundingType,
      deadline: deadlineIso,
      daysLeft: days,
      isPastDue: days !== null && days < 0,
      eligibilityConfirmed: false,
      requirements: '',
      notes: `Discovered · ${r.focusArea}${r.deadline && !looksLikeDate ? ` · ${r.deadline}` : ''}\n${r.summary}`,
      url: r.url,
    };
    addScholarship(newScholarship);
    setTracked(prev => new Set(prev).add(r.name));
  };

  return (
    <div className="page">
      <div className="finder-hero">
        <div className="finder-hero-text">
          <div className="finder-hero-tag"><Sparkles size={13} /> LIVE WEB SEARCH</div>
          <h1>Discover scholarships, the real ones.</h1>
          <p>
            Set your criteria. We search the live web — real scholarship sites, university portals,
            funding programs — and use AI to surface only what fits you. Every result links to the
            <em> actual</em> scholarship page. 🇷🇼 → 🌍
          </p>
          <div className="finder-badges">
            <span className="finder-badge"><span className="dot info" /> Live web results</span>
            <span className="finder-badge"><span className="dot success" /> Real URLs</span>
            <span className="finder-badge"><span className="dot rose" /> All degree levels</span>
            <span className="finder-badge"><span className="dot warning" /> Personalized to your profile</span>
          </div>
        </div>
        <div className="finder-hero-art" aria-hidden="true">
          <img src={FINDER_HERO_IMG} alt="" loading="lazy" />
          <div className="finder-hero-art-fade" />
        </div>
      </div>

      <div className="finder-form card">
        <div className="finder-form-header">
          <SlidersHorizontal size={16} />
          <h3>Search filters</h3>
          <span className="finder-form-hint">Set your criteria below, then let AI do the work</span>
        </div>

        <div className="finder-grid">
          <div className="finder-field">
            <label>FIELD OF STUDY *</label>
            <select value={field} onChange={e => setField(e.target.value)} className={!field ? 'placeholder' : ''}>
              <option value="">Choose your field...</option>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>DEGREE LEVEL</label>
            <select value={degree} onChange={e => setDegree(e.target.value)} className={!degree ? 'placeholder' : ''}>
              <option value="">Select degree...</option>
              {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>HOST COUNTRY / REGION</label>
            <select value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>FUNDING TYPE</label>
            <select value={funding} onChange={e => setFunding(e.target.value)}>
              {FUNDING.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>LANGUAGE OF INSTRUCTION</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>DEADLINE — MONTH</label>
            <select value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>DEADLINE — YEAR</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>INTAKE / START DATE</label>
            <select value={intake} onChange={e => setIntake(e.target.value)}>
              {INTAKES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="finder-field">
            <label>TEST REQUIREMENTS</label>
            <select value={testReq} onChange={e => setTestReq(e.target.value)}>
              {TESTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="finder-extra">
          <label>EXTRA PREFERENCES — <em>tell the AI anything specific</em></label>
          <textarea
            rows={3}
            value={extra}
            onChange={e => setExtra(e.target.value)}
            placeholder={'e.g. "Must be open to Cameroonian students", "Strong research lab in NLP", "Grants for women in STEM", "Scholarships with success stories from Africa"...'}
          />
        </div>

        <button
          className="btn-search"
          onClick={handleSearch}
          disabled={!field || loading}
        >
          <Sparkles size={16} /> {loading ? 'Searching the real web…' : 'Search the live web for scholarships'}
        </button>
        {!field && <p className="search-hint">* Select a field of study to enable search</p>}
        {!tavilyReady && (
          <p className="search-hint" style={{ color: 'var(--warning)' }}>
            Live web search is currently in demo mode. Add VITE_TAVILY_API_KEY to .env for full Discover.
          </p>
        )}
      </div>

      {loading && (
        <div className="finder-loading">
          <div className="spinner" />
          <p>{loadingStage || 'Working…'}</p>
        </div>
      )}

      {error && !loading && (
        <div className="aw-error mt-3" style={{ maxWidth: 720, margin: '20px auto' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {results && !loading && !error && (
        <div className="finder-results">
          {results.length === 0 ? (
            <div className="empty applications-empty">
              <div className="empty-emoji">🌷</div>
              <h2>No scholarships matched.</h2>
              <p>
                Try broadening your filters — fewer specifics, different country, or remove the
                year. Some great scholarships have rolling deadlines, not a calendar year.
              </p>
            </div>
          ) : (
            <>
              <h3>{results.length} scholarship{results.length === 1 ? '' : 's'} found from the live web</h3>
              <div className="results-list">
                {results.map((r, i) => {
                  const isTracked = tracked.has(r.name);
                  const code = r.countryCode || COUNTRY_CODE_MAP[r.country] || '';
                  return (
                    <div key={`${r.name}-${i}`} className="result-card">
                      <div className="result-thumb" aria-hidden="true">
                        <img
                          src={`https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=70`}
                          alt=""
                          loading="lazy"
                        />
                        {code && <span className="scholarship-thumb-flag">{code}</span>}
                      </div>
                      <div className="result-body">
                        <div className="scholarship-name">{r.name}</div>
                        <div className="scholarship-sub">{r.institution} · {r.country}</div>
                        <div className="result-meta">
                          <span className="badge badge-rose">💰 {r.funding}</span>
                          {r.deadline && <span className="badge badge-warning">🗓 {r.deadline}</span>}
                          {r.focusArea && <span className="badge">{r.focusArea}</span>}
                        </div>
                        {r.summary && (
                          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 8, lineHeight: 1.55 }}>
                            {r.summary}
                          </p>
                        )}
                      </div>
                      <div className="result-actions">
                        <button
                          className={`btn ${isTracked ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleTrack(r)}
                          disabled={isTracked}
                        >
                          {isTracked ? <><Check size={14} /> Tracked</> : <><BookmarkPlus size={14} /> Track this</>}
                        </button>
                        {r.url && (
                          <a href={r.url} className="btn btn-secondary" target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> Open page
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
