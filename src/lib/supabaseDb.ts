/**
 * Cloud persistence helpers.
 *
 * Each table gets two functions: dbLoadX(userId) and dbSaveX(userId, x).
 * Delete is dbDeleteX(id). They all no-op silently if Supabase isn't configured,
 * so the local-only path keeps working in dev.
 *
 * Naming: TypeScript uses camelCase, Postgres uses snake_case. The mapping
 * functions in here are the one place that knows about both shapes.
 */

import { supabase } from './supabase';
import type {
  StudentProfile, Scholarship, Task, Story, Recommender, Retrospective,
  LearningResource, WritingDocument, Payment, FieldCategory, DegreeLevel,
  GpaBand, EnglishLevel, ScholarshipStatus, Priority, FocusArea, TaskCategory,
  TaskStatus, LearningStatus, DifficultyLevel, StoryTheme, RecommenderStatus,
  RecommenderRelation, WritingType, WritingTone, OutputStyle, ParagraphLength,
  CountryStyle, WritingDocStatus, QualityScores, PaymentStatus, PlanName,
  BillingPeriod, PaymentSettings,
} from '../types';

const ok = () => !!supabase;

// ────────────────────────────────────────────────────────────────────
// Student Profile  (single row per user, keyed by user_id)
// ────────────────────────────────────────────────────────────────────

export async function dbSaveProfile(userId: string, p: StudentProfile): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('student_profiles').upsert({
    user_id: userId,
    full_name: p.fullName,
    country_of_origin: p.countryOfOrigin,
    field_category: p.fieldCategory,
    field_specific: p.fieldSpecific,
    education_level: p.educationLevel,
    intended_degree_level: p.intendedDegreeLevel,
    current_gpa: p.currentGpa,
    english_level: p.englishLevel,
    target_countries: p.targetCountries,
    preferred_programs: p.preferredPrograms,
    academic_background: p.academicBackground,
    work_experience: p.workExperience,
    projects: p.projects,
    achievements: p.achievements,
    challenges: p.challenges,
    career_goals: p.careerGoals,
    personal_story_notes: p.personalStoryNotes,
    onboarding_complete: p.onboardingComplete,
    current_plan: p.currentPlan,
    essays_used_this_period: p.essaysUsedThisPeriod,
    letters_used_this_period: p.lettersUsedThisPeriod,
    usage_period_started: p.usagePeriodStarted,
  });
  if (error) console.warn('[db] saveProfile:', error.message);
}

export async function dbLoadProfile(userId: string): Promise<Partial<StudentProfile> | null> {
  if (!ok()) return null;
  const { data, error } = await supabase!
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    fullName: data.full_name ?? '',
    countryOfOrigin: data.country_of_origin ?? '',
    fieldCategory: (data.field_category ?? 'STEM') as FieldCategory,
    fieldSpecific: data.field_specific ?? '',
    educationLevel: data.education_level ?? '',
    intendedDegreeLevel: (data.intended_degree_level ?? "Master's") as DegreeLevel,
    currentGpa: (data.current_gpa ?? 'Strong (B+ / 3.3+)') as GpaBand,
    englishLevel: (data.english_level ?? 'Advanced') as EnglishLevel,
    targetCountries: data.target_countries ?? '',
    preferredPrograms: data.preferred_programs ?? '',
    academicBackground: data.academic_background ?? '',
    workExperience: data.work_experience ?? '',
    projects: data.projects ?? '',
    achievements: data.achievements ?? '',
    challenges: data.challenges ?? '',
    careerGoals: data.career_goals ?? '',
    personalStoryNotes: data.personal_story_notes ?? '',
    onboardingComplete: !!data.onboarding_complete,
    currentPlan: (data.current_plan ?? 'Free') as PlanName,
    essaysUsedThisPeriod: data.essays_used_this_period ?? 0,
    lettersUsedThisPeriod: data.letters_used_this_period ?? 0,
    usagePeriodStarted: data.usage_period_started ?? new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────
// Scholarships
// ────────────────────────────────────────────────────────────────────

export async function dbSaveScholarship(userId: string, s: Scholarship): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('scholarships').upsert({
    id: s.id,
    user_id: userId,
    name: s.name,
    institution: s.institution,
    country: s.country,
    country_code: s.countryCode,
    focus_area: s.focusArea,
    status: s.status,
    priority: s.priority,
    funding: s.funding,
    funding_type: s.fundingType,
    deadline: s.deadline || null,
    days_left: s.daysLeft,
    is_past_due: s.isPastDue,
    eligibility_confirmed: s.eligibilityConfirmed,
    requirements: s.requirements,
    notes: s.notes,
    url: s.url,
  });
  if (error) console.warn('[db] saveScholarship:', error.message);
}

