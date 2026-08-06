import { describe, expect, it } from 'vitest';

import { WEEK_8_SCENARIO as scenario } from './scenario.ts';
import { deriveDisruptionGate } from './disruption.ts';
import {
  deriveFieldSnapshot,
  deriveTakeFieldContext,
  execSeedFor,
  execSeedInputFor,
} from './matchDay.ts';
import {
  FIVE_STEP_TRIPS_FLOOD,
  developmentAssignments,
  eligiblePackageDepth,
  playerAvailability,
  resolvePracticePersonnel,
} from './roster.ts';
import type {
  ReadinessLabel,
  RtFix,
  RtStarterId,
  WeekScenario,
  WeekState,
} from './types.ts';
import {
  acceptRisk,
  allocatePracticeBlock,
  adoptAnswerScheme,
  advanceStage,
  canAdvanceStage,
  createSeedState,
  chooseAnswer,
  confirmDisruption,
  deriveEvidenceGate,
  derivePlanGate,
  derivePracticeGate,
  evidenceCounts,
  hypothesisViews,
  lockPracticePlan,
  movePracticeBlock,
  nextStep,
  practiceObjectiveSummaries,
  removePracticeBlock,
  resetPracticeToStaffPlan,
  resetWeek,
  selectRtFix,
  selectRtStarter,
  setDisposition,
  setPracticeBlockLive,
  staffPracticeBlocks,
  togglePriority,
  undoPracticeBlocks,
} from './week.ts';

/** Prioritize the given ids in order, starting from the seed. */
function boardWith(...ids: readonly string[]): WeekState {
  return ids.reduce(
    (state, id) => togglePriority(state, scenario, id),
    createSeedState(),
  );
}

function planBoard(): WeekState {
  return acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');
}

function cleanPlan(): WeekState {
  let state = planBoard();
  state = chooseAnswer(state, scenario, 'h1', 'a11');
  state = chooseAnswer(state, scenario, 'h2', 'a21');
  return chooseAnswer(state, scenario, 'h3', 'a31');
}

function fullPracticePlan(): WeekState {
  const allocations = [
    ['o2', 'MON'],
    ['o3', 'MON'],
    ['o1', 'TUE'],
    ['o5', 'TUE'],
    ['o6', 'TUE'],
    ['o2', 'WED'],
    ['o3', 'WED'],
    ['o6', 'THU'],
  ] as const;
  return allocations.reduce(
    (state, [objectiveId, day]) =>
      allocatePracticeBlock(state, scenario, objectiveId, day),
    cleanPlan(),
  );
}

function scenarioWithFullContactCap(maximumMinutes: number): WeekScenario {
  return {
    ...scenario,
    jurisdictionRuleSet: {
      ...scenario.jurisdictionRuleSet,
      weeklyFullContact: {
        ...scenario.jurisdictionRuleSet.weeklyFullContact,
        maximumMinutes,
      },
    },
  };
}

/** Webb off Friday — the roster constraint that withdraws the promote path. */
function unavailableWebbScenario(): WeekScenario {
  return {
    ...scenario,
    rosterPlanning: {
      ...scenario.rosterPlanning,
      availability: scenario.rosterPlanning.availability.map((entry) =>
        entry.playerId === 'player-webb'
          ? {
              ...entry,
              participation: 'ineligible' as const,
              label: 'Unavailable Friday',
              authority: 'Guidance Office' as const,
            }
          : entry,
      ),
    },
  };
}

/** Webb still available, but less of the protection package is actually his. */
function webbMasteryScenario(readiness: ReadinessLabel): WeekScenario {
  return {
    ...scenario,
    rosterPlanning: {
      ...scenario.rosterPlanning,
      packageMastery: scenario.rosterPlanning.packageMastery.map((entry) =>
        entry.playerId === 'player-webb' ? { ...entry, readiness } : entry,
      ),
    },
  };
}

function lockedPlan(): WeekState {
  return lockPracticePlan(fullPracticePlan(), scenario);
}

function webbPromote(): WeekState {
  return selectRtFix(
    selectRtStarter(lockedPlan(), scenario, 'webb'),
    'promote',
  );
}

/** The staff allocation, materialized onto the state so reps can be read off it. */
function withStaffPlan(state: WeekState, against: WeekScenario): WeekState {
  return { ...state, practiceBlocks: [...staffPracticeBlocks(state, against)] };
}

function repsByObjective(
  state: WeekState,
  against: WeekScenario,
): Record<string, number> {
  return Object.fromEntries(
    practiceObjectiveSummaries(state, against).map((summary) => [
      summary.objective.id,
      summary.expectedReps,
    ]),
  );
}

describe('seeded Week 8 scenario', () => {
  it('opens on the evidence stage with an empty board', () => {
    const state = createSeedState();

    expect(state.stage).toBe('evidence');
    expect(state.selectedHypotheses).toEqual([]);
    expect(state.acceptedRisk).toBeNull();
    expect(state.dispositions).toEqual({});
    // No program event has been answered yet — the alert has not arrived.
    expect(state.academicResponse).toBeNull();
  });

  it('seeds Westfield vs Central Catholic with four hypotheses and 32 clips', () => {
    expect(scenario.weekNumber).toBe(8);
    expect(scenario.program.school).toBe('Westfield');
    expect(scenario.opponent.name).toBe('Central Catholic');
    expect(scenario.hypotheses).toHaveLength(4);
    expect(scenario.clips).toHaveLength(32);
    expect(scenario.priorityCapacity).toBe(3);
    expect(scenario.answers).toHaveLength(12);
    expect(scenario.objectives).toHaveLength(6);
    expect(
      scenario.objectives.slice(4).map((objective) => objective.id),
    ).toEqual(['o5', 'o6']);
    expect(scenario.practiceDays.map((day) => day.capacity)).toEqual([
      2, 3, 2, 1,
    ]);
    expect(scenario.answers.map((answer) => answer.name)).toContain(
      'Trips flood — three levels at the curl-flat defender',
    );
  });

  it('derives evidence counts from clips rather than storing them', () => {
    // h1 power tendency: 9 supporting, 2 contradicting per the seeded film.
    expect(evidenceCounts('h1', scenario)).toEqual({
      supporting: 9,
      contradicting: 2,
      total: 11,
    });
    expect(evidenceCounts('h4', scenario)).toEqual({
      supporting: 3,
      contradicting: 0,
      total: 3,
    });
  });
});

