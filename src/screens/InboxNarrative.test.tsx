/**
 * Phase 4.4 — small-town narrative beats must be caused by the week.
 *
 * Every assertion here is about causality, not decoration: post-game mail is
 * invisible until the coach closes the review with a legally named right
 * tackle, the copy names the tackle the coach actually chose, and the score
 * stays where it is derived — the Decision Review — instead of being written
 * into narrative copy that could drift from the game that was played.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { WeekRepository } from '../data/weekRepository.ts';
import {
  closeReview,
  deriveDecisionReview,
  toggleReviewLesson,
} from '../domain/decisionReview.ts';
import {
  chooseMatchOption,
  deriveMatch,
  skipToDecision,
  takeField,
} from '../domain/matchDay.ts';
import { deriveNarrativeContext } from '../domain/narrative.ts';
import {
  ACADEMIC_RESPONSES,
  NO_ACADEMIC_RESPONSE_CONSEQUENCE,
} from '../domain/programEvents.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';
import type {
  AcademicResponse,
  RtStarterId,
  WeekState,
} from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import { WeekProvider } from '../state/WeekProvider.tsx';
import { DecisionReview } from './DecisionReview.tsx';
import { Inbox } from './Inbox.tsx';
import { INBOX_MESSAGES, STAFF_NOTES } from './inboxData.ts';

const POST_GAME_SUBJECTS = [
  'Notebook: the right tackle nobody planned on',
  'Kowalski: nothing changes before Oct 26',
] as const;

const STARTER_NAMES: Readonly<Record<RtStarterId, string>> = {
  webb: 'Levi Webb',
  ruiz: 'Pete Ruiz',
  slide: 'J. Mendes',
};

function repositoryFor(week: WeekState): WeekRepository {
  return {
    name: 'Inbox narrative fixture',
    persists: false,
    async load() {
      return week;
    },
    async save() {},
    async clear() {},
  };
}

/** Saturday, review open, with the coach's right-tackle decision recorded. */
function reviewWeek(starter: RtStarterId | null): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    practicePlanLocked: true,
    rtStarter: starter,
    rtFix: 'promote',
    disruptionConfirmed: true,
  };
}

function closedWeek(
  starter: RtStarterId,
  academicResponse: AcademicResponse | null = null,
): WeekState {
  return { ...reviewWeek(starter), reviewClosed: true, academicResponse };
}

/** Thursday, alert delivered, the support decision still open to the coach. */
function alertedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'disruption',
    practicePlanLocked: true,
  };
}

const TUTOR = ACADEMIC_RESPONSES[0];
const STUDY_HALL = ACADEMIC_RESPONSES[1];

/** The canonical played week: seeded queue, first option every time. */
function playedWeek(): WeekState {
  let state = takeField({
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
  });
  for (let guard = 0; guard < 12; guard += 1) {
    state = skipToDecision(state, WEEK_8_SCENARIO);
    const view = deriveMatch(state, WEEK_8_SCENARIO);
    if (view.phase === 'final') break;
    state = chooseMatchOption(state, WEEK_8_SCENARIO, view.pending!.id, 0);
  }
  if (deriveMatch(state, WEEK_8_SCENARIO).phase !== 'final') {
    throw new Error('narrative fixture did not reach the final horn');
  }
  const lesson = deriveDecisionReview(state, WEEK_8_SCENARIO)
    .lessonCandidates[0];
  if (lesson === undefined) throw new Error('no lesson candidate to save');
  return closeReview(
    toggleReviewLesson(state, WEEK_8_SCENARIO, lesson.id),
    WEEK_8_SCENARIO,
  );
}

