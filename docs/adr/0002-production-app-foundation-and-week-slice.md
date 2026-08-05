# ADR 0002 — Production app foundation and the first coaching-week slice

- **Status:** Accepted
- **Date:** 2026-08-05
- **Supersedes:** nothing. Complements [ADR 0001](./0001-simulation-first-shared-decision-model.md).

## Context

The accepted UI-3 prototype (`prototypes/Friday Night Manager UI-3/`) establishes
the product's language, information architecture, and decision rules for a
Coaching Week. It is a single generated `.dc.html` file with a generated
`support.js` runtime: excellent as a specification, unusable as a codebase.

We needed a production foundation that keeps the prototype canonical for
behavior while giving the domain rules a form that can be typed, tested, and
extended — without a backend being a prerequisite for running the app.

## Decision

**Stack.** Vite + React + TypeScript, Tailwind CSS v4 via `@tailwindcss/vite`,
Convex for persistence, Vitest + Testing Library for tests. Dependencies are
npm-managed with a committed `package-lock.json`.

**The domain is pure and separate.** `src/domain/` holds the week contract with
no React, no I/O, no clock reads, and no randomness. `week.ts` exports the seed,
the gate derivation, the board actions, and stage progression as plain
functions over `(state, scenario)`. The screens are a rendering of those
functions; they hold no rules of their own.

**Derived state is computed, never persisted.** `WeekState` stores only
decisions — stage, the priority board, the accepted risk, and dispositions.
Gates, badges, counts, board labels, and the next step are all recomputed. This
is inherited directly from the prototype, where readiness is always derived via
`blockCalc()` and nav badges are never stored.

**The app runs with no backend.** `src/data/weekRepository.ts` defines the
persistence boundary. When `VITE_CONVEX_URL` is unset — the default — the app
resolves a deterministic in-memory adapter and states that mode in the UI. When
the URL is configured, `src/data/convexWeekRepository.ts` uses typed
`ConvexHttpClient` references for the week query/save/reset mutations. A live
Convex deployment and authenticated ownership boundary remain explicit
follow-up work; the local adapter never pretends to persist.

**Convex functions typecheck before codegen.** `convex/week.ts` uses
`queryGeneric`/`mutationGeneric` bound to `DataModelFromSchemaDefinition<typeof
schema>` rather than `./_generated/server`, so a clean checkout typechecks
without anyone having run `npx convex dev`. After a deployment exists, swapping
in the generated builders is a two-line change with identical signatures.

## Consequences

- The evidence gate — exactly 3 of 4 hypotheses prioritized, the remaining one
  explicitly accepted as risk — is enforced in one place and covered by tests
  for the valid case, under-selection, duplicates, over-selection, a risk that
  collides with a priority, an unknown risk, and dismissal side effects.
- `Reset Week` is `createSeedState()`. It cannot drift, because the seed is
  constructed fresh on every call rather than shared.
- Stage progression is gated through the implemented evidence, Game Plan, and
  Practice slices. Practice locks only after its valid eight-block plan; later
  stages stay closed until their own gates exist, so the week cannot skip ahead
  of work that has not been built.
- Convex tables and an optional HTTP repository now exist. With no URL,
  reloading restarts the seeded week, matching the prototype's documented
  behavior; with a configured URL, the current decision state is persisted by
  the typed adapter. Authentication and ownership checks are still required
  before multi-user production use.

## What this slice does not do

The Thursday disruption, Guidance/Trainer authority flow, Match Day, and
Decision Review are specified in the prototype but not implemented here.
Neither is authentication, real film ingestion, eligibility/medical data
integration, or any multi-week season model. The prototype README's
"Simulated vs. designed" section remains the accurate list of production
unknowns.