describe('Thursday disruption and authority', () => {
  const summary = (state: WeekState, objectiveId: string) =>
    practiceObjectiveSummaries(state, scenario).find(
      (item) => item.objective.id === objectiveId,
    );

  it('locks Practice into a deterministic two-step disruption gate', () => {
    const locked = lockedPlan();
    expect(locked).toMatchObject({
      stage: 'disruption',
      rtStarter: null,
      rtFix: null,
      disruptionConfirmed: false,
    });
    expect(deriveDisruptionGate(locked)).toMatchObject({
      rtLegal: false,
      rtResolved: false,
      unresolved: 2,
      ready: false,
    });
    expect(nextStep(locked, scenario)).toMatchObject({
      screen: 'game-plan',
      tacticsTab: 'Depth Chart',
      blocker: true,
    });
  });

  it('keeps Kowalski ineligible and McCoy no-contact without an override path', () => {
    const locked = lockedPlan();
    const attempted = selectRtStarter(
      locked,
      scenario,
      'kowalski' as RtStarterId,
    );
    expect(attempted).toBe(locked);
    expect(deriveDisruptionGate(attempted).rtLegal).toBe(false);
    expect(summary(locked, 'o1')).toMatchObject({ expectedReps: 6 });
    expect(confirmDisruption(locked, scenario)).toBe(locked);
  });

  it('causally resolves McCoy availability into only the live locked o1 fallback', () => {
    const locked = lockedPlan();
    const resolution = resolvePracticePersonnel(
      scenario.rosterPlanning,
      'o1',
    )[0];
    expect(resolution).toMatchObject({
      availability: { participation: 'no-contact' },
      fallback: {
        name: 'C. Dunn',
        repPenalty: 2,
        detail:
          'McCoy cannot take contact. Dunn runs the scout counter and the look is a step slow.',
      },
    });
    expect(summary(locked, 'o1')).toMatchObject({ expectedReps: 6 });

    const availableScenario: WeekScenario = {
      ...scenario,
      rosterPlanning: {
        ...scenario.rosterPlanning,
        availability: scenario.rosterPlanning.availability.map((entry) =>
          entry.playerId === 'player-mccoy'
            ? { ...entry, participation: 'available' as const }
            : entry,
        ),
      },
    };
    expect(
      resolvePracticePersonnel(availableScenario.rosterPlanning, 'o1')[0]
        ?.fallback,
    ).toBeNull();
    expect(
      practiceObjectiveSummaries(locked, availableScenario).find(
        (item) => item.objective.id === 'o1',
      ),
    ).toMatchObject({ expectedReps: 8 });

    const liveBlock = fullPracticePlan().practiceBlocks.find(
      (block) => block.objectiveId === 'o1',
    )!;
    const nonLive = lockPracticePlan(
      setPracticeBlockLive(fullPracticePlan(), scenario, liveBlock.id, false),
      scenario,
    );
    expect(
      nonLive.practiceBlocks.find((block) => block.objectiveId === 'o1'),
    ).toMatchObject({ live: false });
    expect(summary(nonLive, 'o1')).toMatchObject({ expectedReps: 6 });
  });

  it.each([
    ['promote', { objective: 'o5', readiness: 'Repped', reps: 10, target: 14 }],
    [
      'simplify',
      { objective: 'o3', readiness: 'Rehearsed', reps: 12, target: 8 },
    ],
    [
      'switch',
      { objective: 'o3', readiness: 'Introduced', reps: 12, target: 10 },
    ],
    [
      'accept',
      { objective: 'o5', readiness: 'Introduced', reps: 8, target: 6 },
    ],
  ] as const)(
    'applies the canonical %s branch to reps, target, and readiness',
    (fix, expected) => {
      let state = selectRtStarter(lockedPlan(), scenario, 'webb');
      state = selectRtFix(state, fix as RtFix);
      expect(deriveDisruptionGate(state)).toMatchObject({
        rtLegal: true,
        rtResolved: true,
        starterName: 'Levi Webb',
        response: fix,
      });
      expect(summary(state, expected.objective)).toMatchObject({
        readiness: expected.readiness,
        expectedReps: expected.reps,
        targetReps: expected.target,
      });
      if (fix === 'switch') expect(state.answers.h3).toBe('a32');
      else expect(state.answers.h3).toBe('a31');
    },
  );

  it('confirms only a legal RT plus response and opens Friday Decision Room', () => {
    const starterOnly = selectRtStarter(lockedPlan(), scenario, 'slide');
    expect(confirmDisruption(starterOnly, scenario)).toBe(starterOnly);
    const resolved = selectRtFix(starterOnly, 'simplify');
    const confirmed = confirmDisruption(resolved, scenario);
    expect(confirmed).toMatchObject({
      stage: 'friday',
      rtStarter: 'slide',
      rtFix: 'simplify',
      disruptionConfirmed: true,
    });
    expect(deriveDisruptionGate(confirmed).confirmed).toBe(true);
    expect(nextStep(confirmed, scenario)).toMatchObject({
      label: 'Continue · Decision Room',
      screen: 'match',
      blocker: false,
    });
  });
});

