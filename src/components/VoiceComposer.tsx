import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Sparkles, BookHeart, PenTool, Send, Globe, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/helpers';

/**
 * Full-screen voice-first capture.
 *
 * Flow:
 *   tap mic → live transcript → tap stop → pick destination
 *     • Story Vault     → saves a new Story, navigates to /stories
 *     • Writing Studio  → pushes transcript into ?seed= and navigates to /writing
 *     • Just save note  → stashes in localStorage 'udonpass-voice-notes'
 */

type RecognitionResult = { transcript: string };
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<RecognitionResult>>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type Lang = 'en-US' | 'fr-FR';
type Phase = 'idle' | 'recording' | 'review';

export default function VoiceComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { addStory } = useApp();
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lang, setLang] = useState<Lang>('en-US');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef('');
  const [seconds, setSeconds] = useState(0);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      recRef.current?.abort();
      setPhase('idle'); setTranscript(''); setInterim(''); setSeconds(0); setError('');
    }
  }, [open]);

  // Timer
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = o; };
  }, [open]);

  if (!open) return null;

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(''); setSeconds(0);
    baseRef.current = transcript ? transcript.trimEnd() + ' ' : '';
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i][0];
        if ((e.results[i] as unknown as { isFinal: boolean }).isFinal) finalChunk += r.transcript;
        else interimChunk += r.transcript;
      }
      if (finalChunk) {
        baseRef.current += finalChunk;
        setTranscript(baseRef.current.replace(/\s+/g, ' ').trim());
      }
      setInterim(interimChunk);
    };
    rec.onerror = (e) => {
      setError(
        e.error === 'not-allowed'
          ? 'Microphone permission was denied. Allow it in your browser settings.'
          : e.error === 'no-speech'
            ? "I didn't hear anything. Move a bit closer and try again."
            : `Voice error: ${e.error}`
      );
      setPhase('review');
    };
    rec.onend = () => {
      setInterim('');
      recRef.current = null;
      setPhase(prev => (prev === 'recording' ? 'review' : prev));
    };
    try {
      rec.start();
      recRef.current = rec;
      setPhase('recording');
    } catch {
      setError("Couldn't start voice — try again in a moment.");
    }
  }

  function stop() {
    recRef.current?.stop();
    setPhase('review');
  }

  function reset() {
    setTranscript(''); setInterim(''); setSeconds(0); setError('');
    setPhase('idle');
  }

  function saveToStories() {
    if (!transcript.trim()) return;
    const now = new Date().toISOString();
    addStory({
      id: generateId(),
      title: transcript.split(/[.!?]/)[0].slice(0, 60) || 'Voice note',
      body: transcript.trim(),
      themes: [],
      emotion: 3,
      whenItHappened: '',
      whyItMatters: '',
      createdAt: now,
      updatedAt: now,
    });
    onClose();
    navigate('/stories');
  }

  function sendToWriting() {
    if (!transcript.trim()) return;
    try { sessionStorage.setItem('udonpass-voice-seed', transcript.trim()); } catch { /* ignore */ }
    onClose();
    navigate('/writing?seed=voice');
  }

  function justSave() {
    if (!transcript.trim()) return;
    try {
      const key = 'udonpass-voice-notes';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift({ id: generateId(), body: transcript.trim(), createdAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
    } catch { /* ignore */ }
    onClose();
  }

  const live = (transcript + (interim ? ' ' + interim : '')).trim();
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="vc-shell" role="dialog" aria-label="Voice composer">
      <div className="vc-head">
        <button className="vc-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div className="vc-title">
          <Sparkles size={14} /> Tell ApplyWise your story
        </div>
        <div className="vc-lang">
          <Globe size={12} />
          <select value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Language">
            <option value="en-US">EN</option>
            <option value="fr-FR">FR</option>
          </select>
        </div>
      </div>

      {!supported ? (
        <div className="vc-unsupported">
          <div className="vc-unsupported-emoji">🎙️</div>
          <h3>Voice isn't supported in this browser</h3>
          <p>Try Chrome on Android, or use the keyboard in Writing Studio instead.</p>
          <button className="btn btn-primary mt-2" onClick={onClose}>Got it</button>
        </div>
      ) : (
        <>
          <div className="vc-body">
            {phase === 'idle' && (
              <div className="vc-prompt">
                <div className="vc-prompt-emoji">🗣️</div>
                <h3>Just talk. We'll catch every word.</h3>
                <p>
                  Tell us anything — a memory, a goal, a moment that changed you.
                  We turn raw thoughts into essay material.
                </p>
                <p className="vc-prompt-hint">No essay structure. No grammar pressure. Just you.</p>
              </div>
            )}

            {(phase === 'recording' || phase === 'review') && (
              <div className={`vc-transcript ${phase === 'recording' ? 'live' : ''}`}>
                {live ? (
                  <p>
                    {transcript}
                    {interim && <span className="vc-transcript-interim"> {interim}</span>}
                  </p>
                ) : (
                  <p className="vc-transcript-empty">Listening… start whenever you're ready.</p>
                )}
              </div>
            )}

            {error && <div className="vc-error">{error}</div>}
          </div>

          <div className="vc-footer">
            {phase !== 'review' && (
              <div className="vc-timer">{phase === 'recording' ? `${mm}:${ss}` : '00:00'}</div>
            )}

            {phase === 'idle' && (
              <button className="vc-mic-btn" onClick={start} aria-label="Start recording">
                <Mic size={28} />
                <span className="vc-mic-label">Tap to speak</span>
              </button>
            )}

            {phase === 'recording' && (
              <button className="vc-mic-btn recording" onClick={stop} aria-label="Stop recording">
                <MicOff size={28} />
                <span className="vc-mic-pulse" aria-hidden="true" />
                <span className="vc-mic-label">Tap to stop</span>
              </button>
            )}

            {phase === 'review' && (
              <div className="vc-destinations">
                <button className="vc-dest" onClick={saveToStories} disabled={!transcript.trim()}>
                  <BookHeart size={18} />
                  <div>
                    <div className="vc-dest-title">Save to Story Vault</div>
                    <div className="vc-dest-sub">Raw material for future essays</div>
                  </div>
                </button>
                <button className="vc-dest" onClick={sendToWriting} disabled={!transcript.trim()}>
                  <PenTool size={18} />
                  <div>
                    <div className="vc-dest-title">Shape into an essay</div>
                    <div className="vc-dest-sub">Open Writing Studio with this as seed</div>
                  </div>
                </button>
                <button className="vc-dest" onClick={justSave} disabled={!transcript.trim()}>
                  <Send size={18} />
                  <div>
                    <div className="vc-dest-title">Just save the note</div>
                    <div className="vc-dest-sub">Quick stash, no destination yet</div>
                  </div>
                </button>
                <button className="vc-redo" onClick={reset}>
                  <RotateCcw size={14} /> Start over
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
