# Copy/Paste Prompt — Build the First Playable Coaching Week

You are extending an existing Friday Night Manager `.dc.html` design prototype. Work directly in this directory:

`/Users/andrewsolomon/Documents/Github/arc-fnm/prototypes/Friday Night Manager UI`

Your mission is to turn the current collection of management screens into one complete, interactive opponent week. Do not create a parallel app, do not scaffold a production codebase, and do not redesign the visual language from scratch.

## Read before editing

Read these files completely, in this order:

1. `/Users/andrewsolomon/Documents/Github/arc-fnm/docs/prototype-coaching-week-IMPLEMENTATION_PLAN.md`
2. `/Users/andrewsolomon/Documents/Github/arc-fnm/prototypes/Friday Night Manager UI/FNM Design System.dc.html`
3. `/Users/andrewsolomon/Documents/Github/arc-fnm/prototypes/Friday Night Manager UI/FNM Career Start.dc.html`
4. `/Users/andrewsolomon/Documents/Github/arc-fnm/prototypes/Friday Night Manager UI/Friday Night Manager Vercel.dc.html`
5. `/Users/andrewsolomon/Documents/Github/arc-fnm/CONTEXT.md`
6. `/Users/andrewsolomon/Documents/Github/arc-fnm/docs/research/high-school-football-coach-decision-support.md`
7. `/Users/andrewsolomon/Documents/Github/arc-fnm/docs/adr/0001-simulation-first-shared-decision-model.md`
8. `/Users/andrewsolomon/Documents/Github/arc-fnm/docs/prototype-coaching-week-progress.txt`

Treat the implementation plan as the authoritative behavioral specification and the existing design-system file as the authoritative visual specification.

## File rules

- Extend `Friday Night Manager Vercel.dc.html` as the primary management prototype.
- Preserve and selectively extend `FNM Career Start.dc.html` for career entry.
- Extend `FNM Design System.dc.html` with reusable patterns introduced by this work.
- Treat `Friday Night Manager.dc.html` as a legacy reference; do not shift new work into it.
- Never edit `support.js`; it is generated runtime code.
- Preserve the `.dc.html` structure: `<x-dc>`, `<sc-if>`, `<sc-for>`, `Component extends DCLogic`, constructor seed data, `this.state`, and `renderVals()`.
- Use seeded deterministic state. Do not add backend, authentication, API, upload, or database setup.
- Update `docs/prototype-coaching-week-progress.txt` after each phase, preserving completed checkboxes.

## Product outcome

Build this complete flow:

```text
Career Start
→ Coaching Week Hub
→ Scouting Film Room
→ Prioritize three opponent hypotheses and accept one risk
→ Select Game Plan answers
→ Allocate eight scarce practice blocks
→ Respond to an eligibility/no-contact disruption
→ Resolve the depth chart and preparation gaps
→ Confirm Friday decision policies
→ Play 10–12 key situations
→ Review decision quality separately from execution and result
→ Save Lessons and complete the week
```

The central decision is:

> Given limited practice time, what should we prepare for—and what risk do we knowingly leave uncovered?

The user must not be able to prepare everything. The prototype should produce tension through scarce attention and reps, not through arbitrary currency or grind.

## Preserve what already works

Keep the current:

- Westfield Wildcats vs. Central Catholic Week 8 scenario;
- 6–1 vs. 7–0 district-title stakes;
- coach/athletic-department software shell;
- Inbox voices and local program flavor;
- roster, Player Profile, scheme, schedule, academics, boosters, school, and Match Day surfaces;
- Geist typography and achromatic Vercel-derived visual system;
- restrained shadow borders, radii, spacing, dots, and blue interaction color;
- seeded characters including Marcus Reed, Sam Okafor, Ryan Kowalski, Hunter McCoy, the existing staff, and local institutions.

Do not replace this with a dark Football Manager clone, a card-collection game, a generic analytics dashboard, or a colorful sports-betting aesthetic.

## Visual non-negotiables

- Canvas `#FAFAFA`; surfaces white or `#F2F2F2`; primary text/action `#171717`.
- Blue `#0072F5` means interactive/active only.
- Green, orange, red, purple, teal, and light blue appear mainly as compact status dots—not colored panels.
- Geist/Geist Mono, weights 400/500/600 only.
- 4px spacing grid; 6px controls; 12px cards; pill filters.
- Shadow-as-border; avoid conventional CSS borders when current patterns use shadows.
- No decorative gradients, oversized glow, glassmorphism, hover transforms, or celebratory confetti.
- Warmth comes through content: local paper, school history, staff personalities, stadium/program details, and grounded consequences.
- Preserve professional information density, but give each screen one dominant decision.

