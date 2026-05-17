export type ScholarshipStatus = 'Not Started' | 'In Progress' | 'Submitted' | 'Accepted' | 'Rejected';
export type Priority = 'High' | 'Medium' | 'Low';
export type FocusArea = 'AI Systems Engineering' | 'AI Governance & Safety' | 'Machine Learning' | 'Computer Science' | 'Data Science';
export type TaskCategory = 'Essays' | 'Documents' | 'Research' | 'Logistics';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type LearningStatus = 'Not Started' | 'In Progress' | 'Completed';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type DegreeLevel = "Bachelor's" | "Master's" | 'PhD' | 'Diploma' | 'Scholarship' | 'Exchange Program' | 'Certificate';
export type WritingType =
  | 'Statement of Purpose'
  | 'Personal Statement'
  | 'Motivation Letter'
  | 'Scholarship Essay'
  | 'Study Plan'
  | 'Recommendation Letter'
  | 'Research Proposal'
  | 'Professor Outreach Email'
  | 'Admission Email'
  | 'CV Profile Summary';

export type WritingTone = 'Natural' | 'Academic' | 'Emotional' | 'Concise' | 'Confident';
export type OutputStyle = 'Plain Text' | 'Structured Essay' | 'Formal Letter' | 'Email' | 'Recommendation Letter' | 'Scholarship Essay' | 'SOP' | 'Study Plan';
export type ParagraphLength = 'Short' | 'Medium' | 'Detailed';
export type CountryStyle = 'Canada' | 'UK' | 'USA' | 'Germany' | 'France' | 'Australia' | 'Rwanda' | 'Cameroon' | 'Other';

export type WritingDocStatus = 'Draft' | 'Generated' | 'Revised' | 'Final';
export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected';
export type PlanName = 'Free' | 'Starter' | 'Pro' | 'Premium';

export interface QualityScores {
  specificity: number;
  authenticity: number;
  academicStrength: number;
  programFit: number;
  careerClarity: number;
  emotionalDepth: number;
  grammar: number;
  genericRisk: number;
  copyPasteReadiness: number;
}

export interface WritingDocument {
  id: string;
  title: string;
  writingType: WritingType;
  targetCountry: string;
  targetUniversity: string;
  targetProgram: string;
  degreeLevel: DegreeLevel;
  scholarshipName: string;
  wordLimit: number;
  deadline: string;
  tone: WritingTone;
  outputStyle: OutputStyle;
  formattingStyle: OutputStyle;
  paragraphLength: ParagraphLength;
  countryStyle: CountryStyle;
  rawInput: string;
  followUpQuestions: string[];
  userAnswers: string[];
  profileSummary: string;
  storyAngle: string;
  outline: string;
  finalWriting: string;
  qualityScores: QualityScores | null;
  improvementChecklist: string[];
  status: WritingDocStatus;
  linkedScholarshipId: string;
  createdAt: string;
  updatedAt: string;
}

export type FieldCategory =
  | 'STEM' | 'Business' | 'Medicine & Health' | 'Arts & Design'
  | 'Music & Performance' | 'Humanities' | 'Social Sciences'
  | 'Law' | 'Education' | 'Agriculture' | 'Other';

export type EnglishLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Native' | 'Tested (IELTS/TOEFL)';
export type GpaBand = 'Top 10%' | 'Strong (B+ / 3.3+)' | 'Mid (B / 3.0)' | 'Below average (<3.0)' | 'Not graded yet';

export interface StudentProfile {
  // Identity
  fullName: string;
  countryOfOrigin: string;
  // Field & level
  fieldCategory: FieldCategory;
  fieldSpecific: string;
  educationLevel: string;
  intendedDegreeLevel: DegreeLevel;
  // Academics
  currentGpa: GpaBand;
  englishLevel: EnglishLevel;
  // Goals
  targetCountries: string;
  preferredPrograms: string;
  // Story material (kept from before)
  academicBackground: string;
  workExperience: string;
  projects: string;
  achievements: string;
  challenges: string;
  careerGoals: string;
  personalStoryNotes: string;
  // Onboarding status
  onboardingComplete: boolean;
  // Plan & usage (kept on the profile so it travels with the user)
  currentPlan: PlanName;
  essaysUsedThisPeriod: number;
  lettersUsedThisPeriod: number;
  usagePeriodStarted: string;   // ISO date; resets when month rolls over
}

