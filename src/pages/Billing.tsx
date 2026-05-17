import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, Zap, Sparkles, Check, ArrowRight, ShieldCheck, Clock, PenTool, Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatUsage, getPlanLimits } from '../utils/planLimits';

interface PlanCard {
  key: 'free' | 'starter' | 'pro' | 'founder';
  display: 'Free' | 'Starter' | 'Pro' | 'Premium';
  tagline: string;
  monthly: string;
  yearly?: string;
  oneTime?: string;
  features: string[];
  ctaLabel: string;
  ctaTone: 'secondary' | 'primary' | 'founder';
  icon: React.ReactNode;
}

const PLANS: PlanCard[] = [
  {
    key: 'free',
    display: 'Free',
    tagline: 'Everything you need to start serious.',
    monthly: '$0',
    features: [
      'Unlimited scholarships & deadlines',
      'Unlimited Story Vault',
      'Voice input everywhere',
      'Readiness Score on every application',
      '1 AI essay · 1 recommender letter',
    ],
    ctaLabel: 'Current free plan',
    ctaTone: 'secondary',
    icon: <Sparkles size={18} />,
  },
  {
    key: 'starter',
    display: 'Starter',
    tagline: 'For one serious application season.',
    monthly: '$4 / month',
    yearly: '$35 / year',
    features: [
      'Everything in Free',
      '5 AI essays / month',
      '3 recommender drafts / month',
      'Quality scoring on every essay',
      'Gap-closing quests on Grow',
    ],
    ctaLabel: 'Choose Starter',
    ctaTone: 'secondary',
    icon: <Sparkles size={18} />,
  },
  {
    key: 'pro',
    display: 'Pro',
    tagline: 'For students applying to many programs.',
    monthly: '$9 / month',
    yearly: '$79 / year',
    features: [
      'Everything in Starter',
      'Unlimited AI essays',
      'Unlimited recommender drafts',
      'AI Discover · multi-language',
      'Rejection retrospective analysis',
    ],
    ctaLabel: 'Go Pro',
    ctaTone: 'primary',
    icon: <Zap size={18} />,
  },
  {
    key: 'founder',
    display: 'Premium',
    tagline: 'Pro forever. For believers.',
    oneTime: '$179 once',
    monthly: '',
    features: [
      'Everything in Pro',
      'Pro forever — no monthly fees',
      "Founder's Circle badge",
      'First access to every new feature',
      'Direct line to the founders',
    ],
    ctaLabel: 'Claim your spot',
    ctaTone: 'founder',
    icon: <Crown size={18} />,
  },
];

export default function Billing() {
  const navigate = useNavigate();
  const { currentPlan, payments, studentProfile } = useApp();
  const limits = getPlanLimits(currentPlan);
  const essaysUsed = studentProfile.essaysUsedThisPeriod ?? 0;
  const lettersUsed = studentProfile.lettersUsedThisPeriod ?? 0;

  const pending = useMemo(
    () => payments.filter(p => p.status === 'Pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments],
  );
  const latestApproved = useMemo(
    () => payments.filter(p => p.status === 'Approved').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [payments],
  );

  return (
    <div className="page billing-page">
      <div className="page-header">
        <div>
          <h1>Plan & billing</h1>
          <p className="page-subtitle">Choose how you want to keep growing.</p>
        </div>
      </div>

      {/* Current plan summary */}
      <div className="billing-current-card">
        <div className="billing-current-info">
          <div className="billing-current-eyebrow">CURRENT PLAN</div>
          <div className="billing-current-name">
            {currentPlan === 'Premium' ? <Crown size={20} /> : currentPlan === 'Pro' ? <Zap size={20} /> : <Sparkles size={20} />}
            <span>{currentPlan}</span>
          </div>
          <div className="billing-current-sub">
            {currentPlan === 'Free'
              ? "You're on the free plan. Upgrade any time."
              : `Active${latestApproved ? ` · since ${new Date(latestApproved.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}.`}
          </div>
        </div>
      </div>

      {/* Usage this month */}
      <div className="billing-usage-grid">
        <div className="billing-usage-card">
          <div className="billing-usage-icon"><PenTool size={16} /></div>
          <div className="billing-usage-info">
            <div className="billing-usage-label">AI essays this month</div>
            <div className="billing-usage-val">{formatUsage(essaysUsed, limits.essaysPerMonth)}</div>
          </div>
        </div>
        <div className="billing-usage-card">
          <div className="billing-usage-icon"><Users size={16} /></div>
          <div className="billing-usage-info">
            <div className="billing-usage-label">Recommender drafts this month</div>
            <div className="billing-usage-val">{formatUsage(lettersUsed, limits.lettersPerMonth)}</div>
          </div>
        </div>
      </div>

      {/* Pending review banner */}
      {pending.length > 0 && (
        <div className="billing-pending-banner">
          <Clock size={16} />
          <div>
            <strong>Your {pending[0].planName} payment is in review.</strong>
            <p>
              We typically approve within 24 hours. You'll get an email the moment it's live.
              Reference: <code>{pending[0].transactionReference}</code>
            </p>
          </div>
        </div>
      )}

      <div className="billing-plans-head">
        <h2>Choose your plan</h2>
        <p>Pay once you believe — not before. Cancel any time. Pay in your local currency.</p>
      </div>

      <div className="billing-plans-grid">
        {PLANS.map(p => {
          const isCurrent = currentPlan === p.display;
          return (
            <div
              key={p.key}
              className={`billing-plan-card ${p.key === 'pro' ? 'featured' : ''} ${p.key === 'founder' ? 'founder' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="billing-plan-head">
                <div className="billing-plan-icon">{p.icon}</div>
                <div>
                  <div className="billing-plan-name">{p.display}</div>
                  <div className="billing-plan-tag">{p.tagline}</div>
                </div>
              </div>

              <div className="billing-plan-price">
                {p.oneTime ?? p.monthly}
                {p.yearly && <div className="billing-plan-price-sub">or {p.yearly}</div>}
              </div>

              <ul className="billing-plan-features">
                {p.features.map(f => (
                  <li key={f}><Check size={12} /> {f}</li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="btn btn-secondary plan-cta" disabled>
                  <ShieldCheck size={14} /> Your current plan
                </button>
              ) : p.key === 'free' ? (
                <button className="btn btn-secondary plan-cta" disabled>
                  Free forever
                </button>
              ) : (
                <button
                  className={`btn plan-cta ${p.ctaTone === 'primary' ? 'btn-primary' : p.ctaTone === 'founder' ? 'plan-cta-founder' : 'btn-secondary'}`}
                  onClick={() => navigate(`/checkout?plan=${p.key}&period=${p.key === 'founder' ? 'one-time' : 'monthly'}`)}
                >
                  {p.ctaLabel} <ArrowRight size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="billing-history">
          <h2>Payment history</h2>
          <div className="billing-history-list">
            {payments.map(p => (
              <div key={p.id} className={`billing-history-row status-${p.status.toLowerCase()}`}>
                <div className="billing-history-info">
                  <div className="billing-history-plan">{p.planName} · {p.period}</div>
                  <div className="billing-history-meta">
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {p.country && ` · ${p.country}`}
                    {p.transactionReference && ` · Ref ${p.transactionReference}`}
                  </div>
                </div>
                <div className="billing-history-amount">${p.amount} {p.currency}</div>
                <span className={`status-pill status-${p.status.toLowerCase()}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