export async function dbLoadScholarships(userId: string): Promise<Scholarship[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('scholarships').select('*').eq('user_id', userId).order('deadline', { ascending: true });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    name: r.name,
    institution: r.institution ?? '',
    country: r.country ?? '',
    countryCode: r.country_code ?? '',
    focusArea: (r.focus_area ?? 'AI Systems Engineering') as FocusArea,
    status: (r.status ?? 'Not Started') as ScholarshipStatus,
    priority: (r.priority ?? 'Medium') as Priority,
    funding: r.funding ?? '',
    fundingType: (r.funding_type ?? 'Fully Funded') as Scholarship['fundingType'],
    deadline: r.deadline ?? '',
    daysLeft: r.days_left ?? null,
    isPastDue: !!r.is_past_due,
    eligibilityConfirmed: !!r.eligibility_confirmed,
    requirements: r.requirements ?? '',
    notes: r.notes ?? '',
    url: r.url ?? '',
  }));
}

export async function dbDeleteScholarship(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('scholarships').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Tasks
// ────────────────────────────────────────────────────────────────────

export async function dbSaveTask(userId: string, t: Task): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('tasks').upsert({
    id: t.id,
    user_id: userId,
    title: t.title,
    category: t.category,
    status: t.status,
    scholarship_id: t.scholarshipId,
    scholarship_name: t.scholarshipName,
    due_date: t.dueDate || null,
  });
  if (error) console.warn('[db] saveTask:', error.message);
}

export async function dbLoadTasks(userId: string): Promise<Task[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('tasks').select('*').eq('user_id', userId);
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    title: r.title,
    category: (r.category ?? 'Documents') as TaskCategory,
    status: (r.status ?? 'Pending') as TaskStatus,
    scholarshipId: r.scholarship_id ?? '',
    scholarshipName: r.scholarship_name ?? '',
    dueDate: r.due_date ?? '',
  }));
}

export async function dbDeleteTask(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('tasks').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Stories
// ────────────────────────────────────────────────────────────────────

export async function dbSaveStory(userId: string, s: Story): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('stories').upsert({
    id: s.id,
    user_id: userId,
    title: s.title,
    body: s.body,
    themes: s.themes,
    emotion: s.emotion,
    when_it_happened: s.whenItHappened,
    why_it_matters: s.whyItMatters,
  });
  if (error) console.warn('[db] saveStory:', error.message);
}

export async function dbLoadStories(userId: string): Promise<Story[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('stories').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    title: r.title,
    body: r.body ?? '',
    themes: (r.themes ?? []) as StoryTheme[],
    emotion: r.emotion ?? 3,
    whenItHappened: r.when_it_happened ?? '',
    whyItMatters: r.why_it_matters ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));
}

export async function dbDeleteStory(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('stories').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Recommenders
// ────────────────────────────────────────────────────────────────────

export async function dbSaveRecommender(userId: string, r: Recommender): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('recommenders').upsert({
    id: r.id,
    user_id: userId,
    name: r.name,
    email: r.email,
    relation: r.relation,
    organization: r.organization,
    years_known: r.yearsKnown,
    strengths_they_saw_in_you: r.strengthsTheySawInYou,
    draft_letter: r.draftLetter,
    status: r.status,
    linked_scholarship_ids: r.linkedScholarshipIds,
    last_nudged_at: r.lastNudgedAt || null,
    notes: r.notes,
  });
  if (error) console.warn('[db] saveRecommender:', error.message);
}