export type BillingPeriod = 'monthly' | 'yearly' | 'one-time';

export interface Payment {
  id: string;
  planName: PlanName;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference: string;
  screenshotUrl: string;       // public URL or signed URL for display
  screenshotPath: string;      // storage bucket path (for signed URLs / deletion)
  status: PaymentStatus;
  creditsAdded: number;
  period: BillingPeriod;
  country: string;             // payer's country (Rwanda / Uganda / Ghana / Cameroon / Other)
  createdAt: string;
}

export type PaymentCountry = 'Rwanda' | 'Uganda' | 'Ghana' | 'Cameroon' | 'Other';

export interface PaymentSettings {
  id: 'main';
  // MTN MoMo per country: number, account name, active toggle
  mtnRwandaNumber: string;     mtnRwandaName: string;     mtnRwandaActive: boolean;
  mtnUgandaNumber: string;     mtnUgandaName: string;     mtnUgandaActive: boolean;
  mtnGhanaNumber: string;      mtnGhanaName: string;      mtnGhanaActive: boolean;
  mtnCameroonNumber: string;   mtnCameroonName: string;   mtnCameroonActive: boolean;
  fallbackInstructions: string;
}

export interface Scholarship {
  id: string;
  name: string;
  institution: string;
  country: string;
  countryCode: string;
  focusArea: FocusArea;
  status: ScholarshipStatus;
  priority: Priority;
  funding: string;
  fundingType: 'Fully Funded' | 'Partial' | 'Tuition Only';
  deadline: string;
  daysLeft: number | null;
  isPastDue: boolean;
  eligibilityConfirmed: boolean;
  requirements: string;
  notes: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  scholarshipId: string;
  scholarshipName: string;
  dueDate: string;
}

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  status: LearningStatus;
  level: DifficultyLevel;
  duration: string;
  cost: 'Free' | 'Paid';
  topic: string;
  url: string;
  emoji: string;
}

export interface SOPDocument {
  id: string;
  title: string;
  type: 'SOP' | 'Personal Statement' | 'Motivation Letter' | 'Essay' | 'Research Proposal';
  scholarshipId: string;
  scholarshipName: string;
  content: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Phase 5: Story Vault ──────────────────────────────────────────
export type StoryTheme =
  | 'Resilience' | 'Leadership' | 'Curiosity' | 'Service'
  | 'Failure & growth' | 'Identity & culture' | 'Loss' | 'Breakthrough'
  | 'Family' | 'Community impact' | 'Creative' | 'Other';

export interface Story {
  id: string;
  title: string;
  body: string;             // the raw story, told plainly
  themes: StoryTheme[];     // tags
  emotion: number;          // 1-5, how heavy / personal
  whenItHappened: string;   // free text: "Form 4, 2018"
  whyItMatters: string;     // one-line lesson / shift
  createdAt: string;
  updatedAt: string;
}

// ── Phase 5: Recommenders ─────────────────────────────────────────
export type RecommenderStatus =
  | 'Not asked' | 'Asked' | 'Agreed' | 'Drafted' | 'Submitted' | 'Declined';

export type RecommenderRelation =
  | 'Professor' | 'Supervisor / Manager' | 'Mentor' | 'Coach'
  | 'Employer' | 'Religious / Community leader' | 'Other';

export interface Recommender {
  id: string;
  name: string;
  email: string;
  relation: RecommenderRelation;
  organization: string;
  yearsKnown: number;
  strengthsTheySawInYou: string;   // raw notes, used by AI to draft letter
  draftLetter: string;             // AI-generated letter the recommender edits
  status: RecommenderStatus;
  linkedScholarshipIds: string[];  // which scholarships they're recommending you for
  lastNudgedAt: string;            // ISO date of last reminder
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Phase 5: Rejection retrospective ──────────────────────────────
export interface Retrospective {
  id: string;
  scholarshipId: string;
  feedbackReceived: string;
  whatYouWouldChange: string;
  emotionalNote: string;            // for the student's own healing/clarity
  createdAt: string;
}

export interface AppStats {
  totalScholarships: number;
  highPriority: number;
  tasksDone: number;
  totalTasks: number;
  resourcesDone: number;
  totalResources: number;
  documentsCreated: number;
  aiRewrites: number;
  wordsWritten: number;
  timeSaved: number;
}
