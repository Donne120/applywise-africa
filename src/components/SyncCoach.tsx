import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STORAGE_KEY = 'udonpass-sync-coach-dismissed-v1';

/**
 * One-time coachmark that explains how Story Vault, Profile, and Writing Studio
 * are now connected. Appears the first time a user has a complete profile + at
 * least one story. Dismissed forever via localStorage.
 */
export default function SyncCoach() {
  const navigate = useNavigate();
  const { studentProfile, stories } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    if (studentProfile.onboardingComplete && stories.length >= 1) {
      // Defer a touch so it doesn't pop during page load.
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [studentProfile.onboardingComplete, stories.length]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="sync-coach" role="dialog" aria-live="polite">
      <button className="sync-coach-dismiss" onClick={dismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
      <div className="sync-coach-head">
        <Sparkles size={16} /> Everything's connected now.
      </div>
      <p>
        Your <strong>Profile</strong> and <strong>{stories.length} stor{stories.length === 1 ? 'y' : 'ies'}</strong> in your
        Vault now feed every essay you write. Open the Writing Studio and watch the AI pull from your
        own words.
      </p>
      <div className="sync-coach-actions">
        <button className="btn btn-primary btn-sm" onClick={() => { dismiss(); navigate('/writing'); }}>
          Try Writing Studio <ArrowRight size={12} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
