# Non-canonical Fridays wrap a play-by-play engine; Week 8 Match Day stays the teaching path

**Status:** Accepted
**Date:** 2026-08-21
**Supersedes:** nothing. Complements [ADR 0002](./0002-production-app-foundation-and-week-slice.md). Live games stay out of this path ([ADR 0003](./0003-program-workspace-live-data-controls.md)).

Canonical Week 8 Match Day remains `src/domain/matchDay.ts`: a hash of the take-the-field snapshot, tagged causes, and UI-3 copy, including the 20–3 path. Later weeks may call `@arc-sim/core` through `simulateNonCanonicalFriday`, which refuses week 8. The Match Day screen reads `deriveFridayView`: Week 8 stays on `deriveMatch`; after kickoff on a later week the view is a final from the engine, not the scripted queue. Week 9 (at Riverside) is a playable Coaching Week after Saturday’s review closes; it is persisted under a separate week key and carries its own film board (`src/domain/week9Scenario.ts`). The adapter’s seed is `execSeedFor`; the injury gate stays off so the engine cannot invent a diagnosis or Participation Restriction. The Program Workspace never calls this engine — its Fridays are real.
