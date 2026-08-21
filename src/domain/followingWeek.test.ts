import { describe, expect, it } from 'vitest';

import {
  FOLLOWING_WEEK_NUMBER,
  canOpenFollowingWeek,
  followingWeekScenario,
  openFollowingWeekFrom,
  seedFollowingWeek,
  week9ProgramFromWeek8,
} from './followingWeek.ts';
import { WEEK_8_SCENARIO, WEEK_9_SCENARIO } from './scenario.ts';
import { createSeedState, evidenceCounts, resetWeek } from './week.ts';
import { createInitialState, weekReducer } from '../state/weekStore.ts';

describe('following week seed', () => {
  it('is off until Week 8 review is closed', () => {
    expect(canOpenFollowingWeek(8, createSeedState())).toBe(false);
    expect(
      canOpenFollowingWeek(8, { ...createSeedState(), reviewClosed: true }),
    ).toBe(true);
    expect(
      canOpenFollowingWeek(9, { ...createSeedState(), reviewClosed: true }),
    ).toBe(false);
  });

  it('pins saved lessons onto a fresh week without changing the Week 8 seed', () => {
    const next = seedFollowingWeek(['l_rt', 'l_ex']);
    expect(next.stage).toBe('evidence');
    expect(next.matchStarted).toBe(false);
    expect(next.lessons).toEqual(['l_rt', 'l_ex']);
    expect(resetWeek()).toEqual(createSeedState());
    expect(createSeedState().lessons).toEqual([]);
  });

  it('labels Riverside and carries the Week 8 record into the program chrome', () => {
    expect(WEEK_9_SCENARIO.weekNumber).toBe(FOLLOWING_WEEK_NUMBER);
    expect(WEEK_9_SCENARIO.opponent.name).toBe('Riverside');
    expect(WEEK_9_SCENARIO.venue).toBe('Riverside Stadium');
    expect(followingWeekScenario(null)).toEqual(WEEK_9_SCENARIO);
    expect(
      followingWeekScenario({ wScore: 20, cScore: 3, lessons: [] }).program,
    ).toMatchObject(week9ProgramFromWeek8(true));
    expect(WEEK_8_SCENARIO.opponent.name).toBe('Central Catholic');
  });

  it('authors a Riverside board that is not the Central Catholic film', () => {
    expect(WEEK_9_SCENARIO.hypotheses.map((item) => item.short)).toEqual([
      'Zone-read keep',
      'Jet-sweep staple',
      'Cover 2 post window',
      'Rugby-punt threat',
    ]);
    expect(WEEK_8_SCENARIO.hypotheses.map((item) => item.short)).toEqual([
      'Power tendency',
      'Sprint-out response',
      'Cover 3 leverage',
      'Return-game threat',
    ]);
    expect(WEEK_9_SCENARIO.clips).toHaveLength(32);
    expect(WEEK_9_SCENARIO.clips[0]?.id).toBe('r01');
    expect(WEEK_8_SCENARIO.clips[0]?.id).toBe('c01');
    expect(WEEK_9_SCENARIO.answers[0]?.name).toMatch(/mesh/i);
    expect(WEEK_8_SCENARIO.answers[0]?.name).toMatch(/puller/i);
    expect(WEEK_9_SCENARIO.objectives[0]?.name).toBe('Zone-read keep fits');
    expect(WEEK_9_SCENARIO.stages[0]?.date).toBe('Oct 19');
    expect(WEEK_8_SCENARIO.stages[0]?.date).toBe('Oct 12');
    expect(evidenceCounts('h1', WEEK_9_SCENARIO)).toEqual({
      supporting: 9,
      contradicting: 2,
      total: 11,
    });
    expect(evidenceCounts('h4', WEEK_9_SCENARIO)).toEqual({
      supporting: 3,
      contradicting: 0,
      total: 3,
    });
  });

  it('builds an open-week payload from the closed teaching week', () => {
    const closed = {
      ...createSeedState(),
      reviewClosed: true,
      lessons: ['l_rt'],
    };
    const action = openFollowingWeekFrom(closed, { wScore: 20, cScore: 3 });
    expect(action.weekNumber).toBe(9);
    expect(action.week.lessons).toEqual(['l_rt']);
    expect(action.week8Final).toEqual({
      wScore: 20,
      cScore: 3,
      lessons: ['l_rt'],
    });
  });

  it('refuses to open Week 9 before the review is closed, then seeds it', () => {
    const fresh = weekReducer(
      createInitialState(),
      openFollowingWeekFrom(createSeedState(), { wScore: 20, cScore: 3 }),
      WEEK_8_SCENARIO,
    );
    expect(fresh.weekNumber).toBe(8);

    const closed = {
      ...createSeedState(),
      reviewClosed: true,
      lessons: ['l_rt'],
    };
    const opened = weekReducer(
      { ...createInitialState(), week: closed },
      openFollowingWeekFrom(closed, { wScore: 20, cScore: 3 }),
      WEEK_8_SCENARIO,
    );
    expect(opened.weekNumber).toBe(9);
    expect(opened.week.lessons).toEqual(['l_rt']);
    expect(opened.week.matchStarted).toBe(false);
    expect(opened.nav.screen).toBe('week');
    expect(opened.week8Final?.wScore).toBe(20);
  });
});
