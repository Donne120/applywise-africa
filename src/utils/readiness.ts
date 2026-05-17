import type {
  Scholarship, Task, WritingDocument, StudentProfile, GpaBand, EnglishLevel,
  Story, Recommender,
} from '../types';

export type ReadinessTone = 'critical' | 'low' | 'building' | 'strong' | 'excellent';

export interface PillarScore {
  key: 'academics' | 'english' | 'story' | 'recommenders' | 'documents' | 'time';
  label: string;
  score: number;     // 0..max
  max: number;
  note: string;      // one-line honest assessment
  action: string;    // the single next thing to do
  cta?: { label: string; to: string };
  tone: ReadinessTone;
}

export interface ReadinessResult {
  total: number;     // 0..100
  tone: ReadinessTone;
  headline: string;
  pillars: PillarScore[];
}

const GPA_SCORE: Record<GpaBand, number> = {
  'Top 10%': 20,
  'Strong (B+ / 3.3+)': 16,
  'Mid (B / 3.0)': 11,
  'Below average (<3.0)': 5,
  'Not graded yet': 8,
};

const ENGLISH_SCORE: Record<EnglishLevel, number> = {
  'Tested (IELTS/TOEFL)': 15,
  'Native': 13,
  'Advanced': 10,
  'Intermediate': 5,
  'Beginner': 1,
};

function toneFor(pct: number): ReadinessTone {
  if (pct < 0.20) return 'critical';
  if (pct < 0.40) return 'low';
  if (pct < 0.65) return 'building';
  if (pct < 0.85) return 'strong';
  return 'excellent';
}

function pickHeadline(tone: ReadinessTone, days: number | null, isPastDue: boolean): string {
  if (isPastDue) return 'This scholarship has closed.';
  if (tone === 'critical') return 'Far from ready — but every step from here counts double.';
  if (tone === 'low')      return 'Real gaps to close. Pick one pillar and start today.';
  if (tone === 'building') return 'Coming together. Push the weakest pillar next.';
  if (tone === 'strong')   return 'You\'re in good shape. Polish & submit early.';
  if (days !== null && days < 30) return 'Excellent. Submit now — don\'t wait for the deadline.';
  return 'You\'re ready. Submit when polished, not perfect.';
}

