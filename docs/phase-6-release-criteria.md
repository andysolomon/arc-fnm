# Phase 6.1 — Simulation Experience release criteria

**Date.** 2026-08-21
**Mode.** Preview shipped. Named host: https://arc-fnm.vercel.app. Validated-product remains NO-GO.
**Closed.** Tracker 6.1 on merge of the shipping change to `main`. 6.2 archives the plan and tracker with that merge.
**Companion.** [Phase 5 go/no-go](./phase-5-program-workspace.md) §5, [Phase 4.5 validation](./phase-4-5-validation.md), [ADR 0001](./adr/0001-simulation-first-shared-decision-model.md), [ADR 0002](./adr/0002-production-app-foundation-and-week-slice.md), [ADR 0003](./adr/0003-program-workspace-live-data-controls.md)

---

## Call

| Experience | Call | Meaning |
| --- | --- | --- |
| Simulation Experience | **CONDITIONAL GO for a playable preview.** **NO-GO as a validated product.** | The fictional Coaching Week is runnable and decision-complete in code. It has not been shown to be fun, transferable, accessible on real devices, or owned in production. |
| Program Workspace | **NO-GO** | Unchanged from Phase 5.5. No Live Program Record. No live Convex auth. No school pilot. |

**Operator decision (2026-08-21).** The operator accepted the **preview** ship bar in writing. Public notice is on Career Start, in the program-context footer, and in the root README: fictional Simulation Experience, session-only by default, not a school tool. This is not a validated-product claim. Preview is live at **https://arc-fnm.vercel.app**.

---

## Release criteria (Simulation Experience)

Frozen here. A later ship/no-ship uses this table, not a new list invented after the build is tagged.

| ID | Criterion | Source | Status |
| --- | --- | --- | --- |
| R1 | A user can create or load a Career and reach the current Coaching Week without a broken link | Phase 1 AC | **Met** (Career Start tests; local adapter default) |
| R2 | Primary workflows are usable at 390px and 1280px, at 200% zoom, and with keyboard navigation | Phase 1 AC | **Partial.** Tokens and keyboard drawer wrap are pinned in jsdom (`src/App.test.tsx`, `src/validation/phase45.test.ts`). Browser visual QA at 1440/1024/768/390 and 200% zoom are unrun. |
| R3 | A screen reader exposes headings, labels, control roles, selection state, and errors | Phase 1 AC | **Partial.** Landmarks and roles exist; A11Y-1/2 (lock reason in the description, locked nav stays in the tab order) are fixed in jsdom. A11Y-5 (real AT) remains open. |
| R4 | Same opponent Evidence → create, revise, and explain a Game Plan; tendencies show sample, conditions, Evidence, confidence | Phase 2 AC | **Met** in the seeded Week 8 domain tests |
| R5 | Practice conflicts name the athlete/group and rule source without medical inference; hypothesis/roster changes alter planned reps and Friday choices | Phase 2 AC | **Met** (jurisdiction + Phase 2.6 plan-change tests) |
| R6 | A reviewer can reconstruct why each consequential decision was offered and how the coach chose | Phase 3 AC | **Met** (Match Day tags + Decision Review) |
| R7 | Decision quality is independent of the scoreboard | Phase 3 AC; trust ticket | **Met.** Process grade cannot be selected by result points (`src/domain/decisionReview.ts`). |
| R8 | Identical Friday calls can yield different plausible games *without* teaching that the win validated the call | Phase 3 AC, restated by the causality ticket | **Met as restated.** There is no clock and no entropy. Different games require a different take-the-field snapshot. Same snapshot reruns byte-identical (Phase 4.5). The original “dice” reading of Phase 3 AC is superseded. |
| R9 | At least five prepared policies can be rehearsed before kickoff and recognized during the simulation | Phase 3 AC | **Met** (policies + Match Day recognition in tests) |
| R10 | Program events carry a pending Coaching Decision, authority, deadline, and consequence; the Head Coach cannot clear a healthcare restriction | Phase 4 AC | **Met** (five 4.1 event types; Kowalski/McCoy authority tests) |
| R11 | Narrative events reference program state and never contradict rules or roster | Phase 4 AC | **Met** (`deriveNarrativeContext` gated on review + RT starter) |
| R12 | Target users complete multiple Coaching Weeks, can explain good vs poor choices, and report the experience is fun enough to continue | Phase 4 AC | **Unmet** for a validated product. Week 8 and Week 9 are playable in code. LEARN-4: no telemetry, no observed player. Preview does not require R12. |
| R13 | Fictional simulation data never mixes with live student/program data | ADR 0001, ADR 0003 | **Met as a rule; unenforced in infrastructure.** One optional unauthenticated Convex `weeks` table. Safe only while no live roster is written. |
| R14 | Playwright-style journeys cover career, resume, and keyboard-only navigation | Phase 1 deliverable | **Unmet.** No Playwright config or tests in the repo. |
| R15 | Named owners exist for support, UIL/rule updates, incidents, and rollback | Phase 6 deliverable | **Unmet.** No owners recorded. |
| R16 | A shipping change is merged and observable in a production host | Phase 6 AC | **Met** for the preview. Host: https://arc-fnm.vercel.app. Root README and `.github/workflows/ci.yml`. |

**Validated-product ship** requires R1–R13 met, R12 measured (not inferred), R14 or an accepted substitute, R15 named, and R16 done.

**Preview ship** (accepted 2026-08-21) requires R1, R4–R11, R13-as-rule, plus a public notice that the build is a fictional Simulation Experience, session-only by default, and not a school tool. Those criteria are met. R16 is met at https://arc-fnm.vercel.app. Validated-product remains NO-GO.

---

## Operational owners

All **unknown** until named.

| Duty | Owner | Fallback if unnamed |
| --- | --- | --- |
| Product / Decision Model | unknown | Do not ship a validated product |
| Simulation Experience support | unknown | Issues have no on-call |
| Jurisdiction Rule Set updates (Texas UIL season rollover) | unknown | 2026–27 provenance will rot |
| Incidents / rollback | unknown | No runbook |
| Program Workspace / School Approval | N/A until 5.1 is implemented | ADR 0003 |

---

## Release notes (preview ship, 2026-08-21)

**What this is.** A fictional Texas Simulation Experience. Week 8 (Westfield vs Central Catholic) is the canonical teaching path: Evidence, three priorities and one accepted risk, contact-capped practice, Thursday authority events, scripted 20–3 Friday, and process graded apart from the score. Week 9 vs Riverside is playable after Close Saturday, with unique film and a derived Friday.

**What this is not.** A live Program Workspace. A UIL-compliance tool. A medical or eligibility system of record. A claim that playing it improves real Friday nights.

**How it runs.** https://arc-fnm.vercel.app with no backend. `npm run dev` locally. Optional `VITE_CONVEX_URL` persists decisions only, with no identity. Reload without that URL resets the week. `Reset week` confirms first when lessons are saved (REPLAY-2).

**Known gaps.** A11Y-5 (real AT), browser visual QA, Playwright journeys, session-only persistence. Week 9 has unique Riverside film; unique answers still reuse Westfield’s standing RT/situational objectives.

---

## What flipped 6.1 to checked

1. Preview bar: **accepted 2026-08-21.** Validated-product remains NO-GO (R12 observed users, R14 journeys, R15 owners, R2/R3 browser+AT).
2. A11Y-1/2 are fixed in jsdom. A11Y-5 (real AT) and browser visual QA remain if the preview is advertised as keyboard-usable on real devices.
3. Named production host **https://arc-fnm.vercel.app** and merge of the shipping change to `main`. 6.2 archives the plan and tracker with that merge.
