# Friday Night Manager

Fictional Simulation Experience. Session-only by default. Not a school tool.

**Playable preview:** https://arc-fnm.vercel.app

This is not a validated product, a UIL-compliance tool, or a school system of
record. Program Workspace is not in this build.

## Run locally

```bash
npm ci
npm run dev
```

The app is fully playable with no backend. Optional `VITE_CONVEX_URL` persists
Coaching Decisions only, with no identity. Leave it unset for the session-only
default. Copy `.env.example` to `.env.local` if you need the Convex path.

Week 9 Friday uses `@arc-sim/core` from a sibling `../arc-sim` checkout. On
Vercel, `scripts/ensure-arc-sim.mjs` clones a pinned revision into `vendor/`.

## Verify

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

GitHub Actions runs unit tests, typecheck, and the production build against a
pinned `arc-sim` checkout, then Chromium Playwright journeys for new career,
resume, and keyboard-only navigation (`.github/workflows/ci.yml`).

Install the Chromium browser once with `npx playwright install chromium`.

## Owners

Andrew Solomon is the named owner for product, Simulation Experience support,
Texas UIL rule-set updates, and incidents/rollback. File issues at
https://github.com/andysolomon/arc-fnm/issues. Rollback is `vercel rollback` on
project `arc-fnm`. There is no 24/7 on-call. Program Workspace has no owner
until School Approval exists.

## What this ships

Week 8 vs Central Catholic is the canonical teaching path (scripted 20–3 Match
Day). After Close Saturday, Week 9 at Riverside is playable with unique film
and a derived Friday. `Reset week` confirms first when lessons are saved.
