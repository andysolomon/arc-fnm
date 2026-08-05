# Friday Night Manager — Coaching Week Prototype · Handoff

Design handoff for the first playable **Coaching Week** (Westfield Wildcats vs. Central Catholic, Week 8).

**Status:** Phases **1–8** implemented and validated in `Friday Night Manager Vercel.dc.html`. Phase **0** (standalone prototype/design-system stabilization) was intentionally **out of scope** — its deliverables were not executed as a separate phase; residual gaps are noted under Known limitations. This README completes Phase 9 items 9.1–9.3; final design acceptance and archival (9.4–9.5) are complete.

**Plan and tracker:** the accepted copies are archived at repo-root `docs/archive/` (linked as `../../docs/archive/` from this folder). The `uploads/` bundle is reference material only; use the archived root copies as the canonical records.

## Files

| File | Role |
|---|---|
| `Friday Night Manager Vercel.dc.html` | **The prototype.** Source of truth — every screen, seed, and state transition below lives here |
| `FNM Career Start.dc.html` | Career entry surface (menu, coach wizard, team select). Separate file; state does not transfer into the week |
| `FNM Design System.dc.html` | Visual tokens + every reusable pattern, incl. decision-workflow and responsive sections |
| `Friday Night Manager.dc.html` | Legacy reference. Not maintained |
| `support.js` | Generated runtime. Never edit |
| `screenshots/handoff/` | Desktop + 390px captures of every major stage (index below) |
| `github.md` | Visual-source provenance (Vercel DESIGN.md tokens) |

## Run and reset

Open `Friday Night Manager Vercel.dc.html` in a browser. No build, backend, or network.
All data is seeded and deterministic. The game engine uses pure hash-derived execution rolls from the take-the-field snapshot; it never reads wall-clock time or external entropy.
**Reset week** (top bar) restores the full seeded baseline, both mid-week and after a completed week.
Note for testers: browsers throttle timers in background tabs, which slows the live game until the tab regains focus. Not an app bug.

## Screen map

Screens are switched by `state.screen`; there is no routing. Nav badges are derived, never stored.

| `screen` | Surface | Tabs / sub-state |
|---|---|---|
| `week` | Coaching Week hub (entry screen) | Stage timeline, Next Decision card, readiness, constraints, accepted risk, "what changed" |
| `scouting` | Film Room | `scoutTab`: Overview · Film Room · Hypotheses · Assignments |
| `tactics` | Game Plan | `tacTab`: Game Plan · Depth Chart (`phase`: off/def/st) · Situational Policies |
| `training` | Practice allocator | `trTab`: Practice Plan · Development |
| `match` | Match Day | `mPhase`: locked-out → pregame Decision Room → live → final |
| `review` | Decision Review | No nav item — entered from final whistle, Schedule, Week hub, Continue |
| `inbox` `squad` `profile` `schedule` `academics` `boosters` `school` | Supporting surfaces | Propagation targets, not decision gates |

## Week state machine

`state.stage`: `evidence → plan → practice → disruption → friday → review` (+ `revClosed` = complete).
The header **Continue** button computes `nextStep` from real state (not the stage marker) and deep-links to the exact screen/tab; it turns red on blockers.

| Stage | Gate to advance | Where |
|---|---|---|
| evidence | Prioritize exactly 3 of 4 hypotheses, explicitly accept the 4th as risk | Scouting · Hypotheses |
| plan | One active answer per prioritized concern (scheme conflicts must be resolved) | Tactics · Game Plan |
| practice | Place all 8 blocks, lock the plan | Training · Practice Plan |
| disruption | Legal RT body (Step 1) + package decision (Step 2: `rtFix` = promote/simplify/switch/accept), then Confirm Friday personnel | Tactics · Depth Chart |
| friday | Confirm 4 policies, Take the field, play ~12 key situations (6 coach decisions) | Match Day |
| review | Save 1–3 lessons, Close out the week | Decision Review |

Key state: `selHyp[]`, `risk`, `answers{hyp→answer}`, `blocks[]`, `planLocked`, `lineup`, `rtFix`, `pol{}`, `mQueue/mLog/mCtx`, `revRate{}`, `lessons[]`. Objective readiness (`Unseen/Introduced/Repped/Rehearsed`) is **always derived** from blocks + constraints via `blockCalc()` — nothing writes readiness directly, and every label prints its reasons.

## Seeded scenario

