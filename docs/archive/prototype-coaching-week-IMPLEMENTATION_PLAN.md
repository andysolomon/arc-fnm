# First Playable Coaching Week Prototype — Implementation Plan

**Mode:** Gap implementation. A substantial interactive `.dc.html` prototype already exists at `prototypes/Friday Night Manager UI-3`; this plan extends it in place rather than redesigning or scaffolding a production application.

**Companion prompt:** `docs/prototype-coaching-week-DESIGN_AGENT_PROMPT.md`

**Progress tracker:** `docs/prototype-coaching-week-progress.txt`

## 1. Product goal and scope boundaries

### Goal

Turn the existing Friday Night Manager prototype into a complete, replayable **Coaching Week** in which the user:

1. reviews opponent Evidence;
2. decides which threats deserve attention;
3. chooses Game Plan answers;
4. allocates scarce practice periods and reps;
5. responds to an eligibility and availability disruption;
6. sees prepared and neglected areas surface in Friday situations; and
7. reviews decision quality separately from execution and outcome.

The prototype must preserve the current fantasy: the user is a high-school Head Coach operating professional athletic-department software with restrained, warm West Texas character.

### Primary hypothesis

The first playable is compelling when the coach must decide:

> Given limited practice time, what should we prepare for—and what risk do we knowingly leave uncovered?

### Prototype audience

- Primary: football fans, aspiring coaches, current coaches, and staff who want a management simulation.
- Secondary research audience: real coaches evaluating whether the decision workflow resembles an opponent week.
- The prototype uses fictional program and Student-Athlete data only.

### In scope

- Extend the current Westfield vs. Central Catholic, Week 8 scenario.
- Add a Coaching Week hub and a clear Monday-to-Saturday progression.
- Upgrade existing Scouting, Tactics, Training, Inbox, Squad/Academics, and Match Day surfaces into one causal flow.
- Add a post-game Decision Review.
- Use deterministic seeded content with at least two meaningfully different planning paths.
- Make every visible primary action functional inside the prototype.
- Preserve and extend the existing design system.
- Support desktop, compact desktop/tablet, and a usable narrow-screen layout.

### Out of scope

- Production application architecture, authentication, database persistence, cloud sync, or multi-user collaboration.
- Real film upload, video transcoding, Hudl or other vendor integrations.
- Real Student-Athlete, academic, or medical data.
- A full football simulation engine or play-calling game.
- Recruiting, transfer markets, NIL, multiplayer, General Manager mode, facilities construction, or national rules coverage.
- Claims that the prototype improves win rate.

## 2. Current baseline

### Files and ownership

| File | Current role | Plan treatment |
|---|---|---|
| `prototypes/Friday Night Manager UI-3/FNM Career Start.dc.html` | Career menu, coach creation, team selection, game setup, appointment news | Preserve; repair dead affordances and route careers into the new Coaching Week hub |
| `prototypes/Friday Night Manager UI-3/Friday Night Manager Vercel.dc.html` | Main management prototype with ten screens and seeded state | Primary implementation target; extend in place |
| `prototypes/Friday Night Manager UI-3/FNM Design System.dc.html` | Visual tokens and component examples | Extend with decision-workflow patterns |
| `prototypes/Friday Night Manager UI-3/Friday Night Manager.dc.html` | Older/alternate prototype | Treat as legacy reference; do not make it the new source of truth |
| `prototypes/Friday Night Manager UI-3/support.js` | Generated `.dc.html` runtime | Do not edit |
| `prototypes/Friday Night Manager UI-3/uploads/*` | Football Manager screenshots and local visual references | Inspiration only; do not copy their visual language over the established system |

### Existing visual language to preserve

- Geist and Geist Mono; weights 400/500/600, never 700.
- `#FAFAFA` canvas, white surfaces, `#171717` primary text/action.
- `#0072F5` reserved for interaction and active state.
- Status colors confined primarily to 7–9px dots; avoid colored card fills.
- Shadow-as-border, 6px controls, 12px cards, pill filters.
- Four-pixel spacing rhythm.
- Achromatic, professional information density; warmth comes from names, staff voices, local press, stadium/program history, and consequences.

### Existing screens and interaction gaps

