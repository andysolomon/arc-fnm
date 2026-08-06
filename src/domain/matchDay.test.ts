import { describe, expect, it } from 'vitest';

import matchDaySource from './matchDay.ts?raw';
import { WEEK_8_SCENARIO } from './scenario.ts';
import { PRIORITY_SITUATIONS } from './types.ts';
import type {
  PolicyValue,
  PracticeBlock,
  PrioritySituationId,
  WeekScenario,
  WeekState,
} from './types.ts';
import {
  acceptRisk,
  allocatePracticeBlock,
  chooseAnswer,
  confirmDisruption,
  createSeedState,
  lockPracticePlan,
  resetWeek,
  selectRtFix,
  selectRtStarter,
  togglePriority,
} from './week.ts';
import {
  buildGame,
  chooseMatchOption,
  deriveFieldSnapshot,
  deriveMatch,
  deriveTakeFieldContext,
  execPrepFor,
  execRollFor,
  execSeedFor,
  execSeedInputFor,
  setMatchSpeed,
  setPolicy,
  setQuickAdjust,
  skipToDecision,
  takeField,
  type MatchView,
  type TakeFieldContext,
} from './matchDay.ts';

const scenario = WEEK_8_SCENARIO;

const fixtureContext: TakeFieldContext = {
  risk: 'h4',
  rtFix: 'promote',
  rtName: 'Levi Webb',
  pol: { fourth: 'Chart', pat: 'Kick', clock: 'Bank', auto: 'Ask' },
  lvl: { o1: 3, o2: 2, o3: 2, o4: 0, o5: 1, o6: 1 },
  ansBy: {},
};

function block(
  id: string,
  objectiveId: string,
  day: PracticeBlock['day'],
  live = false,
): PracticeBlock {
  return { id, objectiveId, day, live };
}

function fridayState(path: 'A' | 'B'): WeekState {
  const isA = path === 'A';
  return {
    ...createSeedState(),
    stage: 'friday',
    selectedHypotheses: isA ? ['h1', 'h2', 'h3'] : ['h3', 'h4', 'h2'],
    acceptedRisk: isA ? 'h4' : 'h1',
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

/** Take a player off Friday without touching anything else in the scenario. */
function playerOutScenario(
  playerId: WeekScenario['rosterPlanning']['availability'][number]['playerId'],
): WeekScenario {
  return {
    ...scenario,
    rosterPlanning: {
      ...scenario.rosterPlanning,
      availability: scenario.rosterPlanning.availability.map((entry) =>
        entry.playerId === playerId
          ? { ...entry, participation: 'ineligible' as const, label: 'Out' }
          : entry,
      ),
    },
  };
}

/**
 * Play to the horn choosing an explicit option index at each key situation.
 * `playGoldenPath` always takes option 0; this reaches the branches that only
 * a different call opens, without touching the canonical route it leaves alone.
 */
function playChosenPath(
  initial: WeekState,
  picks: readonly number[],
  against: WeekScenario = scenario,
): {
  state: WeekState;
  view: MatchView;
  decisions: readonly string[];
} {
  let state = takeField(initial);
  const decisions: string[] = [];
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, against);
    const view = deriveMatch(state, against);
    if (view.phase === 'final') return { state, view, decisions };
    expect(view.pending).not.toBeNull();
    const pending = view.pending!;
    const index = picks[decisions.length] ?? 0;
    expect(pending.opts[index]).toBeDefined();
    decisions.push(pending.id);
    state = chooseMatchOption(state, against, pending.id, index);
  }
  throw new Error('chosen path did not reach the final horn');
}

function playGoldenPath(
  initial: WeekState,
  against: WeekScenario = scenario,
): {
  state: WeekState;
  view: MatchView;
  decisions: readonly string[];
} {
  let state = takeField(initial);
  const decisions: string[] = [];
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, against);
    const view = deriveMatch(state, against);
    if (view.phase === 'final') return { state, view, decisions };
    expect(view.pending).not.toBeNull();
    const pending = view.pending!;
    decisions.push(pending.id);
    state = chooseMatchOption(state, against, pending.id, 0);
  }
  throw new Error('golden path did not reach the final horn');
}

