import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Story } from '../types';

/**
 * EssayReveal — the "wow" moment when the AI finishes generating.
 * (mobile-redesign-v2 §5.8)
 *
 * Full-screen overlay that types out the essay paragraph-by-paragraph.
 * After each paragraph, a soft chip fades in: "drawn from: [story title]".
 * Tap anywhere to skip ahead. "Continue" dismisses and hands off to the
 * normal editing view.
 *
 * Honest about attribution: we don't actually know which paragraph drew
 * from which story (the AI doesn't tell us). We attribute paragraphs to
 * the top stories by emotional weight in order, which is both how the
 * AI was instructed to use them and a reasonable visual proxy.
 */

const CHAR_DELAY = 14;          // ms per character — slow enough to read, fast enough not to bore
const ATTRIBUTION_FADE = 240;   // ms before attribution chip appears after paragraph completes
const PARAGRAPH_GAP = 360;      // ms pause between paragraphs

type Props = {
  text: string;
  stories: Story[];
  onContinue: () => void;
};

export default function EssayReveal({ text, stories, onContinue }: Props) {
  const paragraphs = splitParagraphs(text);
  const orderedStories = [...stories].sort((a, b) => b.emotion - a.emotion);

  const [revealedFull, setRevealedFull] = useState<string[]>([]);   // paragraphs fully typed so far
  const [currentText, setCurrentText] = useState('');               // paragraph currently typing
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);
  const skippedRef = useRef(false);

  useEffect(() => {
    if (currentIdx >= paragraphs.length) {
      setDone(true);
      return;
    }
    if (skippedRef.current) {
      // user tapped to skip — flush all paragraphs instantly
      setRevealedFull(paragraphs);
      setCurrentText('');
      setCurrentIdx(paragraphs.length);
      setDone(true);
      return;
    }

    const target = paragraphs[currentIdx];
    let pos = 0;
    let raf: number;
    let lastT = performance.now();

    const tick = (t: number) => {
      if (skippedRef.current) return;
      if (t - lastT >= CHAR_DELAY) {
        pos += 1;
        setCurrentText(target.slice(0, pos));
        lastT = t;
      }
      if (pos < target.length) {
        raf = requestAnimationFrame(tick);
      } else {
        // paragraph complete — move it into revealedFull and pause briefly
        setTimeout(() => {
          setRevealedFull(prev => [...prev, target]);
          setCurrentText('');
          setCurrentIdx(i => i + 1);
        }, PARAGRAPH_GAP);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIdx, paragraphs]);

  const handleSkip = () => {
    if (done) return;
    skippedRef.current = true;
    setRevealedFull(paragraphs);
    setCurrentText('');
    setCurrentIdx(paragraphs.length);
    setDone(true);
  };

  return (
    <div className="essay-reveal" role="dialog" aria-label="Your essay">
      <div className="essay-reveal-head">
        <div className="essay-reveal-badge">
          <Sparkles size={14} />
          <span>Made from your stories</span>
        </div>
      </div>

      <div className="essay-reveal-body" onClick={handleSkip}>
        {revealedFull.map((p, i) => (
          <div key={`done-${i}`} className="essay-reveal-paragraph">
            <p>{p}</p>
            <Attribution story={orderedStories[i % Math.max(1, orderedStories.length)]} />
          </div>
        ))}
        {currentText && (
          <div className="essay-reveal-paragraph typing">
            <p>{currentText}<span className="essay-reveal-caret" aria-hidden="true" /></p>
          </div>
        )}
        {!done && (
          <div className="essay-reveal-skip-hint">Tap anywhere to skip</div>
        )}
      </div>

      <div className="essay-reveal-foot">
        <button
          type="button"
          className="essay-reveal-cta"
          onClick={onContinue}
          disabled={!done}
        >
          <span>{done ? 'Continue to edit' : 'Reading…'}</span>
          {done && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}

function Attribution({ story }: { story: Story | undefined }) {
  if (!story) return null;
  return (
    <div className="essay-reveal-attribution">
      <span className="essay-reveal-attribution-label">drawn from</span>
      <span className="essay-reveal-attribution-title">{story.title}</span>
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
