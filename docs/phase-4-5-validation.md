# Phase 4.5 — Validation slice

**Scope.** A static audit of the shipped coaching-week app across three axes —
accessibility, decision-learning transfer, and replayability — plus a new test
file that pins the contracts the audit leans on.

**Method.** Source reading against the canonical UI-3 prototype, plus assertions
executed by `vitest`. Every claim below cites either a source line or a test.

**What this audit is not.** No browser was opened, no device or screen reader was
driven, no real user was observed, and no telemetry exists or was consulted.
Findings marked _static_ are properties of the source and the DOM produced under
jsdom; anything that needs a real AT stack or a real player is listed as an open
question rather than asserted.

Canonical prototype references are to
`prototypes/Friday Night Manager UI-3/Friday Night Manager Vercel.dc.html`
(cited as `UI-3:<line>`).

Baseline at the time of audit: commit `bafd5aa`, 267 tests passing. This slice
adds 7 tests (274 total) and changes no production code.

---

## 1. Accessibility

### 1.1 What holds

| Contract                    | Where                                                | Canonical source                | Evidence                                                        |
| --------------------------- | ---------------------------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| Drawer is a modal dialog    | `src/components/AppShell.tsx:403-413`                 | `UI-3:66-68`                    | `src/App.test.tsx:613`                                            |
| Toggle states the drawer    | `src/components/AppShell.tsx:321-331`                 | `UI-3:27`                       | `src/App.test.tsx:618-620`                                        |
| Main hidden while modal     | `src/components/AppShell.tsx:425`                     | `UI-3:3745` (`mainAriaHidden`)  | `src/App.test.tsx:626-629`                                        |
| Escape closes, focus returns | `src/components/AppShell.tsx:175-193`                | `UI-3:2450-2451` (close only)   | `src/App.test.tsx:636-645`                                        |
| Tab / Shift+Tab wrap        | `src/components/AppShell.tsx:296-313`                 | none — production addition      | `src/validation/phase45.test.ts` (drawer wrap)                    |
| Locked nav is described     | `src/components/AppShell.tsx:260,281-288`             | `UI-3:2918` (`depthBlocked`)    | `src/validation/phase45.test.ts` (scoped, non-colliding ids)      |
| Close-review note, 2 states | `src/screens/DecisionReview.tsx:493-506`              | `UI-3:1279`, `UI-3:3769`        | `src/validation/phase45.test.ts` (both states, same id)           |
| Decorative SVG hidden       | `src/components/AppShell.tsx:132,145`                 | —                               | `src/App.test.tsx:673-675`                                        |
| Status colour never alone   | `src/components/AppShell.tsx:441-489`                 | —                               | dots are `aria-hidden`, each paired with a text value             |
| Landmarks named             | `banner` / `navigation "Primary"` / `main` / `footer` | —                               | `src/App.test.tsx`, `src/screens/DecisionReview.test.tsx:154-156` |

Production is a strict superset of the prototype here: UI-3 closes the drawer on
Escape (`UI-3:2450`) but never traps Tab, never restores focus to the toggle, and
carries no `aria-describedby` at all. Those three are production hardening, and
this slice is the first place they are pinned as contracts rather than incidental
behaviour.

### 1.2 Findings — open gaps

These are recorded, not fixed. Fixing any of them means editing shipped
production code, which is outside this slice's scope.

**A11Y-1 · The lock reason is not in the accessibility tree.** A locked nav
control is `aria-describedby` a span whose entire text is `Locked`
(`src/components/AppShell.tsx:281-288`). The sentence that actually explains the
lock — "Set exactly three priorities and one accepted risk first." — lives only in
`title` (`:262`). `title` is not reliably announced, and a `disabled` button is not
hoverable by keyboard, so the reason is effectively sighted-mouse-only. The
description resolves and is unique (pinned in the new test), so the wiring is
sound; only the content is thin. _Suggested fix: put `lockReason` text in the
described element (visually hidden), leaving the visible `Locked` chip as-is._

**A11Y-2 · Locked controls are removed from the tab order.** `disabled`
(`src/components/AppShell.tsx:261`) makes the control unfocusable, so its
description is rarely reached at all; a coach tabbing the nav cannot discover
that Tactics exists and why it is shut. `aria-disabled="true"` plus a no-op
handler would keep it discoverable. The same caveat applies to the Close-out
button in the review (`src/screens/DecisionReview.tsx:495`), though there the note
sits adjacent in the reading order, so the reason is still reachable.