describe('canonical deterministic execution', () => {
  it('keeps the execSeed input ordering and fixture output byte-for-byte', () => {
    expect(execSeedInputFor(fixtureContext)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:3|o2:2|o3:2|o4:0|o5:1|o6:1',
    );
    expect(execSeedFor(fixtureContext)).toBe(4_273_764_986);
    expect(execSeedFor(fixtureContext)).toBe(execSeedFor(fixtureContext));
  });

  it('repeats rolls exactly and applies all four preparation bands', () => {
    const seed = execSeedFor(fixtureContext);
    expect(
      ['power', 'sprint', 'flood'].map((key) => execRollFor(seed, key)),
    ).toEqual([88, 81, 52]);
    expect(
      [0, 1, 2, 3].map((level) => execPrepFor(seed, 'flood', level)),
    ).toEqual([
      { roll: 52, band: 24, preparedWins: false },
      { roll: 52, band: 40, preparedWins: false },
      { roll: 52, band: 56, preparedWins: true },
      { roll: 52, band: 74, preparedWins: true },
    ]);
  });

  it('contains no result entropy, wall-clock reads, or unsafe HTML/SVG injection', () => {
    expect(matchDaySource).not.toMatch(
      /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=|<svg/i,
    );
  });
});

describe('Friday policies, snapshot, and controls', () => {
  it('persists only valid typed policies and freezes them at kickoff', () => {
    const friday = fridayState('A');
    const changed = setPolicy(friday, 'fourth', 'Short');
    expect(changed.policies.fourth).toBe('Short');
    expect(setPolicy(changed, 'fourth', 'bogus' as PolicyValue)).toBe(changed);
    const live = takeField(changed);
    expect(setPolicy(live, 'fourth', 'Kick')).toBe(live);
    expect(deriveTakeFieldContext(live, scenario).pol.fourth).toBe('Short');
  });

  it('derives prepared, thin, uncovered, and accepted-risk snapshot rows', () => {
    const snapshotA = deriveFieldSnapshot(fridayState('A'), scenario);
    const snapshotB = deriveFieldSnapshot(fridayState('B'), scenario);
    expect(snapshotA.prepared.length).toBeGreaterThan(0);
    expect(snapshotA.thin.length).toBeGreaterThan(0);
    expect(
      snapshotA.uncovered.some((item) => /Accepted risk/.test(item.note)),
    ).toBe(true);
    expect(snapshotA.riskTitle).toMatch(/Return-game threat/);
    expect(snapshotB.riskTitle).toMatch(/Power tendency/);
  });

  it('guards kickoff, supports pause/1x/fast and skip, and resets cleanly', () => {
    const unconfirmed = { ...fridayState('A'), disruptionConfirmed: false };
    expect(takeField(unconfirmed)).toBe(unconfirmed);
    let live = takeField(fridayState('A'));
    expect(live.matchStarted).toBe(true);
    live = setMatchSpeed(live, 'pause');
    expect(live.matchSpeed).toBe('pause');
    live = setMatchSpeed(live, 'fast');
    expect(live.matchSpeed).toBe('fast');
    live = setMatchSpeed(live, '1x');
    const skipped = skipToDecision(live, scenario);
    expect(skipped.matchEvents.at(-1)).toEqual({ kind: 'skip' });
    expect(deriveMatch(skipped, scenario).pending?.id).toBe('s_power');
    expect(resetWeek()).toEqual(createSeedState());
  });

  it('records every Quick Adjust deterministically and changes a later branch', () => {
    let live = takeField(fridayState('A'));
    for (const call of ['Pound the Rock', 'Blitz Heavy', 'Prevent'] as const) {
      live = setQuickAdjust(live, scenario, call);
    }
    const adjusted = deriveMatch(live, scenario);
    expect(adjusted.qt).toBe('Prevent');
    expect(adjusted.log.map((entry) => entry.title)).toEqual([
      'Quick Adjust — Pound the Rock',
      'Quick Adjust — Blitz Heavy',
      'Quick Adjust — Prevent',
    ]);
    expect(setQuickAdjust(live, scenario, 'Prevent')).toBe(live);

    const advanceThroughFlood = (initial: WeekState) => {
      let state = initial;
      for (let decision = 0; decision < 4; decision += 1) {
        state = skipToDecision(state, scenario);
        const pending = deriveMatch(state, scenario).pending!;
        state = chooseMatchOption(
          state,
          scenario,
          pending.id,
          pending.id === 's_flood' ? 2 : 0,
        );
      }
      state = skipToDecision(state, scenario);
      return deriveMatch(state, scenario);
    };
    const baseline = advanceThroughFlood(takeField(fridayState('A')));
    const pound = advanceThroughFlood(
      setQuickAdjust(takeField(fridayState('A')), scenario, 'Pound the Rock'),
    );
    expect(
      pound.plays.some((play) =>
        /Quick Adjust — Pound the Rock/.test(play.tag),
      ),
    ).toBe(true);
    expect(pound.plays).not.toEqual(baseline.plays);
  });
});

