import { describe, expect, it } from 'vitest';

import adapterSource from './arcSimAdapter.ts?raw';
import matchDaySource from './matchDay.ts?raw';
import {
  FNM_FRIDAY_FEATURES,
  deriveFridaySimInput,
  fridaySimInputFromSnapshot,
} from './arcSimAdapter.ts';
import {
  execSeedFor,
  type TakeFieldContext,
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

const fixtureContext: TakeFieldContext = {
  risk: 'h4',
  rtFix: 'promote',
  rtName: 'Levi Webb',
  pol: { fourth: 'Chart', pat: 'Kick', clock: 'Bank', auto: 'Ask' },
  lvl: { o1: 3, o2: 2, o3: 2, o4: 0, o5: 1, o6: 1 },
  ansBy: {},
};

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

describe('FNM Friday feature gates', () => {
  it('keeps injuries off even though other varsity gates are on', () => {
    expect(FNM_FRIDAY_FEATURES.injuries).toBe(false);
    expect(FNM_FRIDAY_FEATURES.playCalling).toBe(true);
    expect(Object.isFrozen(FNM_FRIDAY_FEATURES)).toBe(true);
    expect(() => {
      (FNM_FRIDAY_FEATURES as { injuries: boolean }).injuries = true;
    }).toThrow();
  });
});

describe('fridaySimInputFromSnapshot', () => {
  it('reuses the take-the-field seed so prep still determines Friday', () => {
    const input = fridaySimInputFromSnapshot(fixtureContext, scenario);
    expect(input.seed).toBe(execSeedFor(fixtureContext));
    expect(input.seed).toBe(4_273_764_986);
    expect(input.features).toBe(FNM_FRIDAY_FEATURES);
  });

  it('omits ineligible and no-contact Student-Athletes from the home side', () => {
    const input = fridaySimInputFromSnapshot(fixtureContext, scenario);
    const ids = input.home.players.map((player) => player.playerId);
    expect(ids.some((id) => id.includes('kowalski'))).toBe(false);
    expect(ids.some((id) => id.includes('mccoy'))).toBe(false);
    expect(ids).toContain('westfield-marcus-reed');
    expect(input.away.players.some((player) => player.playerId.includes('kowalski'))).toBe(
      true,
    );
  });

  it('is byte-stable for the same snapshot and diverges when a decision changes', () => {
    const first = fridaySimInputFromSnapshot(fixtureContext, scenario);
    const second = fridaySimInputFromSnapshot(fixtureContext, scenario);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));

    const risked = fridaySimInputFromSnapshot(
      { ...fixtureContext, risk: 'h1' },
      scenario,
    );
    expect(risked.seed).not.toBe(first.seed);
  });

  it('scales home overalls with practice readiness and leaves the opponent unscaled', () => {
    const prepared = fridaySimInputFromSnapshot(fixtureContext, scenario);
    const unseen = fridaySimInputFromSnapshot(
      { ...fixtureContext, lvl: { o1: 0, o2: 0, o3: 0, o4: 0, o5: 0, o6: 0 } },
      scenario,
    );
    const reed = (input: typeof prepared) =>
      input.home.players.find((player) => player.playerId.endsWith('marcus-reed'));
    expect(reed(prepared)?.overall).toBeGreaterThan(reed(unseen)?.overall ?? 0);
    expect(prepared.away.strength).toBeGreaterThan(prepared.home.strength);
  });

  it('maps fourth-down policy onto coach aggression and gameplan focus', () => {
    const kick = fridaySimInputFromSnapshot(
      { ...fixtureContext, pol: { ...fixtureContext.pol, fourth: 'Kick' } },
      scenario,
    );
    const short = fridaySimInputFromSnapshot(
      { ...fixtureContext, pol: { ...fixtureContext.pol, fourth: 'Short' } },
      scenario,
    );
    expect(kick.home.coach?.aggression).toBe(25);
    expect(short.home.coach?.aggression).toBe(80);
    expect(short.home.gameplan).toBe('establish_run');
    expect(kick.home.gameplan).toBe('control_clock');
  });

  it('carries mapped schemes only when the week named ones the engine knows', () => {
    const withSchemes = fridaySimInputFromSnapshot(fixtureContext, scenario, {
      offenseScheme: 'Spread',
      defenseScheme: '4-2-5',
    });
    expect(withSchemes.home.scheme).toEqual({
      offense: 'spread',
      defense: 'four_two_five',
    });
    const unknown = fridaySimInputFromSnapshot(fixtureContext, scenario, {
      offenseScheme: 'Wishbone Deluxe',
      defenseScheme: '46 Bear',
    });
    expect(unknown.home.scheme).toBeUndefined();
  });
});

describe('deriveFridaySimInput', () => {
  it('reads the WeekState snapshot without taking the field', () => {
    const state = webbPromoteConfirmed();
    expect(state.matchStarted).toBe(false);
    const input = deriveFridaySimInput(state, scenario);
    expect(input.home.teamId).toBe('westfield');
    expect(input.away.teamId).toBe('central-catholic');
    expect(input.home.scheme).toEqual({
      offense: 'spread',
      defense: 'four_two_five',
    });
    expect(state.matchStarted).toBe(false);
    expect(state.matchEvents).toEqual([]);
  });
});

describe('boundary with Week 8 Match Day', () => {
  it('does not live inside matchDay.ts and introduces no entropy', () => {
    expect(matchDaySource).not.toMatch(/arcSimAdapter/);
    expect(adapterSource).not.toMatch(/from ['"]@arc-sim/);
    expect(adapterSource).not.toMatch(/\btakeField\(|\bbuildGame\(/);
    expect(adapterSource).not.toMatch(/Math\.random|Date\.now/);
  });
});
