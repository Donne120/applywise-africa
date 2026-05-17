import type { User } from '@supabase/supabase-js';

/**
 * Hardcoded admin allowlist. Anyone else who tries to visit /admin
 * gets bounced to /today, and the user-menu doesn't even show them
 * the Admin link.
 *
 * To add another admin: add their email here (lowercase).
 * Long-term we'll move this to an `is_admin` column on student_profiles
 * — but for v1 with one admin (the founder), hardcode is simpler and safer.
 *
 * Note: This is *UI gating only*. The real security comes from Supabase
 * RLS policies, which prevent non-owners from reading other users' data
 * regardless of what the client UI does.
 */
const ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'd.ngum@alustudent.com',
  'dieudonnen450@gmail.com',
]);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function isAdminUser(user: User | null): boolean {
  return isAdminEmail(user?.email);
}
