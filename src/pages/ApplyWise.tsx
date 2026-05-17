import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PenTool, FileText, Lightbulb,
  Copy, Save, RefreshCw, Sparkles, ChevronRight, ChevronLeft,
  Check, AlertCircle, BarChart2, CreditCard, Settings,
  Trash2, Edit3, Plus, CheckCircle, Clock, Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  WritingDocument, WritingType, DegreeLevel, WritingTone,
  OutputStyle, ParagraphLength, CountryStyle, QualityScores, StudentProfile, PlanName, Payment
} from '../types';
import {
  generateFollowUpQuestions,
  generateProfileSummary,
  generateWriting,
  improveWriting,
  scoreWriting,
} from '../services/gemini';
import { generateId } from '../utils/helpers';
import VoiceInput from '../components/VoiceInput';
import UpgradeModal from '../components/UpgradeModal';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const WRITING_TYPES: { type: WritingType; icon: string; desc: string }[] = [
  { type: 'Statement of Purpose', icon: 'ðŸŽ¯', desc: 'For graduate & PhD applications' },
  { type: 'Personal Statement', icon: 'ðŸ‘¤', desc: 'Undergraduate & scholarship applications' },
  { type: 'Motivation Letter', icon: 'ðŸ’¡', desc: 'European university applications' },
  { type: 'Scholarship Essay', icon: 'ðŸ†', desc: 'Specific scholarship programs' },
  { type: 'Study Plan', icon: 'ðŸ“‹', desc: 'Visa & program applications' },
  { type: 'Recommendation Letter', icon: 'âœï¸', desc: 'Draft for your recommender' },
  { type: 'Research Proposal', icon: 'ðŸ”¬', desc: 'PhD & research programs' },
  { type: 'Professor Outreach Email', icon: 'ðŸ“§', desc: 'Contact potential supervisors' },
  { type: 'Admission Email', icon: 'ðŸ›ï¸', desc: 'Contact admissions offices' },
  { type: 'CV Profile Summary', icon: 'ðŸ“„', desc: 'Professional summary for applications' },
];

const DEGREE_LEVELS: DegreeLevel[] = ["Bachelor's", "Master's", 'PhD', 'Diploma', 'Scholarship', 'Exchange Program', 'Certificate'];
const TONES: WritingTone[] = ['Natural', 'Academic', 'Emotional', 'Concise', 'Confident'];
const OUTPUT_STYLES: OutputStyle[] = ['Plain Text', 'Structured Essay', 'Formal Letter', 'Email', 'Recommendation Letter', 'Scholarship Essay', 'SOP', 'Study Plan'];
const PARA_LENGTHS: ParagraphLength[] = ['Short', 'Medium', 'Detailed'];
const COUNTRY_STYLES: CountryStyle[] = ['Canada', 'UK', 'USA', 'Germany', 'France', 'Australia', 'Rwanda', 'Cameroon', 'Other'];

const IMPROVE_ACTIONS = [
  'Make more natural', 'Make more academic', 'Make more emotional', 'Make more concise',
  'Strengthen opening', 'Improve conclusion', 'Tailor to university', 'Reduce generic language',
  'Check honesty and consistency', 'Rewrite with same format', 'Shorten to word limit',
  'Expand with more detail', 'Make more formal',
];