describe('RT protection roster hardening', () => {
  it('derives eligible package depth and preserves non-coach authority', () => {
    expect(
      eligiblePackageDepth(scenario.rosterPlanning, FIVE_STEP_TRIPS_FLOOD).map(
        (entry) => entry.playerId,
      ),
    ).toEqual(['player-webb', 'player-ruiz', 'player-mendes']);
    expect(
      playerAvailability(scenario.rosterPlanning, 'player-kowalski'),
    ).toMatchObject({
      participation: 'ineligible',
      authority: 'Guidance Office',
    });
    expect(
      playerAvailability(scenario.rosterPlanning, 'player-mccoy'),
    ).toMatchObject({
      participation: 'no-contact',
      authority: 'Athletic Trainer',
    });
    expect(
      developmentAssignments(scenario.rosterPlanning, 'o5', 'player-webb'),
    ).toEqual([
      expect.objectContaining({
        id: 'development-webb-five-step-protection',
        packageId: FIVE_STEP_TRIPS_FLOOD,
      }),
    ]);
  });

  it('changes answer validity and eligible depth when Webb becomes unavailable', () => {
    const unavailableScenario = unavailableWebbScenario();
    const state = webbPromote();

    expect(
      eligiblePackageDepth(
        unavailableScenario.rosterPlanning,
        FIVE_STEP_TRIPS_FLOOD,
      ).map((entry) => entry.playerId),
    ).not.toContain('player-webb');
    expect(derivePlanGate(state, unavailableScenario)).toMatchObject({
      ready: false,
      blocker: { kind: 'invalid-answer', hypothesisId: 'h3' },
    });
  });

  it('rejects an unavailable Webb when a caller bypasses the depth-chart UI', () => {
    const locked = lockedPlan();
    const unavailableScenario = unavailableWebbScenario();

    expect(selectRtStarter(locked, unavailableScenario, 'webb')).toBe(locked);
  });

  it('does not confirm an invalid direct Webb selection in an unavailable scenario', () => {
    const invalidDirectState: WeekState = {
      ...lockedPlan(),
      rtStarter: 'webb',
      rtFix: 'promote',
    };

    expect(
      confirmDisruption(invalidDirectState, unavailableWebbScenario()),
    ).toBe(invalidDirectState);
  });

  it('caps package readiness and the Friday snapshot when Webb mastery falls', () => {
    const lowerMasteryScenario = webbMasteryScenario('Introduced');
    const state = webbPromote();
    const baseline = practiceObjectiveSummaries(state, scenario).find(
      (summary) => summary.objective.id === 'o5',
    );
    const lowered = practiceObjectiveSummaries(
      state,
      lowerMasteryScenario,
    ).find((summary) => summary.objective.id === 'o5');

    expect(baseline).toMatchObject({
      readiness: 'Repped',
      expectedReps: 10,
    });
    expect(lowered).toMatchObject({
      readiness: 'Introduced',
      expectedReps: 10,
    });
    expect(
      deriveFieldSnapshot(state, lowerMasteryScenario).thin.find(
        (item) => item.name === 'Right tackle protection with a backup',
      )?.note,
    ).toBe('Introduced · 10 reps');
  });

  it('retains the seeded Webb/promote reps, readiness, and Match Day seed', () => {
    const state = confirmDisruption(webbPromote(), scenario);
    const summary = practiceObjectiveSummaries(state, scenario).find(
      (item) => item.objective.id === 'o5',
    );
    const context = deriveTakeFieldContext(state, scenario);

    expect(summary).toMatchObject({
      expectedReps: 10,
      targetReps: 14,
      readiness: 'Repped',
    });
    expect(execSeedInputFor(context)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(context)).toBe(3_427_930_963);
    expect(execSeedFor(context)).toBe(execSeedFor(context));
  });
});

describe('game plan gate and actions', () => {
  it('changes planning output when the accepted evidence risk changes', () => {
    let alternate = acceptRisk(boardWith('h1', 'h2', 'h4'), scenario, 'h3');
    alternate = chooseAnswer(alternate, scenario, 'h1', 'a11');
    alternate = chooseAnswer(alternate, scenario, 'h2', 'a21');
    alternate = chooseAnswer(alternate, scenario, 'h4', 'a41');

    const baseline = practiceObjectiveSummaries(cleanPlan(), scenario);
    const changed = practiceObjectiveSummaries(alternate, scenario);
    expect(
      baseline.find((summary) => summary.objective.id === 'o3')?.availability,
    ).toBe('available');
    expect(
      changed.find((summary) => summary.objective.id === 'o3')?.availability,
    ).toBe('accepted-risk');
    expect(
      changed.find((summary) => summary.objective.id === 'o4')?.availability,
    ).toBe('available');
    expect(
      staffPracticeBlocks(alternate, scenario).map(
        (block) => block.objectiveId,
      ),
    ).toContain('o4');
  });

  it('stays incomplete until every priority has exactly one active answer', () => {
    const board = planBoard();
    const one = chooseAnswer(board, scenario, 'h1', 'a11');
    const two = chooseAnswer(one, scenario, 'h2', 'a21');
    const complete = chooseAnswer(two, scenario, 'h3', 'a31');

    expect(derivePlanGate(board, scenario).ready).toBe(false);
    expect(derivePlanGate(one, scenario).status).toBe(
      'Plan incomplete · 1/3 answers set',
    );
    expect(derivePlanGate(two, scenario).ready).toBe(false);
    expect(derivePlanGate(complete, scenario).ready).toBe(true);
    expect(derivePlanGate(complete, scenario).activeAnswers).toEqual({
      h1: expect.objectContaining({ id: 'a11', objectiveId: 'o1' }),
      h2: expect.objectContaining({ id: 'a21', objectiveId: 'o2' }),
      h3: expect.objectContaining({ id: 'a31', objectiveId: 'o3' }),
    });
  });

  it('chooses and replaces one answer deterministically', () => {
    const board = planBoard();
    const first = chooseAnswer(board, scenario, 'h2', 'a21');
    const replacedA = chooseAnswer(first, scenario, 'h2', 'a23');
    const replacedB = chooseAnswer(first, scenario, 'h2', 'a23');

    expect(first.answers).toEqual({ h2: 'a21' });
    expect(replacedA.answers).toEqual({ h2: 'a23' });
    expect(replacedA).toEqual(replacedB);
  });

  it('cannot assign an answer to the accepted-risk concern', () => {
    const board = planBoard();
    const attempted = chooseAnswer(board, scenario, 'h4', 'a41');

    expect(attempted).toBe(board);
    expect(attempted.answers.h4).toBeUndefined();
  });

  it('keeps a scheme-conflicted answer invalid until its dependency is adopted', () => {
    let state = planBoard();
    state = chooseAnswer(state, scenario, 'h1', 'a12');
    state = chooseAnswer(state, scenario, 'h2', 'a21');
    state = chooseAnswer(state, scenario, 'h3', 'a31');

    expect(derivePlanGate(state, scenario).blocker?.kind).toBe(
      'invalid-answer',
    );

    const resolved = adoptAnswerScheme(state, scenario, 'a12');
    expect(resolved.defenseScheme).toBe('46 Bear');
    expect(derivePlanGate(resolved, scenario).ready).toBe(true);
  });

  it('deep-links evidence completion through Game Plan into Practice', () => {
    let state = planBoard();
    expect(nextStep(state, scenario)).toMatchObject({
      screen: 'game-plan',
      label: 'Continue · Set answers · 0/3',
    });

    state = chooseAnswer(state, scenario, 'h1', 'a11');
    state = chooseAnswer(state, scenario, 'h2', 'a21');
    state = chooseAnswer(state, scenario, 'h3', 'a31');

    expect(derivePlanGate(state, scenario).ready).toBe(true);
    expect(canAdvanceStage(state, scenario)).toBe(true);
    expect(advanceStage(state, scenario).stage).toBe('practice');
    expect(nextStep(state, scenario)).toMatchObject({
      screen: 'practice',
      blocker: false,
      label: 'Continue · Allocate practice · 0/8',
    });
  });
});

