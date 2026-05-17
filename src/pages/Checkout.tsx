import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, Check, Upload, AlertCircle, ShieldCheck, Crown, Zap,
  ChevronRight, Sparkles, Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { uploadPaymentScreenshot, dbLoadPaymentSettings } from '../lib/supabaseDb';
import { generateId } from '../utils/helpers';
import type { BillingPeriod, PaymentCountry, PlanName, PaymentSettings } from '../types';

// ── Plan catalog (mirrors the Landing page exactly) ──────────────
interface PlanInfo {
  name: PlanName;
  tagline: string;
  monthly: number;     // USD
  yearly: number;      // USD billed once per year
  oneTime?: number;    // USD for Founder's Circle
  icon: React.ReactNode;
}

const PLANS: Record<string, PlanInfo> = {
  Starter: {
    name: 'Starter',
    tagline: 'For one serious application season.',
    monthly: 4,
    yearly: 35,
    icon: <Sparkles size={18} />,
  },
  Pro: {
    name: 'Pro',
    tagline: 'For students applying to many programs.',
    monthly: 9,
    yearly: 79,
    icon: <Zap size={18} />,
  },
  Founder: {
    name: 'Premium',
    tagline: 'For believers. For builders. Pro forever.',
    monthly: 0,
    yearly: 0,
    oneTime: 179,
    icon: <Crown size={18} />,
  },
};

