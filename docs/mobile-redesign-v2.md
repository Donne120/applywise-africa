# ApplyWise Africa — Mobile Redesign v2

**Status:** Spec, not yet built
**Date:** 2026-05-19
**Owner:** Founder (Donne)
**Design team:** Adaeze (Principal Product Design), Marcus (Design Director), Fatima (UX Research), Kwame (Staff Mobile Eng), Lerato (Product Lead)

---

## 1. North Star

> A student opens this app at 11pm, tired, on a 5.5" screen, and within 5 seconds knows the one thing to do next — and does it.

Everything in this spec serves that sentence. If a feature doesn't, it's cut.

---

## 2. The 5 Jobs

The whole product is five jobs. Mobile must make these obvious and nothing else can compete.

1. **Find** scholarships that fit them
2. **Apply** — track and work through each scholarship (tasks live here)
3. **Story** — capture raw life material the AI will draw from
4. **Write** — AI turns stories + profile into essays / SOPs / letters
5. **Subscribe** — pay for the plan that unlocks more (drawer, not a tab)

Tasks are *not* a job. Tasks are *a view across Apply*. They live inside each scholarship workspace.

---

## 3. Information Architecture

### Bottom tabs (always visible, 5 slots)

| Tab | Icon | Label | Purpose |
|---|---|---|---|
| 1 | `Sun` | **Home** | The coach. One greeting, one status sentence, one CTA. |
| 2 | `Search` | **Find** | Discover scholarships. AI-powered search + saved filters. |
| 3 | `GraduationCap` | **Apply** | List of scholarships they're tracking. Tap → workspace with tasks. |
| 4 | `BookHeart` | **Story** | Story Vault. Add via text or voice. Themes, lessons, emotional weight. |
| 5 | `PenTool` | **Write** | Writing Studio. New essay, recent drafts. |

### Topbar (sticky, on every tab)

```
[ ☰        ApplyWise        [Avatar] ]
```

That's it. No streak chip. No countdown chip. No badges. The brand returns to center stage.

### Drawer (slides from left, opened via ☰)

- Profile & story
- Plan & billing
- Recommenders
- Grow (skill-gap closing)
- Settings
- Theme toggle (Light / Dark)
- Sign out

Drawer is for secondary destinations only. The 5 tabs are where the real work lives.

---

## 4. Visual Direction — "Editorial Calm"

### Principles

1. **One display headline per screen.** Playfair, large, confident. Everything else is Inter.
2. **One accent action per screen.** Rose-deep (`#C97F89`) only on the single primary CTA. Anything else is text or border-only.
3. **Generous whitespace.** Default vertical rhythm = 24px between sections, 16px within.
4. **Photography over illustration.** Real African students. Magazine-grade treatment with a subtle warm overlay so type stays readable.
5. **Motion is slow and confident.** 280ms ease-out (`cubic-bezier(0.22, 1, 0.36, 1)`) for everything. No springs. No bounces.
6. **No gamification chrome.** No streak rings, no flames, no badge clusters. Progress is communicated in prose: *"You've added 3 stories. One more and the AI starts to sound unmistakably like you."*

### Reusing the existing token system

`src/styles/global.css` already defines the "Soft Rose & Cream" palette with Playfair + Inter. We do not throw it out — we *discipline* it.

What changes:
- We restrict **rose-deep** to the *single primary CTA per screen*. Currently it appears in too many places.
- We add a **`--mobile-vh`** unit and a **`--safe-bottom`** for tab-bar overlap on iOS.
- We introduce a **`--motion-confident`** = `cubic-bezier(0.22, 1, 0.36, 1)` `280ms` alias and use it everywhere on mobile.

### Type scale (mobile)

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `--type-display` | 32px / 38px line | Playfair | 600 | Screen headline (one per screen) |
| `--type-h1` | 22px / 28px | Inter | 600 | Section headers |
| `--type-h2` | 17px / 24px | Inter | 600 | Card titles |
| `--type-body` | 15px / 22px | Inter | 400 | Default body |
| `--type-meta` | 13px / 18px | Inter | 500 | Metadata, labels |
| `--type-tiny` | 11px / 14px | Inter | 600 | Tab labels, badges (rare) |

