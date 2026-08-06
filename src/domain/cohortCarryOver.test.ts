/**
 * Phase 4.3 — saved lessons are the only cohort that carries this week.
 *
 * Every assertion here is derived accumulation on `state.lessons`: the note is
 * empty until a lesson is pinned, the count phrase matches canonical Schedule /
 * UI-3 copy, and the selector stays pure — identical input, identical output,
 * no clock and no entropy.
 */

import { describe, expect, it } from 'vitest';

import {
  COHORT_LESSON_CAP,
  NO_COHORT_CARRY_OVER_NOTE,
  cohortCarryOverNote,
  deriveCohortCarryOver,
} from './cohortCarryOver.ts';
import {
  chooseMatchOption,
  deriveMatch,
  deriveTakeFieldContext,
  execSeedFor,
  execSeedInputFor,
  skipToDecision,
  takeField,
} from './matchDay.ts';
import { WEEK_8_SCENARIO } from './scenario.ts';
import type { WeekState } from './types.ts';
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

const scenario = WEEK_8_SCENARIO;

/** The canonical Week 8 Webb/promote route, built through the week actions. */
function webbPromoteConfirmed(): WeekState {
  let state = ['h1', 'h2', 'h3'].reduce(
    (current, id) => togglePriority(current, scenario, id),
    createSeedState(),
  );
  state = acceptRisk(state, scenario, 'h4');
  state = chooseAnswer(state, scenario, 'h1', 'a11');
  state = chooseAnswer(state, scenario, 'h2', 'a21');
  state = chooseAnswer(state, scenario, 'h3', 'a31');
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
      allocatePracticeBlock(current, scenario, objectiveId, day),
    state,
  );
  state = lockPracticePlan(state, scenario);
  state = selectRtFix(selectRtStarter(state, scenario, 'webb'), 'promote');
  return confirmDisruption(state, scenario);
}

function playToFinal(friday: WeekState): WeekState {
  let state = takeField(friday);
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, scenario);
    const view = deriveMatch(state, scenario);
    if (view.phase === 'final') return state;
    state = chooseMatchOption(state, scenario, view.pending!.id, 0);
  }
  throw new Error('cohort carry-over fixture did not finish');
}

describe('empty cohort', () => {
  it('reports nothing pinned on the seeded week', () => {
    const seed = createSeedState();

    expect(deriveCohortCarryOver(seed)).toEqual({
      lessonIds: [],
      count: 0,
      cap: COHORT_LESSON_CAP,
      note: NO_COHORT_CARRY_OVER_NOTE,
    });
    expect(cohortCarryOverNote(0)).toBe('');
  });
});

describe('accumulated lessons', () => {
  it('names each saved count in canonical Schedule / UI-3 travel copy', () => {
    expect(cohortCarryOverNote(1)).toBe(
      '1 saved lesson ride to the Week 9 opponent board.',
    );
    expect(cohortCarryOverNote(2)).toBe(
      '2 saved lessons ride to the Week 9 opponent board.',
    );
    expect(cohortCarryOverNote(3)).toBe(
      '3 saved lessons ride to the Week 9 opponent board.',
    );

    const one = deriveCohortCarryOver({
      ...createSeedState(),
      lessons: ['l1'],
    });
    expect(one).toMatchObject({
      lessonIds: ['l1'],
      count: 1,
      cap: COHORT_LESSON_CAP,
      note: '1 saved lesson ride to the Week 9 opponent board.',
    });

    const three = deriveCohortCarryOver({
      ...createSeedState(),
      lessons: ['l1', 'l2', 'l3'],
    });
    expect(three.count).toBe(3);
    expect(three.note).toBe(
      '3 saved lessons ride to the Week 9 opponent board.',
    );
  });

  it('preserves save order and never invents ids', () => {
    const state = {
      ...createSeedState(),
      lessons: ['rt-promote', 's_power', 'clock'],
    };
    const carried = deriveCohortCarryOver(state);

    expect(carried.lessonIds).toEqual(['rt-promote', 's_power', 'clock']);
    expect(carried.lessonIds).toBe(state.lessons);
  });

  it('is deterministic — identical input yields identical output', () => {
    const a = { ...createSeedState(), lessons: ['l1', 'l2'] };
    const b = { ...createSeedState(), lessons: ['l1', 'l2'] };

    expect(deriveCohortCarryOver(a)).toEqual(deriveCohortCarryOver(b));
    expect(deriveCohortCarryOver(a)).toEqual(deriveCohortCarryOver(a));
  });
});

describe('canonical Week 8 seed stays untouched', () => {
  it('re-asserts the Match Day seed string, execSeedFor, and 20–3 outcome', () => {
    const canonical = deriveTakeFieldContext(webbPromoteConfirmed(), scenario);
    expect(execSeedInputFor(canonical)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(canonical)).toBe(3_427_930_963);
    expect(execSeedFor(canonical)).toBe(execSeedFor(canonical));

    // Golden-path Friday fixture (same blocks as Decision Review) yields 20–3.
    const played = playToFinal({
      ...createSeedState(),
      stage: 'friday',
      selectedHypotheses: ['h1', 'h2', 'h3'],
      acceptedRisk: 'h4',
      answers: { h1: 'a11', h2: 'a21', h3: 'a31' },
      practiceBlocks: [
        { id: 'a1', objectiveId: 'o1', day: 'MON', live: false },
        { id: 'a2', objectiveId: 'o2', day: 'MON', live: false },
        { id: 'a3', objectiveId: 'o1', day: 'TUE', live: true },
        { id: 'a4', objectiveId: 'o1', day: 'TUE', live: true },
        { id: 'a5', objectiveId: 'o6', day: 'TUE', live: false },
        { id: 'a6', objectiveId: 'o3', day: 'WED', live: false },
        { id: 'a7', objectiveId: 'o2', day: 'WED', live: false },
        { id: 'a8', objectiveId: 'o3', day: 'THU', live: false },
      ],
      practicePlanLocked: true,
      rtStarter: 'webb',
      rtFix: 'promote',
      disruptionConfirmed: true,
    });
    const view = deriveMatch(played, scenario);
    expect([view.wScore, view.cScore]).toEqual([20, 3]);
    expect(deriveCohortCarryOver(played).count).toBe(0);
    expect(deriveCohortCarryOver({ ...played, lessons: ['l1'] }).note).toBe(
      '1 saved lesson ride to the Week 9 opponent board.',
    );
  });
});
