import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import { localWeekRepository } from '../data/weekRepository.ts';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

function objective(name: string): HTMLElement {
  return screen.getByRole('article', { name: new RegExp(name, 'i') });
}

async function openCleanPractice(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
  );
  await user.click(
    within(screen.getByRole('banner')).getByRole('button', {
      name: /Continue · Prioritize concerns/i,
    }),
  );
  for (const name of [
    'Power tendency',
    'Sprint-out response',
    'Cover 3 leverage',
  ]) {
    await user.click(
      within(objective(name)).getByRole('button', { name: /^Prioritize$/ }),
    );
  }
  await user.click(
    within(objective('Return-game threat')).getByRole('button', {
      name: /Accept as this week/i,
    }),
  );
  await user.click(
    within(screen.getByRole('banner')).getByRole('button', {
      name: /Continue · Set answers/i,
    }),
  );
  for (const answer of [
    /Spill the puller, scrape Okafor over the top/i,
    /Squat the boundary corner, end contains flat-footed/i,
    /Trips flood — three levels at the curl-flat defender/i,
  ]) {
    await user.click(screen.getByRole('button', { name: answer }));
  }
  await user.click(
    screen.getByRole('button', { name: /Build Practice Plan/i }),
  );
}

describe('canonical Training parity', () => {
  it('renders exact tabs, four fixed periods, eight slots, six traced objectives, and Development', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCleanPractice(user);

    expect(
      screen.getByRole('heading', { name: 'Practice · Week 8', level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Monday–Thursday script · preparing for Central Catholic (Fri)',
      ),
    ).toBeVisible();

    const tabs = screen.getByRole('tablist', { name: 'Training sections' });
    expect(within(tabs).getAllByRole('tab')).toHaveLength(2);
    expect(
      within(tabs).getByRole('tab', { name: 'Practice Plan' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(tabs).getByRole('tab', { name: 'Development' }),
    ).toBeVisible();

    const expectedDays = [
      ['MON · Oct 12', 'Helmets', '1h 15m', 2],
      ['TUE · Oct 13', 'Full pads', '1h 30m', 3],
      ['WED · Oct 14', 'Shells', '1h 20m', 2],
      ['THU · Oct 15', 'Walk-through', '55m', 1],
    ] as const;
    for (const [name, pads, duration, capacity] of expectedDays) {
      const day = screen.getByRole('article', { name });
      expect(within(day).getByText(pads)).toBeVisible();
      expect(within(day).getByText(duration)).toBeVisible();
      expect(within(day).getAllByRole('button')).toHaveLength(capacity);
      expect(within(day).getByText(`0 of ${capacity}`)).toBeVisible();
    }
    expect(screen.getAllByText('Fixed script')).toHaveLength(4);
    expect(screen.getAllByText('Opponent plan')).toHaveLength(4);
    expect(
      within(
        screen.getByRole('region', {
          name: 'Objectives competing for the plan',
        }),
      ).getAllByRole('article'),
    ).toHaveLength(6);
    expect(
      within(objective('Puller recognition')).getByText(
        /9 supporting clips, 2 against · 41 snaps across 3 games/i,
      ),
    ).toBeVisible();
    expect(
      within(objective('Kick coverage lane discipline')).getByText(
        'Accepted risk',
      ),
    ).toBeVisible();
    expect(
      within(objective('Puller recognition')).getByText(
        /only Tuesday full pads can create a live rep/i,
      ),
    ).toBeVisible();

    await user.click(within(tabs).getByRole('tab', { name: 'Development' }));
    expect(
      screen.getByRole('heading', {
        name: 'Individual development · Week 8',
      }),
    ).toBeVisible();
    expect(
      screen.getByText('Runs underneath the opponent plan every week'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('resets to staff allocation, saves and dirties a draft, undoes, toggles Tuesday contact, and locks', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCleanPractice(user);

    await user.click(
      screen.getByRole('button', { name: 'Reset to staff plan' }),
    );
    expect(screen.getAllByText(/8 of 8 blocks placed/i)[0]).toBeVisible();
    expect(screen.getByText(/Unsaved changes · save a draft/i)).toBeVisible();
    expect(
      screen.getAllByRole('button', { name: 'Take it to thud' }),
    ).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Draft saved · no unsaved changes.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^Week$/ }));
    await user.click(screen.getByRole('button', { name: /^Training0$/ }));
    expect(screen.getByText('Draft saved · no unsaved changes.')).toBeVisible();

    const remove = screen.getByRole('button', { name: /Remove .* from THU/i });
    await user.click(remove);
    expect(
      screen.getByText('Unsaved changes since the saved draft.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Draft saved · no unsaved changes.')).toBeVisible();

    await user.click(
      screen.getAllByRole('button', { name: 'Take it to thud' })[0]!,
    );
    expect(screen.getByRole('button', { name: 'Take it live' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    await user.click(
      screen.getByRole('button', { name: 'Lock the practice plan' }),
    );
    expect(screen.getByRole('button', { name: 'Plan locked' })).toBeDisabled();
    expect(
      screen.getByRole('region', { name: 'What Friday looks like' }),
    ).toBeVisible();
    expect(screen.getByText('Decided by Guidance Office')).toBeVisible();
    expect(screen.getByText('Decided by Athletic Trainer')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Remove .* from/i }),
    ).toBeNull();
  });
});