### Spacing scale (mobile)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`. No magic numbers in component styles.

---

## 5. Screen-by-Screen Wireframes

### 5.1 First-open (one-time)

The "jaw-drop" moment. New user, no profile, no data.

```
┌──────────────────────────────┐
│                              │
│ [ full-bleed photo of an     │
│   African student in soft    │
│   warm light, eyes lifted,   │
│   notebook in lap ]          │
│                              │
│                              │
│   Let's find your            │  ← Playfair display, 32px
│   scholarship.               │
│                              │
│   We turn your real story    │  ← Inter body, 15px
│   into essays universities   │
│   can't ignore.              │
│                              │
│                              │
│   [  Begin           →   ]   │  ← single rose-deep CTA, full width
│                              │
│   I already have an account  │  ← text-only, muted
│                              │
└──────────────────────────────┘
```

No tabs. No topbar. Just photo + headline + sub + one button + one text link.

### 5.2 Home — "The Coach"

The most important screen in the app. This replaces the current Today screen entirely.

**Empty state (no scholarships yet):**

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Good evening, Donne.        │  ← Playfair, 28px
│                              │
│  You haven't picked a        │  ← Inter, 17px, text-soft
│  scholarship yet. Let's      │
│  find one that fits.         │
│                              │
│                              │
│  [  Find scholarships   →]   │  ← rose-deep, full width, 56px tall
│                              │
│                              │
│  Or add a story first        │  ← text-only link, centered
│                              │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │  ← tabs
└──────────────────────────────┘
```

**With one upcoming deadline:**

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Good evening, Donne.        │
│                              │
│  Mastercard Foundation       │  ← Playfair, 22px
│  closes in 12 days.          │
│                              │
│  You have one essay draft    │  ← Inter, 15px, text-soft
│  and two stories ready.      │
│                              │
│                              │
│  [  Open workspace      →]   │  ← rose-deep CTA → /apply/:id
│                              │
│                              │
│  ─────  Next up  ─────       │  ← divider, meta type
│                              │
│  Finish your SOP draft       │  ← list item, tap → /write
│  →                           │
│                              │
│  Add a story about           │  ← list item, tap → /story
│  leadership                  │
│  →                           │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

**Rules for Home:**
- Maximum 1 primary CTA, ever.
- Maximum 2 "Next up" items.
- No grids. No carousels. No tiles.
- The status sentence is generated from real state — if no deadline, talk about stories. If no stories, talk about Find.
- If everything is done: *"You're all caught up. Sleep well."*

### 5.3 Find

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Find your scholarship       │  ← Playfair, 28px
│                              │
│  ┌─────────────────────────┐ │
│  │ ⌕  Search by name,      │ │  ← search field, 48px tall
│  │    country, or field    │ │
│  └─────────────────────────┘ │
│                              │
│  [ Undergrad ] [ Master's ]  │  ← filter chips, single-select
│  [ PhD ] [ Exchange ]        │
│                              │
│  ─── 247 scholarships ───    │  ← divider
│                              │
│  ┌─────────────────────────┐ │
│  │ Mastercard Foundation   │ │  ← single column card
│  │ University of Toronto   │ │
│  │ closes in 12 days       │ │
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │ Chevening               │ │
│  │ UK government           │ │
│  │ closes in 28 days       │ │
│  └─────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

No horizontal carousels. Vertical scroll only. Each card is full-width, generous padding, taps to add to Apply.

### 5.4 Apply (list)

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Your applications           │  ← Playfair, 28px
│                              │
│  [ Active ] [ Submitted ]    │  ← segmented, 2 states only
│                              │
│  ┌─────────────────────────┐ │
│  │ Mastercard Foundation   │ │
│  │ 12 days · 3 of 8 done   │ │  ← progress in prose
│  │ ▓▓▓░░░░░                │ │  ← thin progress bar
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │ Chevening               │ │
│  │ 28 days · 0 of 6 done   │ │
│  │ ░░░░░░░░                │ │
│  └─────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

### 5.5 Apply (workspace — one scholarship)

Tasks live here, not in their own tab.

```
┌──────────────────────────────┐
│ ←   Mastercard Foundation    │  ← back arrow, title in header
├──────────────────────────────┤
│                              │
│  Closes in 12 days           │  ← Playfair, 22px
│  University of Toronto       │  ← Inter meta, muted
│                              │
│  [ Overview ] [ Tasks ]      │  ← 2 segments only
│  [ Essays ]                  │
│                              │
│  ── Tasks ──                 │
│                              │
│  ☐ Request transcript        │
│  ☐ Draft personal statement  │
│  ☑ Update CV                 │
│  ☐ Email referee             │
│                              │
│  [ + Add task ]              │  ← text-only, not a heavy button
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

