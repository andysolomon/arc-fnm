/**
 * Phase 4.5 — validation slice.
 *
 * This file adds no behavior. It pins the three contracts the Phase 4.5 audit
 * (`docs/phase-4-5-validation.md`) leans on, so a later refactor cannot quietly
 * retract them:
 *
 *   1. Keyboard / ARIA / focus — the drawer's Tab wrap, the locked-nav
 *      `aria-describedby` wiring, and the two-state close-review note.
 *   2. Replayability — Reset Week restores the seeded baseline byte-for-byte,
 *      and a replayed round produces a byte-identical result.
 *   3. Canonical Week 8 determinism — seed string, `execSeedFor`, and the 20–3
 *      final, re-asserted here so the audit cites a check in its own file.
 *
 * Everything is derived from shipped exports. No clock, no entropy, no
 * browser: the audit is static and the assertions are pure.
 */

import { createElement } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App.tsx';
import shellSource from '../components/AppShell.tsx?raw';
import type { WeekRepository } from '../data/weekRepository.ts';
import { localWeekRepository } from '../data/weekRepository.ts';
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
  resetWeek,
  selectRtFix,
  selectRtStarter,
  togglePriority,
} from '../domain/week.ts';
import reviewSource from '../screens/DecisionReview.tsx?raw';
import { DecisionReview } from '../screens/DecisionReview.tsx';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { createInitialState, weekReducer } from '../state/weekStore.ts';

const scenario = WEEK_8_SCENARIO;

/** The seeded baseline, serialized. Reset Week must land on exactly this. */
const SEED_JSON =
  '{"stage":"evidence","selectedHypotheses":[],"acceptedRisk":null,"dispositions":{},"answers":{},"offenseScheme":"Spread","defenseScheme":"4-2-5","practiceBlocks":[],"practiceUndo":[],"practicePlanLocked":false,"rtStarter":null,"rtFix":null,"disruptionConfirmed":false,"academicResponse":null,"staffAssignments":{"cut":null},"boosterFunding":{"camera":null},"filmDeadline":{"tape":null},"emergencyProcess":{"reseed":null},"policies":{"fourth":"Chart","pat":"Kick","clock":"Bank","auto":"Ask"},"matchStarted":false,"matchSpeed":"1x","matchEvents":[],"reviewRatings":{},"lessons":[],"reviewLessonMessage":false,"reviewClosed":false}';

/** Clear the shared session store so each test starts from the seeded week. */
beforeEach(async () => {
  await localWeekRepository.clear({ careerId: 'demo', weekNumber: 8 });
});

/** The golden-path Friday fixture — same blocks the Decision Review pins. */
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

/** The canonical Week 8 Webb/promote route, built through the week actions. */
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

/** Play the golden path to the final horn, always taking the first option. */
function playToFinal(initial: WeekState): WeekState {
  let state = takeField(initial);
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, scenario);
    const view = deriveMatch(state, scenario);
    if (view.phase === 'final') return state;
    state = chooseMatchOption(state, scenario, view.pending!.id, 0);
  }
  throw new Error('validation fixture did not reach the final horn');
}

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Phase 4.5 validation fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

async function enterWeek(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: /Westfield Wildcats.*Resume/i }),
  );
}

/** Open the mobile drawer and hand back its dialog element. */
async function openDrawer(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  const dialog = screen.getByRole('dialog', { name: 'Navigation menu' });
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: /^Week3$/ }),
    ).toHaveFocus(),
  );
  return dialog;
}

function enabledButtonsIn(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('button:not([disabled])'),
  );
}