**A11Y-3 · The focus trap only knows about buttons.** `trapDrawerFocus` queries
`button:not([disabled])` (`src/components/AppShell.tsx:298-302`). That is exact
today — the drawer renders nothing but buttons — and the new test pins the wrap
against the real rendered set. Any future link, input, or `tabindex` element added
inside the drawer silently escapes the trap. _Suggested fix: widen the selector
when the drawer's contents change._

**A11Y-4 · Content outside the dialog stays focusable.** While the drawer is
open, `main` is `aria-hidden` but the header controls (menu, Reset week, Continue)
and the desktop rail are not. `aria-modal="true"` confines assistive technology,
and the Tab wrap confines keyboard focus as long as focus starts inside the
drawer — which it does (`:182-184`). This is a defence-in-depth note, not an
observed failure.

**A11Y-5 · Unverifiable without a browser.** Contrast ratios, focus-ring
visibility against real backgrounds, touch-target size at the 390 tier, reduced
motion, and actual screen-reader announcement order are all out of reach of a
static audit. The responsive tiers themselves are pinned in source
(`src/App.test.tsx:679-686`), but that pins the tokens, not the rendering.

---

## 2. Decision-learning transfer

The question: does playing a week teach reasoning a coach can carry to the next
week, or does it only teach this week's answers?

### 2.1 The mechanism that does the teaching

1. **Outcomes name their cause.** Every play carries a tag that states why it went
   the way it did — `Practiced — puller fits · Repped`, `Thin — kick coverage`,
   `Unseen — sprint-out contain`, `Accepted risk — power. This is the bet you made.`
   (`src/domain/matchDay.ts:479,491,907,1069-1070`). The causal chain from Monday's
   evidence to Friday's snap is never left for the player to guess.
2. **Variance is the week, not the dice.** `execSeedInputFor` folds the
   take-the-field snapshot — accepted risk, right-tackle fix, policies, every
   objective's readiness — into the seed (`src/domain/matchDay.ts:339-357`), and
   every roll derives from it (`:359-378`). There is no clock and no entropy
   anywhere in the engine (`:6-12`). "Bad luck" is therefore always traceable to a
   preparation input, which is the single most transferable lesson the game has.
3. **Preparation has visible marginal value.** The readiness bands 24 / 40 / 56 / 74
   (`src/domain/matchDay.ts:386-395`) mean a coach can see what one more practice
   block bought. `src/domain/matchDay.test.ts:226-240` pins all four bands.
4. **Process is graded separately from outcome.** The review's rubric refuses to
   let the scoreboard pick the grade — "Result points never select the process
   rating" (`src/domain/decisionReview.ts:127`) — and says so out loud: a sound call
   that lost still reads "process grades a season; one night grades nothing"
   (`:367`), a lucky bad call reads "Don't let the points launder the process"
   (`:377`). This is the explicit anti-outcome-bias lever.
5. **Execution can beat scheme, and says so.** The `Execution beat scheme` branch
   (`src/domain/matchDay.ts:1039,1693`) lets an unprepared week win a rep and labels
   it as noise rather than vindication — the counterpart to lesson 4.
6. **The loop closes forward.** Saved lessons carry to the Week 9 board
   (`src/domain/cohortCarryOver.ts`, pinned in
   `src/domain/cohortCarryOver.test.ts`), so a lesson is an artifact the next week
   inherits, not a line that disappears at the final horn.

### 2.2 Findings — open gaps

**LEARN-1 · No counterfactual is ever shown.** Each decision's alternatives carry
full result branches (`MatchDecisionOption.res`, `src/domain/matchDay.ts:92-96`),
but the review shows only the branch taken. A coach cannot see what the other two
options would have produced, so the strongest available teaching artifact — a
side-by-side of chosen versus foregone — is computed and discarded. This is the
highest-value learning gap found.

**LEARN-2 · Process calibration does not accumulate.** `reviewRatings` are per
week and do not carry over; only `lessons` do (`src/domain/week.ts:69-70`,
`src/domain/cohortCarryOver.ts`). A coach never learns whether their self-grading
tracks the staff rubric over time, which is exactly the skill the rubric is
teaching.

**LEARN-3 · The transferable rule is stated per-play, never summarised.** Tags
teach in fragments. Nothing rolls them into "you underprepared short yardage
twice this week" — the Decision Review's six rows are per-decision
(`src/screens/DecisionReview.test.tsx:157-166`), and the field snapshot's
prepared/thin/uncovered split (`src/domain/matchDay.test.ts:722-736`) exists but is
a pregame surface, not a postgame one.

