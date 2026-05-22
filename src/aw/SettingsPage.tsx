import { useEffect, useState } from 'react';
import { Check, Copy, Upload, AlertCircle, Smartphone, CreditCard, Globe, Bell, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { uploadPaymentScreenshot, dbLoadPaymentSettings } from '../lib/supabaseDb';
import { generateId } from '../utils/helpers';
import type { PaymentCountry, PaymentSettings, PlanName, BillingPeriod } from '../types';

interface Plan {
  name: PlanName;
  tagline: string;
  xaf: number;
  rwf: number;
  bullets: string[];
}

const PLANS: Plan[] = [
  { name: 'Starter', tagline: 'For one application season.',  xaf: 2000,  rwf: 5000,  bullets: ['5 writings', '20 rewrites', 'All writing modes'] },
  { name: 'Pro',     tagline: 'For applying to many programs.', xaf: 5000, rwf: 12000, bullets: ['20 writings', 'Advanced improvements', 'University tailoring'] },
  { name: 'Premium', tagline: 'Unlimited writing, premium coaching.', xaf: 15000, rwf: 35000, bullets: ['Unlimited (fair use)', 'Priority generation', 'Premium coaching panel'] },
];

const COUNTRIES: PaymentCountry[] = ['Rwanda', 'Uganda', 'Ghana', 'Cameroon', 'Other'];

export default function SettingsPage() {
  const { user, configured: authConfigured, signOut } = useAuth();
  const { studentProfile, currentPlan, paymentSettings: ctxSettings, submitPayment, payments } = useApp();

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  useEffect(() => {
    dbLoadPaymentSettings().then(setSettings).catch(() => setSettings(ctxSettings));
  }, [ctxSettings]);

  const [section, setSection] = useState<'plan' | 'account' | 'notifications'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <>
      <section className="aw-hero" style={{ padding: '24px 0 8px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)' }}>Settings.</h1>
        <p className="aw-hero-sub">Plan, payment, account. Calm and quick.</p>
      </section>

      <div style={{ maxWidth: 820, margin: '24px auto 0', display: 'flex', gap: 8, justifyContent: 'center' }}>
        <TabBtn active={section === 'plan'}          onClick={() => setSection('plan')}><CreditCard size={13} /> Plan & payment</TabBtn>
        <TabBtn active={section === 'account'}       onClick={() => setSection('account')}><Globe size={13} /> Account</TabBtn>
        <TabBtn active={section === 'notifications'} onClick={() => setSection('notifications')}><Bell size={13} /> Notifications</TabBtn>
      </div>

      {section === 'plan' && (
        <>
          <div style={{ maxWidth: 820, margin: '24px auto 0', textAlign: 'center', fontSize: 13, color: 'var(--aw-text-muted)' }}>
            Current plan: <strong style={{ color: 'var(--aw-text)' }}>{currentPlan}</strong> · {studentProfile.essaysUsedThisPeriod ?? 0} writings used this period
          </div>

          <div style={{ maxWidth: 820, margin: '20px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {PLANS.map(p => (
              <PlanCard key={p.name} plan={p} current={currentPlan === p.name} onPick={() => setSelectedPlan(p)} />
            ))}
          </div>

          {selectedPlan && settings && (
            <PaymentPanel
              plan={selectedPlan}
              settings={settings}
              userId={user?.id}
              authConfigured={authConfigured}
              defaultCountry={guessCountry(studentProfile.countryOfOrigin)}
              onSubmit={submitPayment}
              onClose={() => setSelectedPlan(null)}
            />
          )}

          {payments.length > 0 && (
            <div style={{ maxWidth: 820, margin: '40px auto 0' }}>
              <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 17, color: 'var(--aw-text)', marginBottom: 12 }}>Your payments</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {payments.slice().reverse().map(p => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--aw-glass)', border: '1px solid var(--aw-border)',
                    borderRadius: 'var(--aw-r-md)', padding: '12px 16px', fontSize: 13.5,
                  }}>
                    <div>
                      <strong style={{ color: 'var(--aw-text)' }}>{p.planName}</strong>
                      <span style={{ color: 'var(--aw-text-muted)' }}> · {p.paymentMethod} · {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: p.status === 'Approved' ? 'rgba(111, 174, 122, 0.18)' : p.status === 'Rejected' ? 'rgba(216, 112, 128, 0.18)' : 'var(--aw-gold-soft)',
                      color: p.status === 'Approved' ? '#7DC890' : p.status === 'Rejected' ? '#F2B5BE' : 'var(--aw-gold)',
                    }}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {section === 'account' && (
        <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
          <SectionBox title="Account">
            <Row k="Email"   v={user?.email ?? '—'} />
            <Row k="Name"    v={studentProfile.fullName || '—'} />
            <Row k="Country" v={studentProfile.countryOfOrigin || '—'} />
            <Row k="Plan"    v={currentPlan} />
          </SectionBox>
          {authConfigured && user && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="aw-pill-btn" onClick={() => signOut()}>
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      )}

      {section === 'notifications' && (
        <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
          <SectionBox title="Notifications">
            <p style={{ color: 'var(--aw-text-soft)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              We keep it quiet. The only notifications we'll send are payment approvals and major deadline reminders for scholarships you save from Finder. More controls coming soon.
            </p>
          </SectionBox>
        </div>
      )}
    </>
  );
}

// ─── Plan Card ────────────────────────────────────────────────

function PlanCard({ plan, current, onPick }: { plan: Plan; current: boolean; onPick: () => void }) {
  return (
    <div style={{
      background: 'var(--aw-surface)',
      border: current ? '1px solid rgba(139, 124, 246, 0.45)' : '1px solid var(--aw-border)',
      borderRadius: 'var(--aw-r-lg)',
      padding: 22,
      position: 'relative',
    }}>
      {current && (
        <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 600, color: 'var(--aw-purple)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Current
        </div>
      )}
      <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 22, margin: 0, color: 'var(--aw-text)', fontWeight: 600 }}>{plan.name}</h3>
      <p style={{ fontSize: 13, color: 'var(--aw-text-muted)', margin: '4px 0 14px' }}>{plan.tagline}</p>
      <div style={{ fontSize: 15, color: 'var(--aw-text-soft)', marginBottom: 14 }}>
        <strong style={{ color: 'var(--aw-text)', fontSize: 17 }}>{plan.xaf.toLocaleString()} XAF</strong>
        <span style={{ color: 'var(--aw-text-muted)' }}> · {plan.rwf.toLocaleString()} RWF</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.bullets.map(b => (
          <li key={b} style={{ fontSize: 13.5, color: 'var(--aw-text-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={13} style={{ color: 'var(--aw-purple)', flexShrink: 0 }} /> {b}
          </li>
        ))}
      </ul>
      <button className="aw-pill-btn primary" onClick={onPick} style={{ width: '100%', justifyContent: 'center' }}>
        Choose {plan.name}
      </button>
    </div>
  );
}

// ─── Payment Panel ────────────────────────────────────────────

function PaymentPanel({
  plan, settings, userId, authConfigured, defaultCountry, onSubmit, onClose,
}: {
  plan: Plan;
  settings: PaymentSettings;
  userId: string | undefined;
  authConfigured: boolean;
  defaultCountry: PaymentCountry;
  onSubmit: (p: Parameters<ReturnType<typeof useApp>['submitPayment']>[0]) => void;
  onClose: () => void;
}) {
  const [country, setCountry] = useState<PaymentCountry>(defaultCountry);
  const [txRef, setTxRef] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const merchant = getMerchant(settings, country);
  const amount = country === 'Cameroon' ? plan.xaf : country === 'Rwanda' ? plan.rwf : plan.xaf;
  const currency = country === 'Cameroon' ? 'XAF' : country === 'Rwanda' ? 'RWF' : 'XAF';
  const period: BillingPeriod = 'monthly';

  const copyNumber = () => {
    if (!merchant.number) return;
    navigator.clipboard.writeText(merchant.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const submit = async () => {
    setError('');
    if (!authConfigured || !userId) { setError('Sign in first to submit payment.'); return; }
    if (!merchant.active || !merchant.number) {
      setError("Payment isn't configured for this country yet. " + (settings.fallbackInstructions || 'Contact support.'));
      return;
    }
    if (!txRef.trim()) { setError('Enter the transaction reference from your MoMo SMS.'); return; }
    if (!file)         { setError('Upload a screenshot of your payment confirmation.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Screenshot must be under 5 MB.'); return; }

    setSubmitting(true);
    const paymentId = generateId();
    try {
      const upload = await uploadPaymentScreenshot(userId, paymentId, file);
      if (!upload) throw new Error('Could not upload your screenshot. Check your connection.');

      onSubmit({
        id: paymentId,
        planName: plan.name,
        amount,
        currency,
        paymentMethod: `MTN MoMo · ${country}`,
        transactionReference: txRef.trim(),
        screenshotUrl: upload.signedUrl,
        screenshotPath: upload.path,
        status: 'Pending',
        creditsAdded: 0,
        period,
        country,
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={panelStyle}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="aw-placeholder-mark" style={{ background: 'rgba(111, 174, 122, 0.18)', color: '#7DC890', border: '1px solid rgba(111, 174, 122, 0.3)' }}>
            <Check size={24} />
          </div>
          <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 22, margin: '0 0 8px' }}>Payment submitted.</h3>
          <p style={{ color: 'var(--aw-text-soft)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            We'll review and activate your plan within a few hours. You can keep writing in the meantime.
          </p>
          <button className="aw-pill-btn primary" onClick={onClose} style={{ marginTop: 22 }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 22, margin: 0 }}>Pay for {plan.name}</h3>
          <p style={{ fontSize: 13, color: 'var(--aw-text-muted)', margin: '4px 0 0' }}>
            {amount.toLocaleString()} {currency} · one-time for this month
          </p>
        </div>
        <button className="aw-pill-btn" onClick={onClose}>Close</button>
      </div>

      <Field label="Your country">
        <select value={country} onChange={e => setCountry(e.target.value as PaymentCountry)} style={inputStyle}>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      {!merchant.active && (
        <div className="aw-error-banner" style={{ marginTop: 12 }}>
          <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
          Payment for {country} isn't configured yet. {settings.fallbackInstructions || 'Please contact support.'}
        </div>
      )}

      {merchant.active && (
        <>
          <div style={{
            background: 'var(--aw-purple-soft)',
            border: '1px solid rgba(139, 124, 246, 0.25)',
            borderRadius: 'var(--aw-r-md)',
            padding: 16,
            margin: '16px 0',
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--aw-purple)', marginBottom: 8, fontWeight: 600 }}>
              <Smartphone size={12} style={{ verticalAlign: -1, marginRight: 6 }} /> Send via MTN MoMo
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, color: 'var(--aw-text)', fontWeight: 600, fontFamily: 'var(--aw-font-serif)' }}>{merchant.number}</div>
                <div style={{ fontSize: 12.5, color: 'var(--aw-text-muted)', marginTop: 2 }}>{merchant.name}</div>
              </div>
              <button className="aw-pill-btn" onClick={copyNumber}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--aw-text-soft)', marginTop: 10, lineHeight: 1.55 }}>
              Send <strong>{amount.toLocaleString()} {currency}</strong>, then paste the transaction reference from your confirmation SMS below.
            </div>
          </div>

          <Field label="Transaction reference">
            <input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="e.g. CI230523.1234.A56789" style={inputStyle} />
          </Field>

          <Field label="Screenshot of confirmation">
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: 14,
              background: 'var(--aw-surface-2)', border: '1px dashed var(--aw-border-strong)',
              borderRadius: 'var(--aw-r-sm)', cursor: 'pointer', color: 'var(--aw-text-soft)',
            }}>
              <Upload size={15} />
              <span style={{ fontSize: 13.5 }}>{file ? file.name : 'Tap to upload screenshot (max 5 MB)'}</span>
              <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>

          {error && <div className="aw-error-banner">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="aw-send-btn" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit payment'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: '28px auto 0',
  background: 'var(--aw-surface)',
  border: '1px solid var(--aw-border)',
  borderRadius: 'var(--aw-r-lg)',
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--aw-surface-2)',
  border: '1px solid var(--aw-border)',
  borderRadius: 'var(--aw-r-sm)',
  color: 'var(--aw-text)',
  padding: '10px 14px',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginTop: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--aw-text-muted)', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="aw-pill-btn"
      style={active ? { background: 'var(--aw-purple-soft)', color: 'var(--aw-text)', borderColor: 'rgba(139, 124, 246, 0.25)' } : undefined}
    >
      {children}
    </button>
  );
}

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--aw-glass)',
      border: '1px solid var(--aw-border)',
      borderRadius: 'var(--aw-r-lg)',
      padding: '20px 22px',
    }}>
      <h3 style={{ fontFamily: 'var(--aw-font-serif)', fontSize: 16, margin: '0 0 14px', fontWeight: 600 }}>{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--aw-border)', fontSize: 14 }}>
      <span style={{ color: 'var(--aw-text-muted)' }}>{k}</span>
      <span style={{ color: 'var(--aw-text)' }}>{v}</span>
    </div>
  );
}

function getMerchant(settings: PaymentSettings, country: PaymentCountry) {
  switch (country) {
    case 'Rwanda':   return { number: settings.mtnRwandaNumber,   name: settings.mtnRwandaName,   active: settings.mtnRwandaActive };
    case 'Uganda':   return { number: settings.mtnUgandaNumber,   name: settings.mtnUgandaName,   active: settings.mtnUgandaActive };
    case 'Ghana':    return { number: settings.mtnGhanaNumber,    name: settings.mtnGhanaName,    active: settings.mtnGhanaActive };
    case 'Cameroon': return { number: settings.mtnCameroonNumber, name: settings.mtnCameroonName, active: settings.mtnCameroonActive };
    default:         return { number: '', name: '', active: false };
  }
}

function guessCountry(origin: string): PaymentCountry {
  const c = (origin || '').toLowerCase();
  if (c.includes('rwand'))  return 'Rwanda';
  if (c.includes('ugand'))  return 'Uganda';
  if (c.includes('ghan'))   return 'Ghana';
  if (c.includes('camero')) return 'Cameroon';
  return 'Cameroon';
}