describe('deriveNarrativeContext', () => {
  it('keeps post-game beats closed until the review is closed with a named right tackle', () => {
    expect(deriveNarrativeContext(createSeedState()).postGameOpen).toBe(false);
    // Review open, tackle named: the beat has not happened yet.
    expect(deriveNarrativeContext(reviewWeek('webb')).postGameOpen).toBe(false);
    // Review closed, but no legal right tackle was ever named.
    expect(deriveNarrativeContext(closedWeek('webb'))).toMatchObject({
      postGameOpen: true,
      reviewClosed: true,
      rtStarter: 'webb',
      rtStarterName: 'Levi Webb',
    });
    const noStarter = deriveNarrativeContext({
      ...closedWeek('webb'),
      rtStarter: null,
    });
    expect(noStarter.postGameOpen).toBe(false);
    expect(noStarter.rtStarterName).toBeNull();
  });

  it('carries the academic-support decision and the consequence it produced', () => {
    expect(deriveNarrativeContext(createSeedState())).toMatchObject({
      academicResponse: null,
      academicConsequence: NO_ACADEMIC_RESPONSE_CONSEQUENCE,
    });
    expect(deriveNarrativeContext(closedWeek('webb', 'tutor'))).toMatchObject({
      academicResponse: 'tutor',
      academicConsequence: TUTOR.consequence,
    });
  });

  it('reports the disruption gate separately so Thursday mail is unaffected', () => {
    const thursday = deriveNarrativeContext({
      ...createSeedState(),
      stage: 'disruption',
      practicePlanLocked: true,
    });
    expect(thursday.disrupted).toBe(true);
    expect(thursday.postGameOpen).toBe(false);
  });
});

