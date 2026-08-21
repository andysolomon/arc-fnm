# Phase 5.3 — Program Workspace pilot protocol

**Date.** 2026-08-21
**Status.** Executable protocol. Not executed. No program has been observed under this protocol.
**Depends on.** School Approval and live-data controls in [`phase-5-program-workspace.md`](./phase-5-program-workspace.md). Do not put PII into the current simulation app.
**Closes.** [`design-the-coach-validation-pilot`](./wayfinder/tickets/design-the-coach-validation-pilot.md)

This protocol also absorbs the Phase 0.5 field-research method (walk one real opponent week and one consequential game decision). Phase 0.5 live observation was waived as a Phase 0 blocker on 2026-08-21; any live program contact happens here, after School Approval.

---

## 1. Purpose

Demonstrate that the Program Workspace changes **decision process** for real staffs before anyone claims it helps teams win. Wins, losses, and point differential are outcome descriptors, not success measures.

## 2. Sampling frame (8–12 programs)

Recruit until **8 programs have completed** both walks below. Cap at 12. Contrast on all four axes; do not stop at Texas 5A/6A staffs that already film everything.

| Axis | Minimum mix |
| --- | --- |
| Staff size | At least two programs with 1–2 paid football coaches; at least two with a full coordinator staff |
| School size | At least two conferences/classes apart (for Texas: include ≤3A and ≥5A, or the local equivalent) |
| Competitive level | At least one playoff regular and one program that did not make the prior postseason |
| Jurisdiction | At least two state associations. Default pair: Texas UIL plus one comparison already documented in research (e.g. GHSA). Same Decision Model, different Jurisdiction Rule Set |

**Exclude**

- Programs unwilling to complete School Approval.
- Programs that require a vendor film/gradebook adapter as a precondition (that inverts 5.2).
- Any site that would put medical charts or special-education files into the Workspace.

**De-identification in notes.** Field notes use program codes (P01…P12), role titles, and situation types. No student names, jersey numbers that identify, or school-identifying film stills enter the repo or the Simulation Experience.

## 3. Observation protocol

Each program completes two facilitated sessions in one opponent week. Facilitators do not coach the game.

### Walk A — current-state opponent week (baseline, no product)

90–120 minutes with the Head Coach; coordinator optional.

1. Reconstruct last week's actual loop: when film arrived, who tagged, how hypotheses were formed, how practice periods were allocated, how availability was learned, which Friday policies were written down, what was reviewed after the game.
2. Pick **one consequential game decision** (fourth down, two-minute, availability-driven substitution, or similar). Record: options considered, Evidence on hand, constraints, workaround, who could say no, and cost of being wrong.
3. Capture current tools (whiteboard, Hudl, group text, binder). No screenshots of student PII.

### Walk B — Workspace week (treatment, after School Approval)

The staff uses only the **manual** workflows in §3 of the Program Workspace spec for the upcoming opponent. Facilitator may answer “where does this field live,” not “what I would call.”

1. Import or enter Evidence for one opponent tape.
2. Form at least two Scouting Hypotheses with supporting/contradicting plays.
3. Build a practice day that collides with a real constraint (contact cap, restriction, or eligibility checkpoint).
4. Confirm Player Availability from the trainer/guidance *status* feed, not from a diagnosis.
5. Print or export Friday policies legal for that jurisdiction's technology rules.
6. After the game, complete Decision Review for the same class of decision used in Walk A.

If School Approval is not in place, Walk B does not happen. Do not substitute the fictional Westfield week as if it were Walk B.

## 4. Predeclared measures

Freeze this table **before** Walk B data are reviewed. Do not add win-rate, recruiting, or “feels more professional” as primary measures.

