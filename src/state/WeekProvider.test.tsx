import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { WeekRepository } from '../data/weekRepository.ts';
import type { WeekState } from '../domain/types.ts';
import { openFollowingWeekFrom } from '../domain/followingWeek.ts';
import { createSeedState } from '../domain/week.ts';
import { useWeek } from './weekContext.ts';
import { WeekProvider } from './WeekProvider.tsx';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function selectedText(state: WeekState): string {
  return state.selectedHypotheses.join(',') || 'none';
}

function WeekProbe() {
  const { state, scenario, dispatch } = useWeek();

  return (
    <>
      <output aria-label="Selected hypotheses">
        {selectedText(state.week)}
      </output>
      <output aria-label="Career week">
        {`${state.weekNumber} ${scenario.opponent.name}`}
      </output>
      <button
        type="button"
        onClick={() => dispatch({ type: 'toggle-priority', id: 'h1' })}
      >
        Toggle H1
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch(
            openFollowingWeekFrom(state.week, { wScore: 20, cScore: 3 }),
          )
        }
      >
        Open Week 9
      </button>
      <button type="button" onClick={() => dispatch({ type: 'reset-week' })}>
        Reset
      </button>
    </>
  );
}

describe('WeekProvider persistence boundary', () => {
  it('does not save the initial seed while a slow hydrate is pending', async () => {
    const pendingLoad = deferred<WeekState | null>();
    const stored: WeekState = {
      ...createSeedState(),
      selectedHypotheses: ['h1'],
    };
    const repo: WeekRepository = {
      name: 'Slow test adapter',
      persists: true,
      load: vi.fn(() => pendingLoad.promise),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    render(
      <WeekProvider repository={repo}>
        <WeekProbe />
      </WeekProvider>,
    );

    expect(screen.getByLabelText('Selected hypotheses')).toHaveTextContent(
      'none',
    );
    expect(repo.save).not.toHaveBeenCalled();

    await act(async () => {
      pendingLoad.resolve(stored);
      await pendingLoad.promise;
    });

    expect(screen.getByLabelText('Selected hypotheses')).toHaveTextContent(
      'h1',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('clears stored week state on reset so a reload returns to the seed', async () => {
    const user = userEvent.setup();
    let persisted: WeekState | null = null;
    const repo: WeekRepository = {
      name: 'Reset test adapter',
      persists: true,
      load: vi.fn(async () => persisted),
      save: vi.fn(async (_key, state) => {
        persisted = state;
      }),
      clear: vi.fn(async () => {
        persisted = null;
      }),
    };

    const first = render(
      <WeekProvider repository={repo}>
        <WeekProbe />
      </WeekProvider>,
    );

    await act(async () => {});
    await user.click(screen.getByRole('button', { name: /Toggle H1/i }));

    await waitFor(() => {
      expect(persisted?.selectedHypotheses).toEqual(['h1']);
    });

    await user.click(screen.getByRole('button', { name: /Reset/i }));

    await waitFor(() => {
      expect(repo.clear).toHaveBeenCalledTimes(1);
      expect(persisted).toBeNull();
    });
    expect(repo.save).not.toHaveBeenLastCalledWith(
      expect.anything(),
      createSeedState(),
    );

    first.unmount();
    render(
      <WeekProvider repository={repo}>
        <WeekProbe />
      </WeekProvider>,
    );

    await waitFor(() => {
      expect(repo.load).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByLabelText('Selected hypotheses')).toHaveTextContent(
      'none',
    );
  });

  it('persists Week 9 under a separate key and carries the lesson cohort', async () => {
    const user = userEvent.setup();
    const store = new Map<string, WeekState>([
      [
        'demo:8',
        {
          ...createSeedState(),
          reviewClosed: true,
          lessons: ['l_rt'],
        },
      ],
    ]);
    const repo: WeekRepository = {
      name: 'Career persist adapter',
      persists: true,
      load: vi.fn(async (key) => store.get(`${key.careerId}:${key.weekNumber}`) ?? null),
      save: vi.fn(async (key, week) => {
        store.set(`${key.careerId}:${key.weekNumber}`, week);
      }),
      clear: vi.fn(async (key) => {
        store.delete(`${key.careerId}:${key.weekNumber}`);
      }),
    };

    render(
      <WeekProvider repository={repo}>
        <WeekProbe />
      </WeekProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Career week')).toHaveTextContent(
        '8 Central Catholic',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Open Week 9' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Career week')).toHaveTextContent(
        '9 Riverside',
      );
    });
    expect(store.get('demo:9')?.lessons).toEqual(['l_rt']);
    expect(store.get('demo:8')?.reviewClosed).toBe(true);
  });
});