const TABS = ['Write', 'Saved'] as const;
type Tab = typeof TABS[number];

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ApplyWise() {
  const [searchParams] = useSearchParams();
  const {
    scholarships, writingDocuments, studentProfile,
    currentPlan,
    addWritingDocument, updateWritingDocument, deleteWritingDocument,
    consumeEssay,
    essaysRemaining, essaysCapped,
    stories,
  } = useApp();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const prefillScholarshipId = searchParams.get('scholarship');
  const prefillScholarship = scholarships.find(s => s.id === prefillScholarshipId);

  const [activeTab, setActiveTab] = useState<Tab>('Write');
  const [activeDoc, setActiveDoc] = useState<WritingDocument | null>(null);
  const [step, setStep] = useState(0); // 0=mode-select 1=setup 2=raw 3=questions 4=profile 5=writing 6=format 7=review
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Step 1 form
  const [writingType, setWritingType] = useState<WritingType>('Statement of Purpose');
  const [targetCountry, setTargetCountry] = useState(prefillScholarship?.country || '');
  const [targetUniversity, setTargetUniversity] = useState(prefillScholarship?.institution || '');
  const [targetProgram, setTargetProgram] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>("Master's");
  const [scholarshipName, setScholarshipName] = useState(prefillScholarship?.name || '');
  const [wordLimit, setWordLimit] = useState(0);
  const [deadline, setDeadline] = useState(prefillScholarship?.deadline || '');
  const [tone, setTone] = useState<WritingTone>('Natural');
  const [outputStyle, setOutputStyle] = useState<OutputStyle>('Structured Essay');

  // Step 2
  const [rawInput, setRawInput] = useState('');

  // Step 3
  const [followUpQs, setFollowUpQs] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);

  // Step 4
  const [profileSummary, setProfileSummary] = useState('');
  const [storyAngle, setStoryAngle] = useState('');
  const [outline, setOutline] = useState('');

  // Step 5/6
  const [finalWriting, setFinalWriting] = useState('');
  const [formattingStyle, setFormattingStyle] = useState<OutputStyle>('Structured Essay');
  const [paraLength, setParaLength] = useState<ParagraphLength>('Medium');
  const [countryStyle, setCountryStyle] = useState<CountryStyle>('Other');

  // Step 7
  const [qualityScores, setQualityScores] = useState<QualityScores | null>(null);
  const [scoringLoading, setScoringLoading] = useState(false);

  const hasApiKey = !!(import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  // Pre-fill from URL param
  useEffect(() => {
    if (prefillScholarship) {
      setTargetCountry(prefillScholarship.country);
      setTargetUniversity(prefillScholarship.institution);
      setScholarshipName(prefillScholarship.name);
      setDeadline(prefillScholarship.deadline);
      setStep(1);
    }
  }, [prefillScholarship]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const saveCurrentDoc = useCallback(() => {
    if (!activeDoc) {
      const newDoc: WritingDocument = {
        id: generateId(),
        title: `${writingType} â€” ${targetUniversity || targetCountry || 'Draft'}`,
        writingType,
        targetCountry,
        targetUniversity,
        targetProgram,
        degreeLevel,
        scholarshipName,
        wordLimit,
        deadline,
        tone,
        outputStyle,
        formattingStyle,
        paragraphLength: paraLength,
        countryStyle,
        rawInput,
        followUpQuestions: followUpQs,
        userAnswers,
        profileSummary,
        storyAngle,
        outline,
        finalWriting,
        qualityScores,
        improvementChecklist: [],
        status: finalWriting ? 'Generated' : 'Draft',
        linkedScholarshipId: prefillScholarshipId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addWritingDocument(newDoc);
      setActiveDoc(newDoc);
    } else {
      updateWritingDocument(activeDoc.id, {
        rawInput, followUpQuestions: followUpQs, userAnswers,
        profileSummary, storyAngle, outline, finalWriting,
        qualityScores, formattingStyle, paragraphLength: paraLength,
        countryStyle, tone, status: finalWriting ? 'Generated' : 'Draft',
      });
    }
  }, [activeDoc, writingType, targetCountry, targetUniversity, targetProgram,
    degreeLevel, scholarshipName, wordLimit, deadline, tone, outputStyle,
    formattingStyle, paraLength, countryStyle, rawInput, followUpQs, userAnswers,
    profileSummary, storyAngle, outline, finalWriting, qualityScores,
    prefillScholarshipId, addWritingDocument, updateWritingDocument]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalWriting);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // â”€â”€ AI Flows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleGetQuestions = async () => {
    if (!rawInput.trim()) { setError('Please paste your raw ideas first.'); return; }
    setError('');
    if (!hasApiKey) {
      setFollowUpQs(getFallbackQuestions(writingType, degreeLevel));
      setUserAnswers(new Array(7).fill(''));
      setStep(3);
      return;
    }
    setIsLoading(true);
    setLoadingMsg('Analyzing your ideasâ€¦');
    try {
      const qs = await generateFollowUpQuestions(writingType, degreeLevel, rawInput, targetCountry, targetProgram, studentProfile, stories);
      setFollowUpQs(qs);
      setUserAnswers(new Array(qs.length).fill(''));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildProfile = async () => {
    setError('');
    if (!hasApiKey) {
      setProfileSummary(getMockProfileSummary(writingType, degreeLevel, targetProgram, targetCountry));
      setStoryAngle('Your unique African perspective combined with technical expertise and community impact forms a compelling narrative.');
      setOutline('Introduction â†’ Academic Background â†’ Motivation â†’ Research/Professional Experience â†’ Goals â†’ Program Fit â†’ Conclusion');
      setStep(4);
      return;
    }
    setIsLoading(true);
    setLoadingMsg('Building your story profileâ€¦');
    try {
      const result = await generateProfileSummary({
        writingType, degreeLevel, targetCountry, targetUniversity,
        targetProgram, scholarshipName, rawInput,
        followUpQuestions: followUpQs, userAnswers,
      }, studentProfile, stories);
      setProfileSummary(result.profileSummary);
      setStoryAngle(result.storyAngle);
      setOutline(result.outline);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profile generation failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError('');
    if (!consumeEssay()) {
      setUpgradeOpen(true);
      return;
    }
    if (!hasApiKey) {
      setFinalWriting(getMockWriting(writingType, degreeLevel, targetUniversity, targetCountry, targetProgram, scholarshipName));
      setStep(6);
      return;
    }
    setIsLoading(true);
    setLoadingMsg('Generating your polished writingâ€¦');
    try {
      const text = await generateWriting({
        writingType, degreeLevel, targetCountry, targetUniversity,
        targetProgram, scholarshipName, wordLimit, deadline,
        tone, outputStyle, formattingStyle, paragraphLength: paraLength,
        countryStyle, rawInput, followUpQuestions: followUpQs,
        userAnswers, profileSummary, storyAngle, outline,
      }, studentProfile, stories);
      setFinalWriting(text);
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Writing generation failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprove = async (action: string) => {
    setError('');
    if (!finalWriting) return;
    if (!hasApiKey) {
      setFinalWriting(prev => `[Improved: ${action}]\n\n${prev}`);
      return;
    }
    setIsLoading(true);
    setLoadingMsg(`Applying: ${action}â€¦`);
    try {
      const improved = await improveWriting(finalWriting, action, writingType, degreeLevel, tone, wordLimit);
      setFinalWriting(improved);
      if (activeDoc) {
        updateWritingDocument(activeDoc.id, {
          finalWriting: improved,
          improvementChecklist: [...(activeDoc.improvementChecklist || []), action],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Improvement failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreWriting = async () => {
    if (!finalWriting || scoringLoading) return;
    if (!hasApiKey) {
      setQualityScores({ specificity: 7, authenticity: 8, academicStrength: 7, programFit: 8, careerClarity: 7, emotionalDepth: 6, grammar: 9, genericRisk: 7, copyPasteReadiness: 9 });
      return;
    }
    setScoringLoading(true);
    try {
      const scores = await scoreWriting(finalWriting, writingType, degreeLevel);
      setQualityScores(scores);
    } catch (e) {
      // silent fail
    } finally {
      setScoringLoading(false);
    }
  };

  const wordCount = finalWriting.split(/\s+/).filter(Boolean).length;

  // â”€â”€ Open saved doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openDoc = (doc: WritingDocument) => {
    setActiveDoc(doc);
    setWritingType(doc.writingType);
    setTargetCountry(doc.targetCountry);
    setTargetUniversity(doc.targetUniversity);
    setTargetProgram(doc.targetProgram);
    setDegreeLevel(doc.degreeLevel);
    setScholarshipName(doc.scholarshipName);
    setWordLimit(doc.wordLimit);
    setDeadline(doc.deadline);
    setTone(doc.tone);
    setOutputStyle(doc.outputStyle);
    setFormattingStyle(doc.formattingStyle || doc.outputStyle);
    setParaLength(doc.paragraphLength || 'Medium');
    setCountryStyle(doc.countryStyle || 'Other');
    setRawInput(doc.rawInput);
    setFollowUpQs(doc.followUpQuestions);
    setUserAnswers(doc.userAnswers);
    setProfileSummary(doc.profileSummary);
    setStoryAngle(doc.storyAngle);
    setOutline(doc.outline);
    setFinalWriting(doc.finalWriting);
    setQualityScores(doc.qualityScores);
    setActiveTab('Write');
    setStep(doc.finalWriting ? 7 : doc.profileSummary ? 4 : doc.rawInput ? 2 : 1);
  };

  const resetWorkspace = () => {
    setActiveDoc(null);
    setStep(0);
    setRawInput(''); setFollowUpQs([]); setUserAnswers([]);
    setProfileSummary(''); setStoryAngle(''); setOutline('');
    setFinalWriting(''); setQualityScores(null); setError('');
  };

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="page aw-page">
      {/* Header */}
      <div className="aw-header">
        <div className="aw-header-left">
          <div className="aw-header-icon"><PenTool size={22} /></div>
          <div>
            <h1>ApplyWise Africa</h1>
            <p className="page-subtitle">Turn your raw ideas into powerful study-abroad application writing.</p>
          </div>
        </div>
        <div className="aw-header-right">
          <div className="aw-credits-badge">
            <CreditCard size={14} />
            <span>
              {essaysCapped
                ? <><strong>{essaysRemaining}</strong> essay{essaysRemaining === 1 ? '' : 's'} left this month</>
                : <>Unlimited essays</>}
            </span>
            <span className={`plan-tag plan-${currentPlan.toLowerCase()}`}>{currentPlan}</span>
          </div>
          {!hasApiKey && (
            <div className="aw-api-warning">
              <AlertCircle size={14} />
              <span>Demo mode â€” add VITE_GEMINI_API_KEY for live AI</span>
            </div>
          )}
        </div>
        <div className="aw-header-art" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80"
            alt=""
            loading="lazy"
          />
          <div className="aw-header-art-fade" />
        </div>
      </div>

      {/* Ethics notice */}
      <div className="aw-ethics-notice">
        <Check size={14} />
        ApplyWise Africa helps you express your real story clearly. It does not create fake qualifications or dishonest application content.
      </div>

      {/* Tabs */}
      <div className="aw-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`aw-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* â”€â”€ TAB: Write â”€â”€ */}
      {activeTab === 'Write' && (
        <div className="aw-workspace">
          {step === 0 && <ModeSelect onSelect={t => { setWritingType(t); setStep(1); }} />}
          {step === 1 && (
            <SetupStep
              writingType={writingType}
              targetCountry={targetCountry} setTargetCountry={setTargetCountry}
              targetUniversity={targetUniversity} setTargetUniversity={setTargetUniversity}
              targetProgram={targetProgram} setTargetProgram={setTargetProgram}
              degreeLevel={degreeLevel} setDegreeLevel={setDegreeLevel}
              scholarshipName={scholarshipName} setScholarshipName={setScholarshipName}
              wordLimit={wordLimit} setWordLimit={setWordLimit}
              deadline={deadline} setDeadline={setDeadline}
              tone={tone} setTone={setTone}
              outputStyle={outputStyle} setOutputStyle={setOutputStyle}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              profileData={studentProfile}
            />
          )}
          {step === 2 && (
            <RawIdeasStep
              writingType={writingType}
              rawInput={rawInput} setRawInput={setRawInput}
              onBack={() => setStep(1)}
              onNext={handleGetQuestions}
              isLoading={isLoading} loadingMsg={loadingMsg}
              error={error}
              storyCount={stories.length}
              profileName={studentProfile.fullName}
            />
          )}
          {step === 3 && (
            <QuestionsStep
              questions={followUpQs}
              answers={userAnswers}
              setAnswers={setUserAnswers}
              onBack={() => setStep(2)}
              onNext={handleBuildProfile}
              isLoading={isLoading} loadingMsg={loadingMsg}
              error={error}
            />
          )}
          {step === 4 && (
            <ProfileStep
              profileSummary={profileSummary}
              storyAngle={storyAngle}
              outline={outline}
              setProfileSummary={setProfileSummary}
              setStoryAngle={setStoryAngle}
              setOutline={setOutline}
              onBack={() => setStep(3)}
              onNext={handleGenerate}
              isLoading={isLoading} loadingMsg={loadingMsg}
              error={error}
              paraLength={paraLength} setParaLength={setParaLength}
              countryStyle={countryStyle} setCountryStyle={setCountryStyle}
              formattingStyle={formattingStyle} setFormattingStyle={setFormattingStyle}
            />
          )}
          {(step === 5 || step === 6 || step === 7) && (
            <WritingOutput
              finalWriting={finalWriting}
              setFinalWriting={setFinalWriting}
              wordCount={wordCount}
              wordLimit={wordLimit}
              qualityScores={qualityScores}
              scoringLoading={scoringLoading}
              onImprove={handleImprove}
              onScore={handleScoreWriting}
              onCopy={handleCopy}
              onSave={saveCurrentDoc}
              onReset={resetWorkspace}
              onGenerate={handleGenerate}
              isLoading={isLoading}
              loadingMsg={loadingMsg}
              error={error}
              copied={copied}
              outputRef={outputRef}
              writingType={writingType}
            />
          )}
        </div>
      )}

      {/* â”€â”€ TAB: Saved â”€â”€ */}
      {activeTab === 'Saved' && (
        <SavedWritings
          docs={writingDocuments}
          onOpen={openDoc}
          onDelete={deleteWritingDocument}
          onNew={() => { resetWorkspace(); setActiveTab('Write'); }}
          scholarships={scholarships}
        />
      )}

      {upgradeOpen && <UpgradeModal reason="essay" onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}

// â”€â”€â”€ Step: Mode Select â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ModeSelect({ onSelect }: { onSelect: (t: WritingType) => void }) {
  return (
    <div>
      <div className="aw-section-title">
        <Sparkles size={16} />
        What would you like to write?
      </div>
      <div className="aw-mode-grid">
        {WRITING_TYPES.map(({ type, icon, desc }) => (
          <button key={type} className="aw-mode-card" onClick={() => onSelect(type)}>
            <span className="aw-mode-icon">{icon}</span>
            <div className="aw-mode-name">{type}</div>
            <div className="aw-mode-desc">{desc}</div>
            <span className="aw-mode-start">Start <ChevronRight size={13} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ Step 1: Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SetupStep({
  writingType, targetCountry, setTargetCountry,
  targetUniversity, setTargetUniversity,
  targetProgram, setTargetProgram,
  degreeLevel, setDegreeLevel,
  scholarshipName, setScholarshipName,
  wordLimit, setWordLimit,
  deadline, setDeadline,
  tone, setTone,
  outputStyle, setOutputStyle,
  onBack, onNext, profileData,
}: {
  writingType: WritingType;
  targetCountry: string; setTargetCountry: (v: string) => void;
  targetUniversity: string; setTargetUniversity: (v: string) => void;
  targetProgram: string; setTargetProgram: (v: string) => void;
  degreeLevel: DegreeLevel; setDegreeLevel: (v: DegreeLevel) => void;
  scholarshipName: string; setScholarshipName: (v: string) => void;
  wordLimit: number; setWordLimit: (v: number) => void;
  deadline: string; setDeadline: (v: string) => void;
  tone: WritingTone; setTone: (v: WritingTone) => void;
  outputStyle: OutputStyle; setOutputStyle: (v: OutputStyle) => void;
  onBack: () => void; onNext: () => void;
  profileData: StudentProfile;
}) {
  const autofilled = profileData.targetCountries || profileData.preferredPrograms;

  return (
    <div className="aw-step-card">
      <StepHeader step={1} total={7} title={`Setup: ${writingType}`} onBack={onBack} />
      {autofilled && (
        <div className="aw-autofill-hint">
          <Lightbulb size={13} /> Some fields pre-filled from your profile. Adjust as needed.
        </div>
      )}
      <div className="aw-form-grid">
        <FormField label="Target Country *">
          <input value={targetCountry} onChange={e => setTargetCountry(e.target.value)} placeholder="e.g. Germany, UK, Canada" />
        </FormField>
        <FormField label="Target University *">
          <input value={targetUniversity} onChange={e => setTargetUniversity(e.target.value)} placeholder="e.g. TU Berlin, University of Edinburgh" />
        </FormField>
        <FormField label="Target Program *">
          <input value={targetProgram} onChange={e => setTargetProgram(e.target.value)} placeholder="e.g. MSc Computer Science, BSc Engineering" />
        </FormField>
        <FormField label="Degree Level">
          <select value={degreeLevel} onChange={e => setDegreeLevel(e.target.value as DegreeLevel)}>
            {DEGREE_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Scholarship Name (if applicable)">
          <input value={scholarshipName} onChange={e => setScholarshipName(e.target.value)} placeholder="e.g. DAAD EPOS, Chevening, Fulbright" />
        </FormField>
        <FormField label="Word Limit (0 = no limit)">
          <input type="number" min={0} value={wordLimit || ''} onChange={e => setWordLimit(Number(e.target.value))} placeholder="e.g. 500, 1000" />
        </FormField>
        <FormField label="Application Deadline">
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </FormField>
        <FormField label="Writing Tone">
          <select value={tone} onChange={e => setTone(e.target.value as WritingTone)}>
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Output Style">
          <select value={outputStyle} onChange={e => setOutputStyle(e.target.value as OutputStyle)}>
            {OUTPUT_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
      </div>
      <div className="aw-step-actions">
        <button className="btn btn-primary" onClick={onNext} disabled={!targetCountry || !targetProgram}>
          Next: Paste Your Ideas <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Step 2: Raw Ideas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RawIdeasStep({ writingType, rawInput, setRawInput, onBack, onNext, isLoading, loadingMsg, error, storyCount, profileName }: {
  writingType: WritingType; rawInput: string; setRawInput: (v: string) => void;
  onBack: () => void; onNext: () => void;
  isLoading: boolean; loadingMsg: string; error: string;
  storyCount: number; profileName: string;
}) {
  return (
    <div className="aw-step-card">
      <StepHeader step={2} total={7} title="Paste Your Raw Ideas" onBack={onBack} />
      <p className="aw-step-desc">
        Don't worry about grammar, structure, or language. Write in bullet points, broken English, Pidgin, French, or mixed language —
        or tap <strong>Speak instead</strong> and tell ApplyWise out loud. We transform it into polished writing either way.
      </p>
      <div className="aw-context-chips">
        {profileName && (
          <span className="aw-context-chip">
            <Sparkles size={11} /> Personalizing for <strong>{profileName.split(' ')[0]}</strong>
          </span>
        )}
        {storyCount > 0 ? (
          <span className="aw-context-chip aw-context-chip-good">
            <Sparkles size={11} /> Drawing from <strong>{storyCount} stor{storyCount === 1 ? 'y' : 'ies'}</strong> in your Vault
          </span>
        ) : (
          <span className="aw-context-chip aw-context-chip-empty">
            No Story Vault entries yet — essays write themselves once you add a few.
          </span>
        )}
      </div>
      <VoiceInput value={rawInput} onChange={setRawInput} />
      <textarea
        className="aw-raw-textarea"
        rows={14}
        value={rawInput}
        onChange={e => setRawInput(e.target.value)}
        placeholder={`Paste your raw, scattered ideas here for your ${writingType}.\n\nExamples:\n- I want to study in Germany because they have good engineering\n- I worked on a project about machine learning last year\n- My prof said I am good at research\n- I come from a poor family but I worked hard\n- Je veux amÃ©liorer l'Afrique avec la technologie\n- I no sure wetin to write but I know say I ready for the program\n\nApplyWise will help organize your story.`}
      />
      <div className="aw-raw-counter">{rawInput.split(/\s+/).filter(Boolean).length} words</div>
      {error && <div className="aw-error"><AlertCircle size={14} /> {error}</div>}
      <div className="aw-step-actions">
        {isLoading
          ? <LoadingButton msg={loadingMsg} />
          : (
            <button className="btn btn-primary" onClick={onNext} disabled={rawInput.trim().length < 20}>
              <Sparkles size={15} /> Analyze My Ideas <ChevronRight size={16} />
            </button>
          )
        }
      </div>
    </div>
  );
}

// â”€â”€â”€ Step 3: Follow-Up Questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuestionsStep({ questions, answers, setAnswers, onBack, onNext, isLoading, loadingMsg, error }: {
  questions: string[]; answers: string[];
  setAnswers: (v: string[]) => void;
  onBack: () => void; onNext: () => void;
  isLoading: boolean; loadingMsg: string; error: string;
}) {
  const updateAnswer = (i: number, val: string) => {
    const next = [...answers];
    next[i] = val;
    setAnswers(next);
  };

  const answered = answers.filter(a => a.trim()).length;

  return (
    <div className="aw-step-card">
      <StepHeader step={3} total={7} title="AI Follow-Up Questions" onBack={onBack} />
      <p className="aw-step-desc">
        Answer as many questions as you can. The more you share, the more personalized your writing will be.
        You can skip questions you prefer not to answer.
      </p>
      <div className="aw-questions-list">
        {questions.map((q, i) => (
          <div key={i} className="aw-question-item">
            <div className="aw-q-number">Q{i + 1}</div>
            <div className="aw-q-content">
              <div className="aw-q-text">{q}</div>
              <textarea
                className="aw-q-answer"
                rows={3}
                value={answers[i] || ''}
                onChange={e => updateAnswer(i, e.target.value)}
                placeholder="Your answer (optional)..."
              />
            </div>
          </div>
        ))}
      </div>
      <div className="aw-q-progress">
        {answered}/{questions.length} questions answered
      </div>
      {error && <div className="aw-error"><AlertCircle size={14} /> {error}</div>}
      <div className="aw-step-actions">
        {isLoading
          ? <LoadingButton msg={loadingMsg} />
          : (
            <button className="btn btn-primary" onClick={onNext}>
              <Sparkles size={15} /> Build My Story Profile <ChevronRight size={16} />
            </button>
          )
        }
      </div>
    </div>
  );
}

// â”€â”€â”€ Step 4: Story Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProfileStep({
  profileSummary, storyAngle, outline,
  setProfileSummary, setStoryAngle, setOutline,
  onBack, onNext, isLoading, loadingMsg, error,
  paraLength, setParaLength, countryStyle, setCountryStyle,
  formattingStyle, setFormattingStyle,
}: {
  profileSummary: string; storyAngle: string; outline: string;
  setProfileSummary: (v: string) => void; setStoryAngle: (v: string) => void; setOutline: (v: string) => void;
  onBack: () => void; onNext: () => void;
  isLoading: boolean; loadingMsg: string; error: string;
  paraLength: ParagraphLength; setParaLength: (v: ParagraphLength) => void;
  countryStyle: CountryStyle; setCountryStyle: (v: CountryStyle) => void;
  formattingStyle: OutputStyle; setFormattingStyle: (v: OutputStyle) => void;
}) {
  return (
    <div className="aw-step-card">
      <StepHeader step={4} total={7} title="Your Story Profile" onBack={onBack} />
      <p className="aw-step-desc">
        Review and edit your story profile below. Then configure formatting before generating your writing.
      </p>
      <div className="aw-profile-sections">
        <div className="aw-profile-section">
          <label className="aw-field-label">Student Profile Summary</label>
          <textarea className="aw-profile-textarea" rows={5} value={profileSummary} onChange={e => setProfileSummary(e.target.value)} />
        </div>
        <div className="aw-profile-section">
          <label className="aw-field-label">Strongest Story Angle</label>
          <textarea className="aw-profile-textarea" rows={3} value={storyAngle} onChange={e => setStoryAngle(e.target.value)} />
        </div>
        <div className="aw-profile-section">
          <label className="aw-field-label">Recommended Outline</label>
          <textarea className="aw-profile-textarea" rows={3} value={outline} onChange={e => setOutline(e.target.value)} />
        </div>
      </div>

      <div className="aw-formatting-section">
        <div className="aw-section-title"><Settings size={14} /> Formatting Engine</div>
        <div className="aw-form-grid three-col">
          <FormField label="Formatting Style">
            <select value={formattingStyle} onChange={e => setFormattingStyle(e.target.value as OutputStyle)}>
              {OUTPUT_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Paragraph Length">
            <select value={paraLength} onChange={e => setParaLength(e.target.value as ParagraphLength)}>
              {PARA_LENGTHS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Country Style">
            <select value={countryStyle} onChange={e => setCountryStyle(e.target.value as CountryStyle)}>
              {COUNTRY_STYLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      {error && <div className="aw-error"><AlertCircle size={14} /> {error}</div>}
      <div className="aw-step-actions">
        {isLoading
          ? <LoadingButton msg={loadingMsg} />
          : (
            <button className="btn btn-primary" onClick={onNext}>
              <Sparkles size={15} /> Generate My Writing <ChevronRight size={16} />
            </button>
          )
        }
      </div>
    </div>
  );
}

// â”€â”€â”€ Writing Output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WritingOutput({
  finalWriting, setFinalWriting, wordCount, wordLimit,
  qualityScores, scoringLoading,
  onImprove, onScore, onCopy, onSave, onReset, onGenerate,
  isLoading, loadingMsg, error, copied, outputRef, writingType,
}: {
  finalWriting: string; setFinalWriting: (v: string) => void;
  wordCount: number; wordLimit: number;
  qualityScores: QualityScores | null; scoringLoading: boolean;
  onImprove: (action: string) => void;
  onScore: () => void; onCopy: () => void; onSave: () => void;
  onReset: () => void; onGenerate: () => void;
  isLoading: boolean; loadingMsg: string; error: string;
  copied: boolean;
  outputRef: React.RefObject<HTMLTextAreaElement | null>;
  writingType: string;
}) {
  const [activeImproveTab, setActiveImproveTab] = useState<'improve' | 'scores'>('improve');

  return (
    <div className="aw-output-layout">
      <div className="aw-output-main">
        <div className="aw-output-toolbar">
          <div className="aw-output-title">
            <FileText size={16} />
            <span>{writingType}</span>
            <span className="aw-word-count">
              {wordCount} words{wordLimit > 0 && ` / ${wordLimit} limit`}
              {wordLimit > 0 && wordCount > wordLimit && <span className="aw-over-limit"> (over limit)</span>}
            </span>
          </div>
          <div className="aw-output-actions">
            {isLoading
              ? <LoadingButton msg={loadingMsg} small />
              : <>
                <button className="aw-toolbar-btn" onClick={onGenerate} title="Generate new version">
                  <RefreshCw size={14} /> New Version
                </button>
                <button className="aw-toolbar-btn" onClick={onSave}>
                  <Save size={14} /> Save
                </button>
                <button className={`aw-toolbar-btn ${copied ? 'copied' : ''}`} onClick={onCopy}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy All</>}
                </button>
              </>
            }
          </div>
        </div>

        {error && <div className="aw-error mb-2"><AlertCircle size={14} /> {error}</div>}

        <textarea
          ref={outputRef}
          className="aw-writing-editor"
          value={finalWriting}
          onChange={e => setFinalWriting(e.target.value)}
          placeholder="Your generated writing will appear here. You can edit it directly."
          rows={30}
          spellCheck
        />

        <div className="aw-copy-hint">
          âœ… Ready to copy and paste into Microsoft Word, Google Docs, WPS Office, your email, or any application portal.
        </div>
      </div>

      <div className="aw-output-sidebar">
        <div className="aw-improve-tabs">
          <button className={`aw-imp-tab ${activeImproveTab === 'improve' ? 'active' : ''}`} onClick={() => setActiveImproveTab('improve')}>
            <Edit3 size={13} /> Improve
          </button>
          <button className={`aw-imp-tab ${activeImproveTab === 'scores' ? 'active' : ''}`} onClick={() => { setActiveImproveTab('scores'); onScore(); }}>
            <BarChart2 size={13} /> Quality Score
          </button>
        </div>

        {activeImproveTab === 'improve' && (
          <div className="aw-improve-panel">
            <div className="aw-improve-title">Improvement Tools</div>
            <div className="aw-improve-list">
              {IMPROVE_ACTIONS.map(action => (
                <button key={action} className="aw-improve-btn" onClick={() => onImprove(action)} disabled={isLoading}>
                  <Sparkles size={12} /> {action}
                </button>
              ))}
            </div>
            <div className="aw-reset-btn-wrap">
              <button className="aw-reset-btn" onClick={onReset}>
                <Plus size={13} /> Start New Writing
              </button>
            </div>
          </div>
        )}

        {activeImproveTab === 'scores' && (
          <div className="aw-scores-panel">
            {scoringLoading && <div className="aw-loading-sm"><div className="spinner-sm" /> Scoring...</div>}
            {qualityScores && !scoringLoading && (
              <>
                <div className="aw-scores-title">Quality Analysis</div>
                {(Object.entries(qualityScores) as [keyof QualityScores, number][]).map(([key, val]) => (
                  <ScoreRow key={key} label={scoreLabel(key)} value={val} />
                ))}
                <div className="aw-score-avg">
                  Overall: <strong>{(Object.values(qualityScores).reduce((a, b) => a + b, 0) / 9).toFixed(1)}/10</strong>
                </div>
              </>
            )}
            {!qualityScores && !scoringLoading && (
              <div className="aw-scores-placeholder">
                <BarChart2 size={24} />
                <p>Click "Quality Score" tab to analyze your writing.</p>
                <button className="btn btn-secondary" onClick={onScore}>Score Now</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Saved Writings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SavedWritings({
  docs, onOpen, onDelete, onNew, scholarships,
}: {
  docs: WritingDocument[];
  onOpen: (d: WritingDocument) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  scholarships: ReturnType<typeof useApp>['scholarships'];
}) {
  if (docs.length === 0) {
    return (
      <div className="aw-empty-saved">
        <FileText size={40} />
        <h3>No saved writing yet</h3>
        <p>Start a new writing project to see it here.</p>
        <button className="btn btn-primary" onClick={onNew}><Plus size={15} /> Start Writing</button>
      </div>
    );
  }

  return (
    <div>
      <div className="aw-saved-header">
        <h2>Saved Writing ({docs.length})</h2>
        <button className="btn btn-primary" onClick={onNew}><Plus size={15} /> New Writing</button>
      </div>
      <div className="aw-saved-grid">
        {docs.map(d => {
          const linkedScholarship = scholarships.find(s => s.id === d.linkedScholarshipId);
          return (
            <div key={d.id} className="aw-saved-card">
              <div className="aw-saved-card-top">
                <div className="aw-saved-type-icon">{WRITING_TYPES.find(w => w.type === d.writingType)?.icon || 'ðŸ“„'}</div>
                <div className="aw-saved-info">
                  <div className="aw-saved-title">{d.title}</div>
                  <div className="aw-saved-meta">
                    <span className="aw-saved-type">{d.writingType}</span>
                    <span>Â·</span>
                    <span>{d.degreeLevel}</span>
                  </div>
                  {d.targetUniversity && <div className="aw-saved-university">{d.targetUniversity} â€¢ {d.targetCountry}</div>}
                  {linkedScholarship && <div className="aw-saved-scholarship">ðŸ† {linkedScholarship.name}</div>}
                </div>
                <span className={`aw-saved-status status-${d.status.toLowerCase()}`}>{d.status}</span>
              </div>
              <div className="aw-saved-card-bottom">
                <div className="aw-saved-stats">
                  {d.finalWriting && <span><FileText size={12} /> {d.finalWriting.split(/\s+/).filter(Boolean).length} words</span>}
                  <span><Clock size={12} /> {new Date(d.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="aw-saved-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => onOpen(d)}><Edit3 size={13} /> Open</button>
                  <button className="aw-delete-btn" onClick={() => onDelete(d.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ Profile Memory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function ProfileMemory({ profile, onSave }: { profile: StudentProfile; onSave: (p: Partial<StudentProfile>) => void }) {
  const [form, setForm] = useState<StudentProfile>(profile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="aw-profile-page">
      <div className="aw-profile-header">
        <div>
          <h2>Student Profile Memory</h2>
          <p className="page-subtitle">Save your background once. ApplyWise uses it to personalize all your writing.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Profile</>}
        </button>
      </div>
      <div className="aw-profile-form">
        <div className="aw-form-grid">
          <FormField label="Academic Background">
            <textarea rows={3} value={form.academicBackground} onChange={e => setForm(f => ({ ...f, academicBackground: e.target.value }))} placeholder="Your degree, institution, GPA, relevant courses..." />
          </FormField>
          <FormField label="Current Education Level">
            <input value={form.educationLevel} onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value }))} placeholder="e.g. Final year BSc, completed MSc..." />
          </FormField>
          <FormField label="Intended Degree Level">
            <select value={form.intendedDegreeLevel} onChange={e => setForm(f => ({ ...f, intendedDegreeLevel: e.target.value as DegreeLevel }))}>
              {DEGREE_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Work Experience">
            <textarea rows={3} value={form.workExperience} onChange={e => setForm(f => ({ ...f, workExperience: e.target.value }))} placeholder="Jobs, internships, freelance work, research assistantships..." />
          </FormField>
          <FormField label="Projects">
            <textarea rows={3} value={form.projects} onChange={e => setForm(f => ({ ...f, projects: e.target.value }))} placeholder="Academic or personal projects, GitHub repos, apps built..." />
          </FormField>
          <FormField label="Achievements & Awards">
            <textarea rows={3} value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} placeholder="Scholarships won, competitions, honors, publications..." />
          </FormField>
          <FormField label="Challenges Overcome">
            <textarea rows={3} value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} placeholder="Obstacles you faced and how you overcame them..." />
          </FormField>
          <FormField label="Career Goals">
            <textarea rows={3} value={form.careerGoals} onChange={e => setForm(f => ({ ...f, careerGoals: e.target.value }))} placeholder="Short-term and long-term career goals..." />
          </FormField>
          <FormField label="Target Countries">
            <input value={form.targetCountries} onChange={e => setForm(f => ({ ...f, targetCountries: e.target.value }))} placeholder="e.g. Germany, UK, Canada, USA" />
          </FormField>
          <FormField label="Preferred Programs / Fields">
            <input value={form.preferredPrograms} onChange={e => setForm(f => ({ ...f, preferredPrograms: e.target.value }))} placeholder="e.g. Computer Science, AI, Public Health..." />
          </FormField>
          <FormField label="Personal Story Notes">
            <textarea rows={4} value={form.personalStoryNotes} onChange={e => setForm(f => ({ ...f, personalStoryNotes: e.target.value }))} placeholder="Key personal story elements you want included in your writing â€” formative experiences, community involvement, family background (if relevant)..." />
          </FormField>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLANS = [
  {
    name: 'Free' as PlanName,
    prices: { Cameroon: '0 XAF', Rwanda: '0 RWF' },
    features: ['1 writing project/month', '3 AI rewrites', 'Basic AI interview', 'Copy full text'],
    credits: 1,
  },
  {
    name: 'Starter' as PlanName,
    prices: { Cameroon: '2,000 XAF', Rwanda: '5,000 RWF' },
    features: ['5 writing projects', '20 AI rewrites', 'Formatting engine', 'Saved writing'],
    credits: 5,
  },
  {
    name: 'Pro' as PlanName,
    prices: { Cameroon: '5,000 XAF', Rwanda: '12,000 RWF' },
    features: ['20 writing projects', '100 AI rewrites', 'Advanced formatting', 'University tailoring', 'Scholarship essay mode', 'Saved student profile'],
    credits: 20,
    popular: true,
  },
  {
    name: 'Premium' as PlanName,
    prices: { Cameroon: '15,000 XAF', Rwanda: '35,000 RWF' },
    features: ['Unlimited projects (fair-use)', 'Full application package', 'Priority support', 'Human review placeholder'],
    credits: 999,
  },
];

const CREDIT_PACKS = [
  { label: '1 writing project', cameroon: '1,000 XAF', rwanda: '2,500 RWF', credits: 1 },
  { label: '5 writing projects', cameroon: '3,500 XAF', rwanda: '8,000 RWF', credits: 5 },
  { label: '10 writing projects', cameroon: '6,000 XAF', rwanda: '14,000 RWF', credits: 10 },
];

const PAYMENT_METHODS = ['MTN MoMo Cameroon', 'Orange Money Cameroon', 'MTN MoMo Rwanda', 'Airtel Money Rwanda', 'Bank Transfer', 'Flutterwave'];

export function Pricing({ currentPlan, onSubmitPayment }: { currentPlan: PlanName; onSubmitPayment: (p: Payment) => void }) {
  const [country, setCountry] = useState<'Cameroon' | 'Rwanda'>('Rwanda');
  const [selected, setSelected] = useState<PlanName | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('MTN MoMo Rwanda');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected || !transactionRef) return;
    const plan = PLANS.find(p => p.name === selected)!;
    onSubmitPayment({
      id: generateId(),
      planName: selected,
      amount: 0,
      currency: country === 'Cameroon' ? 'XAF' : 'RWF',
      paymentMethod,
      transactionReference: transactionRef,
      screenshotUrl: '',
      screenshotPath: '',
      status: 'Pending',
      creditsAdded: plan.credits,
      period: 'monthly',
      country,
      createdAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="aw-submitted">
        <CheckCircle size={48} />
        <h2>Payment Submitted!</h2>
        <p>Your payment is pending review. Your account will be activated within 24 hours after confirmation.</p>
        <p className="aw-submitted-note">After payment, upload your screenshot and transaction ID. Your account will be activated after confirmation.</p>
      </div>
    );
  }

  return (
    <div className="aw-pricing">
      <div className="aw-pricing-header">
        <h2>Upgrade Your Plan</h2>
        <p className="page-subtitle">African-friendly pricing â€” pay with your local mobile money</p>
        <div className="aw-country-toggle">
          {(['Cameroon', 'Rwanda'] as const).map(c => (
            <button key={c} className={`country-toggle-btn ${country === c ? 'active' : ''}`} onClick={() => setCountry(c)}>
              {c === 'Cameroon' ? 'ðŸ‡¨ðŸ‡²' : 'ðŸ‡·ðŸ‡¼'} {c}
            </button>
          ))}
        </div>
      </div>

      <div className="aw-plans-grid">
        {PLANS.map(plan => (
          <div
            key={plan.name}
            className={`aw-plan-card ${plan.popular ? 'popular' : ''} ${selected === plan.name ? 'selected' : ''} ${currentPlan === plan.name ? 'current' : ''}`}
            onClick={() => plan.name !== 'Free' && setSelected(plan.name)}
          >
            {plan.popular && <div className="plan-popular-badge">Most Popular</div>}
            {currentPlan === plan.name && <div className="plan-current-badge">Current Plan</div>}
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">{plan.prices[country]}</div>
            <ul className="plan-features">
              {plan.features.map(f => <li key={f}><Check size={13} /> {f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="aw-credit-packs">
        <h3>Credit Packs (pay only for what you need)</h3>
        <div className="credit-packs-grid">
          {CREDIT_PACKS.map(p => (
            <div key={p.label} className="credit-pack-card">
              <div className="credit-pack-label">{p.label}</div>
              <div className="credit-pack-price">{country === 'Cameroon' ? p.cameroon : p.rwanda}</div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="aw-payment-form card">
          <h3>Payment Instructions â€” {selected} Plan</h3>
          <div className="payment-instruction">
            <Globe size={15} />
            After payment, upload your screenshot and transaction ID. Your account will be activated after confirmation.
          </div>
          <div className="aw-form-grid">
            <FormField label="Payment Method">
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Transaction Reference *">
              <input value={transactionRef} onChange={e => setTransactionRef(e.target.value)} placeholder="e.g. TXN123456789" />
            </FormField>
          </div>
          <button className="btn-gold-full" onClick={handleSubmit} disabled={!transactionRef}>
            Submit Payment for Review
          </button>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Admin Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AdminPanel({
  payments, writingDocs, onApprove, onReject,
}: {
  payments: Payment[];
  writingDocs: WritingDocument[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [activeSection, setActiveSection] = useState<'payments' | 'documents'>('payments');
  const pending = payments.filter(p => p.status === 'Pending');
  const approved = payments.filter(p => p.status === 'Approved');
  const rejected = payments.filter(p => p.status === 'Rejected');

  return (
    <div className="aw-admin">
      <div className="aw-admin-header">
        <h2>Admin Dashboard</h2>
        <div className="aw-admin-tabs">
          <button className={`aw-admin-tab ${activeSection === 'payments' ? 'active' : ''}`} onClick={() => setActiveSection('payments')}>
            <CreditCard size={14} /> Payments ({pending.length} pending)
          </button>
          <button className={`aw-admin-tab ${activeSection === 'documents' ? 'active' : ''}`} onClick={() => setActiveSection('documents')}>
            <FileText size={14} /> Writing Projects ({writingDocs.length})
          </button>
        </div>
      </div>

      {activeSection === 'payments' && (
        <div>
          {pending.length > 0 && (
            <>
              <div className="aw-admin-section-title">Pending Payments ({pending.length})</div>
              <div className="admin-payment-list">
                {pending.map(p => (
                  <div key={p.id} className="admin-payment-card pending">
                    <div className="admin-payment-info">
                      <strong>{p.planName} Plan</strong>
                      <span>{p.currency} â€” {p.paymentMethod}</span>
                      <span>Ref: {p.transactionReference}</span>
                      <span className="admin-payment-date">{new Date(p.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="admin-payment-actions">
                      <button className="btn-approve" onClick={() => onApprove(p.id)}><Check size={14} /> Approve</button>
                      <button className="btn-reject" onClick={() => onReject(p.id)}>âœ• Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {approved.length > 0 && (
            <>
              <div className="aw-admin-section-title mt-4">Approved ({approved.length})</div>
              {approved.map(p => (
                <div key={p.id} className="admin-payment-card approved">
                  <strong>{p.planName}</strong> Â· {p.transactionReference} Â· <span className="text-green">Approved</span>
                </div>
              ))}
            </>
          )}
          {rejected.length > 0 && (
            <>
              <div className="aw-admin-section-title mt-4">Rejected ({rejected.length})</div>
              {rejected.map(p => (
                <div key={p.id} className="admin-payment-card rejected">
                  <strong>{p.planName}</strong> Â· {p.transactionReference} Â· <span className="text-red">Rejected</span>
                </div>
              ))}
            </>
          )}
          {payments.length === 0 && <div className="aw-empty-saved" style={{ minHeight: 200 }}><CreditCard size={32} /><p>No payments yet</p></div>}
        </div>
      )}

      {activeSection === 'documents' && (
        <div className="admin-docs-table">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Type</th><th>Country</th><th>Degree</th><th>Status</th><th>Words</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {writingDocs.map(d => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.writingType}</td>
                  <td>{d.targetCountry}</td>
                  <td>{d.degreeLevel}</td>
                  <td><span className={`aw-saved-status status-${d.status.toLowerCase()}`}>{d.status}</span></td>
                  <td>{d.finalWriting ? d.finalWriting.split(/\s+/).filter(Boolean).length : 0}</td>
                  <td>{new Date(d.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {writingDocs.length === 0 && <div className="aw-empty-saved" style={{ minHeight: 200 }}><FileText size={32} /><p>No documents yet</p></div>}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Shared Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StepHeader({ step, total, title, onBack }: { step: number; total: number; title: string; onBack: () => void }) {
  return (
    <div className="aw-step-header">
      <button className="aw-back-btn" onClick={onBack}><ChevronLeft size={16} /> Back</button>
      <div className="aw-step-progress">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`aw-step-dot ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}`} />
        ))}
      </div>
      <div className="aw-step-title">{title}</div>
      <div className="aw-step-label">Step {step} of {total}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="aw-form-field">
      <label className="aw-field-label">{label}</label>
      {children}
    </div>
  );
}

function LoadingButton({ msg, small }: { msg: string; small?: boolean }) {
  return (
    <div className={`aw-loading-btn ${small ? 'sm' : ''}`}>
      <div className={small ? 'spinner-sm' : 'spinner'} />
      <span>{msg}</span>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? '#3fb950' : value >= 6 ? '#d29922' : '#f85149';
  return (
    <div className="aw-score-row">
      <span className="aw-score-label">{label}</span>
      <div className="aw-score-bar-wrap">
        <div className="aw-score-bar" style={{ width: `${value * 10}%`, background: color }} />
      </div>
      <span className="aw-score-val" style={{ color }}>{value}/10</span>
    </div>
  );
}

function scoreLabel(key: keyof QualityScores): string {
  const labels: Record<keyof QualityScores, string> = {
    specificity: 'Specificity',
    authenticity: 'Authenticity',
    academicStrength: 'Academic Strength',
    programFit: 'Program Fit',
    careerClarity: 'Career Clarity',
    emotionalDepth: 'Emotional Depth',
    grammar: 'Grammar',
    genericRisk: 'Uniqueness',
    copyPasteReadiness: 'Copy-Paste Ready',
  };
  return labels[key] || key;
}

// â”€â”€â”€ Fallback/Mock helpers (no API key) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getFallbackQuestions(writingType: WritingType, degreeLevel: DegreeLevel): string[] {
  const base = [
    `What personal experience sparked your interest in this field of study?`,
    `What specific course, project, research, or internship best demonstrates your academic preparation?`,
    `Why this specific university and program â€” what makes it the right fit for you?`,
    `What are your short-term and long-term career goals after graduation?`,
    `Why do you want to study in this country specifically?`,
  ];
  if (degreeLevel === 'PhD') base.push('What specific research problem or gap do you want to investigate, and why?');
  if (writingType === 'Scholarship Essay') base.push('What makes you deserving of this scholarship, and how will it impact your future?');
  if (writingType === 'Recommendation Letter') base.push('Who is writing this letter and in what capacity have they known you?');
  return base.slice(0, 7);
}

function getMockProfileSummary(_writingType: WritingType, degreeLevel: DegreeLevel, program: string, country: string): string {
  return `This student demonstrates strong academic potential and a clear sense of purpose in pursuing ${program || 'their chosen field'} in ${country || 'their target country'}. Their background shows a combination of technical competency, leadership capacity, and community-oriented values that align well with the goals of a ${degreeLevel} program.

The student's journey reflects the determination and resilience characteristic of many talented young Africans who are ready to contribute meaningfully to global academic and professional communities. Their combination of local experience and international ambition makes them a compelling applicant.`;
}

function getMockWriting(writingType: WritingType, degreeLevel: DegreeLevel, university: string, country: string, program: string, scholarship: string): string {
  const isEmail = writingType.includes('Email');
  const isLetter = writingType.includes('Letter') || writingType === 'Motivation Letter';

  if (isEmail) {
    return `Subject: Inquiry Regarding ${program || 'Graduate Program'} Admission

Dear Admissions Office,

I hope this message finds you well. My name is Dieudonne Ngum, and I am writing to express my sincere interest in the ${program || 'graduate program'} at ${university || 'your esteemed institution'}.

I am currently completing my undergraduate studies in Computer Science at the African Leadership University in Rwanda. My academic focus has centered on artificial intelligence and its applications in African development contexts, and I believe ${university || 'your institution'}'s program offers the ideal environment to deepen this work.

I would be grateful if you could provide information regarding the application timeline, available funding opportunities, and any specific materials required for international applicants from Rwanda.

Thank you sincerely for your time and consideration. I look forward to your response.

Warm regards,
Dieudonne Ngum
d.ngum@alustudent.com`;
  }

  if (isLetter) {
    return `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Admissions Committee
${university || 'Graduate Admissions Office'}
${country || ''}

Dear Members of the Admissions Committee,

I write with genuine enthusiasm to apply for the ${program || 'graduate program'} at ${university || 'your institution'}${scholarship ? ` and to be considered for the ${scholarship}` : ''}. This application represents the culmination of years of deliberate academic preparation, professional growth, and a deep conviction that advanced study in ${program || 'this field'} will enable me to make a meaningful contribution to the technological development of Africa.

My journey into this field began not in a classroom but in the daily realities of my community in Rwanda, where I witnessed firsthand how access to technology â€” or the lack of it â€” shaped the trajectories of entire families and businesses. This observation ignited a conviction that has only grown stronger through my undergraduate education: that Africans must not merely consume global technology but actively shape it.

During my studies at the African Leadership University, I pursued coursework and independent projects that placed me at the intersection of computer science, artificial intelligence, and social impact. I developed machine learning models for agricultural yield prediction, collaborated on a research team examining digital financial inclusion, and mentored junior students navigating their first programming courses. Each experience reinforced my belief that rigorous technical training must be paired with a deep understanding of the contexts in which technology will be deployed.

${university || 'Your institution'}'s ${program || 'program'} stands out to me for several specific reasons. The faculty's work on responsible AI systems, the program's emphasis on interdisciplinary collaboration, and the strong alumni network that extends into the African continent all align precisely with the kind of training I am seeking. I am particularly drawn to the opportunity to engage with professors whose research addresses the very questions I hope to pursue.

I am committed to returning to Rwanda and the broader African continent after completing my studies. My goal is to contribute to the development of AI systems that are culturally appropriate, locally relevant, and genuinely beneficial to the communities they serve. This scholarship and program would be instrumental in equipping me with the tools to realize that vision.

I would be honored to join your community of scholars and am grateful for your consideration of my application.

Sincerely,

Dieudonne Ngum
Rwanda`;
  }

  return `Statement of Purpose

My decision to pursue a ${degreeLevel} in ${program || 'this field'} at ${university || 'this institution'} in ${country || 'this country'} is rooted in a journey that began not with a clear roadmap but with a persistent question: how can the African continent transform its relationship with technology from one of consumption to one of creation?

Growing up in Rwanda, I witnessed the extraordinary pace of a nation rebuilding itself through vision and determination. Technology was everywhere in this story â€” in the fiber optic cables being laid across the country, in the mobile money platforms that were bringing financial services to rural communities, in the drone delivery systems that were saving lives in remote hospitals. But I also noticed what was missing: Africans who were not just using these technologies, but designing them, governing them, and questioning them.

This observation became the engine of my academic life. During my undergraduate studies in Computer Science at the African Leadership University, I pursued every opportunity to go beyond the theoretical and engage with the practical realities of technology development on the continent. I built predictive models for agricultural planning with a research team, developed a data pipeline for a community health organization, and spent a year as a teaching assistant helping first-year students navigate the often intimidating entry point into programming.

These experiences taught me that technical competence is necessary but insufficient. What Africa's technology ecosystem urgently needs are professionals who combine rigorous technical training with systems thinking, ethical grounding, and a deep understanding of local context. This conviction brought me to ${university || 'your institution'}, where the ${program || 'program'} offers precisely this kind of integrated education.

${scholarship ? `The ${scholarship} would make this vision achievable. Financial support at this stage of my career would allow me to focus fully on my studies and research, without the burden of financial precarity that derails many talented African students. I am committed to honoring this investment by returning home after graduation and contributing to the ecosystem that has given me so much.` : ''}

I am ready to contribute to your academic community with the same energy, curiosity, and commitment that has characterized my journey so far. I look forward to the opportunity to grow as a scholar and a practitioner under the guidance of your distinguished faculty.`;
}


