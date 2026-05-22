import type { WritingType } from '../types';

export type AwFlowKey =
  | 'sop'
  | 'scholarship'
  | 'motivation'
  | 'improve'
  | 'email'
  | 'recommendation'
  | 'research';

export interface AwFlow {
  key: AwFlowKey;
  writingType: WritingType;
  label: string;
  desc: string;
  hero: string;
  heroSub: string;
  coachIntro: string;
  questions: string[];
  tone: 'reflective' | 'persuasive' | 'professional' | 'authoritative' | 'rigorous';
}

export const FLOWS: Record<AwFlowKey, AwFlow> = {
  sop: {
    key: 'sop',
    writingType: 'Statement of Purpose',
    label: 'Write SOP',
    desc: 'Identity + academic direction',
    hero: "Let's build your study-abroad story.",
    heroSub: 'Write freely in English, French, Pidgin or bullet points. ApplyWise will help turn your ideas into powerful application writing.',
    coachIntro: "I'm your academic mentor. Let's uncover what drives you — the moments, ideas, and direction that make your application yours.",
    questions: [
      'What first sparked your interest in this field?',
      'Tell me about one project, class, or experience that shaped your direction.',
      'Why this specific university — what about it fits you?',
      'Why this country? What pulls you there beyond the program?',
      'What future problem do you want to help solve?',
    ],
    tone: 'reflective',
  },
  scholarship: {
    key: 'scholarship',
    writingType: 'Scholarship Essay',
    label: 'Scholarship Essay',
    desc: 'Impact, leadership & potential',
    hero: "Let's uncover why YOU deserve this opportunity.",
    heroSub: "A scholarship essay isn't about being perfect — it's about being unmistakably you. Tell me what's shaped you.",
    coachIntro: "I'm your scholarship strategist. We're going to find the angle that makes your story impossible to overlook.",
    questions: [
      'What challenge have you overcome that changed how you see yourself?',
      'Tell me about a moment of leadership — even a quiet one.',
      'How would this scholarship change what becomes possible for you?',
      'How will you give back to your community with what you learn?',
      'Why should this scholarship invest in you specifically?',
    ],
    tone: 'persuasive',
  },
  motivation: {
    key: 'motivation',
    writingType: 'Motivation Letter',
    label: 'Motivation Letter',
    desc: 'European-style applications',
    hero: 'Show them why this program, why now.',
    heroSub: 'Motivation letters are short and pointed. We\'ll find your sharpest reasons and write them cleanly.',
    coachIntro: 'A motivation letter is direct. Let me ask just enough to make yours land.',
    questions: [
      'What specifically drew you to this program?',
      'What relevant background or work makes you ready for it?',
      'What do you hope to do during the program?',
      'And after — what comes next?',
    ],
    tone: 'professional',
  },
  improve: {
    key: 'improve',
    writingType: 'Statement of Purpose',
    label: 'Improve Existing Writing',
    desc: 'Paste your draft, get a real review',
    hero: 'Let me read what you have.',
    heroSub: 'Paste your draft. I\'ll look for generic phrasing, robotic tone, emotional flatness, and missing specifics — then help you fix them.',
    coachIntro: 'Paste your current draft below. I\'ll read it as an admissions reader would.',
    questions: [],
    tone: 'reflective',
  },
  email: {
    key: 'email',
    writingType: 'Professor Outreach Email',
    label: 'Email Writer',
    desc: 'Professors, admissions, follow-ups',
    hero: 'Let\'s write a short, clear email.',
    heroSub: 'A few questions, and I\'ll give you something you can paste straight into your inbox.',
    coachIntro: 'Quick and clean. Tell me who and why.',
    questions: [
      'Who are you emailing? (name, title, university if relevant)',
      'What\'s the purpose of the email in one sentence?',
      'Formal or friendly?',
      'Short and direct, or a bit more detailed?',
    ],
    tone: 'professional',
  },
  recommendation: {
    key: 'recommendation',
    writingType: 'Recommendation Letter',
    label: 'Recommendation Letter',
    desc: 'Draft for your recommender',
    hero: 'A real letter your recommender can sign.',
    heroSub: 'I\'ll draft this in their voice, not yours. They can edit and personalize it.',
    coachIntro: 'I\'ll write this from your recommender\'s perspective. Tell me about them and the work they saw.',
    questions: [
      'Who is recommending you? (name, title, institution)',
      'What was your relationship — professor, supervisor, mentor?',
      'How long have they known you?',
      'What strengths did they see in you firsthand?',
      'One concrete moment they witnessed that proves it.',
    ],
    tone: 'authoritative',
  },
  research: {
    key: 'research',
    writingType: 'Research Proposal',
    label: 'Research Proposal',
    desc: 'PhD & research applications',
    hero: 'Let\'s frame your research question.',
    heroSub: 'We\'ll define the problem, the gap, and your approach — clearly enough that a committee can see the work.',
    coachIntro: 'I\'m your research mentor. Let\'s structure your thinking first, then write.',
    questions: [
      'What is your research topic in one or two sentences?',
      'What specific problem does it address?',
      'What gap in current knowledge or practice are you filling?',
      'Why does this matter — to the field, to the world?',
      'What methodology do you propose?',
      'What contribution do you expect to make?',
    ],
    tone: 'rigorous',
  },
};

export const QUICK_ACTIONS: AwFlowKey[] = [
  'sop', 'scholarship', 'motivation', 'improve', 'email', 'recommendation', 'research',
];
