import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { WeekRepository } from '../data/weekRepository.ts';
import {
  chooseMatchOption,
  deriveMatch,
  skipToDecision,
  takeField,
} from '../domain/matchDay.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';
import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { MatchDay } from './MatchDay.tsx';

function fridayState(): WeekState {
  return {
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
      { id: 'a7', objectiveId: 'o3', day: 'WED', live: false },
      { id: 'a8', objectiveId: 'o2', day: 'THU', live: false },
    ],
    practicePlanLocked: true,
    rtStarter: 'webb',
    rtFix: 'promote',
    disruptionConfirmed: true,
  };
}

function finalState(): WeekState {
  let state = takeField(fridayState());
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, WEEK_8_SCENARIO);
    const view = deriveMatch(state, WEEK_8_SCENARIO);
    if (view.phase === 'final') return state;
    state = chooseMatchOption(state, WEEK_8_SCENARIO, view.pending!.id, 0);
  }
  throw new Error('fixture did not finish');
}

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Match Day fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

describe('Match Day / Decision Room', () => {
  it('exposes typed policies, snapshot, semantic playback, decisions, and Quick Adjust', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(fridayState())}>
        <MatchDay />
      </WeekProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Four calls are yours before kickoff',
      }),
    ).toBeVisible();
    expect(screen.getByText('What you take onto the field')).toBeVisible();
    expect(screen.getByText(/Return-game threat/)).toBeVisible();
    const fourth = screen.getByRole('group', { name: 'Fourth down policy' });
    await user.click(
      within(fourth).getByRole('button', { name: /fourth and two/i }),
    );
    expect(
      within(fourth).getByRole('button', { name: /fourth and two/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      screen.getByRole('button', { name: 'Take the field · kickoff' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('LIVE');
    const playback = screen.getByRole('group', { name: 'Playback' });
    await user.click(within(playback).getByRole('button', { name: /Pause/ }));
    expect(screen.getByRole('status')).toHaveTextContent('PAUSED');
    await user.click(
      within(playback).getByRole('button', { name: /Next call/ }),
    );
    expect(
      screen.getByRole('dialog', { name: /I-formation, twin tight ends/i }),
    ).toBeVisible();
    expect(screen.getByRole('group', { name: 'Quick Adjust' })).toBeVisible();
    expect(screen.getByRole('list', { name: 'Play-by-play' })).toBeVisible();
  });

  it('shows the final result and opens Decision Review', async () => {
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <MatchDay />
      </WeekProvider>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('FINAL');
    expect(
      screen.getByRole('button', { name: 'Final — Decision review →' }),
    ).toBeEnabled();
  });
});
