import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App.tsx';
import shellSource from './components/AppShell.tsx?raw';
import { convexUrl, localWeekRepository } from './data/weekRepository.ts';
import { WEEK_8_SCENARIO } from './domain/scenario.ts';
import cssSource from './index.css?raw';
import weekSource from './screens/WeekHub.tsx?raw';

/** Clear the shared session store so each test starts from the seeded week. */
beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function cardFor(name: string): HTMLElement {
  return screen.getByRole('article', { name: new RegExp(name, 'i') });
}

async function enterWeek(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
  );
}

async function completeEvidence(user: ReturnType<typeof userEvent.setup>) {
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
      within(cardFor(name)).getByRole('button', { name: /^Prioritize$/ }),
    );
  }
  await user.click(
    within(cardFor('Return-game threat')).getByRole('button', {
      name: /Accept as this week/i,
    }),
  );
}

async function completeGamePlan(user: ReturnType<typeof userEvent.setup>) {
  for (const answer of [
    /Spill the puller, scrape Okafor over the top/i,
    /Squat the boundary corner, end contains flat-footed/i,
    /Trips flood — three levels at the curl-flat defender/i,
  ]) {
    await user.click(screen.getByRole('button', { name: answer }));
  }
}

describe('local demo adapter', () => {
  it('runs with no VITE_CONVEX_URL configured', () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://ambient.invalid');
    expect(convexUrl()).toBe('https://ambient.invalid');

    vi.stubEnv('VITE_CONVEX_URL', '');
    expect(convexUrl()).toBeNull();
    expect(localWeekRepository.persists).toBe(false);

    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: 'Friday Night Manager',
        level: 1,
      }),
    ).toBeInTheDocument();
  });
});

describe('career start → week hub → hypotheses', () => {
  it('starts the seeded Week 8 and lands on the Week hub', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);

    expect(
      screen.getByRole('heading', {
        name: /Coaching Week · Central Catholic/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing prioritized yet/i)).toBeInTheDocument();
  });

  it('walks the evidence gate: 3 priorities plus one accepted risk', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
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
        within(cardFor(name)).getByRole('button', { name: /^Prioritize$/ }),
      );
    }

    // The board is full: the fourth can no longer be prioritized, only risked.
    const returnGame = cardFor('Return-game threat');
    expect(
      within(returnGame).getByRole('button', { name: /^Prioritize$/ }),
    ).toBeDisabled();
    expect(
      within(returnGame).getByText(/already prioritized/i),
    ).toBeInTheDocument();

    await user.click(
      within(returnGame).getByRole('button', { name: /Accept as this week/i }),
    );

    expect(
      screen.getByText(/Board set — 3 concerns prioritized/i),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Week' }));
    const riskCard = screen.getByRole('region', { name: /Accepted risk/i });
    expect(
      within(riskCard).getByText(/Return-game threat — Special Teams/i),
    ).toBeInTheDocument();
    expect(
      within(riskCard).getByText(/stays on this page all week/i),
    ).toBeInTheDocument();
  });

  it('marks the plan stage as current once the evidence gate closes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);

    const stageList = screen.getByRole('navigation', { name: /Week stages/i });
    expect(
      within(stageList).getByText('Film & evidence').closest('button'),
    ).toHaveAttribute('aria-current', 'step');

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
        within(cardFor(name)).getByRole('button', { name: /^Prioritize$/ }),
      );
    }
    await user.click(
      within(cardFor('Return-game threat')).getByRole('button', {
        name: /Accept as this week/i,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Week' }));
    const stages = screen.getByRole('navigation', { name: /Week stages/i });
    expect(
      within(stages).getByText('Game plan').closest('button'),
    ).toHaveAttribute('aria-current', 'step');
  });

  it('restores the seeded baseline with Reset week', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Prioritize concerns/i,
      }),
    );
    await user.click(
      within(cardFor('Power tendency')).getByRole('button', {
        name: /^Prioritize$/,
      }),
    );

    expect(
      within(cardFor('Power tendency')).getByRole('button', {
        name: /Remove priority/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset week/i }));

    expect(
      screen.getByRole('heading', {
        name: /Coaching Week · Central Catholic/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing prioritized yet/i)).toBeInTheDocument();
  });
});

describe('film room', () => {
  it('filters the tagged clips by hypothesis', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
    await user.click(
      within(
        screen.getByRole('region', {
          name: /Choose three opponent concerns worth practice time/i,
        }),
      ).getByRole('button', { name: /^Open Film Room$/i }),
    );
    expect(screen.getByText(/32 of 32 clips/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Power tendency/i }));

    const powerClips = WEEK_8_SCENARIO.clips.filter(
      (clip) => clip.hypothesisId === 'h1',
    ).length;
    expect(
      screen.getByText(new RegExp(`${powerClips} of 32 clips`, 'i')),
    ).toBeInTheDocument();
  });
});

