import type {
  WritingDocument, WritingTone, DegreeLevel, WritingType, QualityScores,
  StudentProfile, Story, Recommender,
} from '../types';

// Calls the Gemini REST API directly — works with both Google AI Studio keys
// and OpenRouter keys (set VITE_OPENROUTER_KEY to use OpenRouter free tier)
async function callGemini(prompt: string): Promise<string> {
  const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  const openrouterKey = (import.meta.env.VITE_OPENROUTER_KEY as string | undefined)?.trim();

  if (openrouterKey) {
    return callOpenRouter(prompt, openrouterKey);
  }
  if (geminiKey) {
    return callGeminiDirect(prompt, geminiKey);
  }
  throw new Error('No API key set. Add VITE_GEMINI_API_KEY or VITE_OPENROUTER_KEY to your .env file.');
}

async function callGeminiDirect(prompt: string, key: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const data = await res.json();

  if (!res.ok) {
    const msg: string = data?.error?.message || res.statusText;
    const isDaily = msg.includes('PerDay') || msg.includes('per_day') || msg.includes('limit: 0');
    if (res.status === 429) {
      if (isDaily) throw new Error('Daily free quota exhausted for this Google AI Studio key. The quota resets at midnight Pacific Time. To keep using the app: add VITE_OPENROUTER_KEY to your .env (free at openrouter.ai) or enable billing on your Google Cloud project.');
      throw new Error('Rate limit — please wait a moment and try again.');
    }
    if (res.status === 403 || res.status === 400) throw new Error(`API key error: ${msg}`);
    throw new Error(`Gemini error (${res.status}): ${msg}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API.');
  return text;
}

async function callOpenRouter(prompt: string, key: string): Promise<string> {
  const body = {
    model: 'gemini-3.1-flash-lite',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://applywise.africa',
      'X-Title': 'ApplyWise Africa',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg: string = data?.error?.message || res.statusText;
    if (res.status === 429) throw new Error('OpenRouter rate limit — wait a moment and try again.');
    throw new Error(`OpenRouter error (${res.status}): ${msg}`);
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenRouter.');
  return text;
}

// ─── System Prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are ApplyWise Africa, an expert application-writing assistant for African students applying to study abroad.

You support students applying for Bachelor's degrees, Master's degrees, PhD programs, diplomas, certificates, scholarships, and exchange programs.

Your job is to help students transform raw, scattered, incomplete ideas into authentic, polished, personalized, copy-paste-ready application writing.

Rules:
- NEVER invent false achievements, grades, awards, jobs, publications, admission offers, leadership roles, recommender details, or personal experiences.
- Write in natural, mature, human, academically appropriate tone. Avoid generic AI-sounding phrases, exaggerated claims, empty motivation, and robotic structure.
- Use concrete details, specific experiences, realistic emotions, and culturally believable context.
- Preserve the student's voice while making the writing professional.
- Output must be easy to copy and paste.
- Use clean headings only when appropriate.
- Avoid markdown symbols unless user selects markdown.
- Avoid bullet points in final essays unless user asks.
- Use paragraph spacing.
- Keep letters professional and properly structured.
- Keep essays smooth and narrative-driven.
- Keep recommendation letters credible and specific.

Degree-level adaptation:
- Bachelor's: sound early-career, potential-focused, curious, growth-oriented.
- Master's: sound focused, mature, career-directed, academically prepared.
- PhD: sound research-driven, intellectually rigorous, evidence-based.
- Diploma/certificate: sound practical, skill-focused, career-oriented.
- Scholarship: emphasize merit, leadership, need where relevant, community impact, future contribution.
- Exchange: emphasize cultural learning, academic curiosity, adaptability, global perspective.`;

// ─── Context builders ──────────────────────────────────────────────────────
// These format the student's profile + Story Vault into a section we can
// prepend to any prompt — so every generation feels like *them*, not generic.

function buildProfileContext(profile: StudentProfile | undefined): string {
  if (!profile || !profile.onboardingComplete) return '';
  const lines: string[] = [];
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.countryOfOrigin) lines.push(`Country of origin: ${profile.countryOfOrigin}`);
  if (profile.fieldCategory) {
    const specific = profile.fieldSpecific ? ` (specifically: ${profile.fieldSpecific})` : '';
    lines.push(`Field: ${profile.fieldCategory}${specific}`);
  }
  if (profile.educationLevel) lines.push(`Current education level: ${profile.educationLevel}`);
  if (profile.currentGpa) lines.push(`Academic band (self-reported): ${profile.currentGpa}`);
  if (profile.englishLevel) lines.push(`English level: ${profile.englishLevel}`);
  if (profile.targetCountries) lines.push(`Target countries: ${profile.targetCountries}`);
  if (profile.careerGoals) lines.push(`Career goals: ${profile.careerGoals}`);
  if (profile.workExperience) lines.push(`Work experience: ${profile.workExperience}`);
  if (profile.projects) lines.push(`Projects: ${profile.projects}`);
  if (profile.achievements) lines.push(`Achievements: ${profile.achievements}`);
  if (profile.challenges) lines.push(`Challenges faced: ${profile.challenges}`);
  if (profile.personalStoryNotes) lines.push(`Personal story notes: ${profile.personalStoryNotes}`);

  if (lines.length === 0) return '';
  return `STUDENT PROFILE (use this to make the writing personal and accurate — never invent details beyond this):
${lines.join('\n')}
`;
}

function buildStoryVaultContext(stories: Story[] | undefined, maxStories = 6): string {
  if (!stories || stories.length === 0) return '';
  // Sort by emotional weight (heavier first) — those usually make for the strongest narrative anchors.
  const sorted = [...stories].sort((a, b) => b.emotion - a.emotion).slice(0, maxStories);
  const blocks = sorted.map((s, i) => {
    const themes = s.themes.length ? ` [themes: ${s.themes.join(', ')}]` : '';
    const when = s.whenItHappened ? ` (${s.whenItHappened})` : '';
    const why = s.whyItMatters ? `\n  Lesson: ${s.whyItMatters}` : '';
    return `Story ${i + 1}: ${s.title}${when}${themes}
  ${s.body.replace(/\n+/g, ' ').slice(0, 800)}${why}`;
  }).join('\n\n');
  return `STUDENT STORY VAULT (real stories the student has shared — draw from these for specificity. Never invent stories beyond these):
${blocks}
`;
}

function buildFullContext(profile?: StudentProfile, stories?: Story[]): string {
  const parts = [buildProfileContext(profile), buildStoryVaultContext(stories)].filter(Boolean);
  return parts.length ? `\n${parts.join('\n')}\n` : '';
}

// ─── Exported functions ────────────────────────────────────────────────────

export async function generateFollowUpQuestions(
  writingType: WritingType,
  degreeLevel: DegreeLevel,
  rawInput: string,
  targetCountry: string,
  targetProgram: string,
  profile?: StudentProfile,
  stories?: Story[],
): Promise<string[]> {
  const context = buildFullContext(profile, stories);
  const prompt = `${SYSTEM_PROMPT}
${context}
A student wants to write a ${writingType} for a ${degreeLevel} application to study ${targetProgram} in ${targetCountry}.

Their raw ideas:
"""
${rawInput}
"""

Analyze what's missing or underdeveloped in their raw input — taking the profile and any Story Vault entries above into account so you don't re-ask things we already know. Generate between 4 and 7 smart, targeted follow-up questions to extract the information needed to write a powerful ${writingType}.

Rules:
- Ask about personal story if missing
- Ask about academic evidence if missing
- Ask about program fit if missing
- Ask about career goals if missing
- Ask about country fit if missing
- For Bachelor's: ask about secondary school experiences and interests
- For Master's: ask about academic/professional preparation
- For PhD: ask about research problem or gap
- For Recommendation Letter: ask about recommender, relationship, specific examples
- For Scholarship Essay: ask about merit, leadership, community impact

Return ONLY a JSON array of question strings. No other text. Example:
["Question 1?", "Question 2?", "Question 3?"]`;

  const text = await callGemini(prompt);

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // fall through
  }
  return text.split('\n')
    .filter(l => l.trim().match(/^\d+\./) || l.trim().startsWith('-') || l.trim().startsWith('"'))
    .map(l => l.replace(/^[\d.\-"\s]+/, '').replace(/[",$]/g, '').trim())
    .filter(Boolean)
    .slice(0, 7);
}

export async function generateProfileSummary(
  doc: Partial<WritingDocument>,
  profile?: StudentProfile,
  stories?: Story[],
): Promise<{
  profileSummary: string;
  storyAngle: string;
  outline: string;
}> {
  const qaSection = (doc.followUpQuestions || [])
    .map((q, i) => `Q: ${q}\nA: ${(doc.userAnswers || [])[i] || '(no answer)'}`)
    .join('\n\n');

  const context = buildFullContext(profile, stories);
  const prompt = `${SYSTEM_PROMPT}
${context}
Based on this student's information, produce a structured JSON response with three fields:

Student info:
- Writing type: ${doc.writingType}
- Degree level: ${doc.degreeLevel}
- Target university: ${doc.targetUniversity}
- Target program: ${doc.targetProgram}
- Target country: ${doc.targetCountry}
- Scholarship: ${doc.scholarshipName || 'N/A'}

Raw ideas:
"""
${doc.rawInput}
"""

Follow-up Q&A:
${qaSection}

Return ONLY valid JSON with this exact structure:
{
  "profileSummary": "2-3 paragraph summary of the student's profile and strengths",
  "storyAngle": "1 paragraph: the strongest narrative angle for this application",
  "outline": "A brief outline of the recommended document structure"
}`;

  const text = await callGemini(prompt);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // fall through
  }
  return {
    profileSummary: text.slice(0, 600),
    storyAngle: 'Strong authentic narrative identified.',
    outline: 'Introduction → Academic Background → Motivation → Goals → Program Fit → Conclusion',
  };
}

