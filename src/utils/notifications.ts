/** Deadline-reminder notifications.
 *
 *  Strategy:
 *  - Permission requested via a soft in-app prompt (NotifyPrompt component),
 *    not a cold browser modal.
 *  - On each scheduler tick we look at every scholarship and fire a
 *    notification when its days-left crosses a milestone (30/14/7/3/1/0).
 *  - A localStorage ledger tracks `${scholarshipId}:${milestone}` so each
 *    milestone fires at most once per scholarship.
 *  - Browser-only (web push would need a server). When wrapped with
 *    Capacitor, replace fireNotification with a native local-notification
 *    plugin call.
 */

import type { Scholarship } from '../types';

const LEDGER_KEY = 'udonpass-notif-ledger-v1';
const PROMPT_KEY = 'udonpass-notif-prompt-v1';
export const MILESTONES = [30, 14, 7, 3, 1, 0] as const;
export type Milestone = typeof MILESTONES[number];

function readLedger(): Record<string, true> {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeLedger(l: Record<string, true>) {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationsPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return await Notification.requestPermission();
}

export function softPromptDismissed(): boolean {
  try { return localStorage.getItem(PROMPT_KEY) === '1'; } catch { return false; }
}
export function dismissSoftPrompt() {
  try { localStorage.setItem(PROMPT_KEY, '1'); } catch { /* ignore */ }
}

function fire(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    });
  } catch { /* some browsers throw if document is hidden under quotas */ }
}

function milestoneFor(daysLeft: number): Milestone | null {
  for (const m of MILESTONES) {
    if (daysLeft === m) return m;
  }
  return null;
}

function copyFor(s: Scholarship, m: Milestone): { title: string; body: string } {
  if (m === 0) {
    return {
      title: `🚨 ${s.name} closes today`,
      body: `Last chance — submit before midnight.`,
    };
  }
  if (m === 1) {
    return {
      title: `⏰ ${s.name} closes tomorrow`,
      body: `One day left. Final review and submit.`,
    };
  }
  if (m <= 7) {
    return {
      title: `⏳ ${s.name} — ${m} days left`,
      body: `Crunch week. Make today the day you submit.`,
    };
  }
  return {
    title: `📅 ${s.name} — ${m} days left`,
    body: `Stay on track. Open your workspace and chip away.`,
  };
}

/** Walk all scholarships and fire any pending milestone notifications. */
export function runDeadlineScan(scholarships: Scholarship[]) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const ledger = readLedger();
  let dirty = false;

  for (const s of scholarships) {
    if (s.isPastDue) continue;
    if (s.daysLeft === null || s.daysLeft === undefined) continue;
    if (s.status === 'Submitted' || s.status === 'Accepted' || s.status === 'Rejected') continue;
    const m = milestoneFor(s.daysLeft);
    if (m === null) continue;
    const key = `${s.id}:${m}`;
    if (ledger[key]) continue;
    const { title, body } = copyFor(s, m);
    fire(title, body, key);
    ledger[key] = true;
    dirty = true;
  }

  if (dirty) writeLedger(ledger);
}

/** Clear ledger entries for a given scholarship (e.g. on submit/delete). */
export function clearLedgerForScholarship(scholarshipId: string) {
  const ledger = readLedger();
  let dirty = false;
  for (const key of Object.keys(ledger)) {
    if (key.startsWith(scholarshipId + ':')) {
      delete ledger[key];
      dirty = true;
    }
  }
  if (dirty) writeLedger(ledger);
}
