import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  Scholarship, Task, LearningResource, SOPDocument, AppStats,
  WritingDocument, StudentProfile, Payment, PlanName,
  Story, Recommender, Retrospective, PaymentSettings,
} from '../types';
import { initialScholarships, initialTasks, initialResources } from '../data/initialData';
import { useAuth } from './AuthContext';
import { shouldResetUsagePeriod, getRemaining } from '../utils/planLimits';
import {
  dbLoadProfile, dbSaveProfile,
  dbLoadScholarships, dbSaveScholarship,
  dbLoadTasks, dbSaveTask,
  dbLoadStories, dbSaveStory, dbDeleteStory,
  dbLoadRecommenders, dbSaveRecommender, dbDeleteRecommender,
  dbLoadRetrospectives, dbSaveRetrospective,
  dbLoadResources, dbSaveResource,
  dbLoadWritingDocs, dbSaveWritingDoc, dbDeleteWritingDoc,
  dbLoadPayments, dbSavePayment,
  dbLoadPaymentSettings, dbSavePaymentSettings,
} from '../lib/supabaseDb';

const DEFAULT_PROFILE: StudentProfile = {
  fullName: '',
  countryOfOrigin: '',
  fieldCategory: 'STEM',
  fieldSpecific: '',
  educationLevel: '',
  intendedDegreeLevel: "Master's",
  currentGpa: 'Strong (B+ / 3.3+)',
  englishLevel: 'Advanced',
  targetCountries: '',
  preferredPrograms: '',
  academicBackground: '',
  workExperience: '',
  projects: '',
  achievements: '',
  challenges: '',
  careerGoals: '',
  personalStoryNotes: '',
  onboardingComplete: false,
  currentPlan: 'Free',
  essaysUsedThisPeriod: 0,
  lettersUsedThisPeriod: 0,
  usagePeriodStarted: new Date().toISOString(),
};

const PROFILE_STORAGE_KEY = 'udonpass-profile';
const STORIES_STORAGE_KEY = 'udonpass-stories';
const RECOMMENDERS_STORAGE_KEY = 'udonpass-recommenders';
const RETROS_STORAGE_KEY = 'udonpass-retros';

function loadProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}
function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  id: 'main',
  mtnRwandaNumber: '', mtnRwandaName: '', mtnRwandaActive: false,
  mtnUgandaNumber: '', mtnUgandaName: '', mtnUgandaActive: false,
  mtnGhanaNumber: '', mtnGhanaName: '', mtnGhanaActive: false,
  mtnCameroonNumber: '', mtnCameroonName: '', mtnCameroonActive: false,
  fallbackInstructions: 'Please contact support to arrange payment.',
};