### 5.6 Story

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Your stories                │  ← Playfair, 28px
│                              │
│  The AI uses these to make   │  ← Inter, 15px, text-soft
│  your essays sound like you, │
│  not like everyone else.     │
│                              │
│  [  +  Add a story        ]  │  ← rose-deep CTA, full width
│  [  🎤  Or speak it instead ]│  ← secondary, text + icon, ghost
│                              │
│  ── 3 stories so far ──      │
│                              │
│  ┌─────────────────────────┐ │
│  │ The night I built the   │ │
│  │ borehole pump           │ │
│  │ leadership · resilience │ │  ← themes inline, muted
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │ Failing physics in P3   │ │
│  │ growth · honesty        │ │
│  └─────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

### 5.7 Write

```
┌──────────────────────────────┐
│ ☰    ApplyWise          [A]  │
├──────────────────────────────┤
│                              │
│  Writing studio              │  ← Playfair, 28px
│                              │
│  [  +  New essay or letter ] │  ← rose-deep CTA
│                              │
│  ── 2 drafts ──              │
│                              │
│  ┌─────────────────────────┐ │
│  │ SOP — Toronto           │ │
│  │ Draft · 480 / 800 words │ │
│  └─────────────────────────┘ │
│                              │
│  ┌─────────────────────────┐ │
│  │ Recommendation letter   │ │
│  │ Generated · ready to    │ │
│  │ copy                    │ │
│  └─────────────────────────┘ │
│                              │
├──────────────────────────────┤
│ ◉ ⌕ 🎓 ❤ ✎                   │
└──────────────────────────────┘
```

### 5.8 The AI Essay Reveal (the second "wow")

When the AI finishes generating, the screen does this:

1. Generation completes silently — no spinner-to-text pop.
2. Headline of the essay appears in Playfair, full-width, slow fade-in (380ms).
3. Body paragraphs type on character-by-character at ~40ms per character, paragraph by paragraph. Reader can tap to skip.
4. After each paragraph, a tiny grey **"drawn from: [Story title]"** chip fades in below it. This is the trust-builder — the AI shows its sources.
5. Bottom of screen: `[ Copy ]  [ Refine ]  [ Save draft ]` — three actions, equal weight, no rose-deep yet (this is a viewing moment, not an action moment).

This is what students will screenshot and send to their friends. This is the marketing.

---

## 6. Component Inventory

### Keep (with refinement)

- `MobileNav` — restructure to 5 tabs, remove FAB, simplify topbar
- `VoiceComposer` — keep, surfaced from Story tab now (not FAB)
- Drawer — keep, trim items, restyle for editorial feel
- Application workspace — keep core structure, restyle header to Playfair

### Kill outright

- `MobileToday` (current) — replaced wholesale by `MobileHome` (the coach)
- FAB + radial menu (`mobile-fab*`, `mobile-fab-sheet`, `mobile-fab-actions`)
- Streak ring SVG + streak chip on topbar
- Countdown chip on topbar
- Horizontal `mobile-focus-scroller` + dot indicator
- `mobile-discover-scroller` (horizontal scroller on Today)
- `mtoday-glance` 4-tile grid
- `mtoday-coach` banner
- All `Sparkles` / `Flame` chrome decorations