describe('Game Plan → Practice Plan', () => {
  it('deep-links from evidence, announces plan status, and opens Practice only when clean', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
    expect(
      screen.getByRole('button', { name: /Tactics.*Locked/i }),
    ).toBeDisabled();

    await completeEvidence(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Set answers · 0\/3/i,
      }),
    );

    expect(
      screen.getByRole('heading', { name: /Tactics · Game Plan/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Plan incomplete · 0/3 answers set',
    );
    expect(
      screen.getByText(/Return-game threat — Special Teams/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Sky kick to the pylon/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Training.*Locked/i }),
    ).toBeDisabled();

    await completeGamePlan(user);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Plan complete · 3/3 answers set',
    );
    expect(screen.getByRole('button', { name: /^Training8$/ })).toBeEnabled();
    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Allocate practice · 0\/8/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Build Practice Plan/i }),
    );
    expect(
      screen.getByRole('heading', {
        name: /Practice · Week 8/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/0 of 8 blocks placed/i)[0]).toBeVisible();
  });

  it('allocates eight fixed-capacity blocks, locks once, and keeps future stages guarded', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
    await completeEvidence(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Set answers/i,
      }),
    );
    await completeGamePlan(user);
    await user.click(
      screen.getByRole('button', { name: /Build Practice Plan/i }),
    );

    await user.click(
      within(cardFor('Third down and red-zone situational')).getByRole(
        'button',
        {
          name: /Place a block/i,
        },
      ),
    );
    for (const [day, capacity] of [
      ['MON', 2],
      ['TUE', 3],
      ['WED', 2],
      ['THU', 1],
    ] as const) {
      for (let block = 1; block <= capacity; block += 1) {
        await user.click(
          screen.getByRole('button', {
            name: new RegExp(
              `Place Third down and red-zone situational on ${day}, block ${block}`,
              'i',
            ),
          }),
        );
      }
    }

    expect(screen.getAllByText(/8 of 8 blocks placed/i)[0]).toBeVisible();
    const lock = screen.getByRole('button', {
      name: /^Lock the practice plan$/i,
    });
    expect(lock).toBeEnabled();
    await user.click(lock);

    expect(screen.getByRole('button', { name: 'Plan locked' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Remove .* from/i }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole(
        'button',
        { name: 'Schedule' },
      ),
    ).toBeEnabled();
    expect(screen.getByText(/Decided by Guidance Office/i)).toBeVisible();
    expect(screen.getByText(/Decided by Athletic Trainer/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^Week$/ }));
    const constraints = screen.getByRole('region', { name: 'Constraints' });
    expect(within(constraints).getByText('Ryan Kowalski · RT')).toBeVisible();
    expect(within(constraints).getByText('Hunter McCoy · FB')).toBeVisible();
    expect(
      within(constraints).getByText('Authority · Guidance Office'),
    ).toBeVisible();
    expect(
      within(constraints).getByText('Authority · Athletic Trainer'),
    ).toBeVisible();
    expect(screen.getByText(/Kowalski is out for Friday/i)).toBeVisible();
    expect(
      screen.getByText(/That one is not a coaching decision/i),
    ).toBeVisible();
    const disruption = screen.getByRole('region', {
      name: /Right tackle is open for Friday/i,
    });
    const openDepth = within(disruption).getByRole('button', {
      name: 'Open Depth Chart',
    });
    expect(openDepth).toBeEnabled();
    await user.click(openDepth);

    const confirm = screen.getByRole('button', {
      name: 'Confirm Friday personnel',
    });
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: /Levi Webb.*OT.*62 OVR/i }),
    );
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: /Promote and rep the backup/i }),
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(
      screen.getByRole('button', { name: 'Thursday resolution confirmed' }),
    ).toBeDisabled();
    expect(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Decision Room/i,
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^Week$/ }));
    expect(
      screen.getByText(/Protection reps count again, with Levi Webb/i),
    ).toBeVisible();

    const primary = screen.getByRole('navigation', { name: 'Primary' });
    await user.click(
      within(primary).getByRole('button', { name: /^Academics$/ }),
    );
    expect(
      screen.getByRole('heading', {
        name: /Eligibility alert: Ryan Kowalski/i,
      }),
    ).toBeVisible();
    expect(screen.getByText(/Guidance Office’s call/i)).toBeVisible();

    await user.click(within(primary).getByRole('button', { name: /^Squad$/ }));
    expect(
      screen.getByRole('heading', { name: /Injury update: Hunter McCoy/i }),
    ).toBeVisible();
    expect(screen.getAllByText('No contact').length).toBeGreaterThan(0);
  });

  it('reset clears active answers and returns a guarded plan to the Week hub', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enterWeek(user);
    await completeEvidence(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Set answers/i,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: /Spill the puller, scrape Okafor over the top/i,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Plan incomplete · 1/3 answers set',
    );

    await user.click(screen.getByRole('button', { name: /Reset week/i }));

    expect(
      screen.getByRole('heading', {
        name: /Coaching Week · Central Catholic/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tactics.*Locked/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Nothing prioritized yet/i)).toBeInTheDocument();
  });
});

