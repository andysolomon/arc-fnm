import { describe, expect, it } from 'vitest';

import reviewSource from './decisionReview.ts?raw';
import {
  closeReview,
  deriveDecisionReview,
  rateReviewDecision,
  staffProcessFor,
  toggleReviewLesson,
} from './decisionReview.ts';
import {
  chooseMatchOption,
  deriveMatch,
  deriveTakeFieldContext,
  skipToDecision,
  takeField,
  type MatchLogDecision,
  type MatchView,
} from './matchDay.ts';
import { WEEK_8_SCENARIO } from './scenario.ts';
import type { PracticeBlock, WeekState } from './types.ts';
import { createSeedState, resetWeek } from './week.ts';
import { createInitialState, weekReducer } from '../state/weekStore.ts';

const scenario = WEEK_8_SCENARIO;

function block(
  id: string,
  objectiveId: string,
  day: PracticeBlock['day'],
  live = false,
): PracticeBlock {
  return { id, objectiveId, day, live };
}

function fridayState(path: 'A' | 'B', withRisk = true): WeekState {
  const isA = path === 'A';
  return {
    ...createSeedState(),
    stage: 'friday',
    selectedHypotheses: isA ? ['h1', 'h2', 'h3'] : ['h3', 'h4', 'h2'],
    acceptedRisk: withRisk ? (isA ? 'h4' : 'h1') : null,
    answers: isA
      ? { h1: 'a11', h2: 'a21', h3: 'a31' }
      : { h3: 'a31', h4: 'a41', h2: 'a21' },
    practiceBlocks: isA
      ? [
          block('a1', 'o1', 'MON'),
          block('a2', 'o2', 'MON'),
          block('a3', 'o1', 'TUE', true),
          block('a4', 'o1', 'TUE', true),
          block('a5', 'o6', 'TUE'),
          block('a6', 'o3', 'WED'),
          block('a7', 'o2', 'WED'),
          block('a8', 'o3', 'THU'),
        ]
      : [
          block('b1', 'o3', 'MON'),
          block('b2', 'o4', 'MON'),
          block('b3', 'o3', 'TUE'),
          block('b4', 'o4', 'TUE'),
          block('b5', 'o2', 'TUE'),
          block('b6', 'o3', 'WED'),
          block('b7', 'o4', 'WED'),
          block('b8', 'o6', 'THU'),
        ],
    practicePlanLocked: true,
    rtStarter: isA ? 'webb' : 'slide',
    rtFix: isA ? 'promote' : 'simplify',
    disruptionConfirmed: true,
  };
}

function playToFinal(initial: WeekState): {
  readonly state: WeekState;
  readonly view: MatchView;
} {
  let state = takeField(initial);
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, scenario);
    const view = deriveMatch(state, scenario);
    if (view.phase === 'final') return { state, view };
    state = chooseMatchOption(state, scenario, view.pending!.id, 0);
  }
  throw new Error('review fixture did not reach the final horn');
}

