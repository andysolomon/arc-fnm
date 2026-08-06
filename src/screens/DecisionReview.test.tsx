import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { WeekRepository } from '../data/weekRepository.ts';
import { deriveCohortCarryOver } from '../domain/cohortCarryOver.ts';
import {
  chooseMatchOption,
  deriveMatch,
  deriveTakeFieldContext,
  execSeedFor,
  execSeedInputFor,
  skipToDecision,
  takeField,
} from '../domain/matchDay.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';
import type { WeekState } from '../domain/types.ts';
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
} from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { useWeek } from '../state/weekContext.ts';
import { Scouting } from './Scouting.tsx';
import { WeekHub } from './WeekHub.tsx';
import { DecisionReview } from './DecisionReview.tsx';

const scenario = WEEK_8_SCENARIO;

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
      { id: 'a7', objectiveId: 'o2', day: 'WED', live: false },
      { id: 'a8', objectiveId: 'o3', day: 'THU', live: false },
    ],
    practicePlanLocked: true,
    rtStarter: 'webb',
    rtFix: 'promote',
    disruptionConfirmed: true,
  };
}

/** The canonical Week 8 Webb/promote route for seed re-assertion. */
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

function finalState(): WeekState {
  let state = takeField(fridayState());
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, WEEK_8_SCENARIO);
    const view = deriveMatch(state, WEEK_8_SCENARIO);
    if (view.phase === 'final') return state;
    state = chooseMatchOption(state, WEEK_8_SCENARIO, view.pending!.id, 0);
  }
  throw new Error('review UI fixture did not finish');
}

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Decision Review fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

function ReviewRoutes() {
  const { state, dispatch } = useWeek();
  useEffect(() => {
    dispatch({ type: 'navigate', screen: 'review' });
  }, [dispatch]);
  if (state.nav.screen === 'week') return <WeekHub />;
  if (state.nav.screen === 'scouting') return <Scouting />;
  return <DecisionReview />;
}

describe('Decision Review screen', () => {
  it('renders the canonical empty pregame guard', async () => {
    render(
      <WeekProvider repository={repositoryFor(createSeedState())}>
        <DecisionReview />
      </WeekProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'No game on film yet' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'The review opens after the final horn. There is nothing to grade until Friday night has been played.',
      ),
    ).toBeVisible();
  });

  it('renders six semantic rows and the local story, risk, and next-opponent cards', async () => {
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <ReviewRoutes />
      </WeekProvider>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Westfield 20 — 3 Central Catholic',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('main', { name: 'Decision review timeline' }),
    ).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(
      screen.getAllByRole('region', { name: 'Evidence and choice' }),
    ).toHaveLength(6);
    expect(
      screen.getAllByRole('region', { name: 'Practice at kickoff' }),
    ).toHaveLength(6);
    expect(
      screen.getAllByRole('region', {
        name: 'Decision, execution, and result',
      }),
    ).toHaveLength(6);
    expect(
      screen.getByRole('heading', {
        name: 'The risk you accepted — Return-game threat',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'THE WESTFIELD COURIER' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Next — Week 9 · at Riverside' }),
    ).toBeVisible();
  });

  it('deep-links tagged evidence and carries the hypothesis filter', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <ReviewRoutes />
      </WeekProvider>,
    );
    const first = await screen.findByRole('article', {
      name: /I-formation, twin tight ends/i,
    });
    await user.click(
      within(first).getByRole('button', { name: 'Open tagged evidence' }),
    );
    const tendency = await screen.findByRole('group', {
      name: 'Tendency filter',
    });
    expect(
      within(tendency).getByRole('button', { name: 'Power tendency' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/of 32 clips/i)).toBeVisible();
  });

  it('keeps coach rating distinct and explains agreement with the staff read', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <ReviewRoutes />
      </WeekProvider>,
    );
    const clock = await screen.findByRole('article', {
      name: /A heavy set you haven’t seen/i,
    });
    expect(within(clock).getByText('Decision · Debatable')).toBeVisible();
    await user.click(
      within(clock).getByRole('button', { name: 'Poor process' }),
    );
    expect(
      within(clock).getByText(
        'You and the staff split on this one — worth two minutes in Monday’s staff meeting.',
      ),
    ).toBeVisible();
  });

  it('enforces the lesson cap, closes with one lesson, and pins it on the Hub', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <ReviewRoutes />
      </WeekProvider>,
    );
    const close = await screen.findByRole('button', {
      name: 'Close out the week',
    });
    expect(close).toBeDisabled();
    const lessonButtons = screen.getAllByRole('button', {
      name: /^Save lesson:/,
    });
    await user.click(lessonButtons[0]!);
    expect(close).toBeEnabled();
    expect(
      document
        .querySelector('[data-cohort-note]')
        ?.getAttribute('data-cohort-note'),
    ).toBe('1 saved lesson ride to the Week 9 opponent board.');
    await user.click(close);
    expect(
      await screen.findByRole('heading', {
        name: 'Lessons pinned for Riverside',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: /Beat Central Catholic — Riverside is next/i,
      }),
    ).toBeVisible();
    const hubNote = document.querySelector('[data-cohort-note]');
    expect(hubNote).toHaveAttribute(
      'data-cohort-note',
      '1 saved lesson ride to the Week 9 opponent board.',
    );
  });

  it('shows the canonical swap message when a fourth lesson is attempted', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(finalState())}>
        <DecisionReview />
      </WeekProvider>,
    );
    const lessonButtons = await screen.findAllByRole('button', {
      name: /^Save lesson:/,
    });
    for (const button of lessonButtons.slice(0, 4)) await user.click(button);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Three lessons travel. More than that is a binder nobody opens — swap one out instead.',
    );
    expect(screen.getByText('3 of 3 saved')).toBeVisible();
    expect(
      document
        .querySelector('[data-cohort-note]')
        ?.getAttribute('data-cohort-note'),
    ).toBe('3 saved lessons ride to the Week 9 opponent board.');
  });

  it('exposes an empty cohort note until a lesson is saved, and keeps the Week 8 seed', async () => {
    const friday = webbPromoteConfirmed();
    const context = deriveTakeFieldContext(friday, scenario);
    expect(execSeedInputFor(context)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(context)).toBe(3_427_930_963);
    expect(execSeedFor(context)).toBe(execSeedFor(context));

    const played = finalState();
    expect(deriveCohortCarryOver(played).note).toBe('');
    expect([
      deriveMatch(played, WEEK_8_SCENARIO).wScore,
      deriveMatch(played, WEEK_8_SCENARIO).cScore,
    ]).toEqual([20, 3]);

    render(
      <WeekProvider repository={repositoryFor(played)}>
        <DecisionReview />
      </WeekProvider>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Westfield 20 — 3 Central Catholic',
      }),
    ).toBeVisible();
    expect(
      document
        .querySelector('[data-cohort-note]')
        ?.getAttribute('data-cohort-note'),
    ).toBe('');
  });
});