describe('practice plan gate and block actions', () => {
  it('requires a clean Game Plan before allocating any block', () => {
    const incomplete = chooseAnswer(planBoard(), scenario, 'h1', 'a11');
    const attempted = allocatePracticeBlock(incomplete, scenario, 'o1', 'TUE');

    expect(attempted).toBe(incomplete);
    expect(derivePracticeGate(attempted, scenario).blocker).toEqual({
      kind: 'plan-incomplete',
    });
  });

  it('enforces daily capacities of 2/3/2/1 and exactly eight total blocks', () => {
    let state = cleanPlan();
    state = allocatePracticeBlock(state, scenario, 'o2', 'MON');
    state = allocatePracticeBlock(state, scenario, 'o3', 'MON');
    const rejectedThird = allocatePracticeBlock(state, scenario, 'o6', 'MON');

    expect(rejectedThird).toBe(state);

    const full = fullPracticePlan();
    expect(derivePracticeGate(full, scenario)).toMatchObject({
      capacity: 8,
      placedCount: 8,
      remaining: 0,
      ready: true,
      dayCounts: { MON: 2, TUE: 3, WED: 2, THU: 1 },
    });
    expect(allocatePracticeBlock(full, scenario, 'o6', 'THU')).toBe(full);
  });

  it('allows live reps only on Tuesday Full Pads', () => {
    const clean = cleanPlan();
    const mondayLive = allocatePracticeBlock(
      clean,
      scenario,
      'o1',
      'MON',
      true,
    );
    const mondayAir = allocatePracticeBlock(
      clean,
      scenario,
      'o1',
      'MON',
      false,
    );
    const tuesdayLive = allocatePracticeBlock(clean, scenario, 'o1', 'TUE');

    expect(mondayLive).toBe(clean);
    expect(mondayAir.practiceBlocks[0]).toMatchObject({
      day: 'MON',
      live: false,
    });
    expect(
      setPracticeBlockLive(
        mondayAir,
        scenario,
        mondayAir.practiceBlocks[0]!.id,
        true,
      ),
    ).toBe(mondayAir);
    expect(tuesdayLive.practiceBlocks[0]).toMatchObject({
      day: 'TUE',
      live: true,
    });
  });

  it('moves blocks across open days and derives contact from the destination', () => {
    const tuesday = allocatePracticeBlock(cleanPlan(), scenario, 'o1', 'TUE');
    const blockId = tuesday.practiceBlocks[0]!.id;
    const monday = movePracticeBlock(tuesday, scenario, blockId, 'MON');
    const returned = movePracticeBlock(monday, scenario, blockId, 'TUE');

    expect(monday.practiceBlocks[0]).toMatchObject({
      id: blockId,
      day: 'MON',
      live: false,
    });
    expect(returned.practiceBlocks[0]).toMatchObject({
      id: blockId,
      day: 'TUE',
      live: true,
    });

    const fullMonday = allocatePracticeBlock(
      allocatePracticeBlock(cleanPlan(), scenario, 'o2', 'MON'),
      scenario,
      'o3',
      'MON',
    );
    const withTuesday = allocatePracticeBlock(
      fullMonday,
      scenario,
      'o1',
      'TUE',
    );
    expect(
      movePracticeBlock(
        withTuesday,
        scenario,
        withTuesday.practiceBlocks[2]!.id,
        'MON',
      ),
    ).toBe(withTuesday);
  });

  it('rejects accepted-risk, non-priority, and invalid objective allocation', () => {
    const clean = cleanPlan();
    expect(allocatePracticeBlock(clean, scenario, 'o4', 'TUE')).toBe(clean);

    const invalid: WeekState = { ...clean, defenseScheme: '46 Bear' };
    expect(derivePlanGate(invalid, scenario).ready).toBe(false);
    expect(allocatePracticeBlock(invalid, scenario, 'o1', 'TUE')).toBe(invalid);

    const unknown = allocatePracticeBlock(clean, scenario, 'o99', 'TUE');
    expect(unknown).toBe(clean);
  });

  it('undo restores the exact previous block set', () => {
    const first = allocatePracticeBlock(cleanPlan(), scenario, 'o1', 'TUE');
    const second = allocatePracticeBlock(first, scenario, 'o2', 'MON');

    expect(undoPracticeBlocks(second).practiceBlocks).toEqual(
      first.practiceBlocks,
    );
    expect(
      undoPracticeBlocks(undoPracticeBlocks(second)).practiceBlocks,
    ).toEqual([]);
  });

  it('builds and resets to the deterministic staff plan in one undo step', () => {
    const clean = cleanPlan();
    const staffA = staffPracticeBlocks(clean, scenario);
    const staffB = staffPracticeBlocks(clean, scenario);

    expect(scenario.jurisdictionRuleSet.weeklyFullContact.maximumMinutes).toBe(
      90,
    );
    expect(staffA).toEqual(staffB);
    expect(staffA).toHaveLength(8);
    expect(staffA.map((block) => block.day)).toEqual([
      'TUE',
      'TUE',
      'TUE',
      'WED',
      'MON',
      'MON',
      'WED',
      'THU',
    ]);
    expect(staffA.filter((block) => block.live)).toHaveLength(3);
    expect(
      staffA
        .filter((block) => block.live)
        .every((block) => block.day === 'TUE'),
    ).toBe(true);
    expect(
      derivePracticeGate({ ...clean, practiceBlocks: staffA }, scenario)
        .dayCounts,
    ).toEqual({
      MON: 2,
      TUE: 3,
      WED: 2,
      THU: 1,
    });

    const partial = allocatePracticeBlock(clean, scenario, 'o6', 'THU');
    const reset = resetPracticeToStaffPlan(partial, scenario);
    expect(reset.practiceBlocks).toEqual(staffA);
    expect(reset.practiceUndo).toEqual([[], partial.practiceBlocks]);
    expect(undoPracticeBlocks(reset).practiceBlocks).toEqual(
      partial.practiceBlocks,
    );
    expect(
      resetPracticeToStaffPlan(
        lockPracticePlan(fullPracticePlan(), scenario),
        scenario,
      ),
    ).toEqual(lockPracticePlan(fullPracticePlan(), scenario));
  });

  it('applies a lower jurisdiction cap without changing staff objective or day order', () => {
    const clean = cleanPlan();
    const cappedScenario = scenarioWithFullContactCap(20);
    const baseline = staffPracticeBlocks(clean, scenario);
    const capped = staffPracticeBlocks(clean, cappedScenario);

    expect(capped).toHaveLength(8);
    expect(capped).toEqual(staffPracticeBlocks(clean, cappedScenario));
    expect(
      capped.map(({ objectiveId, day }) => ({ objectiveId, day })),
    ).toEqual(baseline.map(({ objectiveId, day }) => ({ objectiveId, day })));
    expect(capped.map((block) => block.live)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('rejects explicit over-cap live allocation and toggling without mutation', () => {
    const cappedScenario = scenarioWithFullContactCap(20);
    let state = allocatePracticeBlock(
      cleanPlan(),
      cappedScenario,
      'o1',
      'TUE',
      true,
    );
    state = allocatePracticeBlock(state, cappedScenario, 'o5', 'TUE', true);

    expect(
      allocatePracticeBlock(state, cappedScenario, 'o6', 'TUE', true),
    ).toBe(state);

    const nonLive = allocatePracticeBlock(
      state,
      cappedScenario,
      'o6',
      'TUE',
      false,
    );
    expect(
      setPracticeBlockLive(
        nonLive,
        cappedScenario,
        nonLive.practiceBlocks[2]!.id,
        true,
      ),
    ).toBe(nonLive);
  });

  it('keeps an implicit move to Tuesday non-live when the cap is full', () => {
    const cappedScenario = scenarioWithFullContactCap(20);
    let state = allocatePracticeBlock(cleanPlan(), cappedScenario, 'o1', 'TUE');
    state = allocatePracticeBlock(state, cappedScenario, 'o5', 'TUE');
    state = allocatePracticeBlock(state, cappedScenario, 'o6', 'MON', false);
    const movedId = state.practiceBlocks[2]!.id;
    const moved = movePracticeBlock(state, cappedScenario, movedId, 'TUE');

    expect(moved).not.toBe(state);
    expect(moved.practiceBlocks[2]).toMatchObject({
      id: movedId,
      day: 'TUE',
      live: false,
    });
  });

  it('marks an existing over-cap block set invalid and refuses to lock it', () => {
    const cappedScenario = scenarioWithFullContactCap(20);
    const overCap = fullPracticePlan();

    expect(derivePracticeGate(overCap, cappedScenario).blocker).toMatchObject({
      kind: 'invalid-blocks',
      reason: expect.stringContaining('20 minutes'),
    });
    expect(lockPracticePlan(overCap, cappedScenario)).toBe(overCap);
  });

  it('derives canonical reps and readiness without persisting either', () => {
    let state = cleanPlan();
    for (const day of [
      'MON',
      'MON',
      'TUE',
      'TUE',
      'TUE',
      'WED',
      'WED',
      'THU',
    ] as const) {
      state = allocatePracticeBlock(state, scenario, 'o1', day, false);
    }
    const capped = practiceObjectiveSummaries(state, scenario).find(
      (summary) => summary.objective.id === 'o1',
    );
    const withLiveState = allocatePracticeBlock(
      cleanPlan(),
      scenario,
      'o5',
      'TUE',
    );
    const withLive = practiceObjectiveSummaries(withLiveState, scenario).find(
      (summary) => summary.objective.id === 'o5',
    );

    expect(capped).toMatchObject({
      readiness: 'Repped',
      expectedReps: 46,
      hasLiveRep: false,
      contactCapped: true,
    });
    expect(withLive).toMatchObject({
      readiness: 'Repped',
      expectedReps: 8,
      hasLiveRep: true,
    });
    expect(state).not.toHaveProperty('readiness');
  });

  it('rejects lock until valid, locks exactly once, and blocks every mutation', () => {
    const partial = allocatePracticeBlock(cleanPlan(), scenario, 'o1', 'TUE');
    expect(lockPracticePlan(partial, scenario)).toBe(partial);

    const full = fullPracticePlan();
    const locked = lockPracticePlan(full, scenario);
    expect(locked).toMatchObject({
      practicePlanLocked: true,
      stage: 'disruption',
      practiceUndo: [],
    });
    expect(lockPracticePlan(locked, scenario)).toBe(locked);
    expect(removePracticeBlock(locked, locked.practiceBlocks[0]!.id)).toBe(
      locked,
    );
    expect(allocatePracticeBlock(locked, scenario, 'o6', 'THU')).toBe(locked);
    expect(chooseAnswer(locked, scenario, 'h1', 'a12')).toBe(locked);
    expect(undoPracticeBlocks(locked)).toBe(locked);
  });

  it('Reset Week clears answers, blocks, history, and lock deterministically', () => {
    const locked = lockPracticePlan(fullPracticePlan(), scenario);
    const resetA = resetWeek();
    const resetB = resetWeek();

    expect(locked.practicePlanLocked).toBe(true);
    expect(resetA).toEqual(resetB);
    expect(resetA).toMatchObject({
      answers: {},
      practiceBlocks: [],
      practiceUndo: [],
      practicePlanLocked: false,
      rtStarter: null,
      rtFix: null,
      disruptionConfirmed: false,
      academicResponse: null,
      stage: 'evidence',
    });
  });
});

describe('evidence gate', () => {
  it('accepts exactly 3 priorities plus a distinct accepted risk', () => {
    const state = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');
    const gate = deriveEvidenceGate(state, scenario);

    expect(gate.validSelection).toEqual(['h1', 'h2', 'h3']);
    expect(gate.acceptedRisk).toBe('h4');
    expect(gate.prioritiesExact).toBe(true);
    expect(gate.ready).toBe(true);
    expect(gate.blocker).toBeNull();
  });

  it('rejects an under-selected board', () => {
    const gate = deriveEvidenceGate(boardWith('h1', 'h2'), scenario);

    expect(gate.ready).toBe(false);
    expect(gate.blocker).toEqual({ kind: 'under-selected', remaining: 1 });
  });

  it('rejects 3 priorities with no accepted risk', () => {
    const gate = deriveEvidenceGate(boardWith('h1', 'h2', 'h3'), scenario);

    expect(gate.prioritiesExact).toBe(true);
    expect(gate.ready).toBe(false);
    expect(gate.blocker).toEqual({ kind: 'no-risk' });
  });

  it('rejects a duplicated selection as a corrupt board', () => {
    const state: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h1', 'h2'],
      acceptedRisk: 'h4',
    };
    const gate = deriveEvidenceGate(state, scenario);

    expect(gate.priorityIds).toEqual(['h1', 'h2']);
    expect(gate.prioritiesExact).toBe(false);
    expect(gate.ready).toBe(false);
  });

  it('rejects an over-selected board of 4 priorities', () => {
    const state: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h2', 'h3', 'h4'],
      acceptedRisk: null,
    };
    const gate = deriveEvidenceGate(state, scenario);

    expect(gate.priorityIds).toHaveLength(4);
    expect(gate.validSelection).toEqual(['h1', 'h2', 'h3']);
    expect(gate.prioritiesExact).toBe(false);
    expect(gate.ready).toBe(false);
    expect(gate.blocker).toEqual({ kind: 'board-corrupt' });
  });

  it('refuses a risk that is also a priority', () => {
    const state: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h2', 'h3'],
      acceptedRisk: 'h1',
    };
    const gate = deriveEvidenceGate(state, scenario);

    expect(gate.acceptedRisk).toBeNull();
    expect(gate.ready).toBe(false);
  });

  it('refuses a risk that is unknown to the scenario', () => {
    const state: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h2', 'h3'],
      acceptedRisk: 'h99',
    };

    expect(deriveEvidenceGate(state, scenario).acceptedRisk).toBeNull();
  });

  it('drops a held or rejected hypothesis off the board and the risk slot', () => {
    const ready = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');
    const held = setDisposition(ready, scenario, 'h4', 'hold');
    const gate = deriveEvidenceGate(held, scenario);

    expect(held.acceptedRisk).toBeNull();
    expect(gate.acceptedRisk).toBeNull();
    expect(gate.ready).toBe(false);

    const rejected = setDisposition(ready, scenario, 'h2', 'reject');
    expect(rejected.selectedHypotheses).toEqual(['h1', 'h3']);
    expect(deriveEvidenceGate(rejected, scenario).ready).toBe(false);
  });
});

