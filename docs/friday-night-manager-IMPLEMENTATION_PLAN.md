# Friday Night Manager — Implementation Plan

**Mode:** Greenfield implementation informed by an external interactive prototype. The repository contains no application source, package manifest, tests, or deployment configuration.

## 1. Product goal and scope boundaries

Build a professional-feeling, warm high-school football platform in two deliberate stages. The first release is a Simulation Experience in which anyone can inhabit the Head Coach role, have fun, and learn through consequential Coaching Decisions; the later Program Workspace applies the same Decision Model to real staffs and live seasons. Executive roles can be considered after the Head Coach experience is proven.

In scope:

- A Texas-first, single-program Simulation Experience for a broad football audience.
- Evidence-backed opponent planning, constrained practice allocation, roster availability and development, prepared game-day decisions, and post-game learning.
- Explicit uncertainty, source provenance, and separation of decision, execution, and outcome.
- A shared Decision Model that can later support an operational Program Workspace without making integrations a simulation dependency.
- Coach interviews and observed usability tests before operational or win-rate claims.

Boundaries:

- The product supports health-and-safety workflow but does not diagnose or clear a Student-Athlete.
- Jurisdiction rules are versioned by state association, season, competition, and level.
- Live sideline behavior must remain legal for the selected jurisdiction.
- Fictional simulation data and live student/program data remain separate security and data contexts.
- Real-program integrations, live data, and the Program Workspace are secondary to shipping and validating the simulation.
- Multi-state rollout, marketplace integrations, and multiplayer are deferred until the weekly loop is validated.

## 2. Current baseline

### Repository

- No app implementation is present; only agent skills and newly created product/planning documents exist.
- Stack is therefore unconfirmed. Unless replaced by a product decision, the planning default is Next.js + TypeScript + shadcn/ui, Convex, Clerk, Vercel, Jest, and Playwright.

### External v1.4.2 prototype observed on 2026-07-31

- Strong reachable surfaces: main menu, career-mode choice, coach profile/attributes, Texas team selection, roster/region setup, and hiring-news flavor.
- The copy and world framing successfully combine athletic-department seriousness with small-town personality.
- The central product loop could not be evaluated: both **Resume** and **Continue to Preseason** link to `Friday Night Manager Vercel.dc.html`, which returns `forbidden` from the shared artifact.
- Several visible affordances do nothing in the artifact, including **Preferences**, **Customize**, and **Playoff Run**.
- At 390px viewport width, the desktop columns remain side by side, producing extremely narrow cards, awkward line wrapping, and clipped content.
- Many interactive cards are generic clickable containers rather than semantic controls; heading structure is also largely absent from the accessibility tree.
- Product sequence is now decided: broad Simulation Experience first; real Program Workspace second as the higher-value operational offering.
- Unknown: existing source location, simulation engine, persistence model, production stack, operational buyer, required integrations, and results of prior coach testing.

## 3. Missing capabilities

1. A shared Decision Model contract and strict boundary between fictional simulation data and the later Program Workspace.
2. A runnable end-to-end Coaching Week rather than a deep setup funnel.
3. Evidence objects that link every tendency or recommendation back to plays, samples, assumptions, and staff judgment.
4. A practice allocator connecting opponent answers to objectives, periods, reps, contact level, and plan-versus-actual notes.
5. Player Availability, eligibility, depth/package roles, development goals, and authority-safe restrictions.
6. Prepared Friday policies for fourth down, conversions, clock, substitutions, special teams, and contingencies.
7. A Decision Review that distinguishes information quality, choice quality, execution, randomness, and outcome.
8. A versioned Texas rule layer with source and effective-date provenance.
9. Responsive, keyboard-operable, screen-reader-legible interaction patterns.
10. A validated path from the simulation to a Program Workspace with incremental, replaceable integrations.

## 4. Milestones and phases

### Phase 0 — Define boundaries and the real workflow

**Goal:** Turn the simulation-first sequence into precise product boundaries while observing how real staffs make decisions during one opponent week.

**Deliverables:**

- Use the Head Coach as the first playable role and resolve **Define the shared Decision Model boundary**.
- Interview and contextually observe 8–12 programs across staff size, school size, competitive level, and at least two jurisdictions.
- Produce a current-state Coaching Week journey, decision inventory, user/data-authority map, and ranked pain/opportunity set.
- Convert the v1.4.2 critique into a clickable vertical-slice test script.
- Execute the phased child plan in `docs/prototype-coaching-week-IMPLEMENTATION_PLAN.md` against the existing `.dc.html` prototype.