describe('six canonical situations and golden paths', () => {
  it('matches every canonical option and result on the six-decision Scenario A route', () => {
    const expected = {
      s_power: [
        [
          'Trust the plan — Wrong-arm every pull and make the ball run to our speed.',
          { w: 0, c: 0 },
          'Power right — the end wrong-arms the pull and Okafor scrapes over the top. Malone dropped for -2',
          3,
        ],
        [
          'Walk Pierce down — sell out against the run',
          { w: 0, c: 0 },
          'Pierce walks down — eight in the box, power stuffed for nothing',
          3,
        ],
        [
          'Bend — soft box, keep everything in front',
          { w: 0, c: 3 },
          'Soft box — Malone takes 4, 5, 4. Central converts twice and keeps grinding',
          3,
        ],
      ],
      s_fourth: [
        [
          'Go for it — Carter behind Sosa',
          { w: 7, c: 0 },
          'Carter surges for 4 — moved the chains',
          3,
        ],
        [
          'Punt — pin them deep',
          { w: 0, c: 0 },
          'Whitfield drops it at the CEN 8 — downed',
          3,
        ],
        [
          'Hard count — try to draw them off',
          { w: 0, c: 0 },
          'Nobody jumps — delay of game, punt from the 43',
          3,
        ],
      ],
      s_clock: [
        [
          'Spend a timeout — reset the front',
          { w: 0, c: 0 },
          'Timeout — the front resets. Stuff, incompletion, incompletion. The 41-yarder clangs off the upright',
          1,
        ],
        [
          'Play the down — trust the rules you repped',
          { w: 0, c: 3 },
          'The repped rules hold — two stops, and they settle for three at the gun',
          1,
        ],
        [
          'Show pressure, back out late',
          { w: 0, c: 3 },
          'The bluff buys a checkdown — and the 47-yarder is up and good anyway',
          1,
        ],
      ],
      s_flood: [
        [
          'Take the shot — trips flood',
          { w: 3, c: 3 },
          'The window is there — the timing isn’t. Overthrown by a yard',
          4,
        ],
        [
          'Three-step rhythm — stay underneath',
          { w: 3, c: 3 },
          'Hitches and slants — two first downs to the CEN 30',
          4,
        ],
        [
          'Stay on the ground',
          { w: 3, c: 3 },
          'Carter five straight — 46 yards of downhill football to the CEN 13',
          4,
        ],
      ],
      s_pat: [
        ['Kick — Ramsey, 21 of 22', { w: 1, c: 0 }, 'Extra point is GOOD', 2],
        [
          'Go for two — the surge package',
          { w: 2, c: 0 },
          'Carter surges in — TWO POINTS',
          2,
        ],
      ],
      s_close_def: [
        [
          'Base rules — play what you practiced',
          { w: 0, c: 0 },
          'Two throws die at the sticks — and on fourth down Cruz arrives with the ball still in Herrera’s hand. TURNOVER ON DOWNS',
          2,
        ],
        [
          'Prevent — two-deep shell, everything in front',
          { w: 0, c: 0 },
          'Checkdown, checkdown, checkdown — midfield with 0:20 and no timeouts. The heave falls incomplete',
          2,
        ],
        [
          'Send Cruz — end it at the quarterback',
          { w: 0, c: 0 },
          'Cruz off the boundary edge — strip sack, Okafor falls on it. BALL GAME',
          2,
        ],
      ],
    } as const;
    let state = takeField(fridayState('A'));
    const ids: string[] = [];
    for (let decision = 0; decision < 6; decision += 1) {
      state = skipToDecision(state, scenario);
      const pending = deriveMatch(state, scenario).pending!;
      ids.push(pending.id);
      expect(pending.opts.map((option) => option.name)).toEqual(
        expected[pending.id as keyof typeof expected].map(([name]) => name),
      );
      pending.opts.forEach((_option, optionIndex) => {
        const fork = chooseMatchOption(
          state,
          scenario,
          pending.id,
          optionIndex,
        );
        const log = deriveMatch(fork, scenario).log.filter(
          (entry) => entry.kind === 'decision',
        );
        const result =
          expected[pending.id as keyof typeof expected][optionIndex];
        expect(log.at(-1)).toMatchObject({
          id: pending.id,
          oi: optionIndex,
          choice: result?.[0],
          pts: result?.[1],
        });
        expect(log.at(-1)?.out[0]?.t).toBe(result?.[2]);
        expect(log.at(-1)?.out).toHaveLength(result?.[3] ?? 0);
      });
      state = chooseMatchOption(state, scenario, pending.id, 0);
    }
    expect(ids).toEqual([
      's_power',
      's_fourth',
      's_clock',
      's_flood',
      's_pat',
      's_close_def',
    ]);
  });

  it.each(['A', 'B'] as const)(
    'takes canonical Scenario %s through six decisions to Decision Review',
    (path) => {
      const result = playGoldenPath(fridayState(path));
      expect(result.view.phase).toBe('final');
      expect(result.view.decisionCount).toBe(6);
      expect(result.decisions).toHaveLength(6);
      expect(result.state.stage).toBe('review');
      expect(result.state.matchSpeed).toBe('pause');
      expect(result.view.plays[0]?.t).toMatch(/^FINAL — Westfield/);
      expect(
        result.view.log.some((entry) => /Accepted risk/.test(entry.title)),
      ).toBe(true);
      if (path === 'A') {
        expect([result.view.wScore, result.view.cScore]).toEqual([20, 3]);
        expect(result.view.mom).toBe(89);
        expect(result.view.plays[0]?.t).toBe(
          'FINAL — Westfield 20, Central Catholic 3. The district runs through Wildcat Stadium.',
        );
      } else {
        expect([result.view.wScore, result.view.cScore]).toEqual([16, 14]);
        expect(result.view.plays[0]?.t).toBe(
          'FINAL — Westfield 16, Central Catholic 14. The district runs through Wildcat Stadium.',
        );
      }
    },
  );

  it('keeps post-final quick-adjust and speed calls from changing final output', () => {
    const result = playGoldenPath(fridayState('A'));
    const baseline = result.view;
    const baselineEvents = result.state.matchEvents;
    const baselineSummary = baseline.plays[0]?.t;

    const quickAdjusted = setQuickAdjust(result.state, scenario, 'Prevent');
    expect(quickAdjusted).toBe(result.state);
    expect(quickAdjusted.matchEvents).toBe(baselineEvents);
    const afterQuickAdjust = deriveMatch(quickAdjusted, scenario);
    expect(afterQuickAdjust.phase).toBe('final');
    expect(afterQuickAdjust.plays).toEqual(baseline.plays);
    expect(afterQuickAdjust.log).toEqual(baseline.log);
    expect([afterQuickAdjust.wScore, afterQuickAdjust.cScore]).toEqual([
      baseline.wScore,
      baseline.cScore,
    ]);
    expect(afterQuickAdjust.plays[0]?.t).toBe(baselineSummary);

    const speedChanged = setMatchSpeed(result.state, 'fast');
    expect(speedChanged).toBe(result.state);
    expect(speedChanged.matchEvents).toBe(baselineEvents);
    const afterSpeedChange = deriveMatch(speedChanged, scenario);
    expect(afterSpeedChange.phase).toBe('final');
    expect(afterSpeedChange.plays).toEqual(baseline.plays);
    expect(afterSpeedChange.log).toEqual(baseline.log);
    expect([afterSpeedChange.wScore, afterSpeedChange.cScore]).toEqual([
      baseline.wScore,
      baseline.cScore,
    ]);
    expect(afterSpeedChange.plays[0]?.t).toBe(baselineSummary);
  });

  it('builds the same queue shape for the same take-field snapshot', () => {
    const context = deriveTakeFieldContext(fridayState('A'), scenario);
    const first = buildGame(context);
    const second = buildGame(context);
    expect(first.length).toBe(second.length);
    expect(
      first
        .filter((item) => 'dec' in item)
        .map((item) => ('dec' in item ? item.dec.id : '')),
    ).toEqual(['s_power', 's_fourth', 's_clock', 's_flood']);
    expect(playGoldenPath(fridayState('A')).view).toEqual(
      playGoldenPath(fridayState('A')).view,
    );
  });

  it('matches both canonical preparation snapshots and their risk/preparation tags', () => {
    const contextA = deriveTakeFieldContext(fridayState('A'), scenario);
    const contextB = deriveTakeFieldContext(fridayState('B'), scenario);
    expect(contextA.lvl).toEqual({
      o1: 3,
      o2: 3,
      o3: 2,
      o4: 0,
      o5: 1,
      o6: 2,
    });
    expect(contextB.lvl).toEqual({
      o1: 0,
      o2: 2,
      o3: 3,
      o4: 3,
      o5: 0,
      o6: 1,
    });
    expect([execSeedFor(contextA), execSeedFor(contextB)]).toEqual([
      1_768_531_688, 3_857_828_646,
    ]);

    for (const path of ['A', 'B'] as const) {
      const view = playGoldenPath(fridayState(path)).view;
      expect(view.log.some((entry) => /^Accepted risk/.test(entry.title))).toBe(
        true,
      );
      expect(view.log.some((entry) => /^Practiced/.test(entry.title))).toBe(
        true,
      );
    }
  });
});