- Westfield 6–1 (#2) hosts Central Catholic 7–0 (#1), Fri Oct 16 — winner controls District 7-5A.
- 32 opponent clips (situation, personnel, formation, concept, result, angles, staff note, hypothesis relationship).
- 4 hypotheses of varying evidence quality: h1 power tendency (strong) · h2 sprint-out (moderate) · h3 Cover 3 flood window (strong) · h4 return game (low sample). Pick 3; the 4th is the accepted risk.
- 12 game-plan answers (3 per hypothesis), each with personnel, owner, tradeoff, success cue, and the practice objective + rep target it creates.
- 6 objectives compete for 8 ten-minute blocks (MON 2 / TUE 3 / WED 2 / THU 1); Tuesday is the only live-contact day.
- Thursday disruption: Ryan Kowalski (RT) academically ineligible — Guidance Office authority, no override; Hunter McCoy (FB) no-contact — Athletic Trainer authority. Both propagate across Inbox, Academics, Squad, Depth Chart, Game Plan, Training, and the Week hub.

## Branches

The game is a deterministic queue built by `buildGame(ctx)` from the take-the-field snapshot (readiness levels, answers, `rtFix`, RT name, accepted risk, policies). Each situation uses a pure FNV-1a/xorshift-style hash roll against readiness bands, so the same snapshot always produces the same branch while preparation changes the odds.

- **Preparation branches:** every key situation frames and resolves differently by readiness level; the accepted risk cashes visibly (amber tags); `rtFix` changes the Q1 protection sequence, the Q3 shot play, and the Q4 conversion framing; policies pre-answer the 4th-down, conversion, and two-minute calls; Quick Adjust (Blitz Heavy / Pound the Rock / Air It Out) alters later resolutions.
- **Validated paths:** Scenario A (defense-first: h1/h2/h3, return-game risk) wins on stops but bleeds return-game field position; Scenario B (offense/ST: h3/h4/h2, power risk) hits the flood but eats power runs. Either can win or lose at the closing decision.
- **Review:** process labels (Sound/Debatable/Poor process) come from a rubric over the decision-time snapshot, never from the result. Good calls can lose; bad calls can win; the labels don't move.

## Simulated vs. designed (production unknowns)

Designed behavior (spec-quality): the decision workflow, gates, propagation rules, readiness math, authority model, and review rubric.
Simulated stand-ins a production team must replace:

- **Film**: clips are metadata + placeholder frames. Real ingestion, tagging, and video playback are unbuilt.
- **Game engine**: a scripted branch tree with deterministic hash-derived execution rolls, not a production simulation. A real engine needs a probabilistic model calibrated so preparation shifts odds without exposing or fixing outcomes.
- **Readiness math**: rep weights (live 1.0 / thud 0.6 / air 0.4 …) are design placeholders, not sports science.
- **Eligibility/medical data**: seeded. Production needs guidance-office and trainer data sources, plus FERPA/HIPAA handling; the coach-cannot-override rule must survive integration.
- **Persistence**: none — reload restarts the seeded week. No accounts, sync, or multi-week season model.
- **Staff voices**: hand-written. A content system per staff persona is an open question.

## Known limitations

- Lessons are seeded candidates only; no free-text lesson entry.
- The coach's own review ratings (`revRate`) aren't summarized outside the review screen.
- Squad/Academics dense tables reflow as contained horizontal scrollers, not stacked cards (accepted per plan).
- Career Start is a separate file; "Resume" does not carry state into the week prototype.
- Depth-chart drag: bench→slot drops are real; practice-plan kanban drags are real; both have keyboard-equivalent buttons, but drag has no keyboard emulation itself (accelerator only).
- One opponent week exists; Week 9 (Riverside) is a preview card only.

## Screenshot index (`screenshots/handoff/`)

Stages 00–13 (**14 desktop** + **14 narrow**): desktop (`desktop-NN-*.jpg`, 914×540 viewport) and narrow (`narrow-NN-*.png`, true 390px layout):
00 career-start · 01 week-hub · 02 film-room · 03 hypotheses · 04 priorities-risk · 05 game-plan · 06 practice-plan · 07 disruption · 08 rt-resolved · 09 decision-room · 10 key-situation · 11 final · 12 review · 13 week-complete.
Captured on the Scenario-A path (first option chosen at each in-game decision; final Westfield 20–3). Narrow captures crop to the 390px column; content below the 540px viewport is not shown.