**Dependencies:** Access to head coaches, coordinators, athletic trainers/medical-policy owners, and athletic administrators; permission to discuss real but appropriately de-identified workflows.

**Risks:** Giving the Head Coach unrealistic authority, designing operational workflows around entertainment conventions, or treating one Texas program as universal.

**Acceptance criteria:**

- The Head Coach's first-playable authority is explicit, while executive roles remain deferred and the Program Workspace user, buyer, and use context are documented separately.
- Shared decision concepts and experience-specific data/permissions are enumerated.
- At least 8 programs have walked through one real opponent week and one consequential game decision.
- The team can name the top five decisions, their evidence, constraints, current workaround, and cost of error.

### Phase 1 — Establish the runnable Simulation Experience foundation

**Goal:** Replace the disconnected artifact with a deployable simulation shell and a reliable path into a fictional Coaching Week, without storing live student data.

**Deliverables:**

- Confirm or revise the default stack and document the architecture decision only if it meets the ADR threshold.
- Create the app shell, simulation-only persistence, seeded fictional Texas program, repeatable local setup, and preview deployment workflow.
- Define a Decision Model interface that does not assume whether Evidence came from the simulator or a future authorized operational source.
- Implement responsive navigation and semantic components for menu, team selection, coach profile, and weekly workspace.
- Repair or replace every dead prototype affordance; remove controls not yet supported.
- Add Jest behavior tests and Playwright journeys for new career, resume career, and keyboard-only navigation.

**Dependencies:** Source/repository decision, hosting access, visual asset rights, and Phase 0 product promise.

**Risks:** Spending on world setup before the weekly loop works; prematurely building integrations; coupling the Decision Model to either generated or vendor-specific data.

**Acceptance criteria:**

- A user can create or load a career and reach the current Coaching Week without a broken link.
- Primary workflows pass at 390px and 1280px, at 200% zoom, and with keyboard navigation.
- A screen reader exposes meaningful headings, labels, control roles, selection state, and errors.

### Phase 2 — Build the first playable Coaching Week

**Goal:** Make preparation a chain of consequential, explainable decisions.

**Deliverables:**

- Film/tagging seed workflow with game state, personnel, formation/motion, concept, result, confidence, and clip/source reference.
- Scouting Hypothesis board showing supporting/contradicting Evidence and sample size.
- Game Plan answers linked to practice objectives.
- Practice planner for periods, drills, groups, expected reps, contact level, and plan-versus-actual.
- Player Availability, eligibility, package depth charts, mastery, development goals, and rep allocation.
- Jurisdiction Rule Set validation with source/effective-date display for the selected Texas season.

**Dependencies:** Phase 0 decision inventory; a legally usable demonstration dataset; reviewed Texas rules; clear data ownership.

**Risks:** False precision from small samples; excessive manual tagging; presenting coach judgment as model fact; leaking protected student or medical information.

**Acceptance criteria:**

- Given the same opponent Evidence and constraints, a user can create, revise, and explain a Game Plan.
- Every generated tendency can reveal its sample, conditions, Evidence, and confidence.
- Practice conflicts identify the affected athlete/group and authoritative rule source without making a medical inference.
- User-focused tests prove that changing a hypothesis or roster constraint changes the planned reps and available Friday choices.

### Phase 3 — Make Friday decisions and post-game learning playable

**Goal:** Connect preparation to game state while preserving uncertainty and coaching agency.

**Deliverables:**

- Coach-owned policies for fourth down, conversion, clock, timeout, field-position, special teams, and contingency decisions.
- A simulation slice that consumes roster, mastery, plan, opponent behavior, and uncertainty without guaranteeing outcomes.
- Game-day decision presentation appropriate to jurisdictional technology constraints, including printable/rehearsable options.
- Decision Review separating Evidence available, choice, execution, randomness, and outcome.
- Scenario tests for end-of-half, backed-up, red-zone, four-minute, two-minute, overtime, and unavailable-player contingencies.

**Dependencies:** Calibrated assumptions; Phase 2 data model; high-school-specific validation rather than NFL thresholds copied directly.

**Risks:** Users gaming opaque formulas; outcomes teaching the wrong lesson; a match engine overwhelming the decision product.

**Acceptance criteria:**

- A reviewer can reconstruct why each consequential decision was offered and how the coach chose.
- Identical decisions can produce different plausible outcomes while receiving consistent decision-quality review.
- At least five prepared policies can be rehearsed before kickoff and recognized during the simulation.

### Phase 4 — Complete and validate the Simulation Experience