## Behavioral non-negotiables

- Seeded prototype data is acceptable. Dead controls are not.
- Every visible action must navigate, update state, explain why disabled, or be removed.
- Do not show an opaque overall Game Plan score.
- Every readiness/confidence label must reveal its Evidence, practice blocks, personnel, or constraint cause.
- A good decision may produce a poor outcome; a poor decision may get a favorable outcome.
- Never let score result define decision quality.
- Guidance Office eligibility and Athletic Trainer restrictions are authoritative and non-overridable.
- Never present medical diagnosis, clearance, or “health score” as a coach decision.
- Never hide contradictory film evidence or small samples.
- Make the user's accepted risk visible throughout the week and review it after the game.
- Keep fictional prototype data completely separate from the future Program Workspace concept.

## Seeded scenario requirements

Use Central Catholic's existing identity:

- I-formation power/counter with pulling guards;
- sprint-out passing when behind schedule or on medium third down;
- Cover 3 with the eighth defender down on early downs;
- dangerous but smaller-sample return-game threat.

Create at least 30 opponent clips covering offense, defense, and special teams. Each clip needs a placeholder visual plus situation, personnel, formation, motion, concept, result, angle availability, staff note, and hypothesis relationship.

Create four hypotheses:

1. power/counter toward the tight-end surface on early downs;
2. sprint-out to the boundary after a negative play or on medium third down;
3. Cover 3 rotation that creates a trips-side flood opportunity;
4. return-game field-position threat supported by a smaller sample.

Require three priorities and one accepted risk.

Create at least six competing practice objectives and only eight allocatable 10-minute priority blocks. The user must make a real tradeoff.

Trigger these existing disruptions after the first practice plan is locked:

- Ryan Kowalski becomes academically ineligible for Friday.
- Hunter McCoy remains unavailable for contact because of bruised ribs.

Propagate both across Inbox, Academics, Squad, Depth Chart, Game Plan, Training, Week Hub, and Friday readiness.

## Phase execution

Work through the following phases in order. Do not skip ahead. At the end of each phase:

1. run the reachable interaction path for that phase;
2. verify all previous screens still work;
3. inspect desktop and narrow layout;
4. fix console/runtime errors introduced by the phase;
5. update the matching phase in `docs/prototype-coaching-week-progress.txt`;
6. continue to the next phase only after its acceptance criteria pass.

### Phase 0 — Stabilize and extend the design system

- Confirm the main source-of-truth files.
- Fix the unresolved interpolated nav SVG path error without editing `support.js`.
- Remove the hard `min-width:1240px` shell behavior.
- Establish 1440, 1024, 768, and 390 layout primitives.
- Add semantic primary controls and visible focus states.
- Implement, disable with explanation, or remove existing dead global actions.
- Add Decision Card, Evidence/Sample, Confidence, Linked Object, Practice Block, Constraint, Accepted Risk, and Review Row patterns to the design system.
- Once the Week screen lands, update the displayed version to `v1.5.0 — Coaching Week`.

Do not continue until Career Start and all existing management screens remain reachable without application console errors.

### Phase 1 — Coaching Week Hub

- Add **Week** as the first nav item and management entry screen.
- Make Inbox supporting—not the primary orientation screen.
- Show opponent/stakes, Monday–Saturday timeline, Next Decision, objective readiness, hard constraints, accepted risk, staff notes, and “What changed?”
- Make global Continue navigate to the next unresolved mandatory decision.
- Ensure a tester can identify opponent, day, next decision, deadline, and major constraint within five seconds.

The Week Hub must be a decision queue, not a wall of metrics.

### Phase 2 — Evidence-driven Film Room

- Preserve the current Scouting overview.
- Add Overview, Film Room, Hypotheses, and Assignments tabs.
- Add clip list/viewer, tight/wide toggle, conditional filters, notes, tags, and support/contradiction assignment.
- Add four hypotheses with sample, games, support, contradiction, missing Evidence, and confidence explanation.
- Make every hypothesis drill into contributing clips.
- Require three prioritized concerns and one explicit accepted risk before advance.

Do not use a generic “AI says” recommendation. Staff and user judgments must remain identifiable.

### Phase 3 — Opponent-specific Game Plan

- Preserve existing scheme and Depth Chart content.
- Add Game Plan, Depth Chart, and Situational Policies tabs.
- Turn each selected hypothesis into one active answer with 2–3 plausible choices.
- Show upside, exposure, counter-risk, responsible assistant, personnel dependency, observable success cue, and required practice objective.
- Show which answers become invalid or thin when scheme/personnel changes.
- Keep the accepted risk visible.

There must not be one obviously correct answer in every card.

