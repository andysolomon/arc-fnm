---
status: closed
label: wayfinder:map
tracker: local-markdown
---

# Friday Night Manager: Coach Decision System

## Destination

Reach a decision-complete product brief for a simulation-first high-school football platform: an entertaining, educational Simulation Experience for anyone, followed by a Program Workspace that real staffs can use during live seasons. Define a shared Decision Model and strict experience/data boundaries precisely enough to implement the first playable without accidentally making real-program integrations a launch dependency.

## Notes

- Planning map; implementation and deployment are not part of this effort.
- Texas is the first jurisdictional reference, not a rules template for every state.
- Preserve the professional athletic-department interface and warm small-town Friday-night character.
- Sequence the Simulation Experience first; the Program Workspace and its integrations follow after the decision gameplay proves useful and engaging.
- Share the Decision Model, not fictional careers or live student records, between the two experiences.
- Treat decision quality, execution quality, and game outcome as separate concepts.
- Product research: [High-school football coaching decisions that software can support](../research/high-school-football-coach-decision-support.md).
- Working language: [Friday Night Manager domain context](../../CONTEXT.md).
- The shared v1.4.2 artifact was exercised on desktop and mobile on 2026-07-31. Its career setup is reachable, but its linked preseason/game application is not.
- Phase 5 desk-complete 2026-08-21: [Program Workspace spec and go/no-go](../phase-5-program-workspace.md), [pilot protocol](../phase-5-pilot-protocol.md), [ADR 0003](../adr/0003-program-workspace-live-data-controls.md). Program Workspace remains NO-GO for live records.
- Phase 6.1 criteria recorded 2026-08-21: [release-criteria memo](../phase-6-release-criteria.md). Simulation Experience is a conditional preview go, not a validated-product ship. Tracker 6.1/6.2 remain open.

## Decisions so far

- [Anchor the product in the Coaching Week](tickets/anchor-the-product-in-the-coaching-week.md) — Center the product on evidence → hypothesis → practice allocation → availability → prepared Friday decisions → review, with the career simulation wrapped around that loop.
- [Choose the primary product promise](tickets/choose-the-primary-product-promise.md) — Deliver both experiences in sequence: broad simulation and learning first, then the live Program Workspace as the higher-value operational product.
- [Define the first playable Coaching Week](tickets/define-the-first-playable-coaching-week.md) — Shipped Week 8 is the smallest end-to-end opponent week.
- [Define trust, uncertainty, and causality](tickets/define-trust-uncertainty-and-causality.md) — No clock or entropy; process grade is independent of the scoreboard.
- [Define the shared Decision Model boundary](tickets/define-the-shared-decision-model-boundary.md) — Share the loop and Decision Model; never share people, film, or live persistence.
- [Set safety, rules, and data boundaries](tickets/set-safety-rules-and-data-boundaries.md) — Coach sees Availability, not diagnosis; live records need School Approval.
- [Design the coach-validation pilot](tickets/design-the-coach-validation-pilot.md) — 8–12 program protocol with frozen process measures; not yet executed.

## Not yet specified

- Commercial packaging and account relationships between individual simulation users, coaching staffs, schools, and districts.
- Data ingestion and vendor integrations after the minimum useful Coaching Week can be tested manually.
- Simulation-engine fidelity and progression systems after decision quality can be distinguished from execution and randomness.
- Multi-state expansion after the Texas Jurisdiction Rule Set is proven maintainable.
- AI assistance boundaries after coaches show where explanation and retrieval reduce work without replacing judgment.
- How progress or learned decision habits should transfer from the Simulation Experience into the Program Workspace without transferring fictional data.

## Out of scope

- [Define the simulation role and authority](tickets/define-the-simulation-role-and-authority.md) — General Manager authority is not important to the first playable; begin with the Head Coach and revisit executive roles only when they serve a proven gameplay need.
- Automated diagnosis, medical clearance, or coach override of a healthcare restriction.
- A static nationwide compliance claim based only on NFHS rules.
- Full implementation, deployment, monetization, and vendor procurement in this planning effort.