**LEARN-4 · Unmeasurable here.** Whether any of this actually transfers is a
claim about players. With one scripted week, no second week to transfer *into*,
and no telemetry, this audit can only assert that the mechanisms are present and
coherent — not that they work.

---

## 3. Replayability

### 3.1 What holds

**Reset is byte-identical.** `resetWeek()` returns `createSeedState()` verbatim
(`src/domain/week.ts:76-79`), and the reducer's `reset-week` also restores the
canonical nav tabs and drops any practice draft
(`src/state/weekStore.ts:391-404`). The new test pins the full serialized seed as
a literal, asserts it after a fully-played week, and asserts the reducer path — so
a silently added or reordered field fails the suite. This matches the prototype,
which resets `WEEK_SEED` + `UI_SEED` and preserves only the viewport
(`UI-3:2437,2443,3751`); production's equivalent of `vw` is component-local drawer
state, which is never part of `WeekState` at all.

**Reruns are byte-identical.** Only coach actions persist; the queue, feed, log,
scores and field state are re-derived by folding `MatchEvent`s
(`src/domain/matchDay.ts:10-12`). The new test plays the golden path, resets,
replays, and compares `matchEvents` and the whole `MatchView` as JSON — identical,
and 20–3 both times. Deriving twice from one state is also pinned, so the view is
provably a projection and never a stored result.

**Divergence is real and cheap to reach.** Different weeks give different seeds
and different games: `src/domain/matchDay.test.ts` pins distinct seeds for the
canonical route (`3427930963`), path A (`1768531688`), each of the six priority
situations, and an added unavailability (`325368726`), with outcomes that differ
(20–3 canonical, 20–6 with Mendes out).

### 3.2 Findings — open gaps

**REPLAY-1 · Replay value is across weeks, not within one.** Because the seed is a
pure function of the snapshot, replaying the *same* week with the *same*
preparation is guaranteed to be identical — by design, and the point of the
determinism rule. The player-facing consequence is that a coach who wants a
different Friday must change a decision, not retry. That is the intended lesson,
but it means "replay" here means "re-plan", and there is exactly one week to
re-plan.

**REPLAY-2 · Reset is unguarded and total.** The header's Reset week button
(`src/components/AppShell.tsx:355-362`) discards the entire week — including saved
lessons — on a single click, with only a `title` as warning. The prototype behaves
the same way (`UI-3:37,3751`), so this is canonical, not a regression; it is still
the single most destructive control in the shell.

**REPLAY-3 · A reload is an unannounced reset.** The local adapter does not
persist (`src/data/weekRepository.ts`), and the footer says so ("Session only",
with the detail on hover). Deliberate and disclosed — noted because it interacts
with REPLAY-2: there are two ways to lose a week and one of them is a refresh.

---

## 4. What this slice added

`src/validation/phase45.test.ts` — 7 tests, no production change:

- Drawer Tab wrap: last → first, Shift+Tab first → last, no hijack of a middle
  control, no reaction to a non-Tab key.
- Locked nav description: `aria-describedby` resolves, resolves *inside* its own
  control, and the id is unique document-wide across the rail and the drawer
  rendering the same nav twice; enabled controls carry no description.
- Close-review note: same id and same wiring in both states, with the two
  canonical sentences pinned verbatim.
- Reset Week: the serialized seed pinned as a literal, from a fresh week, from a
  played week, and through the reducer (including nav and draft reset).
- Rerun: reset then replay yields byte-identical `matchEvents` and `MatchView`;
  double-derivation is stable.
- Canonical Week 8 determinism re-asserted in this file: seed string,
  `execSeedFor` = `3427930963`, empty `sits`/`outs`, 20–3, and the final-horn line.
- Entropy scan over the two audited screens.

## 5. Recommended follow-ups, in priority order

1. **LEARN-1** — surface the foregone branch in the Decision Review. Highest
   learning value, and the data already exists.
2. **A11Y-1 / A11Y-2** — move the lock reason into the described element and
   switch locked nav controls to `aria-disabled`. Small, contained, high impact
   for keyboard and screen-reader users.
3. **REPLAY-2** — confirm before Reset week once lessons are saved.
4. **A11Y-3** — widen the focus-trap selector when the drawer gains non-button
   content.
5. **A11Y-5 / LEARN-4** — the parts of this audit that need a browser and a
   player. Out of reach until someone runs the app with an AT stack.