describe('Phase 4.5 — keyboard, ARIA, and focus contracts', () => {
  it('wraps Tab and Shift+Tab inside the drawer and ignores other keys', async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await enterWeek(user);
    const dialog = await openDrawer(user);

    const focusable = enabledButtonsIn(dialog);
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    // The trap only sees the drawer's own controls — the scrim button is a
    // sibling of the dialog, so it can never be the wrap target.
    expect(focusable.length).toBeGreaterThan(1);
    expect(first.textContent).toMatch(/^Week/);
    expect(last).toHaveAccessibleName('School');

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    // Forward Tab off a middle control is the browser's job, not the trap's.
    const middle = focusable[1]!;
    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab' });
    expect(middle).toHaveFocus();

    // A non-Tab key leaves focus exactly where it was.
    fireEvent.keyDown(middle, { key: 'ArrowDown' });
    expect(middle).toHaveFocus();
  });

  it('describes every locked nav control with a scoped, non-colliding id', async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await enterWeek(user);
    const dialog = await openDrawer(user);
    const rail = screen.getByRole('navigation', { name: 'Primary' });

    for (const [container, suffix] of [
      [rail, 'rail'],
      [dialog, 'drawer'],
    ] as const) {
      for (const [label, icon] of [
        ['Tactics', 'tactics'],
        ['Training', 'training'],
      ] as const) {
        const button = within(container).getByRole('button', {
          name: new RegExp(`${label}.*Locked`, 'i'),
        });
        const reasonId = `nav-reason-${suffix}-${icon}`;
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-describedby', reasonId);
        // The id resolves, resolves inside this control, and is unique in the
        // document — the rail and the drawer render the same nav twice.
        expect(document.querySelectorAll(`#${reasonId}`)).toHaveLength(1);
        expect(button.querySelector(`#${reasonId}`)).toHaveTextContent(
          'Locked',
        );
      }
    }

    // Enabled controls carry no description at all.
    expect(
      within(dialog).getByRole('button', { name: 'School' }),
    ).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the close-review note wired to the button in both of its states', async () => {
    const user = userEvent.setup();
    render(
      createElement(WeekProvider, {
        repository: repositoryFor(playToFinal(fridayState())),
        children: createElement(DecisionReview),
      }),
    );

    const close = await screen.findByRole('button', {
      name: 'Close out the week',
    });
    expect(close).toHaveAttribute('aria-describedby', 'close-review-note');
    const note = document.querySelector('#close-review-note');
    expect(close).toBeDisabled();
    expect(note).toHaveTextContent(
      'Save at least one lesson first — that is the point of the film session.',
    );

    await user.click(
      screen.getAllByRole('button', { name: /^Save lesson:/ })[0]!,
    );

    // Same id, same wiring — only the copy changes, so a screen reader is told
    // why the control was blocked and what it now does.
    expect(close).toBeEnabled();
    expect(close).toHaveAttribute('aria-describedby', 'close-review-note');
    expect(document.querySelectorAll('#close-review-note')).toHaveLength(1);
    expect(document.querySelector('#close-review-note')).toHaveTextContent(
      'Returns you to the Week hub with the result filed and your lessons pinned.',
    );
  });
});

describe('Phase 4.5 — replayability invariants', () => {
  it('restores the seeded baseline byte-for-byte from any point in the week', () => {
    expect(JSON.stringify(createSeedState())).toBe(SEED_JSON);
    expect(JSON.stringify(resetWeek())).toBe(SEED_JSON);

    // Reset from a fully-played week, not just from a fresh one.
    const played = playToFinal(fridayState());
    expect(JSON.stringify(played)).not.toBe(SEED_JSON);
    expect(JSON.stringify(resetWeek())).toBe(SEED_JSON);

    // And through the reducer, where Reset Week also returns the coach to the
    // Week hub with canonical tabs.
    const reset = weekReducer(
      { ...createInitialState(), week: played },
      { type: 'reset-week' },
      scenario,
    );
    expect(JSON.stringify(reset.week)).toBe(SEED_JSON);
    expect(reset.nav).toEqual({
      screen: 'week',
      scoutingTab: 'Overview',
      tacticsTab: 'Game Plan',
      scoutingHypothesis: null,
    });
    expect(reset.practiceDraftBlocks).toBeNull();
  });

  it('reruns a round to a byte-identical result after a reset', () => {
    const first = playToFinal(fridayState());
    const firstView = deriveMatch(first, scenario);

    // Reset, then replay the same week from the same seeded baseline.
    expect(JSON.stringify(resetWeek())).toBe(SEED_JSON);
    const second = playToFinal(fridayState());
    const secondView = deriveMatch(second, scenario);

    expect(JSON.stringify(second.matchEvents)).toBe(
      JSON.stringify(first.matchEvents),
    );
    expect(JSON.stringify(secondView)).toBe(JSON.stringify(firstView));
    expect([secondView.wScore, secondView.cScore]).toEqual([20, 3]);

    // Deriving twice from one state is also stable — the view is a projection,
    // never a stored result.
    expect(JSON.stringify(deriveMatch(first, scenario))).toBe(
      JSON.stringify(firstView),
    );
  });
});

describe('Phase 4.5 — canonical Week 8 determinism, re-asserted', () => {
  it('pins the seed string, execSeedFor, and the 20–3 final', () => {
    const canonical = deriveTakeFieldContext(webbPromoteConfirmed(), scenario);
    expect(execSeedInputFor(canonical)).toBe(
      'h4|promote|Levi Webb|Chart|Kick|Bank|Ask|o1:2|o2:3|o3:3|o4:0|o5:2|o6:2',
    );
    expect(execSeedFor(canonical)).toBe(3_427_930_963);
    expect(execSeedFor(canonical)).toBe(execSeedFor(canonical));
    expect([canonical.sits, canonical.outs]).toEqual([[], []]);

    const view = deriveMatch(playToFinal(fridayState()), scenario);
    expect([view.wScore, view.cScore]).toEqual([20, 3]);
    expect(view.plays[0]?.t).toBe(
      'FINAL — Westfield 20, Central Catholic 3. The district runs through Wildcat Stadium.',
    );
  });

  it('keeps the audited surfaces free of clock and entropy reads', () => {
    expect(`${shellSource}\n${reviewSource}`).not.toMatch(
      /Math\.random|Date\.now|new Date|performance\.now|crypto\./,
    );
  });
});
