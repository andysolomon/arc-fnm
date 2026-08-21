import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { WeekRepository } from '../data/weekRepository.ts';
import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { useWeek } from '../state/weekContext.ts';
import { ResetWeekButton } from './ResetWeekButton.tsx';

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Reset week fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

function LessonProbe() {
  const { state } = useWeek();
  return (
    <output aria-label="Saved lessons">
      {state.week.lessons.join(',') || 'none'}
    </output>
  );
}

function renderReset(week: WeekState) {
  return render(
    <WeekProvider repository={repositoryFor(week)}>
      <ResetWeekButton />
      <LessonProbe />
    </WeekProvider>,
  );
}

describe('Reset week confirm (REPLAY-2)', () => {
  it('resets immediately when no lessons are saved', async () => {
    const user = userEvent.setup();
    renderReset({
      ...createSeedState(),
      selectedHypotheses: ['h1'],
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Saved lessons')).toHaveTextContent('none');
    });

    await user.click(screen.getByRole('button', { name: 'Reset week' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Saved lessons')).toHaveTextContent('none');
  });

  it('asks before discarding saved lessons, and Keep the week leaves them', async () => {
    const user = userEvent.setup();
    renderReset({
      ...createSeedState(),
      lessons: ['l_rt'],
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Saved lessons')).toHaveTextContent('l_rt');
    });

    await user.click(screen.getByRole('button', { name: 'Reset week' }));

    const dialog = screen.getByRole('dialog', {
      name: 'Reset discards saved lessons',
    });
    expect(dialog).toHaveTextContent(
      'One saved lesson rides to the next opponent board',
    );

    await user.click(screen.getByRole('button', { name: 'Keep the week' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Saved lessons')).toHaveTextContent('l_rt');
  });

  it('resets the seeded week after Reset anyway, including saved lessons', async () => {
    const user = userEvent.setup();
    renderReset({
      ...createSeedState(),
      selectedHypotheses: ['h1'],
      lessons: ['l_rt', 'l_clock'],
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Saved lessons')).toHaveTextContent(
        'l_rt,l_clock',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Reset week' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('2 saved lessons');
    await user.click(screen.getByRole('button', { name: 'Reset anyway' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Saved lessons')).toHaveTextContent('none');
  });
});
