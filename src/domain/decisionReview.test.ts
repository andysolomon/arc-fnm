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
  execSeedFor,
  skipToDecision,
  takeField,
  unavailablePlayersOf,
  type MatchLogDecision,
  type MatchView,
} from './matchDay.ts';
import { WEEK_8_SCENARIO } from './scenario.ts';
import type {
  PracticeBlock,
  PrioritySituationId,
  WeekScenario,
  WeekState,
} from './types.ts';
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

function playToFinal(
  initial: WeekState,
  against: WeekScenario = scenario,
): {
  readonly state: WeekState;
  readonly view: MatchView;
} {
  let state = takeField(initial);
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, against);
    const view = deriveMatch(state, against);
    if (view.phase === 'final') return { state, view };
    state = chooseMatchOption(state, against, view.pending!.id, 0);
  }
  throw new Error('review fixture did not reach the final horn');
}

/** Point one objective at a situational period. Canonical Week 8 points at none. */
function situationScenario(
  objectiveId: string,
  situation: PrioritySituationId,
): WeekScenario {
  return {
    ...scenario,
    objectives: scenario.objectives.map((objective) =>
      objective.id === objectiveId
        ? { ...objective, prioritySituation: situation }
        : objective,
    ),
  };
}

/** Take Mendes — fourth on the depth chart, no practice assignment — off Friday. */
function mendesOutScenario(): WeekScenario {
  return {
    ...scenario,
    rosterPlanning: {
      ...scenario.rosterPlanning,
      availability: scenario.rosterPlanning.availability.map((entry) =>
        entry.playerId === 'player-mendes'
          ? { ...entry, participation: 'ineligible' as const, label: 'Out' }
          : entry,
      ),
    },
  };
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

  it('reflects an additionally unavailable player in a row, not in the canonical one', () => {
    const mendesOut = mendesOutScenario();
    const baseline = deriveDecisionReview(
      playToFinal(fridayState('A')).state,
      scenario,
    );
    const short = deriveDecisionReview(
      playToFinal(fridayState('A'), mendesOut).state,
      mendesOut,
    );

    expect(baseline.score).toBe('Westfield 20 — 3 Central Catholic');
    expect(short.score).toBe('Westfield 20 — 6 Central Catholic');
    expect(short.rows.map((row) => row.decisionId)).toEqual(
      baseline.rows.map((row) => row.decisionId),
    );

    const basePower = baseline.rows[0]!;
    const shortPower = short.rows[0]!;
    expect(basePower.execution).toBe('Practiced — puller fits · Rehearsed');
    expect(shortPower.execution).toBe(
      'Rehearsed — but execution missed the scrape fit',
    );
    // Mendes took no reps off anyone, so preparation is unmoved — the missing
    // body shows up in execution, which is the honest place for it.
    expect(shortPower.preparation).toEqual(basePower.preparation);
    expect(
      deriveDecisionReview(playToFinal(fridayState('A')).state, scenario).score,
    ).toBe('Westfield 20 — 3 Central Catholic');
  });

  it('reflects a prepared priority situation in a row, not in the canonical one', () => {
    const fourMinute = situationScenario('o6', 'four-minute');
    const baseline = deriveDecisionReview(
      playToFinal(fridayState('A')).state,
      scenario,
    );
    const situational = deriveDecisionReview(
      playToFinal(fridayState('A'), fourMinute).state,
      fourMinute,
    );

    expect(deriveTakeFieldContext(fridayState('A'), fourMinute).sits).toEqual([
      'four-minute',
    ]);
    expect(situational.score).toBe('Westfield 20 — 6 Central Catholic');
    expect(situational.rows.map((row) => row.execution)).not.toEqual(
      baseline.rows.map((row) => row.execution),
    );
    expect(situational.rows[3]?.decisionId).toBe('s_flood');
    expect(situational.rows[3]?.execution).toBe(
      'Rehearsed — right call, missed throw',
    );
    expect(baseline.score).toBe('Westfield 20 — 3 Central Catholic');
    expect(baseline.rows[0]?.execution).toBe(
      'Practiced — puller fits · Rehearsed',
    );
  });

  it('contains no entropy, unsafe sinks, or inline SVG interpolation', () => {
    expect(reviewSource).not.toMatch(
      /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=|<svg/i,
    );
  });
});

/**
 * Phase 2.6, stated verbatim by the Phase 2 acceptance criteria:
 *
 *   "User-focused tests prove that changing a hypothesis or roster constraint
 *    changes the planned reps and available Friday choices."
 *
 * The Decision Review end of that claim: a roster constraint the week never
 * planned around has to survive all the way to Monday's rows, while seeded
 * Week 8 stays the golden baseline it was before the constraint existed.
 */
describe('Phase 2.6 — a roster constraint changes the Decision Review', () => {
  it('carries an unavailable Mendes into execution and result, not into the plan', () => {
    const mendesOut = mendesOutScenario();
    const canonical = deriveDecisionReview(
      playToFinal(fridayState('A')).state,
      scenario,
    );
    const short = deriveDecisionReview(
      playToFinal(fridayState('A'), mendesOut).state,
      mendesOut,
    );

    // The constraint reaches Friday through the snapshot, not through copy.
    expect(
      unavailablePlayersOf(deriveTakeFieldContext(fridayState('A'), scenario)),
    ).toEqual([]);
    expect(
      unavailablePlayersOf(deriveTakeFieldContext(fridayState('A'), mendesOut)),
    ).toEqual(['player-mendes']);

    // Same six decisions and the same planned reps behind them — Mendes took
    // no reps off anyone — but a different Friday and a different scoreboard.
    expect(short.rows.map((row) => row.decisionId)).toEqual(
      canonical.rows.map((row) => row.decisionId),
    );
    expect(short.rows.map((row) => row.preparation)).toEqual(
      canonical.rows.map((row) => row.preparation),
    );
    expect(short.rows.map((row) => row.execution)).not.toEqual(
      canonical.rows.map((row) => row.execution),
    );
    expect(short.score).not.toBe(canonical.score);

    expect(canonical.score).toBe('Westfield 20 — 3 Central Catholic');
    expect(short.score).toBe('Westfield 20 — 6 Central Catholic');
  });
});