describe('priority situations and unavailable players', () => {
  const CANONICAL_A_INPUT =
    'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:3|o2:3|o3:2|o4:0|o5:1|o6:2';
  const CANONICAL_FIXTURE_INPUT =
    'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:3|o2:2|o3:2|o4:0|o5:1|o6:1';

  it('leaves the canonical Webb/promote snapshot situation-neutral and fully represented', () => {
    const canonical = deriveTakeFieldContext(webbPromoteConfirmed(), scenario);
    expect(canonical.sits).toEqual([]);
    expect(canonical.outs).toEqual([]);
    expect(execSeedInputFor(canonical)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(canonical)).toBe(3_427_930_963);

    const pathA = deriveTakeFieldContext(fridayState('A'), scenario);
    expect([pathA.sits, pathA.outs]).toEqual([[], []]);
    expect(execSeedInputFor(pathA)).toBe(CANONICAL_A_INPUT);
    expect(execSeedFor(pathA)).toBe(1_768_531_688);
  });

  it.each([
    ['backed-up', 1_428_732_932],
    ['red-zone', 1_271_997_404],
    ['four-minute', 2_398_440_599],
    ['two-minute', 2_129_788_141],
    ['end-of-half', 356_497_921],
    ['overtime', 1_918_741_751],
  ] as const)(
    'appends the %s situation to the seed input without moving the canonical prefix',
    (situation, seed) => {
      const context = { ...fixtureContext, sits: [situation] };
      expect(execSeedInputFor(context)).toBe(
        `${CANONICAL_FIXTURE_INPUT}|sit:${situation}`,
      );
      expect(execSeedFor(context)).toBe(seed);
      // The neutral fixture the rest of the suite pins is untouched by all of it.
      expect(execSeedInputFor(fixtureContext)).toBe(CANONICAL_FIXTURE_INPUT);
      expect(execSeedFor(fixtureContext)).toBe(4_273_764_986);
    },
  );

  it('gives all six situations distinct seeds and normalizes duplicates and order', () => {
    const seeds = PRIORITY_SITUATIONS.map((situation) =>
      execSeedFor({ ...fixtureContext, sits: [situation] }),
    );
    expect(new Set(seeds).size).toBe(PRIORITY_SITUATIONS.length);
    expect(
      execSeedInputFor({
        ...fixtureContext,
        sits: ['backed-up', 'red-zone', 'two-minute'],
      }),
    ).toBe(`${CANONICAL_FIXTURE_INPUT}|sit:backed-up,red-zone,two-minute`);
  });

  it('derives only prepared, on-board situations, in canonical game order', () => {
    const tagged: WeekScenario = {
      ...scenario,
      objectives: scenario.objectives.map((objective) => {
        const situation: Partial<Record<string, PrioritySituationId>> = {
          o2: 'two-minute',
          o4: 'overtime',
          o5: 'backed-up',
          o6: 'red-zone',
        };
        const declared = situation[objective.id];
        return declared === undefined
          ? objective
          : { ...objective, prioritySituation: declared };
      }),
    };

    // Scenario A: h4 is the accepted risk, so o4's overtime never counts, and
    // scenario order (o2 before o5) does not survive normalization.
    expect(deriveTakeFieldContext(fridayState('A'), tagged).sits).toEqual([
      'backed-up',
      'red-zone',
      'two-minute',
    ]);
    // Scenario B: o5 is Unseen, so backed-up drops; h4 is on the board, so
    // overtime counts.
    expect(deriveTakeFieldContext(fridayState('B'), tagged).sits).toEqual([
      'red-zone',
      'two-minute',
      'overtime',
    ]);
    expect(deriveTakeFieldContext(fridayState('A'), scenario).sits).toEqual([]);
  });

  it.each([
    ['backed-up', 2_421_413_206, [24, 3]],
    ['red-zone', 3_697_324_262, [24, 3]],
    ['four-minute', 1_715_507_397, [20, 6]],
    ['two-minute', 1_338_690_115, [20, 3]],
    ['end-of-half', 595_169_807, [24, 3]],
    ['overtime', 3_096_729_405, [24, 3]],
  ] as const)(
    'resolves the %s situation into its own deterministic queue',
    (situation, seed, score) => {
      const situational = situationScenario('o6', situation);
      const context = deriveTakeFieldContext(fridayState('A'), situational);
      expect(context.sits).toEqual([situation]);
      expect(execSeedFor(context)).toBe(seed);

      const view = playGoldenPath(fridayState('A'), situational).view;
      expect(view.phase).toBe('final');
      expect([view.wScore, view.cScore]).toEqual([...score]);
    },
  );

  it('carries an additionally unavailable player into the seed, snapshot, and queue', () => {
    const mendesOut = playerOutScenario('player-mendes');
    const context = deriveTakeFieldContext(fridayState('A'), mendesOut);

    // Mendes is fourth on the protection depth chart with no practice
    // assignment, so nothing else in the snapshot speaks for his absence.
    expect(context.outs).toEqual(['player-mendes']);
    expect(context.lvl).toEqual(
      deriveTakeFieldContext(fridayState('A'), scenario).lvl,
    );
    expect(execSeedInputFor(context)).toBe(
      `${CANONICAL_A_INPUT}|out:player-mendes`,
    );
    expect(execSeedFor(context)).toBe(325_368_726);

    const baseline = deriveFieldSnapshot(fridayState('A'), scenario);
    const short = deriveFieldSnapshot(fridayState('A'), mendesOut);
    expect([
      baseline.prepared.length,
      baseline.thin.length,
      baseline.uncovered.length,
    ]).toEqual([2, 3, 1]);
    expect([
      short.prepared.length,
      short.thin.length,
      short.uncovered.length,
    ]).toEqual([2, 1, 3]);
    expect(short.uncovered.map((item) => item.name)).toEqual([
      'Trips-side flood vs Cover 3',
      'Kick coverage lane discipline',
      'Right tackle protection with a backup',
    ]);
    expect(short.uncovered[0]?.note).toBe(
      'J. Mendes unavailable — the package has no repped body left.',
    );

    const view = playGoldenPath(fridayState('A'), mendesOut).view;
    expect([view.wScore, view.cScore]).toEqual([20, 6]);
  });

  it('keeps a represented unavailability out of the seed', () => {
    // Kowalski is the depth-one right tackle and McCoy runs a scout-look
    // assignment: rtFix/rtName and lvl already carry both, so neither shows up.
    const kowalskiOut = deriveTakeFieldContext(
      fridayState('A'),
      playerOutScenario('player-kowalski'),
    );
    const mccoyOut = deriveTakeFieldContext(
      fridayState('A'),
      playerOutScenario('player-mccoy'),
    );
    expect(kowalskiOut.outs).toEqual([]);
    expect(mccoyOut.outs).toEqual([]);
    expect(execSeedInputFor(kowalskiOut)).toBe(CANONICAL_A_INPUT);
  });

  it('leaves the canonical seed, snapshot, and 20–3 outcome untouched throughout', () => {
    // Derive every noncanonical variant first, then re-derive the canonical one.
    situationScenario('o6', 'two-minute');
    deriveTakeFieldContext(
      fridayState('A'),
      playerOutScenario('player-mendes'),
    );
    PRIORITY_SITUATIONS.forEach((situation) =>
      execSeedFor({ ...fixtureContext, sits: [situation] }),
    );

    const canonical = deriveTakeFieldContext(webbPromoteConfirmed(), scenario);
    expect(execSeedFor(canonical)).toBe(3_427_930_963);
    expect(canonical.outs).toEqual([]);

    const result = playGoldenPath(fridayState('A'));
    expect([result.view.wScore, result.view.cScore]).toEqual([20, 3]);
    expect(result.view.plays[0]?.t).toBe(
      'FINAL — Westfield 20, Central Catholic 3. The district runs through Wildcat Stadium.',
    );
    expect(deriveFieldSnapshot(fridayState('A'), scenario).thin).toHaveLength(
      3,
    );
  });
});

