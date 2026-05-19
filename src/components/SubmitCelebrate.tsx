import { useEffect, useState } from 'react';

/**
 * SubmitCelebrate — the dignified submit moment (mobile-redesign-v2 §7).
 *
 * Photo of a student leaning back in quiet relief + "Submitted." in
 * Playfair. Dissolves after 2.5s. No confetti, no chime.
 */
export default function SubmitCelebrate({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('out'), 1900);
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`submit-celebrate ${phase}`} role="status" aria-live="polite">
      <img src="/submit-celebrate.png" alt="" className="submit-celebrate-img" aria-hidden="true" />
      <div className="submit-celebrate-tint" aria-hidden="true" />
      <div className="submit-celebrate-text">Submitted.</div>
    </div>
  );
}
