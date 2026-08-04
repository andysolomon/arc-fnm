---
status: open
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

## Decisions so far

- [Anchor the product in the Coaching Week](tickets/anchor-the-product-in-the-coaching-week.md) — Center the product on evidence → hypothesis → practice allocation → availability → prepared Friday decisions → review, with the career simulation wrapped around that loop.
- [Choose the primary product promise](tickets/choose-the-primary-product-promise.md) — Deliver both experiences in sequence: broad simulation and learning first, then the live Program Workspace as the higher-value operational product.

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