const COUNTRIES: PaymentCountry[] = ['Rwanda', 'Uganda', 'Ghana', 'Cameroon', 'Other'];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, configured: authConfigured } = useAuth();
  const { paymentSettings: ctxPaymentSettings, submitPayment, studentProfile } = useApp();

  // Force-refresh payment settings when Checkout mounts, in case the cached
  // copy in AppContext is stale (admin changed them in another tab) or wasn't
  // loaded yet (the initial async load lost the race against this page mount).
  const [freshSettings, setFreshSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    dbLoadPaymentSettings()
      .then(s => { if (!cancelled) setFreshSettings(s); })
      .catch(e => console.warn('[checkout] load payment settings:', e))
      .finally(() => { if (!cancelled) setSettingsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  // Use the freshest data: explicit fetch wins; fallback to context cache.
  const paymentSettings = freshSettings ?? ctxPaymentSettings;

  // Read plan + period from URL (?plan=pro&period=yearly|monthly|one-time)
  const rawPlan = (params.get('plan') ?? 'pro').toLowerCase();
  const planKey = rawPlan === 'starter' ? 'Starter'
                : rawPlan === 'founder' || rawPlan === 'founders' || rawPlan === 'premium' ? 'Founder'
                : 'Pro';
  const plan = PLANS[planKey];

  const initialPeriod: BillingPeriod = planKey === 'Founder'
    ? 'one-time'
    : (params.get('period') === 'yearly' ? 'yearly' : 'monthly');
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);

  // Default country from profile if it sounds like one of our supported ones
  const guessCountry = useMemo((): PaymentCountry => {
    const c = (studentProfile.countryOfOrigin || '').toLowerCase();
    if (c.includes('rwand')) return 'Rwanda';
    if (c.includes('ugand')) return 'Uganda';
    if (c.includes('ghan'))  return 'Ghana';
    if (c.includes('camer')) return 'Cameroon';
    return COUNTRIES.find(x => x !== 'Other' && isCountryActive(x, paymentSettings)) ?? 'Other';
  }, [studentProfile.countryOfOrigin, paymentSettings]);
  const [country, setCountry] = useState<PaymentCountry>(guessCountry);

  // Re-pick default country when settings load (if user hasn't touched the picker)
  useEffect(() => { setCountry(guessCountry); /* eslint-disable-next-line */ }, [guessCountry]);

  const [transactionRef, setTransactionRef] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const amount = period === 'one-time' ? (plan.oneTime ?? 0)
               : period === 'yearly'   ? plan.yearly
               : plan.monthly;

  const merchant = getMerchantForCountry(country, paymentSettings);
  const canPayInCountry = country !== 'Other' && merchant.active && merchant.number;

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!user) {
      setError('Please sign in to submit your payment.');
      return;
    }
    if (!canPayInCountry) {
      setError("Payment for this country isn't configured yet. Contact support.");
      return;
    }
    if (!transactionRef.trim()) {
      setError('Enter the transaction reference from your MoMo confirmation.');
      return;
    }
    if (!file) {
      setError('Upload a screenshot of the payment confirmation.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot is larger than 5 MB. Please compress and try again.');
      return;
    }

    setSubmitting(true);
    const paymentId = generateId();

    try {
      const upload = await uploadPaymentScreenshot(user.id, paymentId, file);
      if (!upload) {
        throw new Error('Could not upload your screenshot. Check your connection and try again.');
      }

      submitPayment({
        id: paymentId,
        planName: plan.name,
        amount,
        currency: 'USD',
        paymentMethod: `MTN MoMo · ${country}`,
        transactionReference: transactionRef.trim(),
        screenshotUrl: upload.signedUrl,
        screenshotPath: upload.path,
        status: 'Pending',
        creditsAdded: 0,
        period,
        country,
        createdAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyMerchant() {
    if (!merchant.number) return;
    navigator.clipboard.writeText(merchant.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  // ── Not signed in: invite to sign in first ──────────────────────
  if (!user) {
    return (
      <div className="page checkout-page">
        <button className="workspace-back" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Back to home
        </button>
        <div className="checkout-signin-prompt">
          <ShieldCheck size={32} />
          <h2>Sign in to upgrade</h2>
          <p>
            Your plan needs to be tied to an account so we can confirm payment and unlock features
            on every device you use.
          </p>
          <div className="checkout-signin-actions">
            {authConfigured ? (
              <button className="btn btn-primary" onClick={() => navigate(`/signin?next=/checkout?plan=${rawPlan}&period=${period}`)}>
                Sign in to continue <ChevronRight size={14} />
              </button>
            ) : (
              <p className="checkout-not-ready">
                <AlertCircle size={14} /> Sign-in isn't configured yet. Set up Supabase auth first.
              </p>
            )}
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted: thank-you state ─────────────────────────────────
  if (submitted) {
    return (
      <div className="page checkout-page">
        <div className="checkout-success">
          <div className="checkout-success-icon"><Check size={32} /></div>
          <h1>We've got it.</h1>
          <p className="checkout-success-sub">
            Your <strong>{plan.name}</strong> payment is in review. We typically approve within
            24 hours — usually much faster. You'll get an email the moment it's live.
          </p>
          <div className="checkout-success-meta">
            <div><span>Plan</span><strong>{plan.name} · {periodLabel(period)}</strong></div>
            <div><span>Amount</span><strong>${amount}</strong></div>
            <div><span>Reference</span><strong>{transactionRef}</strong></div>
          </div>
          <div className="checkout-success-actions">
            <button className="btn btn-primary" onClick={() => navigate('/today')}>
              Continue to your space <ChevronRight size={14} />
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/billing')}>
              View my plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main checkout ──────────────────────────────────────────────
  return (
    <div className="page checkout-page">
      <button className="workspace-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="checkout-layout">
        {/* Left — instructions */}
        <div className="checkout-main">
          <div className="checkout-header">
            <div className="checkout-eyebrow">
              <Smartphone size={13} /> MTN MoMo · One-time manual payment
            </div>
            <h1>Pay for <em>{plan.name}</em>.</h1>
            <p className="checkout-intro">
              Three steps. Two minutes. Pay via Mobile Money, drop in the transaction reference and
              the confirmation screenshot, and we'll verify within 24 hours.
            </p>
          </div>

          {/* Step 1 — country */}
          <div className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-num">1</span>
              <h3>Which country are you paying from?</h3>
            </div>
            <div className="checkout-country-grid">
              {COUNTRIES.map(c => {
                const active = c === 'Other' ? true : isCountryActive(c, paymentSettings);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`checkout-country-chip ${country === c ? 'active' : ''} ${!active ? 'disabled' : ''}`}
                    disabled={!active}
                    onClick={() => setCountry(c)}
                    title={!active ? 'Not yet configured' : ''}
                  >
                    {c}
                    {!active && c !== 'Other' && <span className="checkout-soon">Soon</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — pay */}
          <div className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-num">2</span>
              <h3>Send the payment via MTN MoMo</h3>
            </div>
            {settingsLoading ? (
              <div className="checkout-fallback">
                <AlertCircle size={16} />
                <div>
                  <strong>Loading payment options…</strong>
                  <p>One moment.</p>
                </div>
              </div>
            ) : country === 'Other' ? (
              <div className="checkout-fallback">
                <AlertCircle size={16} />
                <div>
                  <strong>We don't have MTN MoMo set up for your country yet.</strong>
                  <p>{paymentSettings.fallbackInstructions}</p>
                </div>
              </div>
            ) : !canPayInCountry ? (
              <div className="checkout-fallback">
                <AlertCircle size={16} />
                <div>
                  <strong>MTN MoMo for {country} is being configured.</strong>
                  <p>Try another country, or contact support to be the first to use it.</p>
                </div>
              </div>
            ) : (
              <div className="checkout-pay-card">
                <div className="checkout-pay-row">
                  <div className="checkout-pay-label">Send to</div>
                  <div className="checkout-pay-number">
                    <button className="checkout-pay-number-btn" onClick={copyMerchant} title="Click to copy">
                      <span className="checkout-pay-number-val">{merchant.number}</span>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                {merchant.name && (
                  <div className="checkout-pay-row">
                    <div className="checkout-pay-label">Name shown on confirmation</div>
                    <div className="checkout-pay-name">{merchant.name}</div>
                  </div>
                )}
                <div className="checkout-pay-row">
                  <div className="checkout-pay-label">Amount</div>
                  <div className="checkout-pay-amount">${amount} USD</div>
                </div>
                <div className="checkout-pay-row">
                  <div className="checkout-pay-label">Note (optional)</div>
                  <div className="checkout-pay-note">
                    ApplyWise {plan.name} {periodLabel(period)}
                  </div>
                </div>
                <p className="checkout-pay-hint">
                  Pay in your local currency at the current exchange rate. MTN may charge a small
                  transaction fee — that's on top of the price above.
                </p>
              </div>
            )}
          </div>

          {/* Step 3 — submit proof */}
          <div className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-num">3</span>
              <h3>Drop in your proof of payment</h3>
            </div>
            <form onSubmit={handleSubmit} className="checkout-form">
              <div className="form-field">
                <label>Transaction reference</label>
                <input
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="e.g. 12345678901"
                  required
                />
                <div className="form-hint">From your MTN MoMo SMS confirmation. Looks like a long number.</div>
              </div>

              <div className="form-field">
                <label>Screenshot of confirmation</label>
                <label className={`checkout-file-drop ${file ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <>
                      <Check size={18} />
                      <span>{file.name}</span>
                      <span className="checkout-file-size">{(file.size / 1024).toFixed(0)} KB</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Click to upload — PNG, JPG, or WebP, under 5 MB</span>
                    </>
                  )}
                </label>
                <div className="form-hint">We only use this to verify your payment. Stored privately.</div>
              </div>

              {error && (
                <div className="aw-error"><AlertCircle size={14} /> {error}</div>
              )}

              <button
                type="submit"
                className="btn btn-primary checkout-submit"
                disabled={submitting || !canPayInCountry}
              >
                {submitting ? 'Submitting…' : <>Submit for review <ChevronRight size={14} /></>}
              </button>
              <p className="checkout-trust">
                <ShieldCheck size={12} /> Manual review · 24h turnaround · 100% refund if anything goes wrong
              </p>
            </form>
          </div>
        </div>

        {/* Right — order summary (sticky) */}
        <aside className="checkout-summary">
          <div className="checkout-summary-card">
            <div className="checkout-summary-eyebrow">Order summary</div>
            <div className="checkout-summary-plan">
              <div className="checkout-summary-plan-icon">{plan.icon}</div>
              <div>
                <div className="checkout-summary-plan-name">{plan.name}</div>
                <div className="checkout-summary-plan-tag">{plan.tagline}</div>
              </div>
            </div>

            {planKey !== 'Founder' && (
              <div className="checkout-period-toggle">
                <button
                  type="button"
                  className={`checkout-period-btn ${period === 'monthly' ? 'active' : ''}`}
                  onClick={() => setPeriod('monthly')}
                >Monthly</button>
                <button
                  type="button"
                  className={`checkout-period-btn ${period === 'yearly' ? 'active' : ''}`}
                  onClick={() => setPeriod('yearly')}
                >Yearly · save 27%</button>
              </div>
            )}

            <div className="checkout-summary-line">
              <span>Subtotal</span>
              <strong>${amount}.00 USD</strong>
            </div>
            <div className="checkout-summary-line muted">
              <span>{periodLabel(period)}</span>
              <span>—</span>
            </div>
            <div className="checkout-summary-divider" />
            <div className="checkout-summary-line total">
              <span>Total today</span>
              <strong>${amount}.00 USD</strong>
            </div>

            <ul className="checkout-summary-features">
              <li><Check size={12} /> Cancel any time</li>
              <li><Check size={12} /> Pay in your local currency</li>
              <li><Check size={12} /> 24h manual review</li>
              <li><Check size={12} /> Full refund if anything goes wrong</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function periodLabel(p: BillingPeriod): string {
  if (p === 'yearly')   return 'billed once / year';
  if (p === 'one-time') return 'one-time payment · forever access';
  return 'billed monthly';
}

function isCountryActive(c: PaymentCountry, s: { mtnRwandaActive: boolean; mtnUgandaActive: boolean; mtnGhanaActive: boolean; mtnCameroonActive: boolean }): boolean {
  switch (c) {
    case 'Rwanda':   return s.mtnRwandaActive;
    case 'Uganda':   return s.mtnUgandaActive;
    case 'Ghana':    return s.mtnGhanaActive;
    case 'Cameroon': return s.mtnCameroonActive;
    case 'Other':    return true;
  }
}

function getMerchantForCountry(c: PaymentCountry, s: {
  mtnRwandaNumber: string; mtnRwandaName: string; mtnRwandaActive: boolean;
  mtnUgandaNumber: string; mtnUgandaName: string; mtnUgandaActive: boolean;
  mtnGhanaNumber:  string; mtnGhanaName:  string; mtnGhanaActive:  boolean;
  mtnCameroonNumber: string; mtnCameroonName: string; mtnCameroonActive: boolean;
}): { number: string; name: string; active: boolean } {
  switch (c) {
    case 'Rwanda':   return { number: s.mtnRwandaNumber,   name: s.mtnRwandaName,   active: s.mtnRwandaActive };
    case 'Uganda':   return { number: s.mtnUgandaNumber,   name: s.mtnUgandaName,   active: s.mtnUgandaActive };
    case 'Ghana':    return { number: s.mtnGhanaNumber,    name: s.mtnGhanaName,    active: s.mtnGhanaActive };
    case 'Cameroon': return { number: s.mtnCameroonNumber, name: s.mtnCameroonName, active: s.mtnCameroonActive };
    case 'Other':    return { number: '', name: '', active: false };
  }
}