describe('priority board actions', () => {
  it('never lets the board exceed capacity through the UI action', () => {
    const state = boardWith('h1', 'h2', 'h3', 'h4');

    expect(state.selectedHypotheses).toEqual(['h1', 'h2', 'h3']);
  });

  it('toggles a priority off without touching the others', () => {
    const state = togglePriority(boardWith('h1', 'h2', 'h3'), scenario, 'h2');

    expect(state.selectedHypotheses).toEqual(['h1', 'h3']);
  });

  it('ignores prioritizing a held hypothesis', () => {
    const held = setDisposition(createSeedState(), scenario, 'h1', 'hold');
    const state = togglePriority(held, scenario, 'h1');

    expect(state.selectedHypotheses).toEqual([]);
  });

  it('clears the risk when that hypothesis becomes a priority', () => {
    const risked = acceptRisk(boardWith('h1', 'h2'), scenario, 'h4');
    expect(risked.acceptedRisk).toBe('h4');

    const promoted = togglePriority(risked, scenario, 'h4');
    expect(promoted.selectedHypotheses).toEqual(['h1', 'h2', 'h4']);
    expect(promoted.acceptedRisk).toBeNull();
  });

  it('toggles the accepted risk back off', () => {
    const ready = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');
    const cleared = acceptRisk(ready, scenario, 'h4');

    expect(cleared.acceptedRisk).toBeNull();
  });

  it('exposes a reason for every action it disables', () => {
    const full = boardWith('h1', 'h2', 'h3');
    const left = hypothesisViews(full, scenario).find(
      (v) => v.hypothesis.id === 'h4',
    );

    expect(left?.boardState).toBe('Left off the board');
    expect(left?.canPrioritize).toBe(false);
    expect(left?.canAcceptRisk).toBe(true);
    expect(left?.blockedReason).toContain('already prioritized');
  });

  it('labels board state for priorities, risk, and dispositions', () => {
    const ready = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');
    const byId = new Map(
      hypothesisViews(ready, scenario).map((v) => [v.hypothesis.id, v]),
    );

    expect(byId.get('h1')?.boardState).toBe('Priority');
    expect(byId.get('h4')?.boardState).toBe('Accepted risk');

    const rejected = setDisposition(ready, scenario, 'h4', 'reject');
    const after = hypothesisViews(rejected, scenario).find(
      (v) => v.hypothesis.id === 'h4',
    );
    expect(after?.boardState).toBe('Rejected');
  });
});