| Screen | What already works | Gap to close |
|---|---|---|
| Career Start | Career menu, coach profile wizard, team selection, roster mode, appointment story | Preferences/Playoff Run affordances are dead; main responsive layout uses desktop columns on narrow screens |
| Inbox | Selectable messages with eligibility, injury, scouting, press, booster, and district content | Most message actions are decorative and do not change other screens or decision state |
| Squad | Filtering, sorting, selection, and summary Player Card | Bench action is dead; status/depth consequences are not propagated |
| Player Profile | Detailed Overview | Stats, Development, Academics, and History are text stubs |
| Tactics | Offense/Defense/Special Teams tabs and scheme choice | Drag instruction is nonfunctional; sliders are static; choices do not affect Training or Match Day |
| Match Day | Scripted scoreboard, field state, event feed, speed controls, Quick Adjust selection | Fixed play script ignores preparation, Game Plan, availability, and Quick Adjust choices |
| Schedule | Schedule and standings | Static; no entry into pregame plan or post-game review |
| Training | Week cards and global intensity selection | Plan is fixed; no period allocation, objective coverage, reps, or constraint resolution |
| Academics | Tutor/study-hall actions update local state | Actions do not update eligibility timeline, depth chart resolution, or practice plan |
| Scouting | Opponent overview, tendencies, key players, film exchange status | Static aggregate claims; no clips, conditions, sample sizes, hypotheses, contradiction, or selection |
| Boosters | Seeded approvals can change state | Intentionally peripheral to the first playable |
| School | Facilities, staff, tradition | Static; intentionally peripheral to the first playable |

### Technical baseline

- The prototype uses `<x-dc>`, `<sc-if>`, `<sc-for>`, and a `Component extends DCLogic` state model.
- The main prototype keeps seeded program data in constructor arrays and interaction state in `this.state`.
- Screens are selected by `state.screen` and `is*` render values.
- The management file currently starts at `screen:'inbox'`.
- The main shell forces `min-width:1240px`, preventing a usable narrow layout.
- The interpolated SVG nav path emits a console error before resolution; this should be corrected without editing `support.js`.

## 3. Target experience and capability map

### Golden path

```text
Career Start
  → Coaching Week Hub
  → Film Room / Scouting Evidence
  → Select Scouting Hypotheses
  → Build Game Plan Answers
  → Allocate Practice Periods and Reps
  → Receive Thursday Availability Disruption
  → Resolve Depth Chart and Reallocate Preparation
  → Confirm Friday Decision Policies
  → Play Key Match Situations
  → Complete Decision Review
  → Save Lessons for Next Week
```

### Causal traceability contract

Every major object must visibly link forward and backward:

| From | Must connect to | Example |
|---|---|---|
| Film clip | Scouting Hypothesis | Clips 04, 11, 18 support “Power toward the tight end on early downs” |
| Scouting Hypothesis | Game Plan answer | “Spill the puller; scrape Okafor over top” |
| Game Plan answer | Practice objective | “Puller recognition and fit integrity” |
| Practice objective | Periods, groups, and expected reps | Tuesday Inside Run: defense, 18 reps, heavy contact |
| Availability event | Depth Chart and affected objectives | Kowalski unavailable changes protection and rep distribution |
| Friday situation | Prepared answer and readiness | “Sprint-out contain” appears with 2/3 planned practice blocks completed |
| Outcome | Decision Review | Sound preparation, poor execution, favorable/unfavorable outcome |

No screen may show an unexplained score, recommendation, or consequence that cannot be traced through this chain.

### Seeded opponent-week scenario

Keep the existing teams, record, date, and personalities:

- Westfield Wildcats, 6–1, district rank #2.
- Central Catholic Crusaders, 7–0, district rank #1.
- Friday home game likely decides the district title and playoff seeding.
- Ryan Kowalski, starting RT, becomes academically ineligible.
- Hunter McCoy, FB, cannot take contact because of bruised ribs.
- Central Catholic identity remains I-formation power, pulling guards, sprint-out passing, Cover 3, and an eighth defender near the box.

Seed at least 30 opponent clips split across offense, defense, and special teams. Each clip needs:

- clip ID and placeholder thumbnail;
- quarter/clock or game label;
- down, distance, hash, yard line;
- personnel, formation, motion;
- concept/result tags;
- tight/wide angle availability;
- staff note;
- whether it supports, contradicts, or is neutral toward a hypothesis.

Seed four candidate hypotheses with different evidence quality:

