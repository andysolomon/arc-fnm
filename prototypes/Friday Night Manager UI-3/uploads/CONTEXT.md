# Friday Night Manager

Friday Night Manager models the decisions involved in leading a U.S. high-school football program. Its language separates the emotional career fantasy from the evidence, constraints, and review practices that can transfer to real coaching.

## Program and people

**Football Program**:
The school-based organization that includes its football teams, coaching staff, student-athletes, season obligations, and athletic-department constraints.
_Avoid_: Franchise, club

**Head Coach**:
The person accountable for the Football Program's competitive plan, staff coordination, player participation, and program standards. Head Coach is a primary playable role in the Simulation Experience.
_Avoid_: General Manager when referring to the on-field role, owner

**Student-Athlete**:
A student who participates in the Football Program and whose football role is constrained by eligibility, health, development, and school responsibilities.
_Avoid_: Asset, commodity

**Career**:
The persistent history of one Head Coach across seasons and, potentially, Football Programs.
_Avoid_: Save file, campaign

## Product experiences

**Simulation Experience**:
The entertainment and learning experience in which any user leads a fictional Football Program through a Career using simulated people, evidence, constraints, and outcomes.
_Avoid_: Demo, fake mode

**Program Workspace**:
The operational experience in which authorized staff use real program information to prepare and review Coaching Decisions during a live season.
_Avoid_: Pro mode, real mode

**Decision Model**:
The shared language for representing a Coaching Decision, its options, Evidence, assumptions, constraints, predicted effects, outcome, and review across both product experiences.
_Avoid_: Simulation engine, recommendation algorithm

## Coaching work

**Coaching Week**:
The recurring cycle of reviewing evidence, forming opponent hypotheses, allocating practice reps, confirming availability, preparing game-day policies, competing, and learning from the result.
_Avoid_: Turn, content cycle

**Coaching Decision**:
A choice among meaningful options made by the Head Coach under football, time, roster, safety, and rules constraints.
_Avoid_: Task, click

**Evidence**:
Film, tagged plays, statistics, staff observations, practice results, or rules sources used to support or challenge a Coaching Decision.
_Avoid_: Insight, intelligence

**Scouting Hypothesis**:
A testable belief about an opponent's likely behavior in a defined situation, linked to supporting and contradicting Evidence.
_Avoid_: Tendency when the sample and conditions are unstated

**Game Plan**:
The connected set of Scouting Hypotheses, planned answers, situational policies, and practice objectives for an opponent.
_Avoid_: Playbook

**Decision Review**:
A post-event assessment that separates the quality of a Coaching Decision from execution and outcome.
_Avoid_: Result grading

## Constraints

**Player Availability**:
The coach-visible statement of whether and how a Student-Athlete may participate at a given time. It does not expose or replace a medical diagnosis.
_Avoid_: Health score, readiness score

**Participation Restriction**:
An authoritative limit on a Student-Athlete's activity, including its source, scope, and duration.
_Avoid_: Injury penalty

**Jurisdiction Rule Set**:
The versioned rules and policies that apply to a specific state association, season, competition, and level.
_Avoid_: NFHS mode, universal rules