describe('stage progression', () => {
  it('cannot advance before the evidence gate is satisfied', () => {
    const empty = createSeedState();
    expect(canAdvanceStage(empty, scenario)).toBe(false);
    expect(advanceStage(empty, scenario)).toEqual(empty);

    const noRisk = boardWith('h1', 'h2', 'h3');
    expect(canAdvanceStage(noRisk, scenario)).toBe(false);
    expect(advanceStage(noRisk, scenario).stage).toBe('evidence');
  });

  it('advances to plan once 3 priorities and the accepted risk are set', () => {
    const ready = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');

    expect(ready.stage).toBe('plan');
  });

  it('does not advance past plan in this slice', () => {
    const ready = acceptRisk(boardWith('h1', 'h2', 'h3'), scenario, 'h4');

    expect(canAdvanceStage(ready, scenario)).toBe(false);
    expect(advanceStage(ready, scenario).stage).toBe('plan');
  });

  it('names the next step from real state, not the stage marker', () => {
    expect(nextStep(createSeedState(), scenario).label).toContain('0/3');
    expect(nextStep(boardWith('h1'), scenario).label).toContain('1/3');
    expect(nextStep(boardWith('h1', 'h2', 'h3'), scenario).label).toContain(
      'accepted risk',
    );

    // A duplicate that leaves fewer than three distinct concerns reads as
    // under-selected — the coach still just needs to pick another one.
    const thin: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h1', 'h2'],
    };
    expect(nextStep(thin, scenario).label).toContain('2/3');
    expect(nextStep(thin, scenario).blocker).toBe(false);

    // A full-but-corrupt board is a blocker: it must be repaired, not added to.
    const corrupt: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1', 'h1', 'h2', 'h3'],
    };
    expect(nextStep(corrupt, scenario).blocker).toBe(true);
    expect(nextStep(corrupt, scenario).label).toContain('Repair');
  });
});