1. **Power tendency:** Central runs power/counter toward the tight-end surface on early downs.
2. **Sprint-out response:** After a negative play or on medium third down, Central favors sprint-out to the boundary.
3. **Cover 3 leverage:** Central's early-down Cover 3 rotation creates a trips-side flood window.
4. **Return-game threat:** Central's return unit creates field-position risk but has a smaller sample.

The user may prioritize only three. The fourth becomes an explicitly accepted risk.

### Prototype state additions

Keep state small and transparent. Add or equivalent:

- `screen:'week'` as the initial management screen.
- `weekStage`: `evidence | plan | practice | disruption | friday | review | complete`.
- `selectedHypothesisIds` and `acceptedRiskId`.
- `planAnswers` keyed by hypothesis.
- `practiceBlocks` keyed by objective/day/unit/contact level.
- `objectiveReadiness` derived from relevant blocks and affected personnel, not edited directly.
- `restrictions` with authoritative, non-overridable status.
- `depthChanges` and `unresolvedConstraints`.
- `fridayPolicies` for a small set of situations.
- `matchDecisions`, `matchEvents`, and `decisionLog`.
- `reviewRatings`, `lessons`, and `weekComplete`.

Avoid a single opaque “game-plan score.” Show readiness per objective and why it changed.

## 4. Phased implementation

### Phase 0 — Stabilize the existing prototype and design system

**Goal:** Establish a safe baseline so later phases extend one coherent prototype.

**Deliverables:**

- Preserve all current files and establish `Friday Night Manager Vercel.dc.html` as the main management source of truth.
- Update the displayed prototype version from `v1.4.2` to `v1.5.0 — Coaching Week` after the first new screen lands.
- Fix the unresolved SVG `path d` console error by using a runtime-safe icon pattern.
- Remove `min-width:1240px`; establish desktop, compact, and narrow layout primitives.
- Replace primary clickable `<div>` containers with semantic buttons/links where the runtime permits.
- Add visible focus treatment from the design system to all primary controls.
- Extend `FNM Design System.dc.html` with patterns for:
  - Pending Decision card;
  - Evidence/sample chip;
  - confidence indicator;
  - linked-object breadcrumb;
  - practice period block;
  - hard constraint alert;
  - accepted-risk callout;
  - Decision Review row.
- Remove, disable with explanation, or implement every visible dead global affordance.

**Dependencies:** Existing `.dc.html` runtime only. Do not change `support.js`.

**Risks:** Accidentally redesigning the product; breaking current seeded interactions; treating mobile as a scaled desktop.

**Acceptance criteria:**

- Career Start and all ten existing management screens remain reachable.
- The prototype loads without application console errors.
- All visible primary controls have an action, an intentionally disabled state with explanation, or are removed.
- At 1440px, 1024px, and 390px, the shell has no page-wide horizontal overflow and critical actions remain reachable.

### Phase 1 — Add the Coaching Week hub and decision queue

**Goal:** Replace passive Inbox-first orientation with a clear view of what the Head Coach must decide next.

**Deliverables:**

- Add **Week** as the first navigation item and initial screen.
- Keep Inbox as a supporting communication surface.
- Build a Coaching Week hub with:
  - Central Catholic opponent header and district stakes;
  - Monday–Saturday stage timeline;
  - one dominant **Next Decision** card;
  - preparation objectives with readiness states and trace links;
  - constraints rail for ineligibility, no-contact, and deadlines;
  - accepted-risk slot;
  - recent staff notes and local flavor;
  - concise “What changed since yesterday?” summary.
- Make the global **Continue** button route to the next unresolved mandatory decision rather than directly to Match Day.
- Add completion states that update as later phases are implemented.

**Dependencies:** Phase 0 layout and decision-card patterns.

**Risks:** Creating another passive dashboard; duplicating Inbox content; presenting readiness before its inputs exist.

**Acceptance criteria:**

- Within five seconds, a first-time tester can state the opponent, current day, next required decision, deadline, and major constraint.
- Every Week Hub card links to the screen where the issue can be resolved.
- Continue never skips an unresolved mandatory decision.

### Phase 2 — Turn Scouting into an Evidence-driven Film Room

**Goal:** Let the user investigate the opponent rather than receive unqualified aggregate tendencies.

**Deliverables:**