**Goal:** Deliver a replayable, professional athletic-department fantasy and establish that people enjoy it and learn its decision logic.

**Deliverables:**

- Fictional eligibility, staff responsibility, film-deadline, environment, and emergency-process events that change football choices.
- Head Coach staff delegation and consequences tied to meaningful coaching tradeoffs.
- Multi-season player development and succession across varsity and sub-varsity cohorts.
- Small-town narrative events tied to domain state and choices, not disconnected random flavor.
- Simulation onboarding, difficulty, accessibility, telemetry, retention, and learning-transfer tests.

**Dependencies:** Jurisdiction audit for authentic constraints and a validated weekly loop.

**Risks:** Turning fictional minors into tradable assets; burying decisions under administrative chores; optimizing retention through grind instead of meaningful choices.

**Acceptance criteria:**

- Program events create a clear pending Coaching Decision, responsible authority, deadline, and consequence.
- A user cannot override an authoritative healthcare restriction even in the simulation.
- Narrative events reference actual program state and never contradict rules or roster status.
- Target users complete multiple Coaching Weeks, can explain why key choices were good or poor, and report that the experience is fun enough to continue.

### Phase 5 — Build and pilot the Program Workspace

**Goal:** Apply the validated Decision Model to real staffs through a separate operational experience, adding integrations incrementally only where they remove proven workflow friction.

**Deliverables:**

- Separate live-program data context, authorization model, audit trail, retention policy, and school/privacy approvals.
- Manual import and low-integration workflows first, followed by prioritized adapters for the highest-cost data gaps.
- Operational film-to-plan, practice, availability, Friday-policy, and Decision Review workspaces.
- Instrumented pilot with 8–12 programs and predeclared measures.
- Measures for time-to-decision, Evidence retrieval, plan-to-practice traceability, preventable rules errors, repeated use, and blinded retrospective decision quality.
- Qualitative review of trust, workload, emotional engagement, and transfer to real coaching.
- Security/privacy/accessibility checks, production runbook, and a go/no-go memo.

**Dependencies:** Validated Simulation Experience and Decision Model; school approvals; consent/privacy approach; selected integration partners; support capacity.

**Risks:** Integration sprawl, vendor lock-in, selection bias, tiny football samples, overclaiming causality from wins/losses, and unsafe handling of student information.

**Acceptance criteria:**

- Pilot thresholds are set before results are reviewed.
- Coaches can retrieve Evidence and revise a plan faster than their baseline without lower decision-review quality.
- No critical safety, rules, privacy, accessibility, or data-authority defects remain.
- The go/no-go memo states what is proven, inferred, disproven, and still unknown.

### Phase 6 — Ship and archive

**Goal:** Release each experience only when its own evidence supports shipping, then close the in-flight planning lifecycle.

**Deliverables:**

- Verified Simulation Experience release and a separately approved Program Workspace release or expansion decision.
- Release notes and operational ownership for support, rule updates, incidents, and rollback.
- This plan and its synchronized progress tracker moved to `docs/archive/` after merge.

**Dependencies:** Simulation validation, Phase 5 operational go decision, production approvals, and identified owners for both experiences.

**Risks:** Treating a technically deployable build as a validated product; leaving current planning files in place after completion.

**Acceptance criteria:**

- The release criteria and operational owners are recorded and satisfied.
- The shipping change is merged and observable in production.
- `docs/friday-night-manager-IMPLEMENTATION_PLAN.md` and `docs/friday-night-manager-progress.txt` are archived together.

## 5. Out of scope and deferred

- A national launch before rule-set maintenance works for Texas and one comparison jurisdiction.
- Recruiting markets, NIL, booster finance, facilities construction, multiplayer leagues, and a broad staff labor market.
- A playable General Manager or executive role in the first release.
- Automated diagnosis, injury prediction, medical clearance, or proprietary readiness scores.
- Claims that the product causes more wins before a suitable longitudinal evaluation.
- Any live-program integration in the Simulation Experience.
- Deep vendor integrations before manual operational workflows prove the decision value.

## 6. Immediate next steps

1. Run `docs/prototype-coaching-week-DESIGN_AGENT_PROMPT.md` against the local source in `prototypes/Friday Night Manager UI-3`.
2. Build and test the first-playable practice-allocation loop phase by phase using the synchronized child tracker.
3. Resolve **Define the shared Decision Model boundary** while the prototype exposes the concepts that genuinely need to transfer.
4. Run both seeded planning paths and five moderated prototype sessions before expanding career setup.
5. Recruit the first three contrasting Texas programs to inform the later Program Workspace without making its integrations a simulation dependency.
