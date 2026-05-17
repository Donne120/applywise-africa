import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Check, X, RefreshCw, Search, Settings, CreditCard,
  Image as ImageIcon, AlertCircle, Eye, Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { dbLoadAllPayments } from '../lib/supabaseDb';
import type { Payment, PaymentSettings } from '../types';

type AdminTab = 'payments' | 'settings';

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('payments');

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div>
          <h1><ShieldCheck size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} /> Admin</h1>
          <p className="page-subtitle">Review payments and configure payout settings.</p>
        </div>
      </div>

      <div className="admin-tabs-row">
        <button
          className={`admin-tab ${tab === 'payments' ? 'active' : ''}`}
          onClick={() => setTab('payments')}
        >
          <CreditCard size={14} /> Payments
        </button>
        <button
          className={`admin-tab ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <Settings size={14} /> Payout settings
        </button>
      </div>

      {tab === 'payments' ? <PaymentsTab /> : <SettingsTab />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Payments tab — all users, sortable, screenshot preview, approve/reject
// ────────────────────────────────────────────────────────────────────

type AllPayment = Payment & { userId: string; userEmail?: string };

function PaymentsTab() {
  const { approvePayment, rejectPayment, payments: localPayments } = useApp();
  const { configured } = useAuth();

  const [all, setAll] = useState<AllPayment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function refresh() {
    if (!configured) {
      // No cloud — show only this admin's own local payments.
      setAll(localPayments.map(p => ({ ...p, userId: 'local' })));
      return;
    }
    setLoading(true);
    try {
      const list = await dbLoadAllPayments();
      setAll(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [configured, localPayments.length]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const q = search.trim().toLowerCase();
    return all
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .filter(p => {
        if (!q) return true;
        return (
          p.transactionReference.toLowerCase().includes(q)
          || p.userEmail?.toLowerCase().includes(q)
          || p.planName.toLowerCase().includes(q)
          || p.country.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Pending first; then by date desc
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (b.status === 'Pending' && a.status !== 'Pending') return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [all, search, statusFilter]);

  const counts = useMemo(() => {
    if (!all) return { all: 0, Pending: 0, Approved: 0, Rejected: 0 };
    return all.reduce((acc, p) => {
      acc.all++;
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, { all: 0, Pending: 0, Approved: 0, Rejected: 0 } as Record<string, number>);
  }, [all]);

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={14} />
          <input
            placeholder="Search by ref, email, plan, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-pills">
          {(['Pending', 'Approved', 'Rejected', 'all'] as const).map(s => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {!all ? (
        <div className="admin-loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🌸</div>
          <h3>No payments match</h3>
          <p>Try a different filter or search term.</p>
        </div>
      ) : (
        <div className="admin-payments-list">
          {filtered.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onApprove={() => { approvePayment(p.id); refresh(); }}
              onReject={() => { rejectPayment(p.id); refresh(); }}
              onPreview={() => setPreviewUrl(p.screenshotUrl)}
            />
          ))}
        </div>
      )}

      {previewUrl && (
        <ScreenshotPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  );
}

function PaymentRow({ payment: p, onApprove, onReject, onPreview }: {
  payment: AllPayment;
  onApprove: () => void;
  onReject: () => void;
  onPreview: () => void;
}) {
  const isPending = p.status === 'Pending';
  return (
    <div className={`admin-payment-card status-${p.status.toLowerCase()}`}>
      <div className="admin-payment-main">
        <div className="admin-payment-head">
          <span className="admin-payment-plan">{p.planName}</span>
          <span className={`status-pill status-${p.status.toLowerCase()}`}>{p.status}</span>
          <span className="admin-payment-amount">${p.amount} {p.currency}</span>
          <span className="admin-payment-period">{p.period}</span>
        </div>
        <div className="admin-payment-meta">
          {p.country && <><strong>{p.country}</strong> · </>}
          {p.paymentMethod && <>{p.paymentMethod} · </>}
          {p.transactionReference && <>Ref <code>{p.transactionReference}</code> · </>}
          {new Date(p.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        <div className="admin-payment-user">
          User: <code>{p.userId.slice(0, 12)}…</code>
          {p.userEmail && ` · ${p.userEmail}`}
        </div>
      </div>

      <div className="admin-payment-actions">
        {p.screenshotUrl ? (
          <button className="btn btn-secondary btn-sm" onClick={onPreview} title="View screenshot">
            <Eye size={13} /> Proof
          </button>
        ) : (
          <span className="admin-payment-noimg" title="No screenshot uploaded">
            <ImageIcon size={13} /> No proof
          </span>
        )}
        {isPending && (
          <>
            <button className="btn-approve" onClick={onApprove}><Check size={13} /> Approve</button>
            <button className="btn-reject" onClick={onReject}><X size={13} /> Reject</button>
          </>
        )}
      </div>
    </div>
  );
}

function ScreenshotPreview({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal screenshot-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Payment screenshot</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="screenshot-modal-body">
          <img src={url} alt="Payment confirmation" />
          <a className="btn btn-secondary mt-2" href={url} target="_blank" rel="noreferrer">
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Settings tab — MTN MoMo numbers per country
// ────────────────────────────────────────────────────────────────────

function SettingsTab() {
  const { paymentSettings, updatePaymentSettings } = useApp();
  const [draft, setDraft] = useState<PaymentSettings>(paymentSettings);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(paymentSettings); }, [paymentSettings]);

  async function save() {
    setSaveError('');
    setSaving(true);
    const res = await updatePaymentSettings(draft);
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error || 'Save failed. Check your connection and Supabase RLS policies.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function bind<K extends keyof PaymentSettings>(key: K) {
    return {
      value: draft[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(d => ({ ...d, [key]: e.target.value })),
    };
  }

  function bindBool<K extends keyof PaymentSettings>(key: K) {
    return {
      checked: draft[key] as boolean,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft(d => ({ ...d, [key]: e.target.checked })),
    };
  }

  const countries: Array<{
    label: string;
    numKey: keyof PaymentSettings;
    nameKey: keyof PaymentSettings;
    activeKey: keyof PaymentSettings;
  }> = [
    { label: 'Rwanda',   numKey: 'mtnRwandaNumber',   nameKey: 'mtnRwandaName',   activeKey: 'mtnRwandaActive' },
    { label: 'Uganda',   numKey: 'mtnUgandaNumber',   nameKey: 'mtnUgandaName',   activeKey: 'mtnUgandaActive' },
    { label: 'Ghana',    numKey: 'mtnGhanaNumber',    nameKey: 'mtnGhanaName',    activeKey: 'mtnGhanaActive' },
    { label: 'Cameroon', numKey: 'mtnCameroonNumber', nameKey: 'mtnCameroonName', activeKey: 'mtnCameroonActive' },
  ];

  return (
    <div className="admin-settings">
      <div className="admin-settings-intro">
        <AlertCircle size={14} />
        <p>
          MTN MoMo numbers shown to students on the checkout page. Toggle <strong>Active</strong> on
          to actually accept payments in that country. Changes save to Supabase and propagate to
          everyone immediately.
        </p>
      </div>

      {countries.map(c => (
        <div key={c.label} className="admin-country-card">
          <div className="admin-country-head">
            <h3>{c.label}</h3>
            <label className="admin-toggle">
              <input type="checkbox" {...bindBool(c.activeKey)} />
              <span>{(draft[c.activeKey] as boolean) ? 'Active' : 'Off'}</span>
            </label>
          </div>
          <div className="admin-country-fields">
            <div className="form-field">
              <label>MTN MoMo number</label>
              <input
                {...bind(c.numKey)}
                placeholder="e.g. 0788123456"
                disabled={!(draft[c.activeKey] as boolean)}
              />
            </div>
            <div className="form-field">
              <label>Account name (shown on confirmation)</label>
              <input
                {...bind(c.nameKey)}
                placeholder="e.g. Dieudonne Ngum"
                disabled={!(draft[c.activeKey] as boolean)}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="admin-country-card">
        <div className="admin-country-head"><h3>Fallback for unsupported countries</h3></div>
        <div className="form-field">
          <label>What students see when their country isn't configured</label>
          <textarea
            rows={3}
            {...bind('fallbackInstructions')}
            placeholder="e.g. Contact support@applywise.africa to arrange payment."
          />
        </div>
      </div>

      {saveError && (
        <div className="aw-error">
          <AlertCircle size={14} /> {saveError}
        </div>
      )}
      <div className="admin-save-row">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