### Build new

- `MobileHome` — the coach screen (replaces MobileToday)
- `MobileFirstOpen` — the editorial welcome screen
- `EssayReveal` — type-on animation + story attribution component
- `EditorialHero` — reusable Playfair display + sub + single CTA component
- `StoryAttributionChip` — small "drawn from: X" pill
- `SegmentedTabs` — 2–3 segment control used across Apply / workspaces

---

## 7. Motion Spec

| Moment | Motion |
|---|---|
| Tab switch | Instant. No transition. Tabs are navigation, not animation. |
| Drawer open | Slide-in left, 280ms `--motion-confident`. Backdrop fades to 45% opacity. |
| First-open headline | Fade + 8px translate-up, 380ms, 60ms after photo loads. |
| Home greeting | Fade-in 240ms on mount. No translate. |
| Essay reveal headline | Fade + 4px translate-up, 380ms. |
| Essay typing | ~40ms per character, paragraph at a time. Tap-to-skip. |
| Story attribution chip | Fade-in 240ms, 120ms after its paragraph completes. |
| Submit success | Photo of the student appears, "Submitted." in Playfair, dissolves after 2.5s. NO confetti. NO chime. Dignity. |

---

## 8. Build Phases

To keep PRs reviewable, ship in 3 phases.

### Phase 1 — Structural cleanup (1 PR)
- Remove FAB + radial menu
- Simplify topbar (no chips)
- Move to 5 tabs: Home · Find · Apply · Story · Write
- Trim drawer to spec
- No new screens yet — Today still renders, but stripped of clutter

**Goal:** the noise goes away. Functionality unchanged. Ship in a day.

### Phase 2 — The Coach (Home) (1 PR)
- Build `MobileHome` from scratch following spec 5.2
- Replace `MobileToday` in `Today.tsx` mobile path
- Add the empty-state copy variants (no deadlines, no stories, all-done)
- New CSS section in `global.css` for mobile editorial typography

**Goal:** the most important screen is right. Ship in 1–2 days.

### Phase 3 — The Wow moments + screen polish (2 PRs)
- PR A: First-open editorial welcome
- PR B: Essay reveal with story attribution + submit dignity moment
- Polish pass on Find / Apply / Story / Write screens to editorial spec

**Goal:** the screenshots that travel. Ship over a week.

---

## 9. Out of Scope (v1)

- Photography sourcing & licensing — assume placeholder gradient heroes for v1, real photo swap-in is a v1.1 task
- Native iOS / Android shell polish (Capacitor is scaffolded but we're not shipping to stores in this redesign)
- Re-translating to French / Swahili — copy is English-first, i18n is a separate workstream
- Animation library upgrade — stay on CSS transitions, no Framer Motion in this pass

---

## 10. Open Questions for the Founder

These need a yes/no before Phase 2 starts:

1. **Photography budget.** Editorial calm with real photos needs ~10 images. Source from Pexels/Unsplash with African student tags for v1, commission for v1.1? Or hold to gradients until a budget exists?
2. **Voice-first surfacing.** Story tab makes voice secondary ("Or speak it instead"). Some students may prefer voice as primary. OK to A/B this later?
3. **Streak — fully dead, or quiet revival?** Team killed it. If you want to retain *some* habit signal, the dignified version is a Home line: *"You've shown up 3 days running."* Optional. Default = dead.

---

## 11. Success Criteria

We'll know the redesign worked when:

- Time from app-open to first useful action drops below 5 seconds (Fatima will user-test 8 students post-launch)
- Story Vault adds per active user goes up — students adding stories means they trust the system
- Submit rate per active scholarship goes up — students finishing applications means the coach is working
- A new student, given the app cold with no walkthrough, can describe what it does in one sentence after 30 seconds

That's the bar.

---

*End of spec. Next step: founder review → adjustments → Phase 1 PR.*
