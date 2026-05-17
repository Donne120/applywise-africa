import { useNavigate } from 'react-router-dom';
import { X, Zap, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  /** What the user just tried to do that hit a paywall. */
  reason: 'essay' | 'letter';
  onClose: () => void;
}

/**
 * Soft-hard paywall: appears when a free or starter user tries to generate
 * past their monthly quota. Charming, honest, and offers ONE primary path
 * (Upgrade to Pro) without buying the user out with discounts.
 */
export default function UpgradeModal({ reason, onClose }: Props) {
  const navigate = useNavigate();
  const { currentPlan } = useApp();

  const isLetter = reason === 'letter';
  const limit = currentPlan === 'Free'
    ? (isLetter ? 1 : 1)
    : currentPlan === 'Starter'
      ? (isLetter ? 3 : 5)
      : '—';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal upgrade-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="icon-btn upgrade-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="upgrade-modal-icon">
          <Zap size={26} />
        </div>

        <h2 className="upgrade-modal-title">
          You've used your <em>{currentPlan}</em> {isLetter ? 'recommender drafts' : 'AI essays'} for this month.
        </h2>
        <p className="upgrade-modal-sub">
          {currentPlan === 'Free'
            ? `Your free plan includes ${limit} ${isLetter ? 'recommender letter' : 'AI essay'} per month. Upgrade to keep writing — unlimited essays, unlimited drafts, the works.`
            : currentPlan === 'Starter'
              ? `Your Starter plan includes ${limit} ${isLetter ? 'recommender letters' : 'AI essays'} per month. Upgrade to Pro for unlimited.`
              : 'Plan reset comes next month, or upgrade now.'}
        </p>

        <div className="upgrade-modal-card">
          <div className="upgrade-modal-card-head">
            <Zap size={16} />
            <div>
              <div className="upgrade-modal-card-name">Pro</div>
              <div className="upgrade-modal-card-tag">For students applying to many programs.</div>
            </div>
            <div className="upgrade-modal-card-price">
              <strong>$9</strong>
              <span>/ month</span>
            </div>
          </div>
          <ul className="upgrade-modal-features">
            <li><Check size={12} /> <strong>Unlimited</strong> AI essays</li>
            <li><Check size={12} /> <strong>Unlimited</strong> recommender drafts</li>
            <li><Check size={12} /> AI Discover · multi-language</li>
            <li><Check size={12} /> Rejection retrospective AI analysis</li>
            <li><Check size={12} /> Cancel any time · pay in your local currency</li>
          </ul>
        </div>

        <div className="upgrade-modal-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => { onClose(); navigate('/checkout?plan=pro&period=monthly'); }}
          >
            <Zap size={14} /> Upgrade to Pro <ArrowRight size={14} />
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Not now
          </button>
        </div>

        <p className="upgrade-modal-honest">
          <Sparkles size={11} /> A single in-person scholarship consultant charges $200–$500 for one essay.
          Pro is <strong>under $80 a year</strong> for unlimited everything.
        </p>
      </div>
    </div>
  );
}
