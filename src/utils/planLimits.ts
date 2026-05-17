import type { PlanName } from '../types';

/**
 * Plan limits — match what's promised on the Landing pricing section and
 * the Billing page exactly. Update both when changing these numbers.
 *
 * UNLIMITED is represented by a very large number rather than `Infinity`
 * so the UI can still render "X / Y" comparisons without special-casing.
 */
const UNLIMITED = 9_999_999;

export interface PlanLimits {
  essaysPerMonth: number;
  lettersPerMonth: number;
}

export function getPlanLimits(plan: PlanName): PlanLimits {
  switch (plan) {
    case 'Free':    return { essaysPerMonth: 1,         lettersPerMonth: 1         };
    case 'Starter': return { essaysPerMonth: 5,         lettersPerMonth: 3         };
    case 'Pro':     return { essaysPerMonth: UNLIMITED, lettersPerMonth: UNLIMITED };
    case 'Premium': return { essaysPerMonth: UNLIMITED, lettersPerMonth: UNLIMITED };
  }
}

export function isUnlimited(n: number): boolean {
  return n >= UNLIMITED;
}

/**
 * The current billing period is a calendar month rooted at usagePeriodStarted.
 * Returns true if the period has rolled over and counters should reset.
 */
export function shouldResetUsagePeriod(usagePeriodStarted: string): boolean {
  if (!usagePeriodStarted) return true;
  const started = new Date(usagePeriodStarted);
  if (Number.isNaN(started.getTime())) return true;
  const now = new Date();
  return (
    started.getUTCFullYear() !== now.getUTCFullYear()
    || started.getUTCMonth() !== now.getUTCMonth()
  );
}

export interface Remaining {
  essays: number;     // remaining this month (clamped to UNLIMITED for display)
  letters: number;
  essaysCapped: boolean;
  lettersCapped: boolean;
  plan: PlanName;
}

export function getRemaining(
  plan: PlanName,
  essaysUsed: number,
  lettersUsed: number,
): Remaining {
  const limits = getPlanLimits(plan);
  return {
    essays: Math.max(0, limits.essaysPerMonth - essaysUsed),
    letters: Math.max(0, limits.lettersPerMonth - lettersUsed),
    essaysCapped: !isUnlimited(limits.essaysPerMonth),
    lettersCapped: !isUnlimited(limits.lettersPerMonth),
    plan,
  };
}

/** "2 of 5" or "Unlimited" — used in pills and labels */
export function formatUsage(used: number, limit: number): string {
  if (isUnlimited(limit)) return 'Unlimited';
  return `${used} of ${limit}`;
}
