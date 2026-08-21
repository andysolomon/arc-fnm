# Phase 5 — Program Workspace desk complete

**Date.** 2026-08-21
**Mode.** Desk specification and static review. No live Student-Athlete data was stored, no Convex authentication was implemented, and no school was piloted.
**Companion.** Executable pilot protocol: [`phase-5-pilot-protocol.md`](./phase-5-pilot-protocol.md)
**Boundary.** [ADR 0001](./adr/0001-simulation-first-shared-decision-model.md), [ADR 0003](./adr/0003-program-workspace-live-data-controls.md)

This file is the Phase 5.1 / 5.2 / 5.4 / 5.5 deliverable. Checking those tracker items means these artifacts exist and the go/no-go call is recorded. It does **not** mean the Program Workspace is built or approved for live use.

---

## 1. Decision Model boundary (shared vs experience-specific)

The Simulation Experience and the Program Workspace share football language and the Decision Model. They do not share people, film, grades, medical facts, or persistence.

### Shared (must stay identical)

These concepts and behaviors already live in `src/domain/` and must not fork by experience:

| Concept | What stays shared | Where it lives today |
| --- | --- | --- |
| Coaching Week loop | Evidence → Scouting Hypothesis → Game Plan → practice allocation → Player Availability → prepared Friday policies → Decision Review | `CONTEXT.md`; shipped Week 8 stages |
| Coaching Decision | Options, authority, deadline, consequence; the UI cannot invent an override of an authoritative restriction | `src/domain/programEvents.ts`, staff/film/emergency slices |
| Evidence | A claim is only as strong as its sample, conditions, and source | `src/domain/week.ts` evidence gate |
| Player Availability vs diagnosis | Coach sees participation, authority, scope, and checkpoint — never a medical inference | `src/domain/types.ts` `PlayerAvailability` |
| Jurisdiction Rule Set | Versioned by association, season, competition, and level, with source provenance | `src/domain/jurisdiction.ts`, `TEXAS_UIL_2026_27_RULE_SET` |
| Decision Review | Process grade is independent of scoreboard | `src/domain/decisionReview.ts` |
| Determinism of derived views | Gates, badges, and match projection are computed, never stored | ADR 0002; `convex/schema.ts` |

### Experience-specific (must never mix)

| Concern | Simulation Experience | Program Workspace |
| --- | --- | --- |
| People | Fictional Westfield roster and staff | Real Student-Athletes and school officials |
| Data Context | Session or optional unauthenticated Convex `careerId` | Isolated live Data Context after School Approval |
| Persistence | Decisions only; local adapter is default; Convex HTTP is opt-in and unauthenticated | Authenticated owner, audit, retention, and school-controlled destruction |
| Outcomes | Deterministic fold of coach actions (`src/domain/matchDay.ts`) | Real games; the product does not simulate Friday |
| Recommendations | Teaching artifacts inside a seeded week | Retrieval and constraint-checking only; no win-rate claims |
| Film | Seeded tags and hypotheses | School-held clips or staff-imported metadata; no sideline ingest where UIL forbids it |
| Eligibility / medical | Seeded Guidance Office and Athletic Trainer authorities | School-owned education records; coach sees the restriction, not the diagnosis |

The Convex `weeks` table is a Simulation Experience store. It is not a Live Program Record store. `careerId` is an opaque demo key (`src/state/WeekProvider.tsx`); `convex/week.ts` `get` / `save` / `reset` have no identity, tenancy, or audit.

---

## 2. Live-data controls (5.1)

These controls are required before any Live Program Record exists. They are specified here, not implemented.

### 2.1 Authorization

