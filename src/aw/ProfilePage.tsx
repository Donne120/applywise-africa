import { useState } from 'react';
import { User, Save, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { StudentProfile, FieldCategory, EnglishLevel, GpaBand, DegreeLevel } from '../types';

const FIELDS: FieldCategory[] = ['STEM', 'Business', 'Medicine & Health', 'Arts & Design', 'Music & Performance', 'Humanities', 'Social Sciences', 'Law', 'Education', 'Agriculture', 'Other'];
const ENGLISH: EnglishLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Native', 'Tested (IELTS/TOEFL)'];
const GPA: GpaBand[] = ['Top 10%', 'Strong (B+ / 3.3+)', 'Mid (B / 3.0)', 'Below average (<3.0)', 'Not graded yet'];
const LEVELS: DegreeLevel[] = ["Bachelor's", "Master's", 'PhD', 'Diploma', 'Scholarship', 'Exchange Program', 'Certificate'];

export default function ProfilePage() {
  const { studentProfile, updateStudentProfile } = useApp();
  const [form, setForm] = useState<StudentProfile>(studentProfile);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof StudentProfile>(k: K, v: StudentProfile[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    updateStudentProfile({ ...form, onboardingComplete: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <>
      <section className="aw-hero" style={{ padding: '24px 0 8px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 38px)' }}>This is what I'll remember about you.</h1>
        <p className="aw-hero-sub">The more I know, the more every piece of writing sounds like you — not a template.</p>
      </section>

      <div style={{ maxWidth: 820, margin: '32px auto 0' }}>
        <Section title="Who you are">
          <Row>
            <Field label="Full name"><input className="aw-input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name" /></Field>
            <Field label="Country of origin"><input className="aw-input" value={form.countryOfOrigin} onChange={e => set('countryOfOrigin', e.target.value)} placeholder="e.g. Cameroon" /></Field>
          </Row>
        </Section>

        <Section title="Field & level">
          <Row>
            <Field label="Field category">
              <select className="aw-input" value={form.fieldCategory} onChange={e => set('fieldCategory', e.target.value as FieldCategory)}>
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="More specific">
              <input className="aw-input" value={form.fieldSpecific} onChange={e => set('fieldSpecific', e.target.value)} placeholder="e.g. AI for healthcare" />
            </Field>
          </Row>
          <Row>
            <Field label="Current education level">
              <input className="aw-input" value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)} placeholder="e.g. Final-year BSc" />
            </Field>
            <Field label="Intended degree">
              <select className="aw-input" value={form.intendedDegreeLevel} onChange={e => set('intendedDegreeLevel', e.target.value as DegreeLevel)}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Academics">
          <Row>
            <Field label="Academic standing">
              <select className="aw-input" value={form.currentGpa} onChange={e => set('currentGpa', e.target.value as GpaBand)}>
                {GPA.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="English level">
              <select className="aw-input" value={form.englishLevel} onChange={e => set('englishLevel', e.target.value as EnglishLevel)}>
                {ENGLISH.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Where you want to go">
          <Field label="Target countries">
            <input className="aw-input" value={form.targetCountries} onChange={e => set('targetCountries', e.target.value)} placeholder="e.g. Germany, Canada, Netherlands" />
          </Field>
          <Field label="Preferred programs">
            <input className="aw-input" value={form.preferredPrograms} onChange={e => set('preferredPrograms', e.target.value)} placeholder="e.g. MSc Data Science, MEng Computer Science" />
          </Field>
        </Section>

        <Section title="Your story material">
          <Field label="Career goals">
            <textarea className="aw-input" rows={3} value={form.careerGoals} onChange={e => set('careerGoals', e.target.value)} placeholder="Where you want this to take you — short and long term." />
          </Field>
          <Field label="Work experience">
            <textarea className="aw-input" rows={3} value={form.workExperience} onChange={e => set('workExperience', e.target.value)} placeholder="Internships, jobs, research, freelance work." />
          </Field>
          <Field label="Projects">
            <textarea className="aw-input" rows={3} value={form.projects} onChange={e => set('projects', e.target.value)} placeholder="Things you've actually built or done." />
          </Field>
          <Field label="Achievements">
            <textarea className="aw-input" rows={3} value={form.achievements} onChange={e => set('achievements', e.target.value)} placeholder="Awards, honors, scholarships, recognition." />
          </Field>
          <Field label="Challenges you've overcome">
            <textarea className="aw-input" rows={3} value={form.challenges} onChange={e => set('challenges', e.target.value)} placeholder="Obstacles that shaped how you think." />
          </Field>
          <Field label="Personal story notes">
            <textarea className="aw-input" rows={4} value={form.personalStoryNotes} onChange={e => set('personalStoryNotes', e.target.value)} placeholder="Anything else that makes you who you are. Family, identity, turning points, the thing only you know." />
          </Field>
        </Section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0 60px' }}>
          <button className="aw-send-btn" onClick={save}>
            {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save profile</>}
          </button>
        </div>
      </div>

      <style>{`
        .aw-input {
          width: 100%;
          background: var(--aw-surface-2);
          border: 1px solid var(--aw-border);
          border-radius: var(--aw-r-sm);
          color: var(--aw-text);
          padding: 11px 14px;
          font-family: inherit;
          font-size: 14.5px;
          outline: none;
          transition: border-color 160ms ease;
          line-height: 1.5;
        }
        .aw-input:focus {
          border-color: rgba(139, 124, 246, 0.5);
          box-shadow: 0 0 0 3px var(--aw-ring);
        }
        textarea.aw-input { resize: vertical; min-height: 80px; }
      `}</style>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--aw-glass)',
      border: '1px solid var(--aw-border)',
      borderRadius: 'var(--aw-r-lg)',
      padding: '22px 24px',
      marginBottom: 18,
    }}>
      <h3 style={{
        fontFamily: 'var(--aw-font-serif)',
        fontSize: 17,
        margin: '0 0 16px',
        fontWeight: 600,
        color: 'var(--aw-text)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <User size={15} style={{ color: 'var(--aw-purple)' }} /> {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 12, color: 'var(--aw-text-muted)', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