- Preserve the current opponent overview as a summary tab.
- Add Scouting tabs: **Overview**, **Film Room**, **Hypotheses**, **Assignments**.
- Build Film Room with:
  - clip list and placeholder viewer;
  - Tight/Wide angle toggle;
  - situation, personnel, formation, motion, concept, and result filters;
  - compact clip metadata;
  - staff notes and editable coach note;
  - hypothesis support/contradiction assignment.
- Build Hypotheses with:
  - conditional statement, not just a percentage;
  - sample size and games represented;
  - supporting, contradicting, and missing Evidence counts;
  - confidence label with plain-language reason;
  - drill-down to contributing clips;
  - actions to prioritize, hold, or reject.
- Require the user to prioritize three hypotheses and explicitly accept one uncovered risk.

**Dependencies:** Seeded 30-clip dataset and Phase 1 stage state.

**Risks:** Fake precision, excessive film-room density, or hiding contradictory evidence.

**Acceptance criteria:**

- Every hypothesis reveals its clips, filters, sample, and contradiction.
- Changing filters changes the visible sample and confidence explanation.
- The user cannot advance without choosing three priorities and one accepted risk.
- Scouting choices appear immediately on the Week Hub and in Tactics.

### Phase 3 — Convert Tactics into an opponent-specific Game Plan

**Goal:** Turn selected concerns into explicit answers and tradeoffs.

**Deliverables:**

- Preserve the existing Depth Chart and scheme surfaces.
- Add Tactics tabs: **Game Plan**, **Depth Chart**, **Situational Policies**.
- For each prioritized hypothesis, create a Game Plan Answer card containing:
  - concern and Evidence link;
  - selected answer from 2–3 plausible approaches;
  - primary unit and responsible assistant;
  - personnel/package dependency;
  - upside, exposure, and counter risk;
  - observable success cue;
  - required practice objective and target reps.
- Make the accepted risk visible beside the plan rather than silently ignored.
- Allow scheme changes, but show which answers and practice objectives they invalidate.
- Connect the existing academically ineligible RT warning to the relevant offensive answers.

**Dependencies:** Selected Phase 2 hypotheses.

**Risks:** “Best answer” choices with no tradeoff; jargon without explanation; scheme selection disconnected from personnel.

**Acceptance criteria:**

- Each selected hypothesis has exactly one active answer and one linked practice objective.
- The user can explain what the answer is designed to stop/create and what it leaves exposed.
- Changing scheme or personnel visibly changes affected objectives and unresolved constraints.

### Phase 4 — Make Training a constrained practice allocator

**Goal:** Make scarce preparation time the prototype's central consequential decision.

**Deliverables:**

- Replace the static Training week with an interactive period plan while preserving the Monday–Thursday visual rhythm.
- Separate fixed periods from a limited pool of discretionary **Opponent Plan blocks**.
- Provide eight allocatable 10-minute priority blocks across the week.
- Let each block specify:
  - objective;
  - day;
  - unit/position group;
  - contact level;
  - expected reps;
  - responsible coach.
- Seed at least six competing objectives so not all can be adequately prepared.
- Show per-objective readiness as `Unseen`, `Introduced`, `Repped`, or `Rehearsed`, with a traceable reason.
- Show affected Student-Athletes and unit rep imbalance.
- Display non-overridable contact/availability constraints and one remaining full-pads day.
- Provide clear undo, reset-to-staff-plan, save draft, and lock plan states.
- After lock, summarize what is prepared, thin, and knowingly uncovered.

**Dependencies:** Game Plan objectives from Phase 3.

**Risks:** Turning the interaction into spreadsheet busywork; treating more contact as always better; hiding fixed periods to manufacture scarcity.

**Acceptance criteria:**

- The user cannot fully prepare all six objectives with eight blocks.
- Every readiness label explains which periods, reps, personnel, and constraints produced it.
- Moving one block can improve one objective while weakening another.
- The locked plan appears on the Week Hub and affects the Friday scenario setup.

### Phase 5 — Add the Thursday disruption and cross-screen consequences

**Goal:** Prove that Inbox, Academics, Squad, Tactics, and Training form one system.

**Deliverables:**

- Trigger the existing Kowalski eligibility message after the initial practice plan is locked.
- Keep the Guidance Office as the authority; do not offer an override or instant same-week eligibility recovery.
- Trigger/retain McCoy's no-contact restriction from the Athletic Trainer.
- Update across screens:
  - Inbox action status;
  - Academics intervention and future checkpoint;
  - Squad availability;
  - Depth Chart vacancy;
  - affected packages/Game Plan answers;
  - practice blocks/reps that no longer apply;
  - Week Hub unresolved constraint count.