export async function generateWriting(
  doc: Partial<WritingDocument>,
  profile?: StudentProfile,
  stories?: Story[],
): Promise<string> {
  const qaSection = (doc.followUpQuestions || [])
    .map((q, i) => `Q: ${q}\nA: ${(doc.userAnswers || [])[i] || '(no answer)'}`)
    .join('\n\n');

  const wordLimitNote = doc.wordLimit && doc.wordLimit > 0
    ? `Word limit: approximately ${doc.wordLimit} words.`
    : 'No strict word limit.';

  const context = buildFullContext(profile, stories);
  const prompt = `${SYSTEM_PROMPT}
${context}
Write a complete, polished, copy-paste-ready ${doc.writingType} for this student.

Student information:
- Writing type: ${doc.writingType}
- Degree level: ${doc.degreeLevel}
- Target university: ${doc.targetUniversity || 'Not specified'}
- Target program: ${doc.targetProgram || 'Not specified'}
- Target country: ${doc.targetCountry || 'Not specified'}
- Scholarship: ${doc.scholarshipName || 'N/A'}
- ${wordLimitNote}
- Tone: ${doc.tone || 'Natural'}
- Output style: ${doc.outputStyle || 'Structured Essay'}
- Country style: ${doc.countryStyle || 'Other'}
- Paragraph length: ${doc.paragraphLength || 'Medium'}

Profile summary:
${doc.profileSummary || ''}

Story angle:
${doc.storyAngle || ''}

Outline:
${doc.outline || ''}

Raw ideas:
"""
${doc.rawInput}
"""

Follow-up Q&A:
${qaSection}

CRITICAL RULES:
1. Write the COMPLETE document, not a template or outline.
2. Make it sound like a real, thoughtful human wrote it — not a machine.
3. Use specific details from the student's information — no generic filler.
4. Match the tone, format, and length appropriate for ${doc.writingType} targeting ${doc.targetCountry}.
5. For formal letters: include proper salutation, body paragraphs, closing.
6. For essays: use flowing narrative paragraphs, no bullet points.
7. For emails: use appropriate subject line, greeting, body, sign-off.
8. Do NOT add any explanations, notes, or commentary outside the document itself.
9. ${wordLimitNote}`;

  return callGemini(prompt);
}