export async function dbLoadRecommenders(userId: string): Promise<Recommender[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('recommenders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email ?? '',
    relation: (r.relation ?? 'Professor') as RecommenderRelation,
    organization: r.organization ?? '',
    yearsKnown: r.years_known ?? 0,
    strengthsTheySawInYou: r.strengths_they_saw_in_you ?? '',
    draftLetter: r.draft_letter ?? '',
    status: (r.status ?? 'Not asked') as RecommenderStatus,
    linkedScholarshipIds: r.linked_scholarship_ids ?? [],
    lastNudgedAt: r.last_nudged_at ?? '',
    notes: r.notes ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));
}

export async function dbDeleteRecommender(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('recommenders').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Retrospectives  (insert-only, no updates)
// ────────────────────────────────────────────────────────────────────

export async function dbSaveRetrospective(userId: string, r: Retrospective): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('retrospectives').upsert({
    id: r.id,
    user_id: userId,
    scholarship_id: r.scholarshipId,
    feedback_received: r.feedbackReceived,
    what_you_would_change: r.whatYouWouldChange,
    emotional_note: r.emotionalNote,
  });
  if (error) console.warn('[db] saveRetrospective:', error.message);
}

export async function dbLoadRetrospectives(userId: string): Promise<Retrospective[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('retrospectives').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    scholarshipId: r.scholarship_id,
    feedbackReceived: r.feedback_received ?? '',
    whatYouWouldChange: r.what_you_would_change ?? '',
    emotionalNote: r.emotional_note ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}

// ────────────────────────────────────────────────────────────────────
// Learning Resources
// ────────────────────────────────────────────────────────────────────

export async function dbSaveResource(userId: string, r: LearningResource): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('learning_resources').upsert({
    id: r.id,
    user_id: userId,
    title: r.title,
    provider: r.provider,
    status: r.status,
    level: r.level,
    duration: r.duration,
    cost: r.cost,
    topic: r.topic,
    url: r.url,
    emoji: r.emoji,
  });
  if (error) console.warn('[db] saveResource:', error.message);
}

export async function dbLoadResources(userId: string): Promise<LearningResource[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('learning_resources').select('*').eq('user_id', userId);
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    title: r.title,
    provider: r.provider ?? '',
    status: (r.status ?? 'Not Started') as LearningStatus,
    level: (r.level ?? 'Intermediate') as DifficultyLevel,
    duration: r.duration ?? '',
    cost: (r.cost ?? 'Free') as LearningResource['cost'],
    topic: r.topic ?? '',
    url: r.url ?? '',
    emoji: r.emoji ?? '📚',
  }));
}

export async function dbDeleteResource(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('learning_resources').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Writing Documents
// ────────────────────────────────────────────────────────────────────

export async function dbSaveWritingDoc(userId: string, d: WritingDocument): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('writing_documents').upsert({
    id: d.id,
    user_id: userId,
    title: d.title,
    writing_type: d.writingType,
    target_country: d.targetCountry,
    target_university: d.targetUniversity,
    target_program: d.targetProgram,
    degree_level: d.degreeLevel,
    scholarship_name: d.scholarshipName,
    word_limit: d.wordLimit,
    deadline: d.deadline || null,
    tone: d.tone,
    output_style: d.outputStyle,
    formatting_style: d.formattingStyle,
    paragraph_length: d.paragraphLength,
    country_style: d.countryStyle,
    raw_input: d.rawInput,
    follow_up_questions: d.followUpQuestions,
    user_answers: d.userAnswers,
    profile_summary: d.profileSummary,
    story_angle: d.storyAngle,
    outline: d.outline,
    final_writing: d.finalWriting,
    quality_scores: d.qualityScores,
    improvement_checklist: d.improvementChecklist,
    status: d.status,
    linked_scholarship_id: d.linkedScholarshipId || '',
  });
  if (error) console.warn('[db] saveWritingDoc:', error.message);
}

