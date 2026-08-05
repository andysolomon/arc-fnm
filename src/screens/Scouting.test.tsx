import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import { localWeekRepository } from '../data/weekRepository.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

async function openFilmRoom(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(
    screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
  );
  await user.click(
    within(
      screen.getByRole('region', {
        name: /Choose three opponent concerns worth practice time/i,
      }),
    ).getByRole('button', { name: /^Open Film Room$/i }),
  );
}

function hypothesisCard(name: string): HTMLElement {
  return screen.getByRole('article', { name: new RegExp(name, 'i') });
}

describe('canonical Scouting surface', () => {
  it('ports all four tabs and the canonical overview and assignments anatomy', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);

    expect(
      screen
        .getAllByRole('tab')
        .map((tab) => tab.textContent?.replace(/\d.*$/, '')),
    ).toEqual(['Overview', 'Film Room', 'Hypotheses', 'Assignments']);

    await user.click(screen.getByRole('tab', { name: /^Overview$/ }));
    expect(
      screen.getByRole('heading', { name: 'Central Catholic Crusaders' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Run 62 · Pass 38')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Assignments$/ }));
    expect(
      screen.getByRole('heading', { name: 'Scout assignments · this week' }),
    ).toBeInTheDocument();
    const jv = screen.getByRole('region', {
      name: /Central Catholic JV game/i,
    });
    await user.click(within(jv).getByRole('button', { name: 'K. Ames' }));
    expect(within(jv).getByText(/Ames misses Thursday/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Hypotheses/ }));
    expect(
      screen.getByRole('heading', { name: /Prioritize 3 more concerns/i }),
    ).toBeInTheDocument();
  });

  it('shows all 32 clips, explicit relationship text, and the canonical selected viewer', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);

    expect(screen.getByText(/Showing 32 of 32 clips · 3 games/i)).toBeVisible();
    expect(WEEK_8_SCENARIO.clips).toHaveLength(32);
    expect(
      screen.getByRole('button', { name: /c04.*Power right.*Supports/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /c06.*Pocket pass.*Contradicts/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /c27.*Run stuff.*Untagged/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('c04 · Tight angle')).toBeVisible();
    expect(screen.getByText('Tight + Wide')).toBeVisible();

    await user.click(
      within(
        screen.getByRole('group', { name: 'Power tendency relationship' }),
      ).getByRole('button', { name: 'Contradicts' }),
    );
    expect(
      screen.getByRole('button', { name: /c04.*Power right.*Contradicts/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('edited')).toBeVisible();
  });

  it('exposes and applies all eight filter dimensions', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);

    const choices: readonly [string, string][] = [
      ['Side', 'Offense'],
      ['Situation', 'Early down'],
      ['Personnel', '21 pers'],
      ['Formation', 'I-Form Twin'],
      ['Motion', 'Jet'],
      ['Concept', 'Power right'],
      ['Result', 'TD'],
      ['Tendency', 'Power tendency'],
    ];

    for (const [groupName, choice] of choices) {
      const group = screen.getByRole('group', {
        name: `${groupName} filter`,
      });
      const option = within(group).getByRole('button', { name: choice });
      await user.click(option);
      expect(option).toHaveAttribute('aria-pressed', 'true');
      await user.click(
        screen.getByRole('button', { name: 'Clear all filters' }),
      );
    }
  });

  it('clears no-match filters and guards both the viewer and selected clip', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);

    await user.click(
      within(screen.getByRole('group', { name: 'Side filter' })).getByRole(
        'button',
        { name: 'Defense' },
      ),
    );
    expect(screen.getByText('c01 · Tight angle')).toBeVisible();

    await user.click(
      within(screen.getByRole('group', { name: 'Personnel filter' })).getByRole(
        'button',
        { name: 'KO unit' },
      ),
    );
    expect(screen.getByText(/No clips match these filters/i)).toBeVisible();
    expect(
      screen.getByText(
        /viewer, coach-note editor, and relationship editor are hidden/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText(/Showing 32 of 32 clips/i)).toBeVisible();
    expect(screen.getByText('c04 · Tight angle')).toBeVisible();
  });

  it('links hypothesis evidence to Film Room and shows confidence, sample, and missing evidence', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);
    await user.click(screen.getByRole('tab', { name: /Hypotheses/ }));

    const power = hypothesisCard('Power tendency');
    expect(within(power).getByText('Confidence')).toBeVisible();
    expect(within(power).getByText('Sample')).toBeVisible();
    expect(within(power).getByText(/What is missing/i)).toBeVisible();
    expect(within(power).getByText(/odd front/i)).toBeVisible();
    await user.click(
      within(power).getByRole('button', { name: /Show the 11 clips/i }),
    );
    expect(screen.getByText(/Showing 11 of 32 clips/i)).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: 'Tendency filter' })).getByRole(
        'button',
        { name: 'Power tendency' },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('preserves Hold, Reject, priority, accepted-risk, and ready-only Game Plan outcomes', async () => {
    const user = userEvent.setup();
    await openFilmRoom(user);
    await user.click(screen.getByRole('tab', { name: /Hypotheses/ }));

    const power = hypothesisCard('Power tendency');
    await user.click(within(power).getByRole('button', { name: /^Hold$/ }));
    expect(within(power).getByText('On hold')).toBeVisible();
    expect(
      within(power).getByRole('button', { name: /^Prioritize$/ }),
    ).toBeDisabled();
    await user.click(
      within(power).getByRole('button', { name: /Remove hold/i }),
    );
    await user.click(within(power).getByRole('button', { name: /^Reject$/ }));
    expect(within(power).getByText('Rejected')).toBeVisible();
    await user.click(
      within(power).getByRole('button', { name: /Undo reject/i }),
    );

    for (const name of [
      'Power tendency',
      'Sprint-out response',
      'Cover 3 leverage',
    ]) {
      await user.click(
        within(hypothesisCard(name)).getByRole('button', {
          name: /^Prioritize$/,
        }),
      );
    }
    expect(
      screen.queryByRole('button', { name: /Lock the board/i }),
    ).not.toBeInTheDocument();
    await user.click(
      within(hypothesisCard('Return-game threat')).getByRole('button', {
        name: /Accept as this week’s risk/i,
      }),
    );
    const lock = screen.getByRole('button', {
      name: 'Lock the board · go to Game Plan',
    });
    expect(lock).toBeEnabled();
    await user.click(lock);
    expect(
      screen.getByRole('heading', {
        name: /Tactics · Game Plan/i,
      }),
    ).toBeVisible();
  });
});