- Give the user meaningful responses:
  - promote a backup and allocate catch-up reps;
  - simplify the affected package;
  - switch to an alternative answer;
  - accept lower readiness.
- Require all illegal depth assignments to be resolved before Friday.

**Dependencies:** Phases 3 and 4 state connections.

**Risks:** Treating academics or health as punitive random events; letting the coach override another authority; consequences that are only cosmetic.

**Acceptance criteria:**

- One action in Academics or Depth Chart changes at least three connected surfaces.
- Restricted/ineligible players cannot be assigned to prohibited reps or Friday starters.
- Each response has a visible football tradeoff.
- Continue remains blocked until legal Friday personnel are set.

### Phase 6 — Connect preparation to key Friday situations

**Goal:** Make Match Day reveal the consequences of preparation without pretending that preparation guarantees outcomes.

**Deliverables:**

- Preserve the existing scoreboard, field visualization, event feed, and speed controls.
- Replace the single fixed script with at least two seeded event branches driven by:
  - selected hypotheses;
  - active Game Plan answers;
  - objective readiness;
  - resolved personnel;
  - accepted risk;
  - explicit execution variance.
- Add a pregame Decision Room with four coach-owned policies:
  - fourth down;
  - conversion after touchdown;
  - clock/timeout;
  - one opponent-specific adjustment trigger.
- Present 10–12 key situations, not every play.
- In at least four situations, show:
  - game state;
  - prepared answer if relevant;
  - staff observation;
  - 2–3 choices and tradeoffs;
  - selection timer only if it adds value, never as default pressure.
- Annotate the event feed when a situation connects to a practiced objective or accepted risk.
- Make Quick Adjust choices affect subsequent seeded situations.

**Dependencies:** Locked legal plan and resolved availability.

**Risks:** Outcome determinism, a fake full match engine, or opaque “you chose wrong” feedback.

**Acceptance criteria:**

- Two materially different practice plans produce different situation framing, readiness, and plausible event branches.
- A rehearsed objective can still fail through execution; an underprepared objective can still succeed.
- The UI never equates score outcome with decision quality.
- Pause, resume, speed, skip-to-next-decision, and Quick Adjust all work.

### Phase 7 — Add post-game Decision Review and learning

**Goal:** Close the loop and make the prototype teach transferable reasoning.

**Deliverables:**

- Add a **Decision Review** screen reached from the final Match Day state and Schedule result.
- Show a decision timeline with:
  - Evidence available at the time;
  - selected concern and answer;
  - practice allocation/readiness;
  - Friday situation and choice;
  - execution note;
  - outcome;
  - separate user/staff review of decision and execution.
- Review the accepted risk explicitly.
- Provide `Sound`, `Debatable`, and `Poor Process` decision labels with rationale; avoid numerical omniscience.
- Let the user save 1–3 Lessons for the next opponent week.
- Add a concise local-newspaper/story beat reflecting the result and one real program decision without exposing hidden simulation math.
- Return the user to a completed Week Hub with a preview of the next opponent.

**Dependencies:** Phase 6 decision and event log.

**Risks:** Hindsight bias, revealing hidden outcomes as if known beforehand, or making the newspaper the authoritative evaluator.

**Acceptance criteria:**

- A tester can identify one good decision with a poor outcome and one weak decision that happened to work.
- Every review statement links to the Evidence and state available when the decision was made.
- Saved Lessons appear on the completed Week Hub and next-week preview.

### Phase 8 — Responsive, accessible, and interaction-complete polish

**Goal:** Make the fully connected prototype credible enough for design review and user testing.

**Deliverables:**

- Validate 1440px, 1024px, 768px, and 390px layouts.
- At compact widths:
  - collapse side navigation into an accessible drawer;
  - stack secondary rails below the primary decision;
  - convert dense tables to cards or contained horizontal scrollers;
  - preserve Next Decision and blocking constraints above the fold.
- Use real heading hierarchy, button/link semantics, form labels, selected states, and keyboard focus.
- Ensure status meaning is never color-only.
- Add empty, resolved, locked, invalid, and completed states for every new surface.
- Audit every existing and new control; remove all dead interactions.
- Add a deterministic **Reset Week** action for testing both decision paths.
- Update `FNM Design System.dc.html` with all final patterns and responsive behavior.