export async function dbLoadWritingDocs(userId: string): Promise<WritingDocument[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('writing_documents').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    title: r.title ?? '',
    writingType: (r.writing_type ?? 'Statement of Purpose') as WritingType,
    targetCountry: r.target_country ?? '',
    targetUniversity: r.target_university ?? '',
    targetProgram: r.target_program ?? '',
    degreeLevel: (r.degree_level ?? "Master's") as DegreeLevel,
    scholarshipName: r.scholarship_name ?? '',
    wordLimit: r.word_limit ?? 0,
    deadline: r.deadline ?? '',
    tone: (r.tone ?? 'Natural') as WritingTone,
    outputStyle: (r.output_style ?? 'Structured Essay') as OutputStyle,
    formattingStyle: (r.formatting_style ?? 'Structured Essay') as OutputStyle,
    paragraphLength: (r.paragraph_length ?? 'Medium') as ParagraphLength,
    countryStyle: (r.country_style ?? 'Other') as CountryStyle,
    rawInput: r.raw_input ?? '',
    followUpQuestions: r.follow_up_questions ?? [],
    userAnswers: r.user_answers ?? [],
    profileSummary: r.profile_summary ?? '',
    storyAngle: r.story_angle ?? '',
    outline: r.outline ?? '',
    finalWriting: r.final_writing ?? '',
    qualityScores: (r.quality_scores as QualityScores | null) ?? null,
    improvementChecklist: r.improvement_checklist ?? [],
    status: (r.status ?? 'Draft') as WritingDocStatus,
    linkedScholarshipId: r.linked_scholarship_id ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));
}

export async function dbDeleteWritingDoc(id: string): Promise<void> {
  if (!ok()) return;
  await supabase!.from('writing_documents').delete().eq('id', id);
}

// ────────────────────────────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────────────────────────────

export async function dbSavePayment(userId: string, p: Payment): Promise<void> {
  if (!ok()) return;
  const { error } = await supabase!.from('payments').upsert({
    id: p.id,
    user_id: userId,
    plan_name: p.planName,
    amount: p.amount,
    currency: p.currency,
    payment_method: p.paymentMethod,
    transaction_reference: p.transactionReference,
    screenshot_url: p.screenshotUrl,
    screenshot_path: p.screenshotPath,
    status: p.status,
    credits_added: p.creditsAdded,
    period: p.period,
    country: p.country,
  });
  if (error) console.warn('[db] savePayment:', error.message);
}

export async function dbLoadPayments(userId: string): Promise<Payment[]> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    planName: (r.plan_name ?? 'Free') as PlanName,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'USD',
    paymentMethod: r.payment_method ?? '',
    transactionReference: r.transaction_reference ?? '',
    screenshotUrl: r.screenshot_url ?? '',
    screenshotPath: r.screenshot_path ?? '',
    status: (r.status ?? 'Pending') as PaymentStatus,
    creditsAdded: r.credits_added ?? 0,
    period: (r.period ?? 'monthly') as BillingPeriod,
    country: r.country ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}

/**
 * For admins: load ALL payments across users (RLS allows this only if you
 * remove the row-level policy on payments for admins — for now this works
 * because we don't have admin roles, so admins see only their own payments.
 * When we add roles, we'll add an admin-only SELECT policy.)
 */
export async function dbLoadAllPayments(): Promise<Array<Payment & { userId: string; userEmail?: string }>> {
  if (!ok()) return [];
  const { data, error } = await supabase!
    .from('payments').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    planName: (r.plan_name ?? 'Free') as PlanName,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'USD',
    paymentMethod: r.payment_method ?? '',
    transactionReference: r.transaction_reference ?? '',
    screenshotUrl: r.screenshot_url ?? '',
    screenshotPath: r.screenshot_path ?? '',
    status: (r.status ?? 'Pending') as PaymentStatus,
    creditsAdded: r.credits_added ?? 0,
    period: (r.period ?? 'monthly') as BillingPeriod,
    country: r.country ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}