export async function improveWriting(
  currentText: string,
  instruction: string,
  writingType: string,
  degreeLevel: string,
  tone: WritingTone,
  wordLimit: number
): Promise<string> {
  const wordNote = wordLimit > 0 ? `Keep within approximately ${wordLimit} words.` : '';

  const prompt = `${SYSTEM_PROMPT}

You are improving an existing ${writingType} for a ${degreeLevel} application.

Current writing:
"""
${currentText}
"""

Improvement instruction: ${instruction}

Additional context:
- Tone: ${tone}
- ${wordNote}

Apply ONLY the requested improvement. Return the complete improved writing. Do not add explanations or commentary.`;

  return callGemini(prompt);
}

export async function scoreWriting(text: string, writingType: string, degreeLevel: string): Promise<QualityScores> {
  const prompt = `You are a rigorous academic writing evaluator assessing a ${writingType} for a ${degreeLevel} application.

Score this writing on each dimension from 1-10:
- specificity: How specific and concrete are the details? (1=very generic, 10=highly specific)
- authenticity: Does it sound like a real person, not AI? (1=robotic, 10=very human)
- academicStrength: Academic vocabulary, structure, and rigor (1=weak, 10=strong)
- programFit: How well does it show fit for the specific program? (1=no fit shown, 10=perfect fit)
- careerClarity: How clear are the career goals? (1=vague, 10=crystal clear)
- emotionalDepth: Emotional resonance and personal story (1=flat, 10=deeply moving)
- grammar: Grammar and language quality (1=many errors, 10=perfect)
- genericRisk: Risk of sounding generic (1=very generic, 10=very unique — higher is better)
- copyPasteReadiness: Ready to copy into an application portal? (1=needs major work, 10=ready)

Writing to evaluate:
"""
${text.slice(0, 3000)}
"""

Return ONLY valid JSON matching this exact structure:
{
  "specificity": 7,
  "authenticity": 8,
  "academicStrength": 7,
  "programFit": 6,
  "careerClarity": 8,
  "emotionalDepth": 7,
  "grammar": 9,
  "genericRisk": 6,
  "copyPasteReadiness": 9
}`;

  const responseText = await callGemini(prompt);

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // fall through
  }
  return {
    specificity: 7, authenticity: 7, academicStrength: 7,
    programFit: 7, careerClarity: 7, emotionalDepth: 6,
    grammar: 8, genericRisk: 6, copyPasteReadiness: 8,
  };
}