/**
 * Phase 3.4 — the named causal routes the seeded McCoy path never reaches.
 *
 * The golden paths always take option 0 and always run the canonical Week 8
 * roster, so two production branches stay dark: the overtime queue, which only
 * opens when the closing decision leaves a three-point lead against a Prevent
 * shell, and the snapshot's "body short" tier, which only opens when a package
 * that is Rehearsed on paper loses a body nothing else in the week accounts
 * for. Each test names its route, and each one re-asserts canonical Week 8.
 */
describe('overtime and body-short routes', () => {
  it('drives the overtime queue when a Prevent shell concedes the tying field goal', () => {
    // Scenario B, choosing Bend / Punt / Timeout / Take the shot / Kick and
    // then Prevent: the shell gives up the field goal that ties it, and the
    // repped rules (o2 Repped) carry the extra period.
    const picks = [2, 1, 0, 0, 0, 1] as const;
    const overtime = playChosenPath(fridayState('B'), picks);

    expect(overtime.decisions).toEqual([
      's_power',
      's_fourth',
      's_clock',
      's_flood',
      's_pat',
      's_close_def',
    ]);
    expect(
      overtime.view.log.some(
        (entry) => entry.title === 'Their last drive — protect a 3-point lead',
      ),
    ).toBe(true);
    expect(
      overtime.view.plays
        .filter((play) => play.q === 'OT')
        .map((play) => [play.c, play.t, play.tag]),
    ).toEqual([
      [
        '13:40',
        'Carter punches in the winner from the 4 — TOUCHDOWN WESTFIELD',
        '',
      ],
      [
        '15:00',
        'OVERTIME — the repped rules force a field goal on Central’s possession',
        'Practiced — the fits held one more time',
      ],
    ]);
    expect(overtime.view.phase).toBe('final');
    expect([overtime.view.wScore, overtime.view.cScore]).toEqual([20, 16]);
    expect(overtime.view.mom).toBe(76);
    expect(overtime.view.decisionCount).toBe(6);
    expect(overtime.view.plays[0]?.t).toBe(
      'FINAL — Westfield 20, Central Catholic 16. The district runs through Wildcat Stadium.',
    );
    expect(overtime.state.stage).toBe('review');
    expect(overtime.state.matchSpeed).toBe('pause');
    // Same picks, same overtime — the extra period carries no fresh entropy.
    expect(playChosenPath(fridayState('B'), picks).view).toEqual(overtime.view);

    // The option-0 route off the same Friday never sees an extra period.
    const goldenB = playGoldenPath(fridayState('B'));
    expect(goldenB.view.plays.some((play) => play.q === 'OT')).toBe(false);
    expect([goldenB.view.wScore, goldenB.view.cScore]).toEqual([16, 14]);

    const canonical = playGoldenPath(fridayState('A'));
    expect([canonical.view.wScore, canonical.view.cScore]).toEqual([20, 3]);
    expect(
      execSeedFor(deriveTakeFieldContext(webbPromoteConfirmed(), scenario)),
    ).toBe(3_427_930_963);
  });

  it('calls a Rehearsed package thin — not uncovered — when it is only a body short', () => {
    // Scenario B reps the trips flood three times, so o3 is Rehearsed. Ruiz is
    // third on that package's depth chart and Mendes is the slide starter, so
    // nothing else in the snapshot speaks for Ruiz being out.
    const ruizOut = playerOutScenario('player-ruiz');
    const baseline = deriveFieldSnapshot(fridayState('B'), scenario);
    const short = deriveFieldSnapshot(fridayState('B'), ruizOut);

    expect(
      baseline.prepared.map((item) => [item.name, item.note]),
    ).toContainEqual([
      'Trips-side flood vs Cover 3',
      '18 reps across 3 blocks',
    ]);
    expect(short.prepared.map((item) => item.name)).toEqual([
      'Kick coverage lane discipline',
    ]);
    expect(short.thin.map((item) => [item.name, item.note])).toContainEqual([
      'Trips-side flood vs Cover 3',
      'Rehearsed on paper · P. Ruiz unavailable, the package is a body short',
    ]);
    // Unseen in the same short package still drops all the way to uncovered.
    expect(short.uncovered.map((item) => [item.name, item.note])).toEqual([
      [
        'Puller recognition and fit integrity',
        'Accepted risk — no practice time, by choice.',
      ],
      [
        'Right tackle protection with a backup',
        'P. Ruiz unavailable — the package has no repped body left.',
      ],
    ]);

    const canonicalB = deriveTakeFieldContext(fridayState('B'), scenario);
    const shortContext = deriveTakeFieldContext(fridayState('B'), ruizOut);
    expect(shortContext.outs).toEqual(['player-ruiz']);
    expect(shortContext.lvl).toEqual(canonicalB.lvl);
    expect(execSeedInputFor(shortContext)).toBe(
      `${execSeedInputFor(canonicalB)}|out:player-ruiz`,
    );
    expect(execSeedFor(shortContext)).toBe(2_123_723_806);
    expect(execSeedFor(canonicalB)).toBe(3_857_828_646);

    // Mendes is the slide starter, so his absence is already represented and
    // the same Friday hashes exactly what it hashed before.
    const mendesOut = deriveTakeFieldContext(
      fridayState('B'),
      playerOutScenario('player-mendes'),
    );
    expect(mendesOut.outs).toEqual([]);
    expect(execSeedFor(mendesOut)).toBe(3_857_828_646);

    // A body short changes what the snapshot admits, not this route's horn.
    const shortView = playGoldenPath(fridayState('B'), ruizOut).view;
    expect([shortView.wScore, shortView.cScore]).toEqual([16, 14]);

    const canonical = playGoldenPath(fridayState('A'));
    expect([canonical.view.wScore, canonical.view.cScore]).toEqual([20, 3]);
    expect(canonical.view.plays[0]?.t).toBe(
      'FINAL — Westfield 20, Central Catholic 3. The district runs through Wildcat Stadium.',
    );
    expect(deriveFieldSnapshot(fridayState('A'), scenario).thin).toHaveLength(
      3,
    );
  });
});
