import { describe, expect, it } from 'vitest';

import matchDaySource from './matchDay.ts?raw';
import {
  CANONICAL_TEACHING_WEEK,
  CanonicalWeekMatchDayError,
  deriveFridayView,
  simulateNonCanonicalFriday,
  usesPlayByPlayFriday,
} from './playByPlayFriday.ts';
import { WEEK_8_SCENARIO, WEEK_9_SCENARIO } from './scenario.ts';
import type { WeekState } from './types.ts';
import { deriveDecisionReview } from './decisionReview.ts';
import { takeField, deriveMatch } from './matchDay.ts';
import {
  acceptRisk,
  allocatePracticeBlock,
  chooseAnswer,
  confirmDisruption,
  createSeedState,
  lockPracticePlan,
  selectRtFix,
  selectRtStarter,
  togglePriority,
} from './week.ts';

const week8 = WEEK_8_SCENARIO;
const week9 = WEEK_9_SCENARIO;

function webbPromoteConfirmed(): WeekState {
  let state = ['h1', 'h2', 'h3'].reduce(
    (current, id) => togglePriority(current, week8, id),
    createSeedState(),
  );
  state = acceptRisk(state, week8, 'h4');
  state = chooseAnswer(state, week8, 'h1', 'a11');
  state = chooseAnswer(state, week8, 'h2', 'a21');
  state = chooseAnswer(state, week8, 'h3', 'a31');
  state = (
    [
      ['o2', 'MON'],
      ['o3', 'MON'],
      ['o1', 'TUE'],
      ['o5', 'TUE'],
      ['o6', 'TUE'],
      ['o2', 'WED'],
      ['o3', 'WED'],
      ['o6', 'THU'],
    ] as const
  ).reduce(
    (current, [objectiveId, day]) =>
      allocatePracticeBlock(current, week8, objectiveId, day),
    state,
  );
  state = lockPracticePlan(state, week8);
  state = selectRtFix(selectRtStarter(state, week8, 'webb'), 'promote');
  return confirmDisruption(state, week8);
}

describe('usesPlayByPlayFriday', () => {
  it('is off for the canonical teaching week and on for later weeks', () => {
    expect(CANONICAL_TEACHING_WEEK).toBe(8);
    expect(usesPlayByPlayFriday(week8)).toBe(false);
    expect(usesPlayByPlayFriday(week9)).toBe(true);
  });
});

describe('simulateNonCanonicalFriday', () => {
  it('refuses Week 8 so Match Day stays the teaching path', () => {
    expect(() => simulateNonCanonicalFriday(webbPromoteConfirmed(), week8)).toThrow(
      CanonicalWeekMatchDayError,
    );
  });

  it('runs a seeded game for a later week without taking the field', () => {
    const state = webbPromoteConfirmed();
    expect(state.matchStarted).toBe(false);
    const result = simulateNonCanonicalFriday(state, week9);
    expect(result.weekNumber).toBe(9);
    expect(result.homeTeamId).toBe('westfield');
    expect(result.awayTeamId).toBe('riverside');
    expect(result.playCount).toBeGreaterThan(0);
    expect(result.driveCount).toBeGreaterThan(0);
    expect(result.injuriesModelled).toBe(false);
    expect(state.matchStarted).toBe(false);
    expect(state.matchEvents).toEqual([]);
  });

  it('replays byte-identically from the same snapshot', () => {
    const state = webbPromoteConfirmed();
    const first = simulateNonCanonicalFriday(state, week9);
    const second = simulateNonCanonicalFriday(state, week9);
    expect(second).toEqual(first);
  });
});

describe('deriveFridayView', () => {
  it('keeps Week 8 on Match Day before and after kickoff', () => {
    const friday = webbPromoteConfirmed();
    expect(deriveFridayView(friday, week8)).toEqual(
      deriveMatch(friday, week8),
    );
    const live = takeField(friday);
    expect(deriveFridayView(live, week8)).toEqual(deriveMatch(live, week8));
    expect(deriveFridayView(live, week8).phase).toBe('live');
  });

  it('finalizes a later week from the play-by-play engine after kickoff', () => {
    const friday = webbPromoteConfirmed();
    expect(deriveFridayView(friday, week9).phase).toBe('pregame');
    const live = takeField(friday);
    const view = deriveFridayView(live, week9);
    const result = simulateNonCanonicalFriday(live, week9);
    expect(view.phase).toBe('final');
    expect(view.pending).toBeNull();
    expect(view.decisionCount).toBe(0);
    expect([view.wScore, view.cScore]).toEqual([
      result.homeScore,
      result.awayScore,
    ]);
    expect(view.dd).toMatch(/drives/);
    expect(view.plays[0]?.t).toMatch(/Injuries off/);
    expect(live.matchEvents).toEqual([]);
    const review = deriveDecisionReview(live, week9);
    expect(review.empty).toBe(false);
    expect(review.score).toBe(
      `Westfield ${result.homeScore} — ${result.awayScore} Riverside`,
    );
    expect(review.rows).toEqual([]);
  });
});

describe('boundary with Week 8 Match Day', () => {
  it('is not imported by matchDay.ts', () => {
    expect(matchDaySource).not.toMatch(/playByPlayFriday|arcSimAdapter/);
  });
});
