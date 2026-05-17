import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Globe } from 'lucide-react';

// Web Speech API isn't in the standard TS lib; declare what we need.
type RecognitionResult = { transcript: string; isFinal: boolean };
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

export type VoiceLang = 'en-US' | 'fr-FR';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** Optional override for default language. */
  defaultLang?: VoiceLang;
  /** Compact button (used inside form labels). */
  compact?: boolean;
}

/**
 * Click to start recording; click again to stop.
 * Live transcript is appended to `value` via onChange, so the user can edit after.
 * Hidden entirely if the browser doesn't support speech recognition.
 */
export default function VoiceInput({ value, onChange, defaultLang = 'en-US', compact }: Props) {
  const [isSupported] = useState(() => getRecognitionCtor() !== null);
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState<VoiceLang>(defaultLang);
  const [error, setError] = useState<string>('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef<string>('');

  useEffect(() => {
    return () => { recRef.current?.abort(); };
  }, []);

  if (!isSupported) return null;

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError('');
    baseRef.current = value ? value.trimEnd() + ' ' : '';
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i][0];
        if (e.results[i][0] && (e.results[i] as unknown as { isFinal: boolean }).isFinal) {
          final += r.transcript;
        } else {
          interim += r.transcript;
        }
      }
      const combined = (baseRef.current + final + interim).replace(/\s+/g, ' ').trimStart();
      onChange(combined);
      if (final) baseRef.current += final;
    };

    rec.onerror = (e) => {
      const msg = e.error === 'not-allowed'
        ? 'Microphone permission was denied. Allow it in the browser address bar and try again.'
        : e.error === 'no-speech'
          ? 'I didn\'t hear anything. Try moving closer to the microphone.'
          : `Voice error: ${e.error}`;
      setError(msg);
      setRecording(false);
    };

    rec.onend = () => {
      setRecording(false);
      recRef.current = null;
    };

    try {
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setError('Couldn\'t start voice — try again in a moment.');
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className={`voice-input ${compact ? 'voice-input-compact' : ''}`}>
      <button
        type="button"
        className={`voice-btn ${recording ? 'recording' : ''}`}
        onClick={recording ? stop : start}
        aria-label={recording ? 'Stop recording' : 'Speak instead of typing'}
        title={recording ? 'Stop recording' : 'Speak instead of typing'}
      >
        {recording ? <MicOff size={13} /> : <Mic size={13} />}
        <span className="voice-btn-label">
          {recording ? 'Listening…' : compact ? 'Speak' : 'Speak instead'}
        </span>
        {recording && <span className="voice-pulse" aria-hidden="true" />}
      </button>

      {!compact && (
        <div className="voice-lang-picker">
          <Globe size={11} />
          <select value={lang} onChange={e => setLang(e.target.value as VoiceLang)} aria-label="Voice language">
            <option value="en-US">English</option>
            <option value="fr-FR">Français</option>
          </select>
        </div>
      )}

      {error && <div className="voice-error">{error}</div>}
    </div>
  );
}