describe('canonical management shell and Week Hub parity', () => {
  it('renders the exact program, coach, date, game, and six-stage context', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterWeek(user);

    const banner = screen.getByRole('banner');
    expect(within(banner).getByText('Westfield Wildcats')).toBeVisible();
    expect(
      within(banner).getByText('Head Coach · Varsity Football'),
    ).toBeVisible();
    expect(within(banner).getByText('Oct 12, 2026')).toBeVisible();
    expect(within(banner).getByText(/Week 8/)).toBeVisible();
    expect(within(banner).getByText(/Monday · Film & evidence/)).toBeVisible();
    expect(
      screen.getByText(
        'Westfield 6–1 (#2) vs Central Catholic 7–0 (#1) · Friday Oct 16, 7:30 PM · Wildcat Stadium',
      ),
    ).toBeVisible();

    const timeline = screen.getByRole('navigation', { name: 'Week stages' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(6);
    for (const label of [
      'Film & evidence',
      'Game plan',
      'Practice plan',
      'Depth & availability',
      'Game night',
      'Decision review',
    ]) {
      expect(within(timeline).getByText(label)).toBeVisible();
    }
    expect(
      within(timeline).getByText('Film & evidence').closest('button'),
    ).toHaveAttribute('aria-current', 'step');
  });

  it('renders every canonical Week section and advances its decision CTA copy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterWeek(user);

    for (const name of [
      'Choose three opponent concerns worth practice time',
      'Preparation objectives',
      'What changed since yesterday',
      'Constraints',
      'Accepted risk',
      'From the staff',
    ]) {
      expect(screen.getByRole('region', { name })).toBeVisible();
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(7);

    await completeEvidence(user);
    await user.click(screen.getByRole('button', { name: /^Week$/ }));
    expect(
      screen.getByRole('region', {
        name: 'Pick one answer for each concern you prioritized',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Open Game Plan' }),
    ).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Open Game Plan' }));
    await completeGamePlan(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Allocate practice/i,
      }),
    );
    await user.click(screen.getByRole('button', { name: /^Week$/ }));
    const practiceDecision = screen.getByRole('region', {
      name: 'Allocate eight opponent-plan blocks',
    });
    expect(practiceDecision).toBeVisible();
    expect(
      within(practiceDecision).getByRole('button', {
        name: 'Open Practice Plan',
      }),
    ).toBeEnabled();
  });

  it('restores canonical Week landing navigation and the seeded decision baseline', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterWeek(user);
    await completeEvidence(user);
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: /Continue · Set answers/i,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: /Spill the puller, scrape Okafor over the top/i,
      }),
    );

    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Reset week',
      }),
    );

    expect(
      screen.getByRole('heading', { name: /Coaching Week/ }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^Week3$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('No risk accepted yet.')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Tactics.*Locked/i }),
    ).toBeDisabled();
  });

  it('implements the drawer dialog, focus containment, main hiding, and Escape contract', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterWeek(user);

    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'primary-nav-drawer');
    await user.click(toggle);

    const dialog = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(dialog).toHaveAttribute('id', 'primary-nav-drawer');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: /^Week3$/ }),
      ).toHaveFocus(),
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      screen.getByRole('button', { name: 'Open navigation' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Open navigation' }),
      ).toHaveFocus(),
    );
  });

  it('keeps canonical selected states and visibly explains guarded surfaces', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterWeek(user);

    expect(screen.getByRole('button', { name: /^Week3$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByText('Not ported')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Boosters' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'School' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Inbox1/i })).toBeEnabled();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole(
        'button',
        { name: 'Schedule' },
      ),
    ).toBeEnabled();
    const matchDay = screen.getByRole('button', { name: 'Match Day' });
    expect(matchDay).toBeEnabled();
    await user.click(matchDay);
    expect(
      screen.getByRole('heading', { name: 'Kickoff is Friday night' }),
    ).toBeVisible();

    for (const path of document.querySelectorAll('svg path')) {
      expect(path.getAttribute('d')).toMatch(/^[a-zA-Z0-9.,\s-]+$/);
    }
  });

  it('keeps the canonical 1440/1024 rail and 768/390 drawer tiers in source without entropy claims', () => {
    for (const tier of ['1440', '1024', '768', '390']) {
      expect(`${shellSource}\n${cssSource}`).toContain(tier);
    }
    expect(shellSource).toContain('role="dialog"');
    expect(shellSource).toContain('aria-hidden={drawerOpen || undefined}');
    expect(`${shellSource}\n${weekSource}`).not.toMatch(
      /Math\.random|Date\.now|dangerouslySetInnerHTML|browser verified|visual verification/i,
    );
    expect(shellSource).not.toMatch(/<path\s+d=\{/);
  });
});