export function computeReadiness(
  scholarship: Scholarship,
  profile: StudentProfile,
  tasks: Task[],
  writingDocs: WritingDocument[],
  stories: Story[] = [],
  recommenders: Recommender[] = [],
): ReadinessResult {
  // ── Academics (20) ────────────────────────────────────────────────
  const academicsScore = GPA_SCORE[profile.currentGpa] ?? 8;
  const academics: PillarScore = {
    key: 'academics',
    label: 'Academics',
    score: academicsScore,
    max: 20,
    note: gpaNote(profile.currentGpa),
    action: gpaAction(profile.currentGpa),
    cta: profile.currentGpa === 'Below average (<3.0)' || profile.currentGpa === 'Mid (B / 3.0)'
      ? { label: 'Strengthen with courses', to: '/grow' }
      : undefined,
    tone: toneFor(academicsScore / 20),
  };

  // ── English / Tests (15) ──────────────────────────────────────────
  const englishScore = ENGLISH_SCORE[profile.englishLevel] ?? 5;
  const english: PillarScore = {
    key: 'english',
    label: 'English & tests',
    score: englishScore,
    max: 15,
    note: englishNote(profile.englishLevel),
    action: englishAction(profile.englishLevel),
    cta: profile.englishLevel !== 'Tested (IELTS/TOEFL)' && profile.englishLevel !== 'Native'
      ? { label: 'Plan test prep', to: '/grow' }
      : undefined,
    tone: toneFor(englishScore / 15),
  };

  // ── Story (25) ───────────────────────────────────────────────────
  const linked = writingDocs.filter(d =>
    d.linkedScholarshipId === scholarship.id ||
    (d.scholarshipName && d.scholarshipName === scholarship.name)
  );
  const hasDraft = linked.some(d => d.finalWriting && d.finalWriting.length > 200);
  const hasFinal = linked.some(d => d.status === 'Final' || d.status === 'Revised');
  const avgQuality = linked
    .map(d => d.qualityScores ? avgScores(d.qualityScores) : 0)
    .filter(s => s > 0);
  const qualityAvg = avgQuality.length ? avgQuality.reduce((a, b) => a + b, 0) / avgQuality.length : 0;

  // Story Vault: having raw story material is a force multiplier on essays.
  const storyVaultBoost = Math.min(4, stories.length); // up to +4 from having stories on file

  let storyScore = 0;
  if (linked.length > 0) storyScore += 5;
  if (hasDraft) storyScore += 8;
  if (hasFinal) storyScore += 4;
  if (qualityAvg >= 7) storyScore += 4;
  else if (qualityAvg >= 5) storyScore += 2;
  storyScore += storyVaultBoost;
  storyScore = Math.min(25, storyScore);

  const story: PillarScore = {
    key: 'story',
    label: 'Your story',
    score: storyScore,
    max: 25,
    note: storyNote(linked.length, hasDraft, hasFinal, qualityAvg, stories.length),
    action: storyAction(linked.length, hasDraft, hasFinal, stories.length),
    cta: stories.length === 0
      ? { label: 'Build your Story Vault', to: '/stories' }
      : { label: linked.length === 0 ? 'Start writing' : 'Open Writing Studio', to: `/writing?scholarship=${scholarship.id}` },
    tone: toneFor(storyScore / 25),
  };

  // ── Recommenders (15) — now live ─────────────────────────────────
  const linkedRecs = recommenders.filter(r => r.linkedScholarshipIds.includes(scholarship.id));
  const totalRecs = linkedRecs.length;
  const agreed = linkedRecs.filter(r => r.status === 'Agreed' || r.status === 'Drafted' || r.status === 'Submitted').length;
  const submitted = linkedRecs.filter(r => r.status === 'Submitted').length;
  const drafted = linkedRecs.filter(r => r.status === 'Drafted' || r.status === 'Submitted').length;

  let recScore = 0;
  if (totalRecs >= 1) recScore += 3;
  if (totalRecs >= 2) recScore += 2;       // most scholarships ask for 2-3
  if (agreed >= 1) recScore += 3;
  if (agreed >= 2) recScore += 2;
  if (drafted >= 1) recScore += 2;         // having a draft to send to recommender
  if (submitted >= 1) recScore += 2;
  if (submitted >= 2) recScore += 1;
  recScore = Math.min(15, recScore);

  const recommendersPillar: PillarScore = {
    key: 'recommenders',
    label: 'Recommenders',
    score: recScore,
    max: 15,
    note: recommenderNote(totalRecs, agreed, submitted),
    action: recommenderAction(totalRecs, agreed, drafted, submitted),
    cta: { label: totalRecs === 0 ? 'Add a recommender' : 'Manage recommenders', to: '/recommenders' },
    tone: toneFor(recScore / 15),
  };

  // ── Documents & Tasks (15) ────────────────────────────────────────
  const scholarshipTasks = tasks.filter(t => t.scholarshipId === scholarship.id);
  const done = scholarshipTasks.filter(t => t.status === 'Completed').length;
  const totalTasks = scholarshipTasks.length;
  const taskRatio = totalTasks > 0 ? done / totalTasks : 0;
  const docsScore = totalTasks === 0
    ? 5
    : Math.round(taskRatio * 13 + (scholarship.eligibilityConfirmed ? 2 : 0));

  const documents: PillarScore = {
    key: 'documents',
    label: 'Tasks & docs',
    score: Math.min(15, docsScore),
    max: 15,
    note: totalTasks === 0
      ? 'No tasks yet — add the requirements so nothing slips.'
      : `${done} of ${totalTasks} tasks complete${scholarship.eligibilityConfirmed ? ' · eligibility confirmed' : ' · eligibility unchecked'}.`,
    action: totalTasks === 0
      ? 'Break the requirements into tasks (transcripts, forms, references…).'
      : taskRatio < 1
        ? 'Finish the remaining tasks — small ones first to build momentum.'
        : 'All tasks done. Double-check originals are signed/notarized if required.',
    cta: { label: 'Go to tasks', to: '/tasks' },
    tone: toneFor((totalTasks === 0 ? 5 : Math.min(15, docsScore)) / 15),
  };

  // ── Time (10) ────────────────────────────────────────────────────
  let timeScore = 10;
  if (scholarship.isPastDue) timeScore = 0;
  else if (scholarship.daysLeft === null) timeScore = 6;
  else if (scholarship.daysLeft <= 7) timeScore = 2;
  else if (scholarship.daysLeft <= 21) timeScore = 4;
  else if (scholarship.daysLeft <= 45) timeScore = 7;
  else if (scholarship.daysLeft <= 90) timeScore = 9;

  const time: PillarScore = {
    key: 'time',
    label: 'Time available',
    score: timeScore,
    max: 10,
    note: scholarship.isPastDue
      ? 'Closed. Reflect on what to do differently next round.'
      : scholarship.daysLeft === null
        ? 'No deadline set — add one to plan properly.'
        : `${scholarship.daysLeft} days remaining.`,
    action: scholarship.isPastDue
      ? 'Mark this as a learning round, not a failure.'
      : (scholarship.daysLeft ?? 99) <= 14
        ? 'Focus only on essays + recommenders. Skip non-essential polish.'
        : 'You have runway. Use it to ask for stronger recommenders.',
    tone: toneFor(timeScore / 10),
  };

  const pillars = [academics, english, story, recommendersPillar, documents, time];
  const total = pillars.reduce((s, p) => s + p.score, 0);
  const tone = toneFor(total / 100);

  return {
    total,
    tone,
    headline: pickHeadline(tone, scholarship.daysLeft, scholarship.isPastDue),
    pillars,
  };
}

