import { supabase } from './supabase';

// ── Payment screenshot upload ──────────────────────────────────

export async function uploadPaymentScreenshot(
  userId: string,
  file: File
): Promise<string | null> {
  if (!supabase) return null;

  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('payment-screenshots')
    .upload(path, file, { upsert: false });

  if (error) {
    console.error('Screenshot upload error:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('payment-screenshots')
    .getPublicUrl(path);

  return data?.publicUrl ?? null;
}

// ── Writing document save ──────────────────────────────────────

export async function saveWritingDocument(
  userId: string,
  docId: string,
  content: string
): Promise<string | null> {
  if (!supabase) return null;

  const path = `${userId}/${docId}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });

  const { error } = await supabase.storage
    .from('writing-documents')
    .upload(path, blob, { upsert: true });

  if (error) {
    console.error('Writing save error:', error.message);
    return null;
  }

  return path;
}

// ── Load writing document ──────────────────────────────────────

export async function loadWritingDocument(
  userId: string,
  docId: string
): Promise<string | null> {
  if (!supabase) return null;

  const path = `${userId}/${docId}.txt`;

  const { data, error } = await supabase.storage
    .from('writing-documents')
    .download(path);

  if (error || !data) return null;

  return data.text();
}
