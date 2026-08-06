/**
 * Cohort carry-over — saved Decision Review lessons that ride to next week.
 *
 * Phase 4.3 foundation: within the current week this is pure derived
 * accumulation on `state.lessons`. Multi-season player succession stays out of
 * scope; the only cohort that carries today is the lesson set the coach pinned
 * on Saturday. Pure: state in, view out. No clock, no entropy, no I/O.
 */

import type { WeekState } from './types.ts';

/** Hard cap Decision Review already enforces; echoed here for callers. */
export const COHORT_LESSON_CAP = 3;

/** Empty cohort — nothing is pinned to travel. */
export const NO_COHORT_CARRY_OVER_NOTE = '';

export interface CohortCarryOver {
  /** Lesson IDs on file, in save order. Cap is enforced by Decision Review. */
  readonly lessonIds: readonly string[];
  readonly count: number;
  readonly cap: number;
  /**
   * Canonical travel note for `data-cohort-note`. Matches Schedule / UI-3 copy
   * when non-empty; empty string when nothing is pinned.
   */
  readonly note: string;
}

/**
 * Canonical Schedule / UI-3 travel copy for a pinned lesson cohort.
 * Authored here so screens never re-write the count phrase.
 */
export function cohortCarryOverNote(count: number): string {
  if (count <= 0) return NO_COHORT_CARRY_OVER_NOTE;
  // Canonical Schedule / UI-3 wording keeps the verb "ride" for every count.
  return `${count} saved lesson${count === 1 ? '' : 's'} ride to the Week 9 opponent board.`;
}

/**
 * Derive the lesson cohort that carries to Riverside. Pure: lessons in, note
 * out — no reads of clocks, entropy, or anything the coach did not save.
 */
export function deriveCohortCarryOver(state: WeekState): CohortCarryOver {
  const lessonIds = state.lessons;
  const count = lessonIds.length;
  return {
    lessonIds,
    count,
    cap: COHORT_LESSON_CAP,
    note: cohortCarryOverNote(count),
  };
}
