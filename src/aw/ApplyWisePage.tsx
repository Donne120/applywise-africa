import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles, Mic, Paperclip, Globe, Send, ArrowLeft,
  Copy, Save, RefreshCw, Check, BookOpen, PenLine, Mail,
  GraduationCap, Microscope, FileEdit, Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateFollowUpQuestions,
  generateProfileSummary,
  generateWriting,
  scoreWriting,
} from '../services/gemini';
import type { WritingDocument, QualityScores } from '../types';
import { generateId } from '../utils/helpers';
import { FLOWS, QUICK_ACTIONS, type AwFlowKey } from './flows';

type Stage = 'hero' | 'questions' | 'storymap' | 'writing' | 'output';

const ACTION_ICONS: Record<AwFlowKey, React.ComponentType<{ size?: number }>> = {
  sop:            GraduationCap,
  scholarship:    Award,
  motivation:     PenLine,
  improve:        FileEdit,
  email:          Mail,
  recommendation: BookOpen,
  research:       Microscope,
};

export default function ApplyWisePage() {
  const { studentProfile, stories, scholarships, addWritingDocument, consumeEssay } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillId = searchParams.get('scholarship');
  const prefillScholarship = scholarships.find(s => s.id === prefillId);

  const [stage, setStage] = useState<Stage>('hero');
  const [flowKey, setFlowKey] = useState<AwFlowKey>('sop');
  const flow = FLOWS[flowKey];

  const [rawInput, setRawInput] = useState(
    prefillScholarship
      ? `I want to apply for the ${prefillScholarship.name} at ${prefillScholarship.institution} in ${prefillScholarship.country}.\n\nWhat I know so far:\n- ${prefillScholarship.funding}\n- Deadline: ${prefillScholarship.deadline}\n\nMy ideas:\n`
      : '',
  );

  useEffect(() => {
    if (prefillScholarship) {
      // Auto-pick scholarship flow when arriving from Finder
      setFlowKey('scholarship');
      // Clear the param so it doesn't re-trigger
      const next = new URLSearchParams(searchParams);
      next.delete('scholarship');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [storyAngle, setStoryAngle] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [outline, setOutline] = useState('');
  const [finalWriting, setFinalWriting] = useState('');
  const [scores, setScores] = useState<QualityScores | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const hasApiKey = !!(import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  // ── Start a flow ────────────────────────────────────────────────────
  const startFlow = useCallback(async (key: AwFlowKey) => {
    if (!rawInput.trim() && key !== 'improve') {
      // Allow starting from a quick action even without text — they'll add it via answers
    }
    setFlowKey(key);
    setError('');
    const f = FLOWS[key];

    // For "improve existing", skip Q&A — we go straight to analyzing pasted text
    if (key === 'improve') {
      if (rawInput.trim().length < 80) {
        setError('Paste at least a paragraph of your existing draft so I can review it.');
        return;
      }
      setStage('storymap');
      return;
    }

    // Use the curated questions for the flow if no API key, otherwise let
    // Gemini personalize them based on what the student already shared.
    if (!hasApiKey || !rawInput.trim()) {
      setQuestions(f.questions);
      setAnswers(new Array(f.questions.length).fill(''));
      setStage('questions');
      return;
    }

    setLoading(true);
    setLoadingMsg('Reading what you shared…');
    try {
      const qs = await generateFollowUpQuestions(
        f.writingType, "Master's", rawInput, '', '', studentProfile, stories,
      );
      const final = qs.length >= 3 ? qs.slice(0, 6) : f.questions;
      setQuestions(final);
      setAnswers(new Array(final.length).fill(''));
      setStage('questions');
    } catch (e) {
      setQuestions(f.questions);
      setAnswers(new Array(f.questions.length).fill(''));
      setStage('questions');
      setError(e instanceof Error ? e.message : 'Could not personalize questions — using defaults.');
    } finally {
      setLoading(false);
    }
  }, [rawInput, hasApiKey, studentProfile, stories]);

  // ── Build story map ──────────────────────────────────────────────────
  const buildStoryMap = useCallback(async () => {
    setError('');
    if (!hasApiKey) {
      setStoryAngle('Your African perspective combined with your specific experience is the angle.');
      setProfileSummary(`Student exploring ${flow.writingType.toLowerCase()}.`);
      setOutline('Opening → Defining moment → Direction → Program fit → Closing');
      setStage('storymap');
      return;
    }
    setLoading(true);
    setLoadingMsg('Mapping your story…');
    try {
      const result = await generateProfileSummary({
        writingType: flow.writingType,
        degreeLevel: "Master's",
        targetCountry: '',
        targetUniversity: '',
        targetProgram: '',
        scholarshipName: '',
        rawInput,
        followUpQuestions: questions,
        userAnswers: answers,
      }, studentProfile, stories);
      setProfileSummary(result.profileSummary);
      setStoryAngle(result.storyAngle);
      setOutline(result.outline);
      setStage('storymap');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build story map. Try again.');
    } finally {
      setLoading(false);
    }
  }, [hasApiKey, flow, rawInput, questions, answers, studentProfile, stories]);

  // ── Generate writing ──────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setError('');
    if (!consumeEssay()) {
      setError('You\'ve used all your essays for this period. Upgrade in Settings to keep writing.');
      return;
    }
    if (!hasApiKey) {
      setFinalWriting(`(Demo mode — add VITE_GEMINI_API_KEY for live AI generation.)\n\nThis is where your ${flow.writingType} would appear, written in your voice, drawing on:\n\n${rawInput}\n\n${answers.filter(Boolean).map((a, i) => `• ${questions[i]}: ${a}`).join('\n')}`);
      setStage('output');
      return;
    }
    setLoading(true);
    setLoadingMsg('Writing your draft…');
    setStage('writing');
    try {
      const text = await generateWriting({
        writingType: flow.writingType,
        degreeLevel: "Master's",
        targetCountry: '',
        targetUniversity: '',
        targetProgram: '',
        scholarshipName: '',
        wordLimit: 0,
        deadline: '',
        tone: 'Natural',
        outputStyle: flow.writingType === 'Professor Outreach Email' ? 'Email' : 'Structured Essay',
        formattingStyle: 'Structured Essay',
        paragraphLength: 'Medium',
        countryStyle: 'Other',
        rawInput,
        followUpQuestions: questions,
        userAnswers: answers,
        profileSummary,
        storyAngle,
        outline,
      }, studentProfile, stories);
      setFinalWriting(text);
      setStage('output');
      // Fire-and-forget score
      scoreWriting(text, flow.writingType, "Master's")
        .then(setScores)
        .catch(() => { /* ignore */ });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Try again.');
      setStage('storymap');
    } finally {
      setLoading(false);
    }
  }, [consumeEssay, hasApiKey, flow, rawInput, questions, answers, profileSummary, storyAngle, outline, studentProfile, stories]);

  // ── Persist when output is ready ─────────────────────────────────────
  useEffect(() => {
    if (stage !== 'output' || !finalWriting) return;
    const doc: WritingDocument = {
      id: generateId(),
      title: `${flow.writingType} — ${new Date().toLocaleDateString()}`,
      writingType: flow.writingType,
      targetCountry: '',
      targetUniversity: '',
      targetProgram: '',
      degreeLevel: "Master's",
      scholarshipName: '',
      wordLimit: 0,
      deadline: '',
      tone: 'Natural',
      outputStyle: 'Structured Essay',
      formattingStyle: 'Structured Essay',
      paragraphLength: 'Medium',
      countryStyle: 'Other',
      rawInput,
      followUpQuestions: questions,
      userAnswers: answers,
      profileSummary,
      storyAngle,
      outline,
      finalWriting,
      qualityScores: scores,
      improvementChecklist: [],
      status: 'Generated',
      linkedScholarshipId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addWritingDocument(doc);
    // We only want to save once per generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, finalWriting]);

  // ── Actions ──────────────────────────────────────────────────────────
  const copy = async () => {
    await navigator.clipboard.writeText(finalWriting);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStage('hero');
    setRawInput('');
    setQuestions([]); setAnswers([]);
    setStoryAngle(''); setProfileSummary(''); setOutline('');
    setFinalWriting(''); setScores(null);
    setError('');
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      {stage === 'hero' && (
        <HeroStage
          flow={flow}
          rawInput={rawInput}
          setRawInput={setRawInput}
          onStart={startFlow}
          loading={loading}
          loadingMsg={loadingMsg}
          hasApiKey={hasApiKey}
          error={error}
        />
      )}

      {stage === 'questions' && (
        <QuestionsStage
          flow={flow}
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => setStage('hero')}
          onNext={buildStoryMap}
          loading={loading}
          loadingMsg={loadingMsg}
          error={error}
        />
      )}

      {stage === 'storymap' && (
        <StoryMapStage
          flow={flow}
          rawInput={rawInput}
          storyAngle={storyAngle}
          outline={outline}
          isImprove={flowKey === 'improve'}
          onBack={() => setStage(flowKey === 'improve' ? 'hero' : 'questions')}
          onGenerate={generate}
          loading={loading}
          loadingMsg={loadingMsg}
          error={error}
        />
      )}

      {stage === 'writing' && (
        <div className="aw-flow">
          <div className="aw-msg aw-msg-coach">
            <div className="aw-thinking">
              <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
              <span>{loadingMsg || 'Writing your draft…'}</span>
            </div>
          </div>
        </div>
      )}

      {stage === 'output' && (
        <OutputStage
          flow={flow}
          finalWriting={finalWriting}
          setFinalWriting={setFinalWriting}
          scores={scores}
          copied={copied}
          onCopy={copy}
          onRegenerate={generate}
          onNew={reset}
          loading={loading}
        />
      )}
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function HeroStage({
  flow, rawInput, setRawInput, onStart, loading, loadingMsg, hasApiKey, error,
}: {
  flow: typeof FLOWS[AwFlowKey];
  rawInput: string; setRawInput: (v: string) => void;
  onStart: (key: AwFlowKey) => void;
  loading: boolean; loadingMsg: string;
  hasApiKey: boolean;
  error: string;
}) {
  return (
    <>
      <section className="aw-hero">
        <h1>{flow.hero}</h1>
        <p className="aw-hero-sub">{flow.heroSub}</p>
      </section>

      <div className="aw-story-card">
        <textarea
          className="aw-story-textarea"
          placeholder="Tell me your story…"
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
        />
        <div className="aw-story-subtext">There's no perfect way to start.</div>
        <div className="aw-story-toolbar">
          <button className="aw-tool-btn" type="button" title="Voice input (coming soon)">
            <Mic size={15} />
          </button>
          <button className="aw-tool-btn" type="button" title="Attach existing writing (coming soon)">
            <Paperclip size={15} />
          </button>
          <button className="aw-tool-btn" type="button" title="Language">
            <Globe size={15} /> EN
          </button>
          <div className="aw-tool-spacer" />
          {loading ? (
            <span className="aw-thinking">
              <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
              {loadingMsg}
            </span>
          ) : (
            <button
              className="aw-send-btn"
              disabled={!rawInput.trim()}
              onClick={() => onStart('sop')}
            >
              <Send size={14} /> Continue
            </button>
          )}
        </div>
      </div>

      {error && <div className="aw-error-banner">{error}</div>}
      {!hasApiKey && (
        <div className="aw-error-banner" style={{ marginTop: 16, background: 'rgba(232, 199, 122, 0.08)', borderColor: 'rgba(232, 199, 122, 0.25)', color: '#E8C77A' }}>
          Demo mode — add <code>VITE_GEMINI_API_KEY</code> to your <code>.env</code> for live AI writing.
        </div>
      )}

      <div className="aw-actions-label">Or start with</div>
      <div className="aw-actions-grid">
        {QUICK_ACTIONS.map(key => {
          const f = FLOWS[key];
          const Icon = ACTION_ICONS[key];
          return (
            <button key={key} className="aw-action-card" onClick={() => onStart(key)}>
              <div className="aw-action-icon"><Icon size={16} /></div>
              <div className="aw-action-title">{f.label}</div>
              <div className="aw-action-desc">{f.desc}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Questions ────────────────────────────────────────────────────────

function QuestionsStage({
  flow, questions, answers, setAnswers, onBack, onNext, loading, loadingMsg, error,
}: {
  flow: typeof FLOWS[AwFlowKey];
  questions: string[];
  answers: string[];
  setAnswers: (v: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean; loadingMsg: string;
  error: string;
}) {
  const updateAnswer = (i: number, val: string) => {
    const next = [...answers];
    next[i] = val;
    setAnswers(next);
  };
  const answered = answers.filter(a => a.trim()).length;

  return (
    <div className="aw-flow">
      <button className="aw-flow-back" onClick={onBack}><ArrowLeft size={14} /> Back</button>

      <div className="aw-msg aw-msg-coach">
        <strong>{flow.label}</strong> · {flow.coachIntro}
      </div>

      {questions.map((q, i) => (
        <div key={i} className="aw-question">
          <label className="aw-question-label">{q}</label>
          <textarea
            className="aw-question-input"
            value={answers[i] || ''}
            onChange={e => updateAnswer(i, e.target.value)}
            placeholder="Take your time. A few honest sentences is enough."
          />
        </div>
      ))}

      {error && <div className="aw-error-banner">{error}</div>}

      <div className="aw-output-actions" style={{ justifyContent: 'space-between', marginTop: 28 }}>
        <span style={{ color: 'var(--aw-text-muted)', fontSize: 13, alignSelf: 'center' }}>
          {answered} of {questions.length} answered · skip any you don't want to answer
        </span>
        {loading ? (
          <span className="aw-thinking">
            <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
            {loadingMsg}
          </span>
        ) : (
          <button className="aw-pill-btn primary" onClick={onNext}>
            <Sparkles size={14} /> Map my story
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Story Map ────────────────────────────────────────────────────────

function StoryMapStage({
  flow, rawInput, storyAngle, outline, isImprove, onBack, onGenerate, loading, loadingMsg, error,
}: {
  flow: typeof FLOWS[AwFlowKey];
  rawInput: string;
  storyAngle: string;
  outline: string;
  isImprove: boolean;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean; loadingMsg: string;
  error: string;
}) {
  return (
    <div className="aw-flow">
      <button className="aw-flow-back" onClick={onBack}><ArrowLeft size={14} /> Back</button>

      <div className="aw-storymap">
        <h3 className="aw-storymap-title">Your Story Map</h3>
        <p className="aw-storymap-sub">Here's the angle I'd build your {flow.writingType.toLowerCase()} around.</p>

        {isImprove ? (
          <div className="aw-storymap-section">
            <h4>Your draft</h4>
            <p style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{rawInput}</p>
          </div>
        ) : (
          <>
            {storyAngle && (
              <div className="aw-storymap-section">
                <h4>Strongest Angle</h4>
                <p>{storyAngle}</p>
              </div>
            )}
            {outline && (
              <div className="aw-storymap-section">
                <h4>Outline</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{outline}</p>
              </div>
            )}
          </>
        )}
      </div>

      {error && <div className="aw-error-banner">{error}</div>}

      <div className="aw-output-actions" style={{ justifyContent: 'flex-end' }}>
        {loading ? (
          <span className="aw-thinking">
            <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
            {loadingMsg}
          </span>
        ) : (
          <button className="aw-pill-btn primary" onClick={onGenerate}>
            <Sparkles size={14} /> {isImprove ? 'Rewrite this draft' : 'Write the draft'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Output ───────────────────────────────────────────────────────────

function OutputStage({
  flow, finalWriting, setFinalWriting, scores, copied, onCopy, onRegenerate, onNew, loading,
}: {
  flow: typeof FLOWS[AwFlowKey];
  finalWriting: string; setFinalWriting: (v: string) => void;
  scores: QualityScores | null;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  onNew: () => void;
  loading: boolean;
}) {
  const wordCount = finalWriting.split(/\s+/).filter(Boolean).length;

  return (
    <div className="aw-flow" style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--aw-text-muted)' }}>
            {flow.writingType}
          </div>
          <h2 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 26, margin: '4px 0 0', fontWeight: 600 }}>
            Your draft is ready
          </h2>
          <div style={{ fontSize: 13, color: 'var(--aw-text-muted)', marginTop: 4 }}>
            {wordCount} words · ready to copy and paste anywhere
          </div>
        </div>
        <div className="aw-output-actions">
          <button className="aw-pill-btn" onClick={onRegenerate} disabled={loading}>
            <RefreshCw size={13} /> New version
          </button>
          <button className="aw-pill-btn primary" onClick={onCopy}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="aw-output">
        <div
          className="aw-writing"
          contentEditable
          suppressContentEditableWarning
          onBlur={e => setFinalWriting(e.currentTarget.innerText)}
          dangerouslySetInnerHTML={{ __html: escapeForContentEditable(finalWriting) }}
        />

        <div className="aw-coach-panel">
          <h4 className="aw-coach-title">Coaching</h4>
          {scores ? (
            <>
              <ScoreRow label="Authenticity" value={scores.authenticity} />
              <ScoreRow label="Specificity" value={scores.specificity} />
              <ScoreRow label="Emotional depth" value={scores.emotionalDepth} />
              <ScoreRow label="Program fit" value={scores.programFit} />
              <ScoreRow label="Ready to send" value={scores.copyPasteReadiness} />

              {scores.specificity < 7 && (
                <div className="aw-coach-tip">
                  <strong>Tip:</strong> Add one real moment that anchors your motivation in a specific time and place.
                </div>
              )}
              {scores.authenticity < 7 && (
                <div className="aw-coach-tip">
                  <strong>Tip:</strong> Some phrases still sound AI-polished. Replace 1–2 with how you'd actually say it out loud.
                </div>
              )}
            </>
          ) : (
            <div className="aw-thinking" style={{ marginTop: 4 }}>
              <span className="aw-thinking-dot" /><span className="aw-thinking-dot" /><span className="aw-thinking-dot" />
              Reading your draft…
            </div>
          )}

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--aw-border)' }}>
            <button className="aw-pill-btn" onClick={onNew}>
              <Save size={13} /> Saved · Start new
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value * 10));
  return (
    <div>
      <div className="aw-score-row">
        <span>{label}</span>
        <span style={{ color: 'var(--aw-text)', fontWeight: 600 }}>{value}/10</span>
      </div>
      <div className="aw-score-bar"><div className="aw-score-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// Render the AI text into a contentEditable safely (escape HTML, preserve newlines)
function escapeForContentEditable(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
