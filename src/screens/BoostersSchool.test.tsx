import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import shellSource from '../components/AppShell.tsx?raw';
import type { WeekRepository } from '../data/weekRepository.ts';
import { localWeekRepository } from '../data/weekRepository.ts';
import {
  BOOSTER_CAMERA_AUTHORITY,
  boosterCameraNote,
} from '../domain/boosterFunding.ts';
import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import boostersSource from './Boosters.tsx?raw';
import { Boosters } from './Boosters.tsx';
import schoolSource from './School.tsx?raw';
import { School } from './School.tsx';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

function repositoryFor(week: WeekState | null): WeekRepository {
  return {
    name: 'Boosters fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

/**
 * The Boosters screen reads the persisted camera answer, so it needs a week.
 * A null fixture is a repository miss, which leaves the seeded week standing.
 */
function renderBoosters(week: WeekState | null = null) {
  return render(
    <WeekProvider repository={repositoryFor(week)}>
      <Boosters />
    </WeekProvider>,
  );
}

describe('Boosters and School shell routes', () => {
  it('makes both main-nav entries active, reachable, and selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
    );

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    const boostersNav = within(primaryNav).getByRole('button', {
      name: 'Boosters',
    });
    const schoolNav = within(primaryNav).getByRole('button', {
      name: 'School',
    });
    expect(boostersNav).toBeEnabled();
    expect(schoolNav).toBeEnabled();

    await user.click(boostersNav);
    expect(boostersNav).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('heading', { name: 'Boosters', level: 1 }),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Approve End-zone camera' }),
    );
    await user.click(screen.getByRole('button', { name: 'Reset week' }));
    const resetPrimaryNav = screen.getByRole('navigation', { name: 'Primary' });
    await user.click(
      within(resetPrimaryNav).getByRole('button', { name: 'Boosters' }),
    );
    expect(
      screen.getByRole('button', { name: 'Approve End-zone camera' }),
    ).toBeEnabled();

    const resetSchoolNav = within(resetPrimaryNav).getByRole('button', {
      name: 'School',
    });
    await user.click(resetSchoolNav);
    expect(resetSchoolNav).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('heading', {
        name: 'Westfield High School',
        level: 1,
      }),
    ).toBeVisible();

    const context = screen.getByRole('contentinfo', {
      name: 'Program context',
    });
    expect(context).toHaveTextContent('vs. Central Catholic (Fri)');
    expect(context).toHaveTextContent('Record 6-1');
    expect(context).toHaveTextContent('District Rank #2');
    expect(context).toHaveTextContent('Team Morale High');
    expect(context).toHaveTextContent('Booster Fund $12,400');
  });
});

describe('Boosters', () => {
  it('renders the exact club stats, funding requests, key boosters, and upcoming events', () => {
    renderBoosters();

    expect(
      screen.getByText('Westfield Gridiron Club · 214 members'),
    ).toBeVisible();
    expect(screen.getByText('$12,400')).toBeVisible();
    expect(screen.getByText('$31,900')).toBeVisible();
    expect(screen.getByText('Club sentiment · 6-1 helps')).toBeVisible();

    const requests = screen.getByRole('region', { name: 'Funding Requests' });
    expect(
      within(requests).getByText('Weight room racks & platforms'),
    ).toBeVisible();
    expect(
      within(requests).getByText(
        'Board vote passed 12–3 · install on bye week',
      ),
    ).toBeVisible();
    expect(
      within(requests).getByText('Charter bus — playoff travel'),
    ).toBeVisible();
    expect(
      within(requests).getByText('Regional rounds are 200+ miles out'),
    ).toBeVisible();
    expect(within(requests).getByText('End-zone camera')).toBeVisible();
    expect(
      within(requests).getByText('Film room request from Coach Soto'),
    ).toBeVisible();
    expect(within(requests).getByText('Friday team meals')).toBeVisible();
    expect(
      within(requests).getByText('Pre-game · Delgado Motors sponsors half'),
    ).toBeVisible();

    const keyBoosters = screen.getByRole('region', { name: 'Key Boosters' });
    for (const text of [
      'Frank Delgado',
      'Delgado Motors',
      'Wants the halftime check moment Friday — say yes',
      'Patty Nguyen',
      'Nguyen Realty',
      'Underwrites film software · renews in Dec',
      'Earl Hodges',
      'Hodges Feed & Supply',
      'Still sore the Wing-T got shelved',
    ]) {
      expect(within(keyBoosters).getByText(text)).toBeVisible();
    }
    expect(
      screen.getByText('Halftime check presentation — weight room'),
    ).toBeVisible();
    expect(screen.getByText('Booster BBQ at Delgado Motors')).toBeVisible();
  });

  it('gives each pending request independent Approve and Later outcomes', async () => {
    const user = userEvent.setup();
    renderBoosters();

    const requests = screen.getByRole('region', { name: 'Funding Requests' });
    await user.click(
      within(requests).getByRole('button', {
        name: 'Approve Charter bus — playoff travel',
      }),
    );
    expect(
      within(requests).getByText('Charter bus — playoff travel').closest('li'),
    ).toHaveTextContent('Approved');
    expect(
      within(requests).queryByRole('button', {
        name: 'Decide later on Charter bus — playoff travel',
      }),
    ).not.toBeInTheDocument();

    await user.click(
      within(requests).getByRole('button', {
        name: 'Decide later on End-zone camera',
      }),
    );
    expect(
      within(requests).getByText('End-zone camera').closest('li'),
    ).toHaveTextContent('Deferred · Nov board');
    expect(
      within(requests).queryByRole('button', {
        name: 'Approve End-zone camera',
      }),
    ).not.toBeInTheDocument();
  });
});