**Dependencies:** All prior phases.

**Risks:** Deferring structural accessibility until visual polish; shrinking dense desktop screens instead of reflowing them.

**Acceptance criteria:**

- The complete golden path works by pointer and keyboard.
- The 390px experience supports every required decision without page-wide horizontal scrolling.
- No control promises an action it cannot complete.
- Reset Week returns all cross-screen state to the same seeded baseline.
- The prototype is ready for five moderated usability sessions, including at least two football coaches or staff members when available.

### Phase 9 — Package the design handoff and archive the plan

**Goal:** Make the resulting prototype understandable to a product or implementation team without the design agent present.

**Deliverables:**

- Add a concise screen/state map beside `github.md` or in a new prototype-local README.
- Document the seeded scenario, state transitions, decision branches, and intentionally simulated behaviors.
- Capture desktop and narrow screenshots for each major stage.
- Record known limitations and deferred production requirements.
- Mark all progress items complete and move this plan and tracker to `docs/archive/` after acceptance.

**Dependencies:** Accepted Phase 8 prototype.

**Risks:** Treating high-fidelity prototype state as production logic; leaving undocumented hidden dependencies.

**Acceptance criteria:**

- A new reviewer can run and reset the prototype, follow the golden path, and understand both branches.
- The handoff clearly distinguishes designed behavior, seeded simulation, and production unknowns.
- The plan and progress tracker are archived together only after acceptance.

## 5. Cross-phase design rules

### Decision-first screen test

Every new or substantially revised screen must answer:

1. What decision is pending?
2. Why is it pending now?
3. What Evidence and constraints matter?
4. What options exist and what does each trade away?
5. What changes after selection?
6. Is the choice reversible, locked, or controlled by another authority?
7. What is the next unresolved decision?

### Language and tone

- Use coach-readable football language; explain less-common analytics terms inline.
- Preserve small-town warmth through specific people and places, not sepia styling or clichés.
- Messages should sound like a guidance counselor, athletic trainer, coordinator, booster, or local reporter—not one generic system voice.
- Student-Athletes are not commodities. Avoid trade-market language and medical omniscience.
- Distinguish `Unavailable`, `Ineligible`, `No Contact`, `Limited`, and `Active`; never collapse them into one injury score.

### Uncertainty

- Show conditional samples: situation, games, and clip count.
- Show contradiction and missing Evidence.
- Prefer qualitative confidence with an explanation over a decorative percentage.
- Never reveal future events as if the coach knew them.
- Never let a good result erase a poor process or a bad result erase sound preparation.

### Prototype interaction standard

- Seeded data is acceptable; dead controls are not.
- Every visible action must update state, navigate, explain why disabled, or be removed.
- Cross-screen consequences must be observable without a page reload.
- All branches must be resettable.
- Do not add backend-shaped forms or integration setup screens to this prototype.

## 6. Validation scenarios

### Scenario A — Stop the power game

- Prioritize Power Tendency, Sprint-out Response, and Cover 3 Leverage.
- Accept return-game risk.
- Allocate three blocks to run fits, two to sprint-out contain, two to Cover 3 answers, one to a Friday policy.
- Resolve Kowalski with a backup and catch-up protection reps.
- Observe strong defensive readiness, thinner special-teams preparation, and at least one return-game consequence.

### Scenario B — Protect field position and offense

- Prioritize Cover 3 Leverage, Return-game Threat, and Sprint-out Response.
- Accept early-down power risk.
- Allocate more blocks to offensive answers, special teams, and situational football.
- Simplify the package after Kowalski becomes ineligible.
- Observe stronger offensive/special-team readiness and at least one power-run consequence.

### Required review behavior

Both scenarios must be capable of winning or losing. Their review should explain process differences without declaring one universally correct.

## 7. Immediate next steps

1. Give the design agent `docs/prototype-coaching-week-DESIGN_AGENT_PROMPT.md`.
2. Have it read this plan, the design system, the two primary prototype files, `CONTEXT.md`, and the research note before editing.
3. Implement Phase 0 and Phase 1 first; verify existing screens before adding Film Room state.
4. Update `docs/prototype-coaching-week-progress.txt` at the end of every phase.
5. Do not begin production integrations or application scaffolding from this prototype plan.