describe('Decision Review derivation', () => {
  it('guards an empty pregame review', () => {
    const review = deriveDecisionReview(createSeedState(), scenario);
    expect(review.empty).toBe(true);
    expect(review.rows).toEqual([]);
    expect(review.canClose).toBe(false);
  });

  it.each(['A', 'B'] as const)(
    'carries Scenario %s from final into the canonical six-row review',
    (path) => {
      const { state, view } = playToFinal(fridayState(path));
      const review = deriveDecisionReview(state, scenario);
      expect(state.stage).toBe('review');
      expect(review.empty).toBe(false);
      expect(review.rows).toHaveLength(6);
      expect(review.rows.map((row) => row.decisionId)).toEqual([
        's_power',
        's_fourth',
        's_clock',
        's_flood',
        's_pat',
        path === 'A' || view.wScore > view.cScore
          ? 's_close_def'
          : 's_close_off',
      ]);
      expect(review.score).toBe(
        `Westfield ${view.wScore} — ${view.cScore} Central Catholic`,
      );
    },
  );

  it('keeps evidence, choice, preparation, execution, result, and process distinct', () => {
    const { state } = playToFinal(fridayState('A'));
    const review = deriveDecisionReview(state, scenario);
    const power = review.rows[0]!;
    expect(power.evidence).toMatch(/41 early-down snaps across 3 games/);
    expect(power.evidenceHypothesisId).toBe('h1');
    expect(power.evidenceCta).toBe('Open tagged evidence');
    expect(power.choice).toMatch(/Trust the plan/);
    expect(power.preparation).toEqual([
      expect.objectContaining({
        objectiveId: 'o1',
        readiness: 'Rehearsed',
        allocation: '3 blocks (MON off-air, TUE, TUE)',
      }),
    ]);
    expect(power.execution).toMatch(/Practiced — puller fits/);
    expect(power.result).toBe('No points changed hands on the sequence.');
    expect(power.staffProcess.rating).toBe('Sound');

    const changedPoints: MatchLogDecision = {
      ...deriveMatch(state, scenario).log.find(
        (entry): entry is MatchLogDecision =>
          entry.kind === 'decision' && entry.id === 's_power',
      )!,
      pts: { w: 0, c: 99 },
    };
    expect(
      staffProcessFor(changedPoints, deriveTakeFieldContext(state, scenario)),
    ).toEqual(power.staffProcess);
  });

  it('derives canonical staff outcomes and keeps the coach rating separate', () => {
    const { state } = playToFinal(fridayState('A'));
    const baseline = deriveDecisionReview(state, scenario);
    expect(baseline.rows.map((row) => row.staffProcess.rating)).toEqual([
      'Sound',
      'Sound',
      'Debatable',
      'Sound',
      'Sound',
      'Sound',
    ]);
    const rated = rateReviewDecision(
      state,
      scenario,
      's_clock',
      'Poor process',
    );
    const clock = deriveDecisionReview(rated, scenario).rows[2]!;
    expect(clock.staffProcess.rating).toBe('Debatable');
    expect(clock.coachRating).toBe('Poor process');
    expect(clock.ratingAgreement).toBe(
      'You and the staff split on this one — worth two minutes in Monday’s staff meeting.',
    );
  });

  it('accounts for an accepted risk and supports the canonical no-risk state', () => {
    const withRisk = deriveDecisionReview(
      playToFinal(fridayState('A')).state,
      scenario,
    );
    expect(withRisk.risk.hasRisk).toBe(true);
    expect(withRisk.risk.name).toBe('Return-game threat');
    expect(withRisk.risk.events.length).toBeGreaterThan(0);
    expect(withRisk.lessonCandidates[0]?.id).toBe('l_risk');

    const noRisk = deriveDecisionReview(
      playToFinal(fridayState('A', false)).state,
      scenario,
    );
    expect(noRisk.risk).toMatchObject({ hasRisk: false, name: '' });
    expect(
      noRisk.lessonCandidates.some((lesson) => lesson.id === 'l_risk'),
    ).toBe(false);
  });

  it('generates candidates, hard-caps three lessons, and emits the swap message', () => {
    const { state } = playToFinal(fridayState('A'));
    const candidates = deriveDecisionReview(state, scenario).lessonCandidates;
    expect(candidates.length).toBeGreaterThanOrEqual(4);
    let selected = state;
    for (const candidate of candidates.slice(0, 3)) {
      selected = toggleReviewLesson(selected, scenario, candidate.id);
    }
    const blocked = toggleReviewLesson(selected, scenario, candidates[3]!.id);
    expect(blocked.lessons).toHaveLength(3);
    expect(blocked.reviewLessonMessage).toBe(true);
    expect(deriveDecisionReview(blocked, scenario).lessonMessage).toBe(true);

    const swappedOut = toggleReviewLesson(blocked, scenario, candidates[0]!.id);
    const swappedIn = toggleReviewLesson(
      swappedOut,
      scenario,
      candidates[3]!.id,
    );
    expect(swappedIn.lessons).toHaveLength(3);
    expect(swappedIn.lessons).toContain(candidates[3]!.id);
    expect(swappedIn.reviewLessonMessage).toBe(false);
  });

  it('requires one lesson to close and preserves the final match through closure', () => {
    const { state, view } = playToFinal(fridayState('B'));
    expect(closeReview(state, scenario)).toBe(state);
    const candidate = deriveDecisionReview(state, scenario)
      .lessonCandidates[0]!;
    const withLesson = toggleReviewLesson(state, scenario, candidate.id);
    const closed = closeReview(withLesson, scenario);
    expect(closed.reviewClosed).toBe(true);
    expect(closed.stage).toBe('review');
    expect(deriveMatch(closed, scenario)).toEqual(view);
    expect(closed.matchEvents).toEqual(state.matchEvents);
  });

  it('restores the exact Week landing seed after a closed review reset', () => {
    const { state } = playToFinal(fridayState('A'));
    const candidate = deriveDecisionReview(state, scenario)
      .lessonCandidates[0]!;
    const closed = closeReview(
      toggleReviewLesson(state, scenario, candidate.id),
      scenario,
    );
    expect(closed.reviewClosed).toBe(true);
    expect(resetWeek()).toEqual(createSeedState());
    expect(resetWeek()).toMatchObject({
      stage: 'evidence',
      matchStarted: false,
      matchEvents: [],
      reviewRatings: {},
      lessons: [],
      reviewClosed: false,
    });
    const reset = weekReducer(
      {
        ...createInitialState(),
        week: closed,
        nav: { ...createInitialState().nav, screen: 'review' },
      },
      { type: 'reset-week' },
      scenario,
    );
    expect(reset.week).toEqual(createSeedState());
    expect(reset.nav).toEqual({
      screen: 'week',
      scoutingTab: 'Overview',
      tacticsTab: 'Game Plan',
      scoutingHypothesis: null,
    });
  });

  it('contains no entropy, unsafe sinks, or inline SVG interpolation', () => {
    expect(reviewSource).not.toMatch(
      /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=|<svg/i,
    );
  });
});