function avgScores(q: NonNullable<WritingDocument['qualityScores']>): number {
  const vals = Object.values(q).filter(v => typeof v === 'number') as number[];
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ── Honest, kind, specific copy ────────────────────────────────────
function gpaNote(gpa: GpaBand): string {
  switch (gpa) {
    case 'Top 10%':              return 'Your academics will open doors. Lead with them.';
    case 'Strong (B+ / 3.3+)':   return 'Solid academic foundation. Pair it with a sharp story.';
    case 'Mid (B / 3.0)':        return 'Average academics. Story and projects must carry weight.';
    case 'Below average (<3.0)': return 'Academics are a real headwind here — but very beatable.';
    case 'Not graded yet':       return 'No grades to lean on yet. Show progress through coursework & projects.';
  }
}
function gpaAction(gpa: GpaBand): string {
  switch (gpa) {
    case 'Top 10%':              return 'Submit a transcript that\'s sealed/verified. Don\'t under-sell.';
    case 'Strong (B+ / 3.3+)':   return 'Don\'t coast — fortify with one project or paper relevant to the program.';
    case 'Mid (B / 3.0)':        return 'Complete 1–2 verified courses in your field this quarter to offset GPA.';
    case 'Below average (<3.0)': return 'Build evidence of late bloom: verified certificates, a real project, a publication.';
    case 'Not graded yet':       return 'Add finished coursework + a clear timeline of expected grades.';
  }
}

function englishNote(lvl: EnglishLevel): string {
  switch (lvl) {
    case 'Tested (IELTS/TOEFL)': return 'Test scores on file. Make sure they\'re above the program\'s minimum.';
    case 'Native':               return 'Native fluency. Most programs waive English tests for you.';
    case 'Advanced':             return 'Strong English, but most scholarships still want a test score.';
    case 'Intermediate':         return 'Test scores will be the gate. Plan now.';
    case 'Beginner':             return 'English level is a hard blocker. Address before applying.';
  }
}
function englishAction(lvl: EnglishLevel): string {
  switch (lvl) {
    case 'Tested (IELTS/TOEFL)': return 'Verify your score meets the program minimum — not just average.';
    case 'Native':               return 'Request an exemption letter early — saves you weeks.';
    case 'Advanced':             return 'Book IELTS/TOEFL within 6 weeks. Most programs require official scores.';
    case 'Intermediate':         return 'Begin a structured 12-week prep — daily practice, weekly mocks.';
    case 'Beginner':             return 'Pause applications for 4–6 months. Reach B2/C1 first, then come back.';
  }
}

function storyNote(linkedCount: number, hasDraft: boolean, hasFinal: boolean, quality: number, vaultCount: number): string {
  if (hasFinal && quality >= 7)  return 'Finalized essays with strong scores. Your story is ready.';
  if (hasFinal)                  return 'Final draft exists. Get one human reviewer before submitting.';
  if (hasDraft)                  return 'You have a draft. Rewrite it once more before scoring.';
  if (linkedCount > 0)           return 'Started writing — keep momentum, don\'t leave it for the last week.';
  if (vaultCount >= 3)           return 'Strong raw material in your Story Vault. Time to shape it into an essay.';
  if (vaultCount > 0)            return 'A few stories saved. Add 2–3 more themes before writing — the AI works best with depth.';
  return 'No raw stories yet. Capture 3–5 in your Story Vault first; essays write themselves after.';
}
function storyAction(linkedCount: number, hasDraft: boolean, hasFinal: boolean, vaultCount: number): string {
  if (hasFinal)         return 'Score your essay. Aim for ≥7/10 before submitting.';
  if (hasDraft)         return 'Run "Improve" in Writing Studio, then score.';
  if (linkedCount > 0)  return 'Finish the current draft — no jumping between essays.';
  if (vaultCount === 0) return 'Capture one true story today. Just 3 minutes of writing.';
  return 'Open Writing Studio. The AI will draw from your Story Vault automatically.';
}

function recommenderNote(total: number, agreed: number, submitted: number): string {
  if (submitted >= 2) return 'Letters submitted. The hardest part is done — well played.';
  if (submitted >= 1) return 'One letter in. Don\'t lose momentum on the others.';
  if (agreed >= 2)    return 'Recommenders agreed. Send them your draft + deadline soon.';
  if (agreed >= 1)    return 'One recommender confirmed. Most scholarships need 2–3 — line up the rest.';
  if (total > 0)      return 'Recommenders identified but not confirmed. Ask this week.';
  return 'No recommenders linked yet. This pillar fails more apps than weak essays do.';
}
function recommenderAction(total: number, agreed: number, drafted: number, submitted: number): string {
  if (submitted >= 2 && submitted === total) return 'Send a short thank-you note. Recommenders remember kindness.';
  if (submitted >= 1)                        return 'Gentle nudge to the others, with the deadline clearly stated.';
  if (agreed >= 1 && drafted === 0)          return 'Draft the letter for them — give them a strong starting point.';
  if (agreed >= 1)                           return 'Send them the draft + your CV + the scholarship details.';
  if (total > 0)                             return 'Send the ask email today — a warm one, not generic.';
  return 'Add 3 potential recommenders. We\'ll draft the ask email and the letter for you.';
}

export function toneLabel(tone: ReadinessTone): string {
  return ({
    critical:  'Not ready',
    low:       'Early',
    building:  'Building',
    strong:    'Strong',
    excellent: 'Ready',
  })[tone];
}