describe('Inbox narrative visibility', () => {
  it('leaves the canonical pre-disruption inbox untouched', async () => {
    render(
      <WeekProvider repository={repositoryFor(createSeedState())}>
        <Inbox />
      </WeekProvider>,
    );

    const list = await screen.findByRole('navigation', { name: 'Messages' });
    expect(within(list).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByText('1 unread')).toBeVisible();
    for (const subject of POST_GAME_SUBJECTS) {
      expect(screen.queryByText(subject)).not.toBeInTheDocument();
    }
    // The two canonical staff notes stand alone — no post-game third one.
    expect(
      screen.getByText(/Thirty-two clips are cut and tagged/),
    ).toBeVisible();
    expect(
      screen.queryByText(/Offensive Coordinator/i),
    ).not.toBeInTheDocument();
  });

  it('holds post-game mail back while the review is still open', async () => {
    render(
      <WeekProvider repository={repositoryFor(reviewWeek('webb'))}>
        <Inbox />
      </WeekProvider>,
    );

    const list = await screen.findByRole('navigation', { name: 'Messages' });
    // Thursday's two authority alerts are visible; the post-game pair is not.
    expect(within(list).getAllByRole('button')).toHaveLength(7);
    for (const subject of POST_GAME_SUBJECTS) {
      expect(screen.queryByText(subject)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/R. Pruitt/)).not.toBeInTheDocument();
  });

  it('delivers both post-game messages and the coordinator note once the week is closed', async () => {
    render(
      <WeekProvider repository={repositoryFor(closedWeek('webb'))}>
        <Inbox />
      </WeekProvider>,
    );

    const list = await screen.findByRole('navigation', { name: 'Messages' });
    expect(within(list).getAllByRole('button')).toHaveLength(9);
    for (const subject of POST_GAME_SUBJECTS) {
      expect(screen.getByText(subject)).toBeVisible();
    }
    // Post-game mail arrives read, so the unread count stays exactly what the
    // disruption gate produces and cannot drift from the shell nav badge.
    expect(screen.getByText('3 unread')).toBeVisible();
    expect(
      screen.getByText(/I want those protection reps on the script/),
    ).toBeVisible();
    expect(screen.getByText('R. Pruitt · Offensive Coordinator')).toBeVisible();
  });

  it.each([['webb' as const], ['ruiz' as const], ['slide' as const]])(
    'names the right tackle the coach chose (%s)',
    async (starter) => {
      const user = userEvent.setup();
      render(
        <WeekProvider repository={repositoryFor(closedWeek(starter))}>
          <Inbox />
        </WeekProvider>,
      );

      await user.click(
        await screen.findByRole('button', {
          name: 'Notebook: the right tackle nobody planned on',
        }),
      );
      const chosen = STARTER_NAMES[starter];
      expect(
        screen.getByText(
          new RegExp(`${chosen} ended up taking the right-tackle snaps`),
        ),
      ).toBeVisible();
      for (const [id, name] of Object.entries(STARTER_NAMES)) {
        if (id === starter) continue;
        expect(screen.queryByText(new RegExp(name))).not.toBeInTheDocument();
      }
      // The token is always resolved — never rendered to the coach.
      expect(screen.queryByText(/\{rtStarter\}/)).not.toBeInTheDocument();
    },
  );

  it('records the coach’s support plan as a decision the coach can change', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(alertedWeek())}>
        <Inbox />
      </WeekProvider>,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Unread: Eligibility alert: Ryan Kowalski',
      }),
    );
    await user.click(screen.getByRole('button', { name: TUTOR.label }));

    const assigned = screen.getByRole('button', {
      name: TUTOR.acknowledgedLabel,
    });
    expect(assigned).toBeDisabled();
    // The plan not taken stays available while the week is open.
    const alternative = screen.getByRole('button', { name: STUDY_HALL.label });
    expect(alternative).toBeEnabled();

    await user.click(alternative);

    expect(
      screen.getByRole('button', { name: STUDY_HALL.acknowledgedLabel }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: TUTOR.label })).toBeEnabled();
  });

  it('closes the support decision once the week is closed', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(closedWeek('webb', 'tutor'))}>
        <Inbox />
      </WeekProvider>,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Unread: Eligibility alert: Ryan Kowalski',
      }),
    );

    expect(
      screen.getByRole('button', { name: TUTOR.acknowledgedLabel }),
    ).toBeDisabled();
    // The deadline has passed: the plan not taken can no longer be taken.
    expect(
      screen.getByRole('button', { name: STUDY_HALL.label }),
    ).toBeDisabled();
  });

  it.each([[TUTOR], [STUDY_HALL]])(
    'names the support plan the coach chose in the counselor’s follow-up (%#)',
    async (option) => {
      const user = userEvent.setup();
      render(
        <WeekProvider repository={repositoryFor(closedWeek('webb', option.id))}>
          <Inbox />
        </WeekProvider>,
      );

      await user.click(
        await screen.findByRole('button', {
          name: 'Kowalski: nothing changes before Oct 26',
        }),
      );

      expect(screen.getByText(option.consequence)).toBeVisible();
      expect(
        screen.queryByText(NO_ACADEMIC_RESPONSE_CONSEQUENCE),
      ).not.toBeInTheDocument();
      // The counselor still owns the date, whatever the coach assigned.
      expect(
        screen.getByText(/Eligibility for competition moves only/),
      ).toBeVisible();
      expect(
        screen.queryByText(/\{academicResponse\}/),
      ).not.toBeInTheDocument();
    },
  );

  it('says nothing was assigned when the coach never answered the alert', async () => {
    const user = userEvent.setup();
    render(
      <WeekProvider repository={repositoryFor(closedWeek('webb'))}>
        <Inbox />
      </WeekProvider>,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Kowalski: nothing changes before Oct 26',
      }),
    );

    expect(screen.getByText(NO_ACADEMIC_RESPONSE_CONSEQUENCE)).toBeVisible();
    for (const option of ACADEMIC_RESPONSES) {
      expect(screen.queryByText(option.consequence)).not.toBeInTheDocument();
    }
  });

  it('leaves the deterministic result to Decision Review instead of narrative copy', async () => {
    const played = playedWeek();

    for (const message of INBOX_MESSAGES.filter(
      (candidate) => candidate.postGameOnly === true,
    )) {
      for (const text of [message.subject, message.preview, ...message.body]) {
        expect(text).not.toMatch(/\d+\s*[–—-]\s*\d+/);
        expect(text).not.toMatch(/\b(20|3)\b/);
      }
    }
    for (const note of STAFF_NOTES.filter(
      (candidate) => candidate.postGameOnly === true,
    )) {
      expect(note.note).not.toMatch(/\d/);
    }

    const view = render(
      <WeekProvider repository={repositoryFor(played)}>
        <Inbox />
      </WeekProvider>,
    );
    expect(
      await screen.findByText('Notebook: the right tackle nobody planned on'),
    ).toBeVisible();
    view.unmount();

    render(
      <WeekProvider repository={repositoryFor(played)}>
        <DecisionReview />
      </WeekProvider>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Westfield 20 — 3 Central Catholic',
      }),
    ).toBeVisible();
  });
});