| ID | Measure | How collected | Direction of success |
| --- | --- | --- | --- |
| M1 | Time-to-decision | Minutes from “opponent film available” to first saved Game Plan answer, Walk A vs Walk B | Decrease without M6 getting worse |
| M2 | Evidence retrieval | Time to surface the plays behind one hypothesis, and whether sample size is stated | Decrease; sample size present |
| M3 | Plan-to-practice traceability | Share of Friday calls that map to a named practice objective | Increase |
| M4 | Preventable rules errors | Count of contact-cap, eligibility, or technology-surface violations caught before they occur | Increase in catches; zero uncaught in Walk B |
| M5 | Repeated use | Did the staff open the Workspace on a second day of the same week without the facilitator | Yes for ≥ half of completing programs |
| M6 | Blinded retrospective decision quality | Two reviewers, outcome hidden, grade the Walk A and Walk B game decisions with the Decision Review rubric | Walk B process grades no worse than Walk A |
| Q1 | Trust / workload / emotional load | Structured debrief, 15 minutes | Qualitative; veto if staff report unsafe pressure to override a restriction |

**Thresholds (set now, not after seeing results)**

- **GO (operational expansion):** ≥ 8 completing programs; M1 or M2 improved in ≥ 6; M3 improved in ≥ 5; M4 uncaught = 0 in Walk B; M5 in ≥ 4; M6 not worse in ≥ 6; no Q1 veto.
- **ITERATE:** Completing n ≥ 8 but missing one quantitative threshold, with no safety/privacy incident.
- **STOP:** Any Live Program Record in the Simulation Experience; any coach override of a healthcare restriction; any Q1 veto; n < 8 at the recruitment cutoff.

## 5. Decision inventory (filled per program, then rolled up)

For Walk A's consequential decision, record:

1. Decision name and game state
2. Options actually considered
3. Evidence (film, stats, staff judgment, missing)
4. Constraints (rules, availability, clock, staff)
5. Current workaround
6. Cost of error (competitive, eligibility, safety, political)
7. Owning authority and who could overrule

After ≥ 8 Walk A completions, rank the top five decision classes by frequency × cost of error. That ranking — not a vendor demo script — chooses any later adapter.

Desk proxy (not a substitute for Walk A): the shipped Week 8 already treats film-to-plan, contact-capped practice, Guidance/Trainer availability, Friday policies, and process-separated review as first-class. Literature backing for those six workflows is in [`docs/research/high-school-football-coach-decision-support.md`](./research/high-school-football-coach-decision-support.md). Live ranking remains unknown.

## 6. User / data-authority map (pilot default)

| Data | Enters Workspace how | Owner | Head Coach may |
| --- | --- | --- | --- |
| Tagged plays / hypotheses | Manual table | Coaching staff | Create, revise, discard |
| Practice plan and actuals | Manual plan | Coaching staff | Create, revise; cannot hide a contact-cap conflict |
| Academic eligibility status | Administrator checklist | Guidance / registrar | Read; cannot certify |
| Participation Restriction | Trainer form | Athletic Trainer | Read and plan around; cannot clear |
| Friday policies | Coach entry | Head Coach | Create; must remain legal for jurisdiction technology |
| Game outcome | Staff entry | Coaching staff | Record; cannot use it to pick the process grade |
| Student medical chart | — | Healthcare / school health record | Never |

## 7. Ethics, privacy, and stop rules

- School Approval is signed before Walk B.
- Facilitators are school officials or contractors named in that approval.
- No student is interviewed about injury, grades, or eligibility.
- Field notes in this repository are de-identified. Raw notes stay with the school.
- A safety or privacy incident ends that site's Walk B the same day and is a STOP for expansion.

## 8. Reporting

One memo after the last Walk B:

- n recruited / n completed / n withdrawn, with axis mix
- Each measure vs the frozen thresholds
- Top five decision classes from Walk A
- Proven / inferred / disproven / unknown, in the same shape as the Phase 5.5 memo
- A go / iterate / stop recommendation for operational expansion

Do not publish identifiable program stories. Do not back-port live examples into the Simulation Experience.
