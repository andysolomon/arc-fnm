/**
 * Persistence boundary for the Coaching Week.
 *
 * The app talks to this interface only. Two implementations exist:
 *   - `localWeekRepository` — deterministic in-memory, used whenever
 *     `VITE_CONVEX_URL` is unset. This is what makes the slice runnable with
 *     no backend.
 *   - a Convex-backed implementation, selected only when a deployment URL is
 *     explicitly configured *and* passes `checkConvexUrl`. A rejected URL falls
 *     back to the local adapter and reports the reason instead of failing.
 */

import type { WeekState } from '../domain/types.ts';
import { createConvexHttpWeekRepository } from './convexWeekRepository.ts';

export interface WeekKey {
  readonly careerId: string;
  readonly weekNumber: number;
}

export type WeekRepositoryMode = 'local' | 'convex';

/**
 * What the footer tells the coach about where decisions go. Adapters may carry
 * this directly; `repositoryStatus` derives a safe default for those that do not
 * (test doubles, for example), so the surface is never blank.
 */
export interface WeekRepositoryStatus {
  readonly mode: WeekRepositoryMode;
  /** Short footer label. */
  readonly label: string;
  /** Full sentence, shown on hover. */
  readonly detail: string;
  /** Set only when `VITE_CONVEX_URL` was present but rejected. */
  readonly configError: string | null;
}

export interface WeekRepository {
  /** Human-readable adapter name, surfaced in the UI so the mode is never hidden. */
  readonly name: string;
  /** Whether writes survive a reload. False for the local demo adapter. */
  readonly persists: boolean;
  /** Optional so existing adapters and test doubles stay structurally valid. */
  readonly status?: WeekRepositoryStatus;
  load(key: WeekKey): Promise<WeekState | null>;
  save(key: WeekKey, state: WeekState): Promise<void>;
  clear(key: WeekKey): Promise<void>;
}

export const LOCAL_STATUS: WeekRepositoryStatus = {
  mode: 'local',
  label: 'Session only',
  detail:
    'Local demo adapter — decisions last for this session and reset on reload. Set VITE_CONVEX_URL to persist them.',
  configError: null,
};

export const CONVEX_STATUS: WeekRepositoryStatus = {
  mode: 'convex',
  label: 'Convex',
  detail: 'Convex persistence — decisions survive a reload.',
  configError: null,
};

/** Local adapter status after a rejected `VITE_CONVEX_URL`, carrying the reason. */
export function misconfiguredStatus(reason: string): WeekRepositoryStatus {
  return {
    mode: 'local',
    label: 'Session only (config error)',
    detail: `${reason} Falling back to the local demo adapter, so decisions reset on reload.`,
    configError: reason,
  };
}

/** The status to display for any adapter, including doubles without one. */
export function repositoryStatus(
  repository: WeekRepository,
): WeekRepositoryStatus {
  if (repository.status !== undefined) return repository.status;
  return repository.persists
    ? {
        ...CONVEX_STATUS,
        detail: `${repository.name} — writes survive a reload.`,
      }
    : {
        ...LOCAL_STATUS,
        detail: `${repository.name} — writes last for this session.`,
      };
}

function keyOf(key: WeekKey): string {
  return `${key.careerId}:${key.weekNumber}`;
}

/**
 * Deterministic in-memory adapter. Holds state for the session so navigation
 * between screens is stable; a reload restarts the seeded week, matching the
 * prototype's documented behavior.
 */
export function createLocalWeekRepository(
  status: WeekRepositoryStatus = LOCAL_STATUS,
): WeekRepository {
  const store = new Map<string, WeekState>();

  return {
    name: 'Local demo adapter',
    persists: false,
    status,
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
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

export type ConvexUrlCheck =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly reason: string };

const EXPECTED_FORM = 'Expected https://<deployment>.convex.cloud.';
const LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  '::1',
]);

/**
 * Validate a configured deployment URL before any client is constructed.
 *
 * Rejecting here rather than inside the Convex client keeps the failure legible:
 * a typo becomes a stated reason in the footer instead of a thrown constructor
 * or a browser request that silently never lands. Local backends are rejected on
 * purpose — this slice ships either real Convex persistence or the deterministic
 * local adapter, with nothing in between.
 */
export function checkConvexUrl(raw: string): ConvexUrlCheck {
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, reason: `VITE_CONVEX_URL is empty. ${EXPECTED_FORM}` };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      reason: `VITE_CONVEX_URL is not a valid URL: "${value}". ${EXPECTED_FORM}`,
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: `VITE_CONVEX_URL must use https://, got "${parsed.protocol}//". ${EXPECTED_FORM}`,
    };
  }
  if (LOCAL_HOSTS.has(parsed.hostname)) {
    return {
      ok: false,
      reason: `VITE_CONVEX_URL must point at a deployed Convex backend; "${parsed.hostname}" is a local address. ${EXPECTED_FORM}`,
    };
  }
  if (!parsed.hostname.endsWith('.convex.cloud')) {
    return {
      ok: false,
      reason: `VITE_CONVEX_URL host "${parsed.hostname}" is not a Convex deployment. ${EXPECTED_FORM}`,
    };
  }
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    return {
      ok: false,
      reason: `VITE_CONVEX_URL must be a bare deployment origin, with no path or query: "${value}". ${EXPECTED_FORM}`,
    };
  }

  return { ok: true, url: parsed.origin };
}

/**
 * One local adapter per distinct configuration error, so a misconfigured
 * environment still keeps its session state across re-resolves.
 */
const misconfiguredRepositories = new Map<string, WeekRepository>();

/**
 * Select the repository for this environment. Convex remains opt-in so a clean
 * checkout is deterministic and fully usable without a backend, and an invalid
 * URL degrades to the same local adapter rather than breaking the app.
 */
export function resolveWeekRepository(): WeekRepository {
  const url = convexUrl();
  if (url === null) return localWeekRepository;

  const check = checkConvexUrl(url);
  if (!check.ok) {
    const existing = misconfiguredRepositories.get(check.reason);
    if (existing !== undefined) return existing;
    const repository = createLocalWeekRepository(
      misconfiguredStatus(check.reason),
    );
    misconfiguredRepositories.set(check.reason, repository);
    return repository;
  }

  return createConvexHttpWeekRepository(check.url);
}