// ─── Scholarship search summarizer ─────────────────────────────────────────
// Given a batch of web-search results (typically from Tavily) about
// scholarships, turn them into structured cards. Each card MUST cite a real
// URL from the inputs — the model is not allowed to invent links.

export interface DiscoveredScholarship {
  name: string;
  institution: string;
  country: string;
  countryCode: string;     // 2-letter ISO
  funding: string;         // human-readable, e.g. "Fully Funded · $30,000/yr"
  fundingType: 'Fully Funded' | 'Partial' | 'Tuition Only';
  deadline: string;        // ISO date OR a human phrase like "Annual, deadlines vary"
  focusArea: string;       // free-form, eg "Public Health"
  url: string;             // MUST come from a Tavily result (real link)
  summary: string;         // 1-2 sentences, why it fits
}

export async function summarizeScholarshipSearch(args: {
  filters: Record<string, string>;       // field / degree / country / funding / etc.
  webResults: { title: string; url: string; content: string }[];
  profile?: StudentProfile;
  maxCards?: number;
}): Promise<DiscoveredScholarship[]> {
  const { filters, webResults, profile, maxCards = 6 } = args;
  if (!webResults.length) return [];

  const profileBlock = profile
    ? `Student profile (use to assess fit):\n${buildProfileContext(profile)}\n`
    : '';

  const filtersBlock = Object.entries(filters)
    .filter(([, v]) => v && !/^any /i.test(v))
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const sourcesBlock = webResults.slice(0, 12).map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}\nSnippet: ${r.content.slice(0, 600).replace(/\s+/g, ' ')}`
  ).join('\n\n');

  const prompt = `${SYSTEM_PROMPT}

