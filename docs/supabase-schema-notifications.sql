-- ApplyWise Africa — Payment notification trigger
-- ────────────────────────────────────────────────────────────────────
-- When a new payment lands in `payments` table, send an email to the
-- admin via Brevo's transactional API. Runs entirely inside Postgres
-- using the pg_net extension — no Edge Function, no exposed keys in
-- the browser.
--
-- PREREQUISITES — DO THESE ONCE BEFORE RUNNING THIS FILE:
--
--   1. Get a Brevo API key for transactional email:
--        Brevo dashboard → SMTP & API → API keys tab → "Generate a new
--        API key" (NOT an SMTP key; this is the REST API one).
--        Name it `applywise-supabase-notify`. Copy the value.
--
--   2. Store the key as a Supabase Vault secret so it never touches
--      client code. In Supabase dashboard:
--        Project Settings → Vault → "New secret"
--        Name: brevo_api_key
--        Value: <paste the key>
--
--   3. Enable pg_net (the Postgres HTTP extension):
--        Database → Extensions → search "pg_net" → enable.
--      Already enabled on most Supabase projects.
--
--   4. THEN run this entire file in the SQL Editor.
--
-- TO TEST AFTER RUNNING: in the SQL Editor, do
--      select notify_admin_of_new_payment_test();
-- It will send a test email to dieudonnen450@gmail.com immediately.
-- ────────────────────────────────────────────────────────────────────

-- Enable pg_net (idempotent — does nothing if already enabled)
create extension if not exists pg_net with schema extensions;

-- ────────────────────────────────────────────────────────────────────
-- Trigger function: send admin notification when a payment is inserted
-- Note: we use $body$...$body$ tagged dollar-quotes for the function
-- body so the inner string templates can use plain quotes without
-- colliding with the outer delimiter.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.notify_admin_of_new_payment()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $body$
declare
  brevo_key text;
  payer_email text;
  body_html text;
  body_text text;
  subject text;
begin
  -- Pull the Brevo REST API key from Vault.
  begin
    select decrypted_secret into brevo_key
    from vault.decrypted_secrets where name = 'brevo_api_key';
  exception when others then
    brevo_key := null;
  end;

  if brevo_key is null or brevo_key = '' then
    raise log '[notify_admin_of_new_payment] brevo_api_key not found in Vault; skipping email';
    return new;
  end if;

  -- Look up the payer's email so the admin knows who to contact
  select email into payer_email from auth.users where id = new.user_id;
  if payer_email is null then payer_email := '(unknown)'; end if;

  subject := format('💸 New %s payment — $%s — %s', new.plan_name, new.amount, payer_email);

  body_text :=
    E'New ApplyWise payment received.\n\n' ||
    'Plan:           ' || new.plan_name || E'\n' ||
    'Period:         ' || new.period || E'\n' ||
    'Amount:         $' || new.amount || ' ' || new.currency || E'\n' ||
    'Payer email:    ' || payer_email || E'\n' ||
    'User ID:        ' || new.user_id || E'\n' ||
    'Country:        ' || coalesce(new.country, '—') || E'\n' ||
    'Payment method: ' || coalesce(new.payment_method, '—') || E'\n' ||
    'Transaction:    ' || coalesce(new.transaction_reference, '—') || E'\n' ||
    'Status:         ' || new.status || E'\n' ||
    'Submitted at:   ' || new.created_at || E'\n\n' ||
    'Review and approve in the admin panel:' || E'\n' ||
    'https://applywise.africa/admin' || E'\n';

  body_html :=
    '<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;color:#3D2B2F">' ||
    '<h2 style="font-family:Georgia,serif;color:#C97F89">💸 New payment received</h2>' ||
    '<p>A user just submitted a payment for review.</p>' ||
    '<table style="border-collapse:collapse;width:100%;margin:14px 0;font-size:14px">' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Plan</b></td><td style="padding:6px 10px">' || new.plan_name || ' · ' || new.period || '</td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Amount</b></td><td style="padding:6px 10px"><b style="color:#C97F89">$' || new.amount || ' ' || new.currency || '</b></td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Payer</b></td><td style="padding:6px 10px">' || payer_email || '</td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Country</b></td><td style="padding:6px 10px">' || coalesce(new.country, '—') || '</td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Method</b></td><td style="padding:6px 10px">' || coalesce(new.payment_method, '—') || '</td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Transaction ref</b></td><td style="padding:6px 10px;font-family:monospace">' || coalesce(new.transaction_reference, '—') || '</td></tr>' ||
    '<tr><td style="padding:6px 10px;background:#FBF1EC"><b>Submitted</b></td><td style="padding:6px 10px">' || new.created_at || '</td></tr>' ||
    '</table>' ||
    '<p style="margin-top:18px">' ||
    '<a href="https://applywise.africa/admin" style="display:inline-block;padding:10px 18px;background:#C97F89;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Review in Admin →</a>' ||
    '</p>' ||
    '<p style="margin-top:24px;color:#9C8589;font-size:12px">User ID: <code>' || new.user_id || '</code></p>' ||
    '</div>';

  -- Fire-and-forget HTTP POST to Brevo. pg_net queues this and runs
  -- asynchronously, so it never blocks the user's submitPayment() call.
  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'api-key', brevo_key,
      'Content-Type', 'application/json',
      'accept', 'application/json'
    ),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'ApplyWise Africa', 'email', 'noreply@applywise.africa'),
      'to', jsonb_build_array(jsonb_build_object('email', 'dieudonnen450@gmail.com', 'name', 'Dieudonne')),
      'replyTo', jsonb_build_object('email', payer_email),
      'subject', subject,
      'htmlContent', body_html,
      'textContent', body_text
    )
  );

  return new;
end;
$body$;

-- Hook the trigger up to INSERTs on payments
drop trigger if exists trg_notify_admin_of_new_payment on public.payments;
create trigger trg_notify_admin_of_new_payment
  after insert on public.payments
  for each row execute function public.notify_admin_of_new_payment();

-- ────────────────────────────────────────────────────────────────────
-- Helper for manual testing — run this in SQL Editor to send a test
-- email RIGHT NOW without creating an actual payment.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.notify_admin_of_new_payment_test()
returns text
language plpgsql
security definer
as $body$
declare
  brevo_key text;
  req_id bigint;
begin
  select decrypted_secret into brevo_key
  from vault.decrypted_secrets where name = 'brevo_api_key';
  if brevo_key is null then
    return 'FAILED: brevo_api_key not set in Vault. Add it under Project Settings → Vault.';
  end if;

  select net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'api-key', brevo_key,
      'Content-Type', 'application/json',
      'accept', 'application/json'
    ),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'ApplyWise Africa', 'email', 'noreply@applywise.africa'),
      'to', jsonb_build_array(jsonb_build_object('email', 'dieudonnen450@gmail.com')),
      'subject', '✅ Test: ApplyWise payment notifications are working',
      'htmlContent', '<p>If you are reading this, the Postgres → Brevo notification trigger is live. Real payments will now arrive here automatically.</p>'
    )
  ) into req_id;

  return 'Test queued. Check your inbox in a few seconds. (Request id: ' || req_id::text || ')';
end;
$body$;

-- ────────────────────────────────────────────────────────────────────
-- DONE. From now on, every new row in `payments` triggers an email to
-- dieudonnen450@gmail.com.
--
-- Run `select notify_admin_of_new_payment_test();` in SQL Editor to verify.
-- ────────────────────────────────────────────────────────────────────