/**
 * Phase 3.4 — the late-game priority periods the canonical week never prepares.
 *
 * Seeded Week 8 declares no priority situation, and the existing coverage only
 * names four-minute. End-of-half, two-minute, and overtime each hash into a
 * different execution seed, so each one has to be shown landing in Monday's
 * rows — including the honest case where a different seed lands the same six
 * rows. Every test re-asserts the canonical 20–3 review alongside its variant.
 */
describe('Phase 3.4 — prepared late-game periods reach the Decision Review', () => {
  const canonicalReview = () =>
    deriveDecisionReview(playToFinal(fridayState('A')).state, scenario);

  it.each([
    ['end-of-half', 595_169_807],
    ['overtime', 3_096_729_405],
  ] as const)(
    'turns a prepared %s period into a different flood row and a 24–3 review',
    (situation, seed) => {
      const situational = situationScenario('o6', situation);
      const baseline = canonicalReview();
      const review = deriveDecisionReview(
        playToFinal(fridayState('A'), situational).state,
        situational,
      );

      expect(
        deriveTakeFieldContext(fridayState('A'), situational).sits,
      ).toEqual([situation]);
      expect(
        execSeedFor(deriveTakeFieldContext(fridayState('A'), situational)),
      ).toBe(seed);

      // Same six decisions, three different rows: the flood cashes instead of
      // sailing, and both later titles carry the wider scoreboard with them.
      expect(review.rows.map((row) => row.decisionId)).toEqual(
        baseline.rows.map((row) => row.decisionId),
      );
      expect(review.score).toBe('Westfield 24 — 3 Central Catholic');
      expect(review.rows[3]?.decisionId).toBe('s_flood');
      expect(review.rows[3]?.execution).toBe(
        'Practiced — trips flood · Repped. The window from film, hit in a game.',
      );
      expect(review.rows[3]?.result).toBe(
        'Westfield +7 · Central +3 across the sequence',
      );
      expect(review.rows[3]?.resultTone).toBe('good');
      expect(review.rows[4]?.title).toBe('Up 20 — take the point or press it?');
      expect(review.rows[5]?.title).toBe(
        'Their last drive — protect a 21-point lead',
      );
      // Preparation is unmoved — the period changed execution, not the plan.
      expect(review.rows.map((row) => row.preparation)).toEqual(
        baseline.rows.map((row) => row.preparation),
      );

      expect(baseline.score).toBe('Westfield 20 — 3 Central Catholic');
      expect(baseline.rows[3]?.execution).toBe(
        'Rehearsed — right call, missed throw',
      );
      expect(baseline.rows[4]?.title).toBe(
        'Up 16 — take the point or press it?',
      );
    },
  );

  it('lands end-of-half and overtime on the same rows from two different seeds', () => {
    const endOfHalf = situationScenario('o6', 'end-of-half');
    const overtime = situationScenario('o6', 'overtime');
    const endOfHalfRun = playToFinal(fridayState('A'), endOfHalf);
    const overtimeRun = playToFinal(fridayState('A'), overtime);

    expect(
      execSeedFor(deriveTakeFieldContext(fridayState('A'), endOfHalf)),
    ).not.toBe(execSeedFor(deriveTakeFieldContext(fridayState('A'), overtime)));
    // Two seeds, two feeds — a Q2 sprint-out contain resolves differently —
    // and still one shared set of Monday rows.
    expect(overtimeRun.view.plays).not.toEqual(endOfHalfRun.view.plays);
    expect(deriveDecisionReview(overtimeRun.state, overtime).rows).toEqual(
      deriveDecisionReview(endOfHalfRun.state, endOfHalf).rows,
    );
    expect(canonicalReview().score).toBe('Westfield 20 — 3 Central Catholic');
  });

  it('reseeds a prepared two-minute period without moving this route’s rows', () => {
    const twoMinute = situationScenario('o6', 'two-minute');
    const baseline = canonicalReview();
    const run = playToFinal(fridayState('A'), twoMinute);
    const review = deriveDecisionReview(run.state, twoMinute);

    expect(deriveTakeFieldContext(fridayState('A'), twoMinute).sits).toEqual([
      'two-minute',
    ]);
    expect(
      execSeedFor(deriveTakeFieldContext(fridayState('A'), twoMinute)),
    ).toBe(1_338_690_115);
    expect(
      execSeedFor(deriveTakeFieldContext(fridayState('A'), scenario)),
    ).toBe(1_768_531_688);

    // A different seed that happens to resolve every roll the same way: the
    // review has to report that honestly rather than invent a difference.
    expect(review.rows).toEqual(baseline.rows);
    expect(review.score).toBe('Westfield 20 — 3 Central Catholic');
    expect(review.risk).toEqual(baseline.risk);
    expect(review.lessonCandidates.map((lesson) => lesson.id)).toEqual([
      'l_risk',
      'l_rt',
      'l_ex',
      'l_sample',
    ]);
    expect(baseline.score).toBe('Westfield 20 — 3 Central Catholic');
  });
});
