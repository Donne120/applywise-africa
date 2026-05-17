import { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  FieldCategory, DegreeLevel, GpaBand, EnglishLevel,
} from '../types';
import { getFieldHero, FIELD_GREETING } from '../utils/fieldAssets';

const FIELDS: FieldCategory[] = [
  'STEM', 'Business', 'Medicine & Health', 'Arts & Design',
  'Music & Performance', 'Humanities', 'Social Sciences',
  'Law', 'Education', 'Agriculture', 'Other',
];
const DEGREES: DegreeLevel[] = ["Bachelor's", "Master's", 'PhD', 'Diploma', 'Exchange Program', 'Certificate'];
const GPAS: GpaBand[] = ['Top 10%', 'Strong (B+ / 3.3+)', 'Mid (B / 3.0)', 'Below average (<3.0)', 'Not graded yet'];
const ENGLISH: EnglishLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Native', 'Tested (IELTS/TOEFL)'];

export default function OnboardingModal() {
  const { studentProfile, updateStudentProfile } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: studentProfile.fullName,
    countryOfOrigin: studentProfile.countryOfOrigin,
    fieldCategory: studentProfile.fieldCategory,
    fieldSpecific: studentProfile.fieldSpecific,
    intendedDegreeLevel: studentProfile.intendedDegreeLevel,
    currentGpa: studentProfile.currentGpa,
    englishLevel: studentProfile.englishLevel,
    targetCountries: studentProfile.targetCountries,
  });

  const totalSteps = 5;
  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const finish = () => updateStudentProfile({ ...form, onboardingComplete: true });
  const skip = () => updateStudentProfile({ onboardingComplete: true });

  const canAdvance =
    (step === 0 && form.fullName.trim().length > 0) ||
    (step === 1) ||
    (step === 2) ||
    (step === 3) ||
    (step === 4);

  return (
    <div className="modal-backdrop onboarding-backdrop">
      <div className="onboarding-modal">
        <div className="onboarding-art" aria-hidden="true">
          <img src={getFieldHero(form.fieldCategory, 700)} alt="" />
          <div className="onboarding-art-fade" />
          <div className="onboarding-art-text">
            <Sparkles size={14} />
            <span>{FIELD_GREETING[form.fieldCategory]}</span>
          </div>
        </div>

        <div className="onboarding-body">
          <div className="onboarding-progress">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />
            ))}
          </div>

          {step === 0 && (
            <>
              <h2>Welcome to ApplyWise Africa 🌍</h2>
              <p className="onboarding-sub">
                Let's set up your space — just a minute. Everything you see after this will be tuned to <em>you</em>.
              </p>
              <div className="onboarding-fields">
                <div className="form-field">
                  <label>What should we call you?</label>
                  <input
                    autoFocus
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="e.g. Dieudonne Ngum"
                  />
                </div>
                <div className="form-field">
                  <label>Where are you from?</label>
                  <input
                    value={form.countryOfOrigin}
                    onChange={e => setForm(f => ({ ...f, countryOfOrigin: e.target.value }))}
                    placeholder="e.g. Rwanda, Cameroon, Nigeria…"
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>What's your field?</h2>
              <p className="onboarding-sub">Pick the area closest to your studies. You can be more specific below.</p>
              <div className="onboarding-fields">
                <div className="field-grid">
                  {FIELDS.map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`field-chip ${form.fieldCategory === f ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, fieldCategory: f }))}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="form-field">
                  <label>Specifically? (optional)</label>
                  <input
                    value={form.fieldSpecific}
                    onChange={e => setForm(prev => ({ ...prev, fieldSpecific: e.target.value }))}
                    placeholder='e.g. "AI Safety", "Jazz Piano", "Public Health Policy"'
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>What's the next step you're applying for?</h2>
              <p className="onboarding-sub">We'll personalize deadlines and writing templates around this.</p>
              <div className="onboarding-fields">
                <div className="field-grid">
                  {DEGREES.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`field-chip ${form.intendedDegreeLevel === d ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, intendedDegreeLevel: d }))}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="form-field">
                  <label>Target countries (you can list a few)</label>
                  <input
                    value={form.targetCountries}
                    onChange={e => setForm(f => ({ ...f, targetCountries: e.target.value }))}
                    placeholder="e.g. UK, Germany, Canada"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Honest snapshot — academics & English</h2>
              <p className="onboarding-sub">
                No judgment. This helps us spot gaps and show you <em>exactly</em> how to close them.
              </p>
              <div className="onboarding-fields">
                <div className="form-field">
                  <label>Your current GPA / academic band</label>
                  <div className="field-grid">
                    {GPAS.map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`field-chip ${form.currentGpa === g ? 'active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, currentGpa: g }))}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label>Your English level</label>
                  <div className="field-grid">
                    {ENGLISH.map(e => (
                      <button
                        key={e}
                        type="button"
                        className={`field-chip ${form.englishLevel === e ? 'active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, englishLevel: e }))}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Beautiful, {form.fullName.split(' ')[0] || 'friend'}. You're ready. ✨</h2>
              <p className="onboarding-sub">
                Here's what we'll personalize for you from this moment on:
              </p>
              <ul className="onboarding-summary">
                <li><Check size={14} /> A space styled around <strong>{form.fieldCategory}</strong></li>
                <li><Check size={14} /> Scholarships filtered for <strong>{form.intendedDegreeLevel}</strong> in {form.targetCountries || 'your target countries'}</li>
                <li><Check size={14} /> Writing assistance tuned to your story angle</li>
                <li><Check size={14} /> A learning path that closes <strong>your</strong> gaps, not generic ones</li>
              </ul>
              <p className="onboarding-tip">
                You can change any of this later in <em>Profile</em>.
              </p>
            </>
          )}

          <div className="onboarding-actions">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={prev}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button className="btn btn-ghost onboarding-skip" onClick={skip}>Skip for now</button>
            {step < totalSteps - 1 ? (
              <button className="btn btn-primary" onClick={next} disabled={!canAdvance}>
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={finish}>
                Take me in <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