// ────────────────────────────────────────────────────────────────────
// Payment Settings (admin-configurable Mobile Money numbers)
// ────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: PaymentSettings = {
  id: 'main',
  mtnRwandaNumber: '', mtnRwandaName: '', mtnRwandaActive: false,
  mtnUgandaNumber: '', mtnUgandaName: '', mtnUgandaActive: false,
  mtnGhanaNumber: '', mtnGhanaName: '', mtnGhanaActive: false,
  mtnCameroonNumber: '', mtnCameroonName: '', mtnCameroonActive: false,
  fallbackInstructions: 'Please contact support to arrange payment.',
};

export async function dbLoadPaymentSettings(): Promise<PaymentSettings> {
  if (!ok()) return DEFAULT_SETTINGS;
  const { data, error } = await supabase!
    .from('payment_settings').select('*').eq('id', 'main').maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    id: 'main',
    mtnRwandaNumber: data.mtn_rwanda_number ?? '',
    mtnRwandaName: data.mtn_rwanda_name ?? '',
    mtnRwandaActive: !!data.mtn_rwanda_active,
    mtnUgandaNumber: data.mtn_uganda_number ?? '',
    mtnUgandaName: data.mtn_uganda_name ?? '',
    mtnUgandaActive: !!data.mtn_uganda_active,
    mtnGhanaNumber: data.mtn_ghana_number ?? '',
    mtnGhanaName: data.mtn_ghana_name ?? '',
    mtnGhanaActive: !!data.mtn_ghana_active,
    mtnCameroonNumber: data.mtn_cameroon_number ?? '',
    mtnCameroonName: data.mtn_cameroon_name ?? '',
    mtnCameroonActive: !!data.mtn_cameroon_active,
    fallbackInstructions: data.fallback_instructions ?? DEFAULT_SETTINGS.fallbackInstructions,
  };
}

export async function dbSavePaymentSettings(s: PaymentSettings): Promise<{ ok: boolean; error?: string }> {
  if (!ok()) return { ok: false, error: 'Supabase not configured.' };
  const { error } = await supabase!.from('payment_settings').upsert({
    id: 'main',
    mtn_rwanda_number: s.mtnRwandaNumber,
    mtn_rwanda_name: s.mtnRwandaName,
    mtn_rwanda_active: s.mtnRwandaActive,
    mtn_uganda_number: s.mtnUgandaNumber,
    mtn_uganda_name: s.mtnUgandaName,
    mtn_uganda_active: s.mtnUgandaActive,
    mtn_ghana_number: s.mtnGhanaNumber,
    mtn_ghana_name: s.mtnGhanaName,
    mtn_ghana_active: s.mtnGhanaActive,
    mtn_cameroon_number: s.mtnCameroonNumber,
    mtn_cameroon_name: s.mtnCameroonName,
    mtn_cameroon_active: s.mtnCameroonActive,
    fallback_instructions: s.fallbackInstructions,
  });
  if (error) {
    console.warn('[db] savePaymentSettings:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ────────────────────────────────────────────────────────────────────
// Storage: upload payment screenshots
// ────────────────────────────────────────────────────────────────────

/**
 * Uploads a payment screenshot to Supabase Storage under
 * `payment-screenshots/{userId}/{paymentId}-{filename}`.
 * Returns { path, signedUrl } so the caller can store both on the Payment row.
 */
export async function uploadPaymentScreenshot(
  userId: string, paymentId: string, file: File,
): Promise<{ path: string; signedUrl: string } | null> {
  if (!ok()) return null;
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
  const path = `${userId}/${paymentId}.${safeExt}`;

  const { error: uploadErr } = await supabase!.storage
    .from('payment-screenshots')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadErr) { console.warn('[storage] upload:', uploadErr.message); return null; }

  // Create a long-lived signed URL (1 year) for display.
  const { data: signed, error: signErr } = await supabase!.storage
    .from('payment-screenshots')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed) { console.warn('[storage] sign:', signErr?.message); return null; }

  return { path, signedUrl: signed.signedUrl };
}