interface AppContextType {
  scholarships: Scholarship[];
  tasks: Task[];
  resources: LearningResource[];
  documents: SOPDocument[];
  writingDocuments: WritingDocument[];
  studentProfile: StudentProfile;
  payments: Payment[];
  currentPlan: PlanName;
  writingCredits: number;
  stats: AppStats;
  stories: Story[];
  recommenders: Recommender[];
  retrospectives: Retrospective[];
  // Sync status for the UserMenu indicator
  syncStatus: SyncStatus;
  // Mutations
  addStory: (s: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  addRecommender: (r: Recommender) => void;
  updateRecommender: (id: string, updates: Partial<Recommender>) => void;
  deleteRecommender: (id: string) => void;
  addRetrospective: (r: Retrospective) => void;
  updateScholarshipStatus: (id: string, status: Scholarship['status']) => void;
  addScholarship: (s: Scholarship) => void;
  updateTask: (id: string, status: Task['status']) => void;
  addTask: (t: Task) => void;
  updateResourceStatus: (id: string, status: LearningResource['status']) => void;
  addResource: (r: LearningResource) => void;
  addDocument: (d: SOPDocument) => void;
  updateDocument: (id: string, content: string) => void;
  addWritingDocument: (d: WritingDocument) => void;
  updateWritingDocument: (id: string, updates: Partial<WritingDocument>) => void;
  deleteWritingDocument: (id: string) => void;
  updateStudentProfile: (p: Partial<StudentProfile>) => void;
  submitPayment: (p: Payment) => void;
  approvePayment: (id: string) => void;
  rejectPayment: (id: string) => void;
  consumeCredit: () => boolean;          // legacy alias for consumeEssay()
  // Plan-gating
  essaysRemaining: number;
  lettersRemaining: number;
  essaysCapped: boolean;
  lettersCapped: boolean;
  consumeEssay: () => boolean;            // false if at limit
  consumeLetter: () => boolean;           // false if at limit
  // Payment settings (admin-configurable MoMo numbers, etc.)
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (s: PaymentSettings) => Promise<{ ok: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, configured: authConfigured } = useAuth();

  const [scholarships, setScholarships] = useState<Scholarship[]>(initialScholarships);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [resources, setResources] = useState<LearningResource[]>(initialResources);
  const [documents, setDocuments] = useState<SOPDocument[]>([]);
  const [writingDocuments, setWritingDocuments] = useState<WritingDocument[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(loadProfile);
  const [stories, setStories] = useState<Story[]>(() => loadJson<Story[]>(STORIES_STORAGE_KEY, []));
  const [recommenders, setRecommenders] = useState<Recommender[]>(() => loadJson<Recommender[]>(RECOMMENDERS_STORAGE_KEY, []));
  const [retrospectives, setRetrospectives] = useState<Retrospective[]>(() => loadJson<Retrospective[]>(RETROS_STORAGE_KEY, []));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  // Plan + usage now live on studentProfile so they sync with the user
  // across devices. currentPlan/writingCredits below are derived.
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(authConfigured ? 'offline' : 'offline');

  // Derive plan info from the profile (single source of truth).
  const currentPlan: PlanName = studentProfile.currentPlan ?? 'Free';
  const remaining = getRemaining(
    currentPlan,
    studentProfile.essaysUsedThisPeriod ?? 0,
    studentProfile.lettersUsedThisPeriod ?? 0,
  );
  // Legacy: "writingCredits" used to be a single number tracked in state.
  // We expose it as essays-remaining for back-compat with existing UI.
  const writingCredits = remaining.essays;

  // Load PaymentSettings once on mount — readable by everyone (RLS allows public read).
  useEffect(() => {
    if (!authConfigured) return;
    dbLoadPaymentSettings().then(s => setPaymentSettings(s)).catch(() => { /* ignore */ });
  }, [authConfigured]);

  const updatePaymentSettings = useCallback(async (s: PaymentSettings): Promise<{ ok: boolean; error?: string }> => {
    setPaymentSettings(s);
    try {
      const res = await dbSavePaymentSettings(s);
      return res;
    } catch (e) {
      console.warn('[app] save payment settings:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }, []);

  // Track which user we last synced for, so we don't re-fetch on every re-render.
  const lastSyncedUserId = useRef<string | null>(null);
  // Suppress writes during initial cloud-load (otherwise we'd overwrite cloud with mid-load state).
  const hydratingRef = useRef(false);

  // ── localStorage cache (always on, regardless of auth) ─────────────
  useEffect(() => {
    try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(studentProfile)); } catch { /* ignore */ }
  }, [studentProfile]);
  useEffect(() => {
    try { localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories)); } catch { /* ignore */ }
  }, [stories]);
  useEffect(() => {
    try { localStorage.setItem(RECOMMENDERS_STORAGE_KEY, JSON.stringify(recommenders)); } catch { /* ignore */ }
  }, [recommenders]);
  useEffect(() => {
    try { localStorage.setItem(RETROS_STORAGE_KEY, JSON.stringify(retrospectives)); } catch { /* ignore */ }
  }, [retrospectives]);

  // ── Monthly usage reset ────────────────────────────────────────────
  // When a new calendar month begins, zero out the counters so the user
  // gets their plan's quota fresh. Runs on mount + when usage period changes.
  useEffect(() => {
    if (!studentProfile.usagePeriodStarted) return;
    if (!shouldResetUsagePeriod(studentProfile.usagePeriodStarted)) return;
    setStudentProfile(prev => {
      const merged: StudentProfile = {
        ...prev,
        essaysUsedThisPeriod: 0,
        lettersUsedThisPeriod: 0,
        usagePeriodStarted: new Date().toISOString(),
      };
      if (user) {
        dbSaveProfile(user.id, merged).catch(e => console.warn('[app] monthly reset:', e));
      }
      return merged;
    });
  }, [studentProfile.usagePeriodStarted, user]);

  // ── Cloud hydration on sign-in (one-shot per user) ─────────────────
  useEffect(() => {
    if (!authConfigured) {
      setSyncStatus('offline');
      return;
    }
    if (!user) {
      // Signed out — reset to offline mode, keep local state intact.
      lastSyncedUserId.current = null;
      setSyncStatus('offline');
      return;
    }
    if (lastSyncedUserId.current === user.id) return;
    lastSyncedUserId.current = user.id;

    let cancelled = false;
    hydratingRef.current = true;
    setSyncStatus('syncing');

    (async () => {
      try {
        const [cloudProfile, cloudSchols, cloudTasks, cloudStories, cloudRecs,
               cloudRetros, cloudRes, cloudDocs, cloudPays] = await Promise.all([
          dbLoadProfile(user.id),
          dbLoadScholarships(user.id),
          dbLoadTasks(user.id),
          dbLoadStories(user.id),
          dbLoadRecommenders(user.id),
          dbLoadRetrospectives(user.id),
          dbLoadResources(user.id),
          dbLoadWritingDocs(user.id),
          dbLoadPayments(user.id),
        ]);
        if (cancelled) return;

        // Migration rule: if cloud has data, cloud wins. Otherwise upload local.
        // For profile, merge so that any partial cloud profile gets local defaults
        // for fields the cloud doesn't know about.
        // If the user just signed up, prefer the name they typed into the signup
        // form (lives in auth user_metadata.full_name OR sessionStorage stash).
        const localProfile = loadProfile();
        const metaName = (user.user_metadata as { full_name?: string } | undefined)?.full_name?.trim();
        let pendingSignupName = '';
        try { pendingSignupName = sessionStorage.getItem('udonpass-pending-name') ?? ''; } catch { /* ignore */ }
        const signupName = (metaName || pendingSignupName).trim();
        if (pendingSignupName) {
          try { sessionStorage.removeItem('udonpass-pending-name'); } catch { /* ignore */ }
        }

        if (cloudProfile && Object.keys(cloudProfile).length > 0) {
          // Cloud wins, but if cloud has no fullName yet and we have a fresh signup name, use it.
          const merged: StudentProfile = {
            ...DEFAULT_PROFILE, ...localProfile, ...cloudProfile,
            fullName: cloudProfile.fullName || signupName || localProfile.fullName || '',
          };
          setStudentProfile(merged);
          // If we just added a name to a cloud profile that didn't have one, persist it.
          if (signupName && !cloudProfile.fullName) {
            dbSaveProfile(user.id, merged).catch(() => { /* best-effort */ });
          }
        } else if (localProfile.onboardingComplete) {
          // Local profile exists, cloud is empty — upload (with signup name if we have one).
          const toUpload: StudentProfile = signupName
            ? { ...localProfile, fullName: signupName }
            : localProfile;
          if (signupName && !localProfile.fullName) setStudentProfile(toUpload);
          await dbSaveProfile(user.id, toUpload);
        } else if (signupName) {
          // Brand-new account (no local profile, no cloud profile) — seed with the
          // name they typed at sign-up so onboarding starts already knowing them.
          setStudentProfile(prev => ({ ...prev, fullName: signupName }));
        }

        if (cloudSchols.length > 0) {
          setScholarships(cloudSchols);
        } else if (scholarships.length > 0) {
          await Promise.all(scholarships.map(s => dbSaveScholarship(user.id, s)));
        }

        if (cloudTasks.length > 0) {
          setTasks(cloudTasks);
        } else if (tasks.length > 0) {
          await Promise.all(tasks.map(t => dbSaveTask(user.id, t)));
        }

        if (cloudStories.length > 0) {
          setStories(cloudStories);
        } else if (stories.length > 0) {
          await Promise.all(stories.map(s => dbSaveStory(user.id, s)));
        }

        if (cloudRecs.length > 0) {
          setRecommenders(cloudRecs);
        } else if (recommenders.length > 0) {
          await Promise.all(recommenders.map(r => dbSaveRecommender(user.id, r)));
        }

        if (cloudRetros.length > 0) {
          setRetrospectives(cloudRetros);
        } else if (retrospectives.length > 0) {
          await Promise.all(retrospectives.map(r => dbSaveRetrospective(user.id, r)));
        }

        if (cloudRes.length > 0) {
          setResources(cloudRes);
        } else if (resources.length > 0) {
          await Promise.all(resources.map(r => dbSaveResource(user.id, r)));
        }

        if (cloudDocs.length > 0) {
          setWritingDocuments(cloudDocs);
        } else if (writingDocuments.length > 0) {
          await Promise.all(writingDocuments.map(d => dbSaveWritingDoc(user.id, d)));
        }

        if (cloudPays.length > 0) {
          setPayments(cloudPays);
        } else if (payments.length > 0) {
          await Promise.all(payments.map(p => dbSavePayment(user.id, p)));
        }

        setSyncStatus('synced');
      } catch (e) {
        console.warn('[app] cloud hydration failed:', e);
        if (!cancelled) setSyncStatus('error');
      } finally {
        hydratingRef.current = false;
      }
    })();

    return () => { cancelled = true; };
    // We intentionally depend only on user.id, not on the full local state arrays
    // (which would re-trigger the effect on every mutation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authConfigured]);

  // ── Write-through helpers (fire-and-forget cloud sync) ─────────────
  // Always update local React state immediately (optimistic); push to cloud
  // in the background. If the user isn't signed in, the db helpers no-op.
  function cloudWrite(work: () => Promise<unknown>) {
    if (hydratingRef.current) return;
    if (!user) return;
    setSyncStatus('syncing');
    work().then(
      () => setSyncStatus('synced'),
      e => { console.warn('[app] cloud write failed:', e); setSyncStatus('error'); },
    );
  }

  // ── Mutations ─────────────────────────────────────────────────────
  const addStory = useCallback((s: Story) => {
    setStories(prev => [...prev, s]);
    cloudWrite(() => dbSaveStory(user!.id, s));
  }, [user]);

  const updateStory = useCallback((id: string, updates: Partial<Story>) => {
    let updated: Story | undefined;
    setStories(prev => prev.map(s => {
      if (s.id !== id) return s;
      updated = { ...s, ...updates, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveStory(user.id, updated!));
  }, [user]);

  const deleteStory = useCallback((id: string) => {
    setStories(prev => prev.filter(s => s.id !== id));
    cloudWrite(() => dbDeleteStory(id));
  }, [user]);

  const addRecommender = useCallback((r: Recommender) => {
    setRecommenders(prev => [...prev, r]);
    cloudWrite(() => dbSaveRecommender(user!.id, r));
  }, [user]);

  const updateRecommender = useCallback((id: string, updates: Partial<Recommender>) => {
    let updated: Recommender | undefined;
    setRecommenders(prev => prev.map(r => {
      if (r.id !== id) return r;
      updated = { ...r, ...updates, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveRecommender(user.id, updated!));
  }, [user]);

  const deleteRecommender = useCallback((id: string) => {
    setRecommenders(prev => prev.filter(r => r.id !== id));
    cloudWrite(() => dbDeleteRecommender(id));
  }, [user]);

  const addRetrospective = useCallback((r: Retrospective) => {
    setRetrospectives(prev => [...prev, r]);
    cloudWrite(() => dbSaveRetrospective(user!.id, r));
  }, [user]);

  const computeStats = useCallback((): AppStats => {
    const doneTasks = tasks.filter(t => t.status === 'Completed').length;
    const doneResources = resources.filter(r => r.status === 'Completed').length;
    const highPriority = scholarships.filter(s => s.priority === 'High').length;
    const wordsWritten = writingDocuments.reduce((sum, d) =>
      sum + (d.finalWriting ? d.finalWriting.split(/\s+/).filter(Boolean).length : 0), 0);
    return {
      totalScholarships: scholarships.length,
      highPriority,
      tasksDone: doneTasks,
      totalTasks: tasks.length,
      resourcesDone: doneResources,
      totalResources: resources.length,
      documentsCreated: writingDocuments.filter(d => d.status !== 'Draft').length,
      aiRewrites: writingDocuments.reduce((s, d) => s + (d.improvementChecklist?.length || 0), 0),
      wordsWritten: wordsWritten || 8452,
      timeSaved: Math.round(writingDocuments.length * 2.1 * 10) / 10 || 6.2,
    };
  }, [scholarships, tasks, resources, writingDocuments]);

  const updateScholarshipStatus = useCallback((id: string, status: Scholarship['status']) => {
    let updated: Scholarship | undefined;
    setScholarships(prev => prev.map(s => {
      if (s.id !== id) return s;
      updated = { ...s, status };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveScholarship(user.id, updated!));
  }, [user]);

  const addScholarship = useCallback((s: Scholarship) => {
    setScholarships(prev => [...prev, s]);
    cloudWrite(() => dbSaveScholarship(user!.id, s));
  }, [user]);

  const updateTask = useCallback((id: string, status: Task['status']) => {
    let updated: Task | undefined;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      updated = { ...t, status };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveTask(user.id, updated!));
  }, [user]);

  const addTask = useCallback((t: Task) => {
    setTasks(prev => [...prev, t]);
    cloudWrite(() => dbSaveTask(user!.id, t));
  }, [user]);

  const updateResourceStatus = useCallback((id: string, status: LearningResource['status']) => {
    let updated: LearningResource | undefined;
    setResources(prev => prev.map(r => {
      if (r.id !== id) return r;
      updated = { ...r, status };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveResource(user.id, updated!));
  }, [user]);

  const addResource = useCallback((r: LearningResource) => {
    setResources(prev => [...prev, r]);
    cloudWrite(() => dbSaveResource(user!.id, r));
  }, [user]);

  const addDocument = useCallback((d: SOPDocument) => {
    setDocuments(prev => [...prev, d]);
  }, []);

  const updateDocument = useCallback((id: string, content: string) => {
    setDocuments(prev => prev.map(d => d.id === id
      ? { ...d, content, wordCount: content.split(/\s+/).filter(Boolean).length, updatedAt: new Date().toISOString() }
      : d
    ));
  }, []);

  const addWritingDocument = useCallback((d: WritingDocument) => {
    setWritingDocuments(prev => [...prev, d]);
    cloudWrite(() => dbSaveWritingDoc(user!.id, d));
  }, [user]);

  const updateWritingDocument = useCallback((id: string, updates: Partial<WritingDocument>) => {
    let updated: WritingDocument | undefined;
    setWritingDocuments(prev => prev.map(d => {
      if (d.id !== id) return d;
      updated = { ...d, ...updates, updatedAt: new Date().toISOString() };
      return updated;
    }));
    if (updated && user) cloudWrite(() => dbSaveWritingDoc(user.id, updated!));
  }, [user]);

  const deleteWritingDocument = useCallback((id: string) => {
    setWritingDocuments(prev => prev.filter(d => d.id !== id));
    cloudWrite(() => dbDeleteWritingDoc(id));
  }, [user]);

  const updateStudentProfile = useCallback((p: Partial<StudentProfile>) => {
    let merged: StudentProfile | undefined;
    setStudentProfile(prev => {
      merged = { ...prev, ...p };
      return merged;
    });
    if (merged && user) cloudWrite(() => dbSaveProfile(user.id, merged!));
  }, [user]);

  const submitPayment = useCallback((p: Payment) => {
    setPayments(prev => [...prev, p]);
    cloudWrite(() => dbSavePayment(user!.id, p));
  }, [user]);

  const approvePayment = useCallback((id: string) => {
    let approved: Payment | undefined;
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      approved = { ...p, status: 'Approved' as const };
      return approved;
    }));
    if (!approved) return;

    // Upgrade the student's plan on their profile (single source of truth).
    // Reset usage counters so they get a fresh month under the new plan.
    if (approved.planName === 'Starter' || approved.planName === 'Pro' || approved.planName === 'Premium') {
      setStudentProfile(prev => {
        const merged: StudentProfile = {
          ...prev,
          currentPlan: approved!.planName,
          essaysUsedThisPeriod: 0,
          lettersUsedThisPeriod: 0,
          usagePeriodStarted: new Date().toISOString(),
        };
        if (user) cloudWrite(() => dbSaveProfile(user.id, merged));
        return merged;
      });
    }

    if (user) cloudWrite(() => dbSavePayment(user.id, approved!));
  }, [user]);

  const rejectPayment = useCallback((id: string) => {
    let rejected: Payment | undefined;
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p;
      rejected = { ...p, status: 'Rejected' as const };
      return rejected;
    }));
    if (rejected && user) cloudWrite(() => dbSavePayment(user.id, rejected!));
  }, [user]);

  // ── Plan-gating: usage consumers ─────────────────────────────────
  // Each one resets the monthly counter if a new month has started,
  // then checks the remaining quota, then bumps the counter and persists.
  // Returns false if the user is at limit (caller should show upgrade modal).

  const consumeEssay = useCallback((): boolean => {
    const profile = studentProfile;
    const periodStarted = profile.usagePeriodStarted;
    const reset = shouldResetUsagePeriod(periodStarted);
    const used = reset ? 0 : (profile.essaysUsedThisPeriod ?? 0);
    const r = getRemaining(profile.currentPlan ?? 'Free', used, profile.lettersUsedThisPeriod ?? 0);
    if (r.essaysCapped && r.essays <= 0) return false;

    setStudentProfile(prev => {
      const merged: StudentProfile = {
        ...prev,
        essaysUsedThisPeriod: used + 1,
        lettersUsedThisPeriod: reset ? 0 : (prev.lettersUsedThisPeriod ?? 0),
        usagePeriodStarted: reset ? new Date().toISOString() : prev.usagePeriodStarted,
      };
      if (user) cloudWrite(() => dbSaveProfile(user.id, merged));
      return merged;
    });
    return true;
  }, [studentProfile, user]);

  const consumeLetter = useCallback((): boolean => {
    const profile = studentProfile;
    const periodStarted = profile.usagePeriodStarted;
    const reset = shouldResetUsagePeriod(periodStarted);
    const used = reset ? 0 : (profile.lettersUsedThisPeriod ?? 0);
    const r = getRemaining(profile.currentPlan ?? 'Free', profile.essaysUsedThisPeriod ?? 0, used);
    if (r.lettersCapped && r.letters <= 0) return false;

    setStudentProfile(prev => {
      const merged: StudentProfile = {
        ...prev,
        lettersUsedThisPeriod: used + 1,
        essaysUsedThisPeriod: reset ? 0 : (prev.essaysUsedThisPeriod ?? 0),
        usagePeriodStarted: reset ? new Date().toISOString() : prev.usagePeriodStarted,
      };
      if (user) cloudWrite(() => dbSaveProfile(user.id, merged));
      return merged;
    });
    return true;
  }, [studentProfile, user]);

  // Legacy alias: existing callers used `consumeCredit()` for essays.
  const consumeCredit = consumeEssay;

  return (
    <AppContext.Provider value={{
      scholarships, tasks, resources, documents,
      writingDocuments, studentProfile, payments,
      currentPlan, writingCredits,
      stats: computeStats(),
      stories, recommenders, retrospectives,
      syncStatus,
      updateScholarshipStatus, addScholarship,
      updateTask, addTask,
      updateResourceStatus, addResource,
      addDocument, updateDocument,
      addWritingDocument, updateWritingDocument, deleteWritingDocument,
      updateStudentProfile,
      submitPayment, approvePayment, rejectPayment,
      consumeCredit,
      essaysRemaining: remaining.essays,
      lettersRemaining: remaining.letters,
      essaysCapped: remaining.essaysCapped,
      lettersCapped: remaining.lettersCapped,
      consumeEssay,
      consumeLetter,
      addStory, updateStory, deleteStory,
      addRecommender, updateRecommender, deleteRecommender,
      addRetrospective,
      paymentSettings, updatePaymentSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