Live records are **education records** when a school maintains them: they are personally identifiable and directly related to a student ([34 CFR § 99.3](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-A/section-99.3); [20 U.S.C. § 1232g](https://www.govinfo.gov/content/pkg/USCODE-2023-title20/html/USCODE-2023-title20-chap31-subchapIII-part4-sec1232g.htm)).

**Who may see what**

| Actor | Legitimate interest | Coach-visible data | Forbidden |
| --- | --- | --- | --- |
| Head Coach | Prepare and review Coaching Decisions for athletes they currently coach | Player Availability, package depth, practice participation, plan/practice artifacts they authored | Diagnosis, counseling notes, full academic transcript unless the school has designated that access |
| Coordinator / position coach | Same, scoped to their unit | Unit-scoped Availability and practice assignments | Other units' restricted records |
| Athletic Trainer / healthcare authority | Create and maintain Participation Restrictions | Full restriction record they own | Coach override; product-inferred clearance |
| Guidance / registrar | Academic eligibility certification | Eligibility status they own | Football tactical artifacts they do not need |
| Athletic administrator | Institutional control, UIL certification, audit | School Approval status, audit extracts, eligibility certification state | Medical detail beyond process compliance |
| Vendor (this product) | School-official contractor performing a function the school would otherwise staff | Only records the current School Approval names | Redisclosure, independent research use, mixing into Simulation Experience |

Prior consent is not required for disclosure to school officials with a legitimate educational interest ([34 CFR § 99.31(a)(1)(i)(A)](https://www.law.cornell.edu/cfr/text/34/99.31)). A contractor may be a school official only if it (1) performs a function the school would otherwise use employees for, (2) is under the school's direct control for use and maintenance of education records, and (3) uses the records only for that purpose ([34 CFR § 99.31(a)(1)(i)(B)](https://www.law.cornell.edu/cfr/text/34/99.31)). The school must use reasonable methods so officials obtain only the records they have a legitimate interest in, and must authenticate the identity of every party to whom it discloses PII ([34 CFR § 99.31(a)(1)(ii)](https://www.law.cornell.edu/cfr/text/34/99.31), [§ 99.31(c)](https://www.law.cornell.edu/cfr/text/34/99.31)).

Directory information (name, participation in sports, weight/height of team members) is a narrower class ([34 CFR § 99.3](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-A/section-99.3)). Grades, eligibility holds, trainer restrictions, and film tied to a named athlete are not directory information.

Texas parents are entitled to access written district records concerning their child, including medical records in accordance with Texas Education Code § 38.0095 and health and immunization information ([Texas Education Code § 26.004](https://statutes.capitol.texas.gov/Docs/ED/htm/ED.26.htm#26.004)). The Program Workspace must be able to export a parent's child's records; it must not become a second, inaccessible filing cabinet.

**Product rules**

1. No Live Program Record is writable until School Approval is effective for that school and season.
2. Identity is school-issued (district SSO or equivalent). The demo `careerId: 'demo'` path is Simulation Experience only.
3. Least privilege is by role **and** roster assignment, not by “staff of the school.”
4. A Participation Restriction is append-only from the owning authority. The Head Coach can acknowledge it and change the Game Plan; they cannot clear it.
5. Simulation Experience and Program Workspace have separate deployments, keys, and backups. A Convex URL that serves the demo week must not accept a live roster.

### 2.2 Audit

FERPA requires a record of each request for access to and each disclosure of PII from a student's education records, with enumerated exceptions for the parent or eligible student, a school official with a legitimate educational interest, a party with written consent, and a party seeking directory information ([34 CFR § 99.32](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.32), including § 99.32(d)). Texas Local Schedule SD still retains those excepted disclosures for one year and retains all other disclosures with the education record ([SD3225-02](https://www.tsl.texas.gov/slrm/localretention/schedule_sd)). The Program Workspace logs both classes so a Texas district can meet TSLAC, not only the federal floor.

Every Program Workspace Audit Event records:

- actor (school-official identity, not a shared staff login)
- action (`read` / `create` / `update` / `export` / `destroy` / `disclose`)
- object class and identifier (never a diagnosis payload in the audit line)
- authority / legitimate-interest basis
- timestamp
- recipient, when the action is a disclosure

Retention of those Audit Events follows the district's FERPA access-record series, not application log rotation:

| Disclosure class | TSLAC floor | Implication |
| --- | --- | --- |
| Parent, eligible student, school official with legitimate interest, written consent, or directory information | Date records produced + 1 year ([SD3225-02a](https://www.tsl.texas.gov/slrm/localretention/schedule_sd)) | Application logs that roll in 30 days are not an audit trail |
| Any other party | Keep with the education record for as long as that record is maintained ([SD3225-02b](https://www.tsl.texas.gov/slrm/localretention/schedule_sd); [34 CFR § 99.32(a)(2)](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.32)) | Third-party exports outlive the feature that created them |

Redisclosure is forbidden except as [34 CFR § 99.33](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.33) allows. Health-or-safety emergency disclosure is a named exception with a documented basis ([34 CFR § 99.36](https://www.ecfr.gov/current/title-34/subtitle-A/part-99/subpart-D/section-99.36)); the product may assist the school in recording that basis, not in inventing one.

Current code has no Audit Event. `convex/week.ts` last-write-wins upserts and deletes. That is acceptable only inside the Simulation Experience.

### 2.3 Retention

FERPA does not set a national destruction clock. Texas public schools do. The Program Workspace stores copies on the school's behalf, so it inherits the district's TSLAC floors and cannot destroy earlier.

| Record class | TSLAC series | Minimum |
| --- | --- | --- |
| UIL correspondence, schedules, rosters, participation reports (not finance) | [SD3625-04](https://www.tsl.texas.gov/slrm/localretention/schedule_sd) | 2 years |
| Student health / medical records held by the district | [SD3300-04](https://www.tsl.texas.gov/slrm/localretention/schedule_sd) | Date of withdrawal + 7 years, or until age 21, whichever later |
| FERPA access policies | [SD3225-01](https://www.tsl.texas.gov/slrm/localretention/schedule_sd) | As long as they demonstrate 34 CFR 99.32 compliance |
| Grades 9–12 academic achievement record | [SD3200-01a](https://www.tsl.texas.gov/slrm/localretention/schedule_sd) | Permanent — **do not store this in the Workspace**; link out to the registrar of record |

**Product rules**

1. Each Live Program Record class has a retention key. Destruction is a school-authorized job, not `reset-week`.
2. Simulation `Reset week` (`src/domain/week.ts`) is forbidden in the Program Workspace. A confirm dialog does not make it safe for Live Program Records ([REPLAY-2](./phase-4-5-validation.md)).
3. Film metadata follows the school's film/UIL participation series, not “until the next opponent.”
4. The vendor retains nothing after contract end except what a surviving legal hold or the school's export requires.

### 2.4 School Approval

School Approval is a named document, not a ToS checkbox. It must exist before the first Live Program Record.

Minimum contents:

1. School / district legal name, campus, season, and sport.
2. Designation of the vendor as a school-official contractor under 34 CFR § 99.31(a)(1)(i)(B), including direct-control and use-limitation language.
3. Roles the school treats as school officials for this tool, and what “legitimate educational interest” means here.
4. Record classes in scope (for a first pilot: decision artifacts, availability *status*, practice plans, Friday policies). Record classes out of scope (full medical charts, counseling, special-education files, registrar transcripts).
5. Parent/eligible-student notice plan and directory-information opt-out handling.
6. Retention owner at the school and destruction/export on contract end.
7. Named administrators who may grant, suspend, or revoke access.
8. Prohibition on using live records to train models, populate the Simulation Experience, or publish identifiable examples.

UIL already requires schools — not vendors — to keep annual participation forms and to certify varsity eligibility over administrator and coach signature ([UIL Constitution, athletics eligibility](https://www.uiltexas.org/policy/constitution/athletics/eligibility); [Football Manual pre-season regulations](https://www.uiltexas.org/football/manual/football-manual-pre-season-regulations)). The Workspace may hold a checklist that those forms are on file. It is not the UIL portal and must not become a second eligibility system of record.

---

## 3. Manual operational workflows (5.2)

No vendor adapter ships until a pilot measure shows that a specific import is the highest-cost gap. Every workflow below is a file or form a staff can complete with tools they already have.

### 3.1 Film → Evidence → Scouting Hypothesis

**Input.** A staff-built table (CSV or sheet) with one row per tagged play: opponent, date, down, distance, hash, yard line, personnel, formation/motion, concept, result, clip identifier, tagger, confidence.

**Work.** Import validates required columns. Each Scouting Hypothesis points at supporting and contradicting play IDs. Sample size is visible. Missing angles stay unknown rather than filled.

**System of record.** The school's film library (Hudl or otherwise) stays outside. The Workspace stores tags and hypotheses, not a second video archive, until a later adapter is justified.

### 3.2 Game Plan and practice allocation

**Input.** The same Decision Model already used in simulation: answers linked to practice objectives; periods with day, group, expected reps, contact level.

**Work.** The Texas UIL 2026–27 contact cap and provenance already in `src/domain/jurisdiction.ts` remain the validator. Plan-versus-actual is a same-day note, not a wearable feed.

**Out.** A printable practice card and a contact-minute conflict list naming the athlete/group and the rule source — still without a medical inference.

### 3.3 Player Availability and eligibility

**Input.** Two manuals, never one blended spreadsheet:

1. **Eligibility checklist** — administrator-certified: physical on file, parent permit, UIL forms, academic standing as *eligible / ineligible / pending*, checkpoint date. Source: UIL required-forms list, not the Guidance Office's gradebook dump.
2. **Participation Restriction** — Athletic Trainer (or other owning authority): player, participation (`available` / `no-contact` / `out`), scope, duration, checkpoint. No diagnosis field exists in the coach schema, matching `PlayerAvailability` in `src/domain/types.ts`.

**Work.** Depth charts consume Availability. An ineligible or no-contact athlete cannot be assigned live-contact reps. The Head Coach cannot tick them back to available.

School-held athletic trainer notes are generally education records under FERPA, not HIPAA PHI, when the school maintains them ([ED/HHS Joint Guidance, Dec 2019](https://www.hhs.gov/hipaa/for-professionals/special-topics/ferpa-hipaa/index.html)). The Workspace therefore follows FERPA access rules and must not re-label those notes as a medical-device feed.

### 3.4 Friday policies

**Input.** Coach-owned thresholds for fourth down, PAT, clock, and contingency packages — the same policy tokens already persisted in simulation.

**Work.** Because UIL regular-season video/data technology is limited to the booth and locker room, not the sideline ([UIL Football Manual, regular season](https://www.uiltexas.org/football/manual/football-manual-regular-season)), the operational surface is a printable/rehearsable card and a booth copy. There is no live sideline app in Texas regular season.

### 3.5 Decision Review

**Input.** After the real game: which prepared decisions were used, a staff process grade, and lessons. Scoreboard is recorded as outcome, not as the grade.

**Work.** Same anti-outcome-bias rule as `src/domain/decisionReview.ts`. Lessons may carry to the next opponent week inside that school's Data Context only.

---

## 4. Reviews (5.4)

Static review of the **current simulation app** against operational launch. Findings marked _block_ must be gone before any Live Program Record. Findings marked _open_ are known simulation follow-ups and do not by themselves block a Simulation Experience release.

### Privacy — **block**

| Check | Result |
| --- | --- |
| Separate live Data Context | Fail. One optional Convex `weeks` table; unauthenticated `careerId`. |
| School-official contractor terms | Fail. No School Approval artifact in product or legal pack. |
| Least-privilege roles | Fail. Demo is a single Head Coach. |
| FERPA disclosure log | Fail. No Audit Event. |
| Parent access path (TEC § 26.004) | Fail. No export of a child's records. |
| No mixing sim and live people | Pass as a rule (ADR 0001); unenforced in infrastructure. |
| Coach cannot see diagnosis | Pass in the domain types; untested against a live trainer feed. |

### Security — **block**

| Check | Result |
| --- | --- |
| Authenticated identity | Fail. `DEMO_WEEK_KEY` is `'demo'`. |
| Authorized Convex mutations | Fail. `week.ts` is public generic handlers. |
| Transport | Pass for the opt-in path: `checkConvexUrl` requires `https://*.convex.cloud`. |
| Secrets | Pass for the repo: `.env.example` has no credentials. |
| Destructive reset | Fail for live use: simulation Reset week is forbidden in the Workspace even with a confirm (REPLAY-2). |
| Session persistence disclosure | Pass for simulation: footer “Session only.” |

### Accessibility — **open for simulation; block for Workspace launch**

Phase 4.5 documented A11Y-1..5 ([phase-4-5-validation.md](./phase-4-5-validation.md)). None were fixed. A live staff tool cannot launch with lock reasons trapped in `title` and locked nav removed from the tab order (A11Y-1, A11Y-2). Browser/AT verification (A11Y-5) is still unrun.

### Rules — **open**

Texas UIL 2026–27 provenance exists for academic eligibility, weekly full-contact minutes, and game-day video/data surfaces (`src/domain/jurisdiction.ts`). Full jurisdiction coverage, a second-state comparison set, and live UIL form checklists are not in the product. The Workspace must not claim “UIL compliant.”

### Safety — **pass as a boundary; unproven operationally**

The domain already refuses medical inference and coach override of Athletic Trainer / Guidance Office authority. CDC HEADS UP still owns concussion removal and clearance ([CDC response guidance](https://www.cdc.gov/heads-up/response/index.html)). Emergency action plans stay school documents (NFHS EAP position statement, cited in [`docs/research/high-school-football-coach-decision-support.md`](./research/high-school-football-coach-decision-support.md)). Nothing here authorizes a sensor-to-clearance feature.

### Integration — **pass by abstinence**

No vendor adapter exists. That is the correct Phase 5.2 posture. The first integrations, if any, wait for pilot friction measures.

---

## 5. Go / no-go memo (5.5)

**Call.**

- **Simulation Experience:** **GO to Phase 6 release-criteria review.** The playable Coaching Week exists. Remaining simulation follow-ups (browser visual QA, Playwright journeys, A11Y-1/2, LEARN-1) are product-quality work, not operational-privacy work.
- **Program Workspace:** **NO-GO.** Do not store a real Student-Athlete record, do not recruit a live pilot that puts PII in this app, and do not describe the current Convex week table as school-ready.

### Proven

- A shared Decision Model can represent Evidence, hypotheses, practice constraints, Player Availability, Friday policies, and Decision Review without a live backend (ADR 0002; shipped Phases 1–4).
- Authority-owned restrictions can be enforced in code so the Head Coach cannot clear them (Kowalski / McCoy / contact-cap tests).
- Texas UIL 2026–27 contact, eligibility-context, and booth-only video rules can be versioned with source provenance.
- Deterministic preparation → Friday causality can be taught without dice (`src/domain/matchDay.ts`; Phase 4.5 LEARN mechanism).

### Inferred (not measured)

- Coaches would retrieve Evidence and revise a plan faster in a Program Workspace than with their current binders/Hudl/email stack.
- Manual CSV/form workflows are enough for an 8–12 program pilot.
- The simulation's process-versus-outcome review transfers to real Friday nights (LEARN-4 remains unmeasured).

### Disproven (for this codebase)

- “Optional Convex persistence” is not an authorization boundary. `careerId` plus public mutations is not School Approval.
- Reset-week and session-only storage are incompatible with education-record retention.
- A single shared deployment can host both the public simulation and live student data. ADR 0001 forbids it; the current schema would not survive that split.

### Unknown

- Whether 8–12 contrasting programs will use the Decision Model during a real opponent week.
- Time-to-decision, evidence-retrieval, plan-to-practice traceability, preventable rules errors, repeated use, and blinded retrospective decision quality (thresholds are in the pilot protocol; no baseline exists).
- School legal counsel acceptance of contractor-as-school-official terms.
- A second jurisdiction's rule-maintenance cost.
- Support load, incident response, and rollback for a live campus.

### What would flip Program Workspace to GO

1. 5.1 implemented: separate Data Context, school identity, least privilege, Audit Events, retention jobs, School Approval gate.
2. 5.2 manual workflows implemented without a vendor adapter.
3. At least one district counsel-signed School Approval.
4. Pilot executed per [`phase-5-pilot-protocol.md`](./phase-5-pilot-protocol.md) with thresholds frozen before results.
5. 5.4 block findings cleared, including A11Y-1/2 on the operational shell.

Until then, Phase 6 may ship the Simulation Experience only.
