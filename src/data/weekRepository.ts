/**
 * Persistence boundary for the Coaching Week.
 *
 * The app talks to this interface only. Two implementations exist:
 *   - `localWeekRepository` — deterministic in-memory, used whenever
 *     `VITE_CONVEX_URL` is unset. This is what makes the slice runnable with
 *     no backend.
 *   - a Convex-backed implementation, selected only when a deployment URL is
 *     explicitly configured.
 */

import type { WeekState } from '../domain/types.ts';
import { createConvexHttpWeekRepository } from './convexWeekRepository.ts';

export interface WeekKey {
  readonly careerId: string;
  readonly weekNumber: number;
}

export interface WeekRepository {
  /** Human-readable adapter name, surfaced in the UI so the mode is never hidden. */
  readonly name: string;
  /** Whether writes survive a reload. False for the local demo adapter. */
  readonly persists: boolean;
  load(key: WeekKey): Promise<WeekState | null>;
  save(key: WeekKey, state: WeekState): Promise<void>;
  clear(key: WeekKey): Promise<void>;
}

function keyOf(key: WeekKey): string {
  return `${key.careerId}:${key.weekNumber}`;
}

/**
 * Deterministic in-memory adapter. Holds state for the session so navigation
 * between screens is stable; a reload restarts the seeded week, matching the
 * prototype's documented behavior.
 */
export function createLocalWeekRepository(): WeekRepository {
  const store = new Map<string, WeekState>();

  return {
    name: 'Local demo adapter',
    persists: false,
    async load(key) {
      return store.get(keyOf(key)) ?? null;
    },
    async save(key, state) {
      store.set(keyOf(key), state);
    },
    async clear(key) {
      store.delete(keyOf(key));
    },
  };
}

/** Shared instance — one demo week per session. */
export const localWeekRepository = createLocalWeekRepository();

/**
 * The Convex deployment URL, or null when the app should run on the local
 * adapter. Reading it through a function keeps `import.meta.env` out of the
 * component tree and makes the fallback testable.
 */
export function convexUrl(): string | null {
  const url = import.meta.env.VITE_CONVEX_URL;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

/**
 * Select the repository for this environment. Convex remains opt-in so a clean
 * checkout is deterministic and fully usable without a backend.
 */
export function resolveWeekRepository(): WeekRepository {
  const url = convexUrl();
  return url === null
    ? localWeekRepository
    : createConvexHttpWeekRepository(url);
}
