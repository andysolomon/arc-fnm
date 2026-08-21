# Live Program Records enter only through School Approval, a separate Data Context, and manual workflows

**Status:** Accepted
**Date:** 2026-08-21
**Supersedes:** nothing. Tightens [ADR 0001](./0001-simulation-first-shared-decision-model.md) for the Program Workspace. Complements [ADR 0002](./0002-production-app-foundation-and-week-slice.md), which remains the Simulation Experience persistence decision.

The Program Workspace may hold Live Program Records only after a school issues School Approval, only in a Data Context that cannot see fictional careers, and only as a FERPA school-official contractor under the school's direct control ([34 CFR § 99.31(a)(1)(i)(B)](https://www.law.cornell.edu/cfr/text/34/99.31)). The current Convex `weeks` table, demo `careerId`, and simulation Reset week stay simulation-only. Manual film/plan/availability/policy workflows ship before any vendor adapter; adapters wait for proven friction from the Phase 5.3 pilot. The Head Coach still cannot clear a Participation Restriction or see a diagnosis.

Desk specification: [`docs/phase-5-program-workspace.md`](../phase-5-program-workspace.md).