### Phase 4 — Constrained Practice Planner

- Replace the static Monday–Thursday plan with fixed periods plus eight allocatable 10-minute opponent-plan blocks.
- Connect each block to objective, day, unit/group, contact level, expected reps, and responsible coach.
- Derive `Unseen`, `Introduced`, `Repped`, or `Rehearsed` readiness from visible inputs.
- Show affected players, unit imbalance, availability, and the remaining full-pads day.
- Add undo, reset-to-staff-plan, save draft, lock, and lock summary.

The plan must force at least one meaningful area to remain thin or uncovered.

### Phase 5 — Thursday disruption

- Trigger the existing eligibility and no-contact messages after plan lock.
- Do not permit a coach override.
- Propagate the restrictions across all relevant screens.
- Let the coach promote a backup, simplify a package, switch an answer, reallocate catch-up reps, or accept lower readiness.
- Prevent illegal reps and illegal Friday depth assignments.
- Block Continue until legal Friday personnel are set.

One response must visibly change at least three other screens.

### Phase 6 — Friday Decision Room and key situations

- Preserve the current scoreboard, field, event feed, speed controls, and Quick Adjust area.
- Add pregame policies for fourth down, conversions, clock/timeouts, and one opponent-specific adjustment trigger.
- Replace the fixed script with at least two seeded branches influenced by plan, readiness, personnel, accepted risk, and execution variance.
- Present 10–12 key situations instead of simulating every play.
- In at least four situations, show context, prepared answer, staff observation, meaningful choices, and consequences.
- Mark event-feed moments connected to preparation or accepted risk.
- Make Quick Adjust choices alter subsequent situations.

Two different preparation paths must feel different, while either path remains capable of winning or losing.

### Phase 7 — Decision Review

- Add Review entry after the final game state and from Schedule.
- Build an Evidence → concern → answer → practice → Friday choice → execution → outcome timeline.
- Use `Sound`, `Debatable`, and `Poor Process` labels with rationale instead of omniscient numeric grades.
- Review the accepted risk explicitly.
- Let the user save 1–3 Lessons.
- Add a restrained local-paper story tied to actual decisions and result.
- Return to a completed Week Hub with next-opponent preview.

The review must contain at least one sound decision with an unfavorable outcome and one weaker decision with a favorable outcome.

### Phase 8 — Responsive, accessible, interaction-complete polish

- Validate 1440, 1024, 768, and 390 widths.
- Collapse nav at compact widths, stack secondary rails, and convert tables to cards or contained scrollers.
- Keep Next Decision and blockers prominent.
- Add headings, labels, selected states, focus, keyboard operation, and non-color status meaning.
- Add empty, resolved, locked, invalid, and completed states.
- Audit and remove every dead interaction.
- Add deterministic Reset Week.
- Run both validation scenarios from the implementation plan.

Do not merely scale the desktop canvas down. Reflow it.

### Phase 9 — Handoff

- Add a prototype-local screen/state map and run instructions.
- Document seeded branches and what remains simulated.
- Capture desktop and narrow screenshots for major stages.
- Record known limitations and production unknowns.
- Complete the progress tracker.
- Archive the plan and tracker together only after final acceptance.

## Required golden-path checks

Run at least these two paths before declaring the prototype complete:

### Path A — Prioritize power defense

- Prioritize Power, Sprint-out, and Cover 3.
- Accept return-game risk.
- Spend most practice blocks on run fits and sprint-out contain.
- Resolve Kowalski with backup/catch-up reps.
- Surface better defensive readiness and a plausible special-teams consequence.

### Path B — Prioritize field position and offense

- Prioritize Cover 3, Return Game, and Sprint-out.
- Accept power-run risk.
- Spend more blocks on offensive answers, special teams, and situations.
- Simplify the package after Kowalski becomes ineligible.
- Surface stronger offensive/special-team readiness and a plausible power-run consequence.

Either path may win or lose. The review must focus on process, not reward one canonical build.

## Definition of done

The work is complete only when:

- the existing career setup routes into the new Week Hub;
- every phase of the opponent week is reachable and stateful;
- every major object is traceable through the causal chain;
- the two planning paths create visibly different but plausible Friday experiences;
- restrictions cannot be overridden by the coach;
- the review separates decision, execution, and result;
- all primary controls work or explain why disabled;
- the full path works at desktop and 390px;
- keyboard users can complete every required decision;
- Reset Week restores the seeded baseline;
- the design-system prototype contains every new reusable pattern;
- the progress tracker accurately reflects completed work;
- the handoff distinguishes prototype simulation from future production logic.

Do not stop after drawing screens. Fully connect the designed interactions and states inside the existing prototype runtime.