describe('reset week', () => {
  it('returns the exact seed from any mid-week state', () => {
    const ready = chooseAnswer(planBoard(), scenario, 'h1', 'a11');
    const messy = setDisposition(ready, scenario, 'h2', 'hold');

    expect(resetWeek()).toEqual(createSeedState());
    expect(resetWeek()).not.toEqual(messy);
    expect(resetWeek().stage).toBe('evidence');
    expect(resetWeek().answers).toEqual({});
  });

  it('hands back a fresh object each time so the seed cannot drift', () => {
    const first = createSeedState();
    const second = createSeedState();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.selectedHypotheses).not.toBe(second.selectedHypotheses);
  });

  it('is deterministic — repeated identical input yields identical state', () => {
    const runA = acceptRisk(boardWith('h3', 'h4', 'h2'), scenario, 'h1');
    const runB = acceptRisk(boardWith('h3', 'h4', 'h2'), scenario, 'h1');

    expect(runA).toEqual(runB);
    expect(runA.stage).toBe('plan');
  });
});

/**
 * Phase 2.6, stated verbatim by the Phase 2 acceptance criteria:
 *
 *   "User-focused tests prove that changing a hypothesis or roster constraint
 *    changes the planned reps and available Friday choices."
 *
 * One test per axis the coach can actually move — the evidence they accept as
 * risk, the roster they have, and the rule set they practice under. Each proves
 * the change is causal against seeded Week 8 held as the golden baseline.
 */
