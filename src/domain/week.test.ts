import { describe, expect, it } from 'vitest';

import { WEEK_8_SCENARIO as scenario } from './scenario.ts';
import { deriveDisruptionGate } from './disruption.ts';
import type { RtFix, RtStarterId, WeekState } from './types.ts';
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

describe('seeded Week 8 scenario', () => {
  it('opens on the evidence stage with an empty board', () => {
    const state = createSeedState();

    expect(state.stage).toBe('evidence');
    expect(state.selectedHypotheses).toEqual([]);
    expect(state.acceptedRisk).toBeNull();
    expect(state.dispositions).toEqual({});
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
  const lockedPlan = () => lockPracticePlan(fullPracticePlan(), scenario);
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
    const attempted = selectRtStarter(locked, 'kowalski' as RtStarterId);
    expect(attempted).toBe(locked);
    expect(deriveDisruptionGate(attempted).rtLegal).toBe(false);
    expect(summary(locked, 'o1')).toMatchObject({ expectedReps: 6 });
    expect(confirmDisruption(locked)).toBe(locked);
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
      let state = selectRtStarter(lockedPlan(), 'webb');
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
    const starterOnly = selectRtStarter(lockedPlan(), 'slide');
    expect(confirmDisruption(starterOnly)).toBe(starterOnly);
    const resolved = selectRtFix(starterOnly, 'simplify');
    const confirmed = confirmDisruption(resolved);
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

describe('game plan gate and actions', () => {
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
