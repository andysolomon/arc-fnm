/**
 * The week after the canonical teaching week. Week 8 Match Day stays put;
 * this module only seeds the following Coaching Week and records its Friday.
 */

import { COHORT_LESSON_CAP } from './cohortCarryOver.ts';
import { CANONICAL_TEACHING_WEEK } from './playByPlayFriday.ts';
import { WEEK_9_SCENARIO } from './scenario.ts';
import type { Program, WeekScenario, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

export const FOLLOWING_WEEK_NUMBER = 9;

export interface Week8FinalSnapshot {
  readonly wScore: number;
  readonly cScore: number;
  readonly lessons: readonly string[];
}

/** Open the Riverside week only after Saturday’s review is on file. */
export function canOpenFollowingWeek(
  weekNumber: number,
  state: WeekState,
): boolean {
  return weekNumber === CANONICAL_TEACHING_WEEK && state.reviewClosed;
}

export function seedFollowingWeek(
  lessons: readonly string[] = [],
): WeekState {
  return {
    ...createSeedState(),
    lessons: lessons.slice(0, COHORT_LESSON_CAP),
  };
}

export function week9ProgramFromWeek8(
  won: boolean,
): Pick<Program, 'record' | 'rank'> {
  return won
    ? { record: '7–1', rank: '#1' }
    : { record: '6–2', rank: '#2' };
}

export function openFollowingWeekFrom(
  state: WeekState,
  scores: { readonly wScore: number; readonly cScore: number },
): {
  readonly type: 'open-week';
  readonly weekNumber: number;
  readonly week: WeekState;
  readonly week8Final: Week8FinalSnapshot;
} {
  return {
    type: 'open-week',
    weekNumber: FOLLOWING_WEEK_NUMBER,
    week: seedFollowingWeek(state.lessons),
    week8Final: {
      wScore: scores.wScore,
      cScore: scores.cScore,
      lessons: [...state.lessons],
    },
  };
}

export function followingWeekScenario(
  week8Final: Week8FinalSnapshot | null,
): WeekScenario {
  if (week8Final === null) return WEEK_9_SCENARIO;
  const won = week8Final.wScore > week8Final.cScore;
  return {
    ...WEEK_9_SCENARIO,
    program: {
      ...WEEK_9_SCENARIO.program,
      ...week9ProgramFromWeek8(won),
    },
  };
}