describe('Phase 2.6 — evidence, roster, and rule changes alter the plan', () => {
  it('moves planned reps and the Friday board when the accepted risk changes', () => {
    let swapped = acceptRisk(boardWith('h1', 'h2', 'h4'), scenario, 'h3');
    swapped = chooseAnswer(swapped, scenario, 'h1', 'a11');
    swapped = chooseAnswer(swapped, scenario, 'h2', 'a21');
    swapped = chooseAnswer(swapped, scenario, 'h4', 'a41');

    const canonical = withStaffPlan(cleanPlan(), scenario);
    const alternate = withStaffPlan(swapped, scenario);
    const canonicalReps = repsByObjective(canonical, scenario);
    const alternateReps = repsByObjective(alternate, scenario);

    // Accepting h3 instead of h4 hands o3's practice time straight to o4.
    expect(canonicalReps).toMatchObject({ o3: 6, o4: 0 });
    expect(alternateReps).toMatchObject({ o3: 0, o4: 6 });
    expect(
      staffPracticeBlocks(swapped, scenario).map((block) => block.objectiveId),
    ).toContain('o4');

    // Friday sees a different board: a different uncovered concern, a
    // different answer set, and therefore a different execution seed.
    expect(
      deriveFieldSnapshot(canonical, scenario).uncovered.map(
        (item) => item.name,
      ),
    ).toEqual(['Kick coverage lane discipline']);
    expect(
      deriveFieldSnapshot(alternate, scenario).uncovered.map(
        (item) => item.name,
      ),
    ).toEqual(['Trips-side flood vs Cover 3']);
    expect(
      Object.keys(deriveTakeFieldContext(alternate, scenario).ansBy).sort(),
    ).toEqual(['h1', 'h2', 'h4']);
    expect(execSeedFor(deriveTakeFieldContext(alternate, scenario))).not.toBe(
      execSeedFor(deriveTakeFieldContext(canonical, scenario)),
    );
  });

  it('withdraws the Friday RT choice and rewrites the snapshot when Webb is out', () => {
    const shortHanded = unavailableWebbScenario();
    const locked = lockedPlan();

    // The choice is gone, not merely discouraged: Webb leaves the eligible
    // depth chart and the transition refuses him even when asked directly.
    expect(
      eligiblePackageDepth(
        shortHanded.rosterPlanning,
        FIVE_STEP_TRIPS_FLOOD,
      ).map((entry) => entry.playerId),
    ).toEqual(['player-ruiz', 'player-mendes']);
    expect(selectRtStarter(locked, shortHanded, 'webb')).toBe(locked);

    const canonical = confirmDisruption(webbPromote(), scenario);
    const substitute = confirmDisruption(
      selectRtFix(selectRtStarter(locked, shortHanded, 'slide'), 'simplify'),
      shortHanded,
    );
    const canonicalSnapshot = deriveFieldSnapshot(canonical, scenario);
    const shortSnapshot = deriveFieldSnapshot(substitute, shortHanded);

    expect(canonicalSnapshot.thin).toContainEqual({
      name: 'Right tackle protection with a backup',
      note: 'Repped · 10 reps',
    });
    expect(shortSnapshot.uncovered.map((item) => item.name)).toContain(
      'Right tackle protection with a backup',
    );
    expect(
      shortSnapshot.uncovered.some((item) =>
        item.note.includes('L. Webb unavailable'),
      ),
    ).toBe(true);
    expect(
      execSeedFor(deriveTakeFieldContext(substitute, shortHanded)),
    ).not.toBe(execSeedFor(deriveTakeFieldContext(canonical, scenario)));

    // Seeded Week 8 is the golden baseline and the alternate roster never touches it.
    expect(execSeedInputFor(deriveTakeFieldContext(canonical, scenario))).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(deriveTakeFieldContext(canonical, scenario))).toBe(
      3_427_930_963,
    );
  });

  it('caps the prepared package and the Friday seed when Webb mastery falls', () => {
    const state = confirmDisruption(webbPromote(), scenario);
    const lowered = webbMasteryScenario('Introduced');
    const canonicalContext = deriveTakeFieldContext(state, scenario);
    const loweredContext = deriveTakeFieldContext(state, lowered);

    // Same blocks, same reps — mastery moves what those reps are worth.
    expect(repsByObjective(state, lowered)).toEqual(
      repsByObjective(state, scenario),
    );
    expect(canonicalContext.lvl).toMatchObject({ o3: 3, o5: 2 });
    expect(loweredContext.lvl).toMatchObject({ o3: 1, o5: 1 });
    expect(execSeedInputFor(loweredContext)).not.toBe(
      execSeedInputFor(canonicalContext),
    );
    expect(execSeedInputFor(canonicalContext)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
  });

  it('demotes implicit Tuesday reps a lower full-contact cap no longer allows', () => {
    const clean = cleanPlan();
    const restrictedScenario = scenarioWithFullContactCap(20);
    const canonical = withStaffPlan(clean, scenario);
    const restricted = withStaffPlan(clean, restrictedScenario);

    expect(scenario.jurisdictionRuleSet.weeklyFullContact.maximumMinutes).toBe(
      90,
    );
    expect(canonical.practiceBlocks.filter((block) => block.live)).toHaveLength(
      3,
    );
    expect(
      restricted.practiceBlocks.filter((block) => block.live),
    ).toHaveLength(2);
    // Identical objectives on identical days — only the contact level moved.
    expect(
      restricted.practiceBlocks.map(
        (block) => `${block.objectiveId}:${block.day}`,
      ),
    ).toEqual(
      canonical.practiceBlocks.map(
        (block) => `${block.objectiveId}:${block.day}`,
      ),
    );
    expect(repsByObjective(canonical, scenario).o5).toBe(8);
    expect(repsByObjective(restricted, restrictedScenario).o5).toBe(6);

    // An implicit Tuesday placement lands off-air once the cap is spent, and
    // both plans remain legal under the rule set that produced them.
    let spent = allocatePracticeBlock(clean, restrictedScenario, 'o1', 'TUE');
    spent = allocatePracticeBlock(spent, restrictedScenario, 'o5', 'TUE');
    const implicit = allocatePracticeBlock(
      spent,
      restrictedScenario,
      'o6',
      'TUE',
    );
    expect(implicit.practiceBlocks[2]).toMatchObject({
      day: 'TUE',
      live: false,
    });
    expect(derivePracticeGate(canonical, scenario).ready).toBe(true);
    expect(derivePracticeGate(restricted, restrictedScenario).ready).toBe(true);
    // The canonical 90-minute rule set still yields the golden staff plan.
    expect(canonical.practiceBlocks).toEqual(
      staffPracticeBlocks(clean, scenario),
    );
  });
});
