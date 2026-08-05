import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import { localWeekRepository } from '../data/weekRepository.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

function hypothesisCard(name: string): HTMLElement {
  return screen.getByRole('article', { name: new RegExp(name, 'i') });
}

async function openGamePlan(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
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
      within(hypothesisCard(name)).getByRole('button', {
        name: /^Prioritize$/,
      }),
    );
  }
  await user.click(
    within(hypothesisCard('Return-game threat')).getByRole('button', {
      name: /Accept as this week’s risk/i,
    }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Lock the board · go to Game Plan' }),
  );
}

describe('canonical Week 8 Tactics surface', () => {
  it('renders all three exact tabs, Week 8 copy, answers, risk, and standing objectives', async () => {
    const user = userEvent.setup();
    await openGamePlan(user);

    expect(
      screen.getByRole('heading', { name: 'Tactics · Game Plan' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'One answer for each concern you prioritized · Central Catholic, Friday',
      ),
    ).toBeVisible();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Game Plan0/3',
      'Depth Chart',
      'Situational Policies4',
    ]);
    expect(
      within(screen.getByRole('region', { name: 'Accepted risk' })).getByText(
        'Return-game threat — Special Teams',
      ),
    ).toBeVisible();

    const priorityIds = new Set(['h1', 'h2', 'h3']);
    for (const answer of WEEK_8_SCENARIO.answers.filter((candidate) =>
      priorityIds.has(candidate.hypothesisId),
    )) {
      expect(
        screen.getByRole('button', { name: new RegExp(answer.name, 'i') }),
      ).toBeVisible();
    }
    expect(screen.getByText('Standing objectives')).toBeVisible();
    expect(
      screen.getByText('Right tackle protection with a backup'),
    ).toBeVisible();
    expect(
      screen.getByText('Third down and red-zone situational'),
    ).toBeVisible();
  });

  it('enforces one answer per priority, guards Practice, and exposes trace links and selected anatomy', async () => {
    const user = userEvent.setup();
    await openGamePlan(user);

    const power = hypothesisCard('Power tendency');
    await user.click(
      within(power).getByRole('button', {
        name: /Spill the puller, scrape Okafor over the top/i,
      }),
    );
    expect(
      within(power).getByRole('button', {
        name: /Spill the puller, scrape Okafor over the top/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(power).getByText('Primary unit')).toBeVisible();
    expect(within(power).getByText('What it exposes')).toBeVisible();
    expect(within(power).getByText('Counter-risk')).toBeVisible();
    expect(within(power).getByText('Valid now')).toBeVisible();

    await user.click(
      within(power).getByRole('button', {
        name: /Crowd the box — walk the strong safety down/i,
      }),
    );
    expect(
      within(power).getByRole('button', {
        name: /Spill the puller, scrape Okafor over the top/i,
      }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(power).getByRole('button', {
        name: /Crowd the box — walk the strong safety down/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      within(power).getByRole('button', { name: 'Practice plan' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Tactics · Game Plan' }),
    ).toBeVisible();

    await user.click(
      within(power).getByRole('button', { name: 'Show the evidence' }),
    );
    expect(
      screen.getByRole('heading', {
        name: 'Scouting · Central Catholic',
      }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: /Film Room/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows scheme invalidity, repairs it semantically, and completes the three-answer gate', async () => {
    const user = userEvent.setup();
    await openGamePlan(user);

    await user.click(
      screen.getByRole('button', {
        name: /Crowd the box — walk the strong safety down/i,
      }),
    );
    expect(screen.getByText('Invalid now')).toBeVisible();
    expect(
      screen.getAllByText(
        /You are running 4-2-5 — the fits do not carry over/i,
      ),
    ).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Switch to 46 Bear' }));
    expect(screen.getByText('Valid now')).toBeVisible();

    for (const answer of [
      /Squat the boundary corner, end contains flat-footed/i,
      /Trips flood — three levels at the curl-flat defender/i,
    ]) {
      await user.click(screen.getByRole('button', { name: answer }));
    }
    expect(
      screen.getByRole('region', { name: 'Game plan completion' }),
    ).toHaveTextContent('Every concern has a valid answer');
    expect(
      screen.getByText(
        'Game plan set — three answers, three practice objectives',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Build Practice Plan' }),
    ).toBeEnabled();
  });

  it('presents seeded depth-chart blockers and interactive policy status without opening later stages', async () => {
    const user = userEvent.setup();
    await openGamePlan(user);

    await user.click(screen.getByRole('tab', { name: 'Depth Chart' }));
    expect(
      screen.getByRole('heading', { name: 'Tactics · Depth Chart' }),
    ).toBeVisible();
    expect(screen.getByText('R. Kowalski')).toBeVisible();
    expect(screen.getByText('Ineligible Friday')).toBeVisible();
    expect(screen.getByText('Levi Webb')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Spread.*Active/i }),
    ).toBeDisabled();
    await user.click(
      within(screen.getByRole('group', { name: 'Depth chart unit' })).getByRole(
        'button',
        { name: 'Defense' },
      ),
    );
    expect(screen.getByText('S. Okafor')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: /Situational Policies/ }));
    expect(
      screen.getByRole('heading', { name: 'Tactics · Situational Policies' }),
    ).toBeVisible();
    const fourth = screen.getByRole('group', { name: 'Fourth down policy' });
    expect(
      within(fourth).getByRole('button', { name: 'Follow the chart' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(
      within(fourth).getByRole('button', {
        name: 'Go only on fourth and two or less',
      }),
    );
    expect(
      screen.getByText(
        'Changed from the staff default — follow the chart. D. Pruitt has been told.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Match Day' })).toBeEnabled();
  });
});
