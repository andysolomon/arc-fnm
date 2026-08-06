import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import type { WeekRepository } from '../data/weekRepository.ts';
import { localWeekRepository } from '../data/weekRepository.ts';
import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { useWeek } from '../state/weekContext.ts';
import inboxSource from './Inbox.tsx?raw';
import { Inbox } from './Inbox.tsx';
import scheduleSource from './Schedule.tsx?raw';
import { Schedule } from './Schedule.tsx';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Supporting screen fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

function InboxRoutes() {
  const { state } = useWeek();
  if (state.nav.screen === 'academics') return <div>Academics source</div>;
  if (state.nav.screen === 'squad') return <div>Squad source</div>;
  if (state.nav.screen === 'week') return <div>Week source</div>;
  return <Inbox />;
}

function ScheduleRoutes() {
  const { state } = useWeek();
  if (state.nav.screen === 'week') return <div>Week source</div>;
  return <Schedule />;
}

describe('Inbox and Schedule shell routes', () => {
  it('makes both nav entries reachable and marks the selected surface', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    const inboxNav = within(primaryNav).getByRole('button', { name: /Inbox/i });
    const scheduleNav = within(primaryNav).getByRole('button', {
      name: 'Schedule',
    });
    expect(inboxNav).toBeEnabled();
    expect(scheduleNav).toBeEnabled();

    await user.click(inboxNav);
    expect(inboxNav).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('heading', { name: 'Inbox', level: 1 }),
    ).toBeVisible();

    await user.click(scheduleNav);
    expect(scheduleNav).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('heading', {
        name: 'Schedule · 2026 Season',
        level: 1,
      }),
    ).toBeVisible();
  });
});

describe('Inbox', () => {
  it('opens canonical list detail, marks unread mail read, and returns to the list', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(createSeedState())}>
        <Inbox />
      </WeekProvider>,
    );

    expect(screen.getByText('1 unread')).toBeVisible();
    const scoutMessage = screen.getByRole('button', {
      name: 'Unread: State U scout attending Friday’s game',
    });
    await user.click(scoutMessage);
    expect(screen.getByText('0 unread')).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'State U scout attending Friday’s game',
        level: 2,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /State University is sending an area scout to Friday's game/i,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: '← All messages' }));
    expect(scoutMessage).toBeInTheDocument();
  });

  it('shows the Thursday authority alerts and exact staff notes with source deep links', async () => {
    const user = userEvent.setup();
    const disrupted: WeekState = {
      ...createSeedState(),
      stage: 'disruption',
      practicePlanLocked: true,
    };
    render(
      <WeekProvider repository={repositoryFor(disrupted)}>
        <InboxRoutes />
      </WeekProvider>,
    );

    const kowalski = await screen.findByRole('button', {
      name: 'Unread: Eligibility alert: Ryan Kowalski',
    });
    expect(
      screen.getByRole('button', {
        name: 'Unread: Injury update: Hunter McCoy (FB)',
      }),
    ).toBeVisible();
    await user.click(kowalski);
    expect(
      screen.getByText(
        "Coach — Ryan Kowalski's grade in Algebra II dropped to a 58 this week, putting his GPA at 1.9. Per district policy he is ineligible for Friday's game against Central Catholic, effective immediately.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/McCoy can condition.*not a coaching decision/i),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Guidance Office' }));
    expect(screen.getByText('Academics source')).toBeVisible();
  });

  it('deep-links the trainer and staff sources to Squad and Week', async () => {
    const user = userEvent.setup();
    const disrupted: WeekState = {
      ...createSeedState(),
      stage: 'disruption',
      practicePlanLocked: true,
    };
    const view = render(
      <WeekProvider repository={repositoryFor(disrupted)}>
        <InboxRoutes />
      </WeekProvider>,
    );
    await user.click(
      await screen.findByRole('button', {
        name: 'Unread: Injury update: Hunter McCoy (FB)',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Athletic Trainer' }));
    expect(screen.getByText('Squad source')).toBeVisible();

    view.unmount();
    render(
      <WeekProvider repository={repositoryFor(disrupted)}>
        <InboxRoutes />
      </WeekProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Week' }));
    expect(screen.getByText('Week source')).toBeVisible();
  });

  it('collapses the list-detail stack at the 1024px narrow=phone||compact tier', () => {
    // Prototype semantics: narrow = phone || compact (vw < 1024). The list and
    // detail reflow to a side-by-side layout only at min-[1024px], so the stack
    // must persist through the compact (768–1023px) tier.
    expect(inboxSource).toContain('hidden min-[1024px]:block');
    // Above the breakpoint the message list is a fixed 380px rail.
    expect(inboxSource).toContain('min-[1024px]:w-[380px]');
    // The "← All messages" back button only exists while the panes are stacked,
    // so it is hidden once they sit side-by-side at min-[1024px].
    expect(inboxSource).toContain('min-[1024px]:hidden');
    // Guard against regressing the stack breakpoint back to the compact tier.
    expect(inboxSource).not.toContain('min-[768px]:w-[380px]');
    expect(inboxSource).not.toContain('min-[768px]:hidden');
  });
});

describe('Schedule', () => {
  it('renders exact Week 8, Week 9, opponents, results, and current states', async () => {
    render(
      <WeekProvider repository={repositoryFor(createSeedState())}>
        <Schedule />
      </WeekProvider>,
    );
    await act(async () => {});

    expect(
      screen.getByText('6-1 overall · 4-0 district · #2 in District 7-5A'),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Week 8 — vs Central Catholic' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Next — Week 9 · at Riverside',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Fri Oct 23 · away · 5-2 and winners of three straight/i,
      ),
    ).toBeVisible();

    const timeline = screen.getByRole('table', {
      name: 'Westfield 2026 opponents, sites, and results',
    });
    expect(within(timeline).getByText('Permian Ridge')).toBeVisible();
    expect(within(timeline).getByText('W 24–13')).toBeVisible();
    expect(
      within(timeline).getByRole('row', { name: /8 Oct 16 Central Catholic/i }),
    ).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Westfield').closest('li')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('deep-links the current schedule card back to Week', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(createSeedState())}>
        <ScheduleRoutes />
      </WeekProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Open Week' }));
    expect(await screen.findByText('Week source')).toBeVisible();
  });

  it('uses semantic responsive state without entropy or unsafe rendering sinks', () => {
    expect(inboxSource).toContain('data-responsive-layout="list-detail-stack"');
    expect(scheduleSource).toContain(
      'data-responsive-layout="wrapping-cards-scroll-table"',
    );
    for (const source of [inboxSource, scheduleSource]) {
      expect(source).not.toContain('Math.random');
      expect(source).not.toContain('Date(');
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toContain('<svg');
    }
  });
});
