import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * MobileFirstOpen — the editorial welcome (mobile-redesign-v2 §5.1)
 *
 * Shown to a user who lands on the app for the first time on mobile,
 * before onboarding. Full-bleed photograph of an African student with
 * a slow ken-burns zoom — "Editorial Calm" with quiet life.
 *
 * One headline. One sentence. One button. One text link.
 * No tabs, no topbar — this is a moment, not a screen.
 */

// Editorial portrait commissioned for the first-open hero.
// Lives in /public so Vite serves it from the site root.
const HERO_PHOTO = '/mfirst-hero.png';

export default function MobileFirstOpen({ onBegin }: { onBegin: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="mfirst">
      <div className="mfirst-hero" aria-hidden="true">
        <img src={HERO_PHOTO} alt="" className="mfirst-hero-img" />
        <div className="mfirst-hero-tint" />
        <div className="mfirst-hero-overlay" />
      </div>

      <div className="mfirst-content">
        <h1 className="mfirst-headline">
          Let's find your<br />scholarship.
        </h1>
        <p className="mfirst-sub">
          We turn your real story into essays universities can't ignore.
        </p>

        <button type="button" className="mfirst-cta" onClick={onBegin}>
          <span>Begin</span>
          <ArrowRight size={18} />
        </button>

        <button
          type="button"
          className="mfirst-secondary"
          onClick={() => navigate('/signin')}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}