You are turning real web-search results into a clean list of scholarship cards for an African student.

${profileBlock}
Student search filters:
${filtersBlock || '(no specific filters)'}

WEB SEARCH RESULTS (treat each URL as authoritative — never invent a URL):
${sourcesBlock}

Task: Identify up to ${maxCards} distinct, currently-available scholarships from these sources. For each, output JSON matching this exact schema:
{
  "name": "...",
  "institution": "...",
  "country": "...",
  "countryCode": "...",   // 2-letter ISO (US, GB, DE, FR, CA, AU, NL, CH, etc.)
  "funding": "...",        // e.g. "Fully Funded · €1,200/month + tuition"
  "fundingType": "Fully Funded" | "Partial" | "Tuition Only",
  "deadline": "...",       // ISO date if known, otherwise a phrase like "Annual: opens September"
  "focusArea": "...",
  "url": "...",            // MUST be one of the URLs from the WEB SEARCH RESULTS above. Never invent.
  "summary": "..."         // 1-2 sentences on why this fits the student's filters/profile
}

CRITICAL RULES:
- Return ONLY a valid JSON array. No prose, no markdown fences.
- Every "url" MUST exist verbatim in the WEB SEARCH RESULTS. If you can't tie a card to a real URL, skip it.
- Skip results that are obviously NOT scholarships (blog posts, news, irrelevant).
- Prefer scholarships explicitly open to African students.
- If a result mentions multiple scholarships, you may extract one card per scholarship from that page (same URL is fine).
- Be honest about funding type — don't upgrade "Partial" to "Fully Funded".
- If only 1 or 2 truly fit, return only those. Quality over quantity.

Return ONLY the JSON array.`;

  const text = await callGemini(prompt);
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as DiscoveredScholarship[];
    // Filter to only those with URLs that actually appeared in our results.
    const realUrls = new Set(webResults.map(r => r.url));
    return parsed.filter(p => p.url && realUrls.has(p.url)).slice(0, maxCards);
  } catch {
    return [];
  }
}

// ─── Recommender letter draft ──────────────────────────────────────────────
// Generates a real, personalized draft the recommender can edit & sign.
// Built from: student profile, the Story Vault, the recommender's own notes
// about what they saw in the student, and the linked scholarship(s).

export async function generateRecommenderLetter(args: {
  recommender: Recommender;
  profile?: StudentProfile;
  stories?: Story[];
  scholarshipContext?: string;     // e.g. "Gates Cambridge Scholarship (UK)"
}): Promise<string> {
  const { recommender: r, profile, stories, scholarshipContext } = args;
  const context = buildFullContext(profile, stories);

  const prompt = `${SYSTEM_PROMPT}
${context}
You are drafting a recommendation letter that the RECOMMENDER below will edit and sign.

RECOMMENDER:
- Name: ${r.name || '[Recommender name]'}
- Relationship: ${r.relation}
- Organization: ${r.organization || '[Organization]'}
- Years known the student: ${r.yearsKnown || '[unknown]'}
- What the recommender saw in the student (in their own words): ${r.strengthsTheySawInYou || '[none provided — use profile/story vault to infer]'}

${scholarshipContext ? `TARGET: ${scholarshipContext}` : ''}

CRITICAL RULES:
1. Write a complete, ready-to-edit letter in the recommender's voice (not the student's).
2. Open with a strong, specific opening — never "I am pleased to recommend."
3. Use ONE concrete anecdote drawn from the strengths-noted field or the Story Vault. Leave a "[Recommender: add a specific moment that…]" placeholder ONLY if you have nothing concrete to anchor it.
4. Include one paragraph on the student's intellectual qualities, one on character/work ethic, and one on fit for the target.
5. End with a clear, confident recommendation — not generic.
6. Sign-off block with placeholders for recommender's title, email, phone.
7. About 350-450 words. Real but not florid.
8. NEVER invent grades, awards, or accomplishments not in the profile or Story Vault.
9. Output ONLY the letter. No commentary, no preface.`;

  return callGemini(prompt);
}
