import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Search, ExternalLink, Calendar, Globe, Sparkles, PenLine } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tavilySearch, isTavilyConfigured } from '../services/tavily';
import { summarizeScholarshipSearch, type DiscoveredScholarship } from '../services/gemini';

const FIELDS = ['Any field', 'STEM', 'Business', 'Medicine & Health', 'Arts & Design', 'Social Sciences', 'Humanities', 'Law', 'Education', 'Agriculture'];
const LEVELS = ['Any level', "Bachelor's", "Master's", 'PhD', 'Exchange'];
const COUNTRIES = ['Any country', 'Germany', 'UK', 'Canada', 'USA', 'France', 'Netherlands', 'Australia', 'Belgium', 'Sweden', 'Switzerland'];
const FUNDING = ['Any funding', 'Fully Funded', 'Partial', 'Tuition Only'];

export default function FinderPage() {
  const navigate = useNavigate();
  const { addScholarship } = useApp();
  const tavilyOk = isTavilyConfigured();

  const [field, setField] = useState(FIELDS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [funding, setFunding] = useState(FUNDING[0]);

  const [results, setResults] = useState<DiscoveredScholarship[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    setError('');
    setLoading(true);
    setLoadingMsg('Searching for current scholarships…');
    setResults(null);
    try {
      const parts = [
        'Scholarships for African students',
        level !== LEVELS[0] ? level : '',
        field !== FIELDS[0] ? `in ${field}` : '',
        country !== COUNTRIES[0] ? `to study in ${country}` : '',
        funding !== FUNDING[0] ? funding.toLowerCase() : '',
        '2026',
      ].filter(Boolean).join(' ');

      const search = await tavilySearch(parts, { maxResults: 10, searchDepth: 'advanced' });
      setLoadingMsg('Summarizing the best matches…');
      const cards = await summarizeScholarshipSearch({
        filters: { field, level, country, funding },
        webResults: search.results,
        maxCards: 8,
      });
      setResults(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [field, level, country, funding]);

  const writeFor = (s: DiscoveredScholarship) => {
    // Save to local scholarships so ApplyWise can prefill from it
    const id = `disc-${Date.now()}`;
    addScholarship({
      id,
      name: s.name,
      institution: s.institution,
      country: s.country,
      countryCode: s.countryCode,
      focusArea: 'AI Systems Engineering',
      status: 'Not Started',
      priority: 'Medium',
      funding: s.funding,
      fundingType: s.fundingType,
      deadline: s.deadline,
      daysLeft: null,
      isPastDue: false,
      eligibilityConfirmed: false,
      requirements: '',
      notes: s.summary,
      url: s.url,
    });
    navigate(`/aw/applywise?scholarship=${id}`);
  };

  return (
    <>
      <section className="aw-hero" style={{ padding: '24px 0 12px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)' }}>Find your scholarship.</h1>
        <p className="aw-hero-sub">Search live for opportunities open to African students. One tap pre-fills ApplyWise to write for it.</p>
      </section>

      <div className="aw-story-card" style={{ padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <FinderSelect label="Field" value={field} setValue={setField} options={FIELDS} />
          <FinderSelect label="Level" value={level} setValue={setLevel} options={LEVELS} />
          <FinderSelect label="Country" value={country} setValue={setCountry} options={COUNTRIES} />
          <FinderSelect label="Funding" value={funding} setValue={setFunding} options={FUNDING} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          {loading ? (
            <span className="aw-thinking">
              <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
              {loadingMsg}
            </span>
          ) : (
            <button className="aw-send-btn" onClick={search} disabled={!tavilyOk}>
              <Search size={14} /> Search
            </button>
          )}
        </div>
      </div>

      {!tavilyOk && (
        <div className="aw-error-banner" style={{ maxWidth: 820, margin: '20px auto 0', background: 'rgba(232, 199, 122, 0.08)', borderColor: 'rgba(232, 199, 122, 0.25)', color: '#E8C77A' }}>
          Live search needs <code>VITE_TAVILY_API_KEY</code>. Add it to your <code>.env</code> to discover real scholarships.
        </div>
      )}
      {error && <div className="aw-error-banner" style={{ maxWidth: 820, margin: '20px auto 0' }}>{error}</div>}

      {results !== null && results.length === 0 && !loading && (
        <div className="aw-placeholder" style={{ margin: '40px auto' }}>
          <div className="aw-placeholder-mark"><Compass size={26} /></div>
          <h2>Nothing matched yet</h2>
          <p>Loosen your filters or try a different country — there are more options than the first page of results shows.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ maxWidth: 820, margin: '32px auto 0', display: 'grid', gap: 14 }}>
          {results.map((s, i) => (
            <ScholarshipCard key={i} s={s} onWrite={() => writeFor(s)} />
          ))}
        </div>
      )}

      {!results && !loading && (
        <div className="aw-placeholder" style={{ margin: '60px auto' }}>
          <div className="aw-placeholder-mark"><Sparkles size={26} /></div>
          <h2>Tell me what you're looking for</h2>
          <p>Pick a field, level, and country — I'll search the live web and bring back current opportunities open to African students.</p>
        </div>
      )}
    </>
  );
}

function FinderSelect({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[] }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--aw-text-muted)' }}>{label}</span>
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{
          width: '100%',
          marginTop: 6,
          background: 'var(--aw-surface-2)',
          border: '1px solid var(--aw-border)',
          borderRadius: 'var(--aw-r-sm)',
          color: 'var(--aw-text)',
          padding: '10px 12px',
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ScholarshipCard({ s, onWrite }: { s: DiscoveredScholarship; onWrite: () => void }) {
  return (
    <div style={{
      background: 'var(--aw-surface)',
      border: '1px solid var(--aw-border)',
      borderRadius: 'var(--aw-r-lg)',
      padding: 22,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--aw-purple)', fontWeight: 600 }}>
              {s.fundingType}
            </span>
            <span style={{ fontSize: 12, color: 'var(--aw-text-muted)' }}>· {s.country}</span>
          </div>
          <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 20, margin: '0 0 6px', fontWeight: 600, color: 'var(--aw-text)' }}>{s.name}</h3>
          <div style={{ fontSize: 13.5, color: 'var(--aw-text-soft)', marginBottom: 10 }}>{s.institution}</div>
          <p style={{ fontSize: 14, color: 'var(--aw-text-soft)', lineHeight: 1.55, margin: 0 }}>{s.summary}</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, fontSize: 12.5, color: 'var(--aw-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Globe size={12} /> {s.funding}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={12} /> {s.deadline}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="aw-pill-btn primary" onClick={onWrite}>
          <PenLine size={13} /> Write for this scholarship
        </button>
        <a className="aw-pill-btn" href={s.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} /> Official page
        </a>
      </div>
    </div>
  );
}