describe('the end-zone camera as a Coaching Decision', () => {
  it('hydrates the row from the answer already on file, not from screen state', async () => {
    renderBoosters({
      ...createSeedState(),
      boosterFunding: { camera: 'approved' },
    });

    // The answer arrives with the hydrated week, not with the first paint.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Approve End-zone camera' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('End-zone camera').closest('li')).toHaveTextContent(
      'Approved',
    );
    // The three session-only requests are untouched by the camera answer.
    expect(
      screen.getByText('Charter bus — playoff travel').closest('li'),
    ).toHaveTextContent('$2,400');
    expect(
      screen.getByRole('button', {
        name: 'Approve Charter bus — playoff travel',
      }),
    ).toBeEnabled();
  });

  it('keeps the camera answer once the coach leaves the screen, unlike the charter bus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
    );
    const nav = () => screen.getByRole('navigation', { name: 'Primary' });
    await user.click(within(nav()).getByRole('button', { name: 'Boosters' }));

    await user.click(
      screen.getByRole('button', { name: 'Approve End-zone camera' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Decide later on Charter bus — playoff travel',
      }),
    );
    await user.click(within(nav()).getByRole('button', { name: 'School' }));
    await user.click(within(nav()).getByRole('button', { name: 'Boosters' }));

    const requests = screen.getByRole('region', { name: 'Funding Requests' });
    expect(
      within(requests).getByText('End-zone camera').closest('li'),
    ).toHaveTextContent('Approved');
    // The charter bus was session UI, so remounting returns it to pending.
    expect(
      within(requests).getByRole('button', {
        name: 'Approve Charter bus — playoff travel',
      }),
    ).toBeEnabled();
  });

  it('echoes Soto’s consequence on the Week hub once the camera is answered', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
    );
    const nav = () => screen.getByRole('navigation', { name: 'Primary' });

    const staff = () => screen.getByRole('region', { name: 'From the staff' });
    expect(staff()).not.toHaveTextContent(boosterCameraNote('deferred'));

    await user.click(within(nav()).getByRole('button', { name: 'Boosters' }));
    await user.click(
      screen.getByRole('button', { name: 'Decide later on End-zone camera' }),
    );
    await user.click(within(nav()).getByRole('button', { name: /^Week/ }));

    expect(staff()).toHaveTextContent(boosterCameraNote('deferred'));
    expect(staff()).toHaveTextContent(BOOSTER_CAMERA_AUTHORITY.authority);
    // The note is the coach's answer, never the one he did not give.
    expect(staff()).not.toHaveTextContent(boosterCameraNote('approved'));
  });
});

describe('School', () => {
  it('renders exact facilities, staff, administration influence, and program history', () => {
    render(<School />);

    expect(
      screen.getByText('Enrollment 2,140 · UIL 5A Division I · Est. 1948'),
    ).toBeVisible();

    const facilities = screen.getByRole('region', { name: 'Facilities' });
    for (const text of [
      'Wildcat Stadium',
      'Capacity 8,200 · turf replaced 2021',
      'Weight Room',
      'Racks funded by boosters — install on bye week',
      'Film Room',
      'Two stations · software license expires Dec',
      'Practice Fields',
      'East field drainage poor after rain',
    ]) {
      expect(within(facilities).getByText(text)).toBeVisible();
    }

    const staff = screen.getByRole('region', { name: 'Staff' });
    for (const text of [
      'D. Pruitt',
      'Spread disciple · calls it from the box',
      'B. Tillman',
      '25 years · Cover 3 core · scouts JV Thu',
      'K. Ames',
      'Also coaches track · gone in spring',
      'D. Ferris',
      'Trainer · conservative with return timelines',
      'M. Soto',
      'Film & analytics · wants the end-zone camera',
    ]) {
      expect(within(staff).getByText(text)).toBeVisible();
    }

    const administration = screen.getByRole('region', {
      name: 'Administration',
    });
    expect(within(administration).getByText('Dr. E. Vaughn')).toBeVisible();
    expect(within(administration).getByText('R. Castillo')).toBeVisible();
    expect(
      within(administration).getByRole('progressbar', {
        name: 'Dr. E. Vaughn influence',
      }),
    ).toHaveValue(74);
    expect(
      within(administration).getByRole('progressbar', {
        name: 'R. Castillo influence',
      }),
    ).toHaveValue(81);
    expect(
      within(administration).getByText(
        'Wins help. Grades help more — Vaughn reads the eligibility report before the box score.',
      ),
    ).toBeVisible();

    const history = screen.getByRole('region', { name: 'Program History' });
    expect(history).toHaveTextContent('State titles1987 · 2004');
    expect(history).toHaveTextContent('District titles9 · last 2023');
    expect(history).toHaveTextContent('All-time record612–388–14');
    expect(history).toHaveTextContent('Playoff appearances31');
  });

  it('uses responsive semantic structures with no entropy or unsafe sinks', () => {
    expect(boostersSource).toContain(
      'data-responsive-layout="auto-fit-stats-wrapping-columns"',
    );
    expect(schoolSource).toContain(
      'data-responsive-layout="wrapping-detail-cards"',
    );
    expect(schoolSource).toContain('<progress');
    expect(shellSource).toContain('aria-label="Program context"');

    for (const source of [boostersSource, schoolSource]) {
      expect(source).not.toMatch(
        /Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=|<svg|<path\s+d=\{/i,
      );
    }
  });
});
