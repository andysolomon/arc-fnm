import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import { localWeekRepository } from '../data/weekRepository.ts';
import { careerStartResponsiveFields } from './careerStartResponsive.ts';

beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

async function openTeamSelection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Start New Career/i }));
  await user.click(screen.getByRole('button', { name: /Quick Start Career/i }));
}

async function openWizard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /Head Coach Profiles/i }),
  );
  await user.click(
    screen.getByRole('button', { name: /Create new head coach profile/i }),
  );
}

describe('canonical Career Start flow', () => {
  it('renders canonical menu copy, controls, disabled explanations, and Resume handoff', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('v1.5.0 — Coaching Week')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Friday Night Manager', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Start New Career/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Head Coach Profiles/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {
        name: /Quick Start — not in this prototype/i,
      }),
    ).toHaveAttribute(
      'title',
      'Playoff Run is not playable in the coaching-week prototype.',
    );

    await user.click(
      screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
    );
    expect(
      screen.getByRole('heading', {
        name: /Coaching Week · Central Catholic/i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('reaches all seven screens through semantic callbacks', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Start New Career/i }));
    expect(
      screen.getByRole('heading', { name: 'Start Your Journey', level: 1 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back' }));

    await openWizard(user);
    expect(
      screen.getByRole('heading', { name: 'Head Coach Creation', level: 1 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(
      screen.getByRole('heading', { name: 'Head Coach Profiles', level: 1 }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Start New Career →/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /Quick Start Career/i }),
    );
    expect(
      screen.getByRole('heading', { name: 'Team Selection', level: 1 }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Next — Game Setup/i }),
    );
    expect(
      screen.getByRole('heading', { name: 'Game Setup', level: 1 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start Career/i }));
    expect(screen.getByText('The Westfield Herald')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue to Preseason/i }),
    ).toBeEnabled();
  });

  it('preserves editable state across wizard steps 0–4', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openWizard(user);

    await user.click(
      screen.getByRole('button', { name: 'Yearbook portrait preset 03' }),
    );
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.clear(screen.getByRole('textbox', { name: 'First name' }));
    await user.type(
      screen.getByRole('textbox', { name: 'First name' }),
      'Dana',
    );
    await user.clear(screen.getByRole('textbox', { name: 'Last name' }));
    await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Cole');
    await user.clear(screen.getByRole('textbox', { name: 'Age' }));
    await user.type(screen.getByRole('textbox', { name: 'Age' }), '41');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('button', { name: /Didn’t play/i }));
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('button', { name: /Film & analytics/i }));
    await user.click(screen.getByRole('button', { name: 'Locally' }));
    await user.click(screen.getByRole('button', { name: 'Next →' }));

    expect(
      screen.getByRole('heading', {
        name: 'Dana Cole is ready for Friday nights',
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Didn’t play')).not.toHaveLength(0);
    expect(screen.getByText('Film & analytics · Locally')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(
      screen.getByRole('button', { name: 'Yearbook portrait preset 03' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Background' }));
    expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue(
      'Dana',
    );
    expect(screen.getByRole('textbox', { name: 'Age' })).toHaveValue('41');
  });

  it('supports school, unemployed, date, and roster choices and explains fixed controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTeamSelection(user);

    await user.click(screen.getByRole('button', { name: /Riverside/i }));
    expect(screen.getByRole('button', { name: /Riverside/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(
      screen.getByRole('button', {
        name: /Start unemployed — wait for a mid-season opening/i,
      }),
    );
    expect(
      screen.getByRole('button', {
        name: /Start unemployed — wait for a mid-season opening/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    const stateControl = screen.getByRole('button', { name: /Texas · UIL/i });
    expect(stateControl).toBeDisabled();
    expect(stateControl).toHaveAttribute(
      'title',
      'Texas · UIL is the only state modelled in this prototype.',
    );
    expect(
      screen.getByRole('button', { name: /4A Division II/i }),
    ).toHaveAttribute(
      'title',
      '4A Division II is not modelled in this prototype.',
    );

    await user.click(
      screen.getByRole('button', { name: /Next — Game Setup/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /Week 1 \(Aug 28\)/i }),
    );
    expect(
      screen.getByRole('button', { name: /Week 1 \(Aug 28\)/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(
      screen.getByRole('button', { name: /Randomized classes/i }),
    );
    expect(
      screen.getByRole('button', { name: /Randomized classes/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {
        name: /Customize — fixed for this prototype/i,
      }),
    ).toHaveAttribute(
      'title',
      'Simulation preferences are fixed to the seeded coaching week in this prototype.',
    );
  });

  it('hands Continue to Preseason to the production Week Hub', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTeamSelection(user);
    await user.click(
      screen.getByRole('button', { name: /Next — Game Setup/i }),
    );
    await user.click(screen.getByRole('button', { name: /Start Career/i }));
    await user.click(
      screen.getByRole('button', { name: /Continue to Preseason/i }),
    );

    expect(
      screen.getByRole('heading', {
        name: /Coaching Week · Central Catholic/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing prioritized yet/i)).toBeInTheDocument();
  });
});

describe('canonical Career Start responsive tiers', () => {
  it.each([
    [
      390,
      {
        tier: 'phone',
        barPadding: '0 12px',
        shellPadding: '28px 14px 48px 14px',
        newsPadding: '20px 14px 48px 14px',
        newsInnerX: '18px',
        heroSize: 32,
        pageTitleSize: 24,
        menuColumns: '1fr',
        journeyColumns: '1fr',
        profileColumns: '1fr',
        wizardColumns: '1fr',
        teamColumns: '1fr',
        setupColumns: '1fr',
        schoolColumns: 2,
        presetColumns: 2,
        fieldColumns: 1,
        stickySummary: false,
        showChrome: false,
      },
    ],
    [
      768,
      {
        tier: 'compact',
        barPadding: '0 24px',
        shellPadding: '36px 18px 56px 18px',
        newsPadding: '26px 18px 56px 18px',
        newsInnerX: '28px',
        heroSize: 40,
        pageTitleSize: 28,
        menuColumns: '1fr',
        journeyColumns: '1fr 1fr',
        profileColumns: '1fr',
        wizardColumns: '1fr',
        teamColumns: '1fr',
        setupColumns: '1fr',
        schoolColumns: 3,
        presetColumns: 3,
        fieldColumns: 2,
        stickySummary: false,
        showChrome: true,
      },
    ],
    [
      1024,
      {
        tier: 'tablet',
        barPadding: '0 24px',
        shellPadding: '48px 24px 64px 24px',
        newsPadding: '32px 24px 64px 24px',
        newsInnerX: '28px',
        heroSize: 48,
        pageTitleSize: 32,
        menuColumns: '1.4fr 1fr',
        journeyColumns: '1fr 1fr 1fr',
        profileColumns: '1fr 1.1fr',
        wizardColumns: '1fr 280px',
        teamColumns: '300px 1fr',
        setupColumns: '1.5fr 1fr',
        schoolColumns: 4,
        presetColumns: 3,
        fieldColumns: 2,
        stickySummary: true,
        showChrome: true,
      },
    ],
    [
      1440,
      {
        tier: 'wide',
        barPadding: '0 24px',
        shellPadding: '48px 24px 64px 24px',
        newsPadding: '32px 24px 64px 24px',
        newsInnerX: '28px',
        heroSize: 48,
        pageTitleSize: 32,
        menuColumns: '1.4fr 1fr',
        journeyColumns: '1fr 1fr 1fr',
        profileColumns: '1fr 1.1fr',
        wizardColumns: '1fr 320px',
        teamColumns: '340px 1fr',
        setupColumns: '1.5fr 1fr',
        schoolColumns: 4,
        presetColumns: 3,
        fieldColumns: 2,
        stickySummary: true,
        showChrome: true,
      },
    ],
  ] as const)('matches the %ipx source tier', (width, expected) => {
    expect(careerStartResponsiveFields(width)).toEqual(expected);
  });
});
