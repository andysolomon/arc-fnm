/**
 * Phase 4.1 — the State U highlight tape must be a coaching decision, not flavor.
 *
 * Every assertion here is causal. The request is in the Inbox from seed;
 * answering it records the coach's answer and nothing else — Match Day,
 * eligibility, the scout delegations, the booster fund, and the exchange's own
 * authority stay untouched; and the note the week reports back names the answer
 * actually on file, including its absence, in Soto's voice.
 */

import { describe, expect, it } from 'vitest';

import {
  HIGHLIGHT_TAPE_OPTIONS,
  NO_HIGHLIGHT_TAPE_NOTE,
  STATE_U_TAPE_AUTHORITY,
  chooseHighlightTape,
  deriveHighlightTapeEvent,
  filmDeadlineOf,
  highlightTapeNote,
  type FilmDeadlineRequestId,
} from './filmDeadline.ts';
import {
  returnScoutDelegateEvent,
  staffFilmDelegateEvent,
} from './staffDelegation.ts';
import type { HighlightTapeResponse, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

function closedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    reviewClosed: true,
  };
}

describe('highlight-tape arrival', () => {
  it('seeds the request unanswered under the Recruiting Desk', () => {
    const seed = createSeedState();

    expect(filmDeadlineOf(seed).tape).toBeNull();
    expect(deriveHighlightTapeEvent(seed)).toEqual({
      id: 'tape',
      kind: 'Scouting',
      authority: 'Recruiting Desk',
      deadline: 'SAT film exchange',
      recipient: 'Western Tech',
      open: true,
      response: null,
      responseLabel: null,
      consequence: NO_HIGHLIGHT_TAPE_NOTE,
    });
  });

  it('keeps the exchange date and the recipient on the authority, not on the coach', () => {
    const queued = chooseHighlightTape(createSeedState(), 'tape', 'queued');

    const event = deriveHighlightTapeEvent(queued);
    expect(event.authority).toBe(STATE_U_TAPE_AUTHORITY.authority);
    expect(event.deadline).toBe(STATE_U_TAPE_AUTHORITY.deadline);
    expect(event.recipient).toBe(STATE_U_TAPE_AUTHORITY.recipient);
  });
});

describe('recording the coach’s answer on the tape', () => {
  it('records the queued outcome on the week', () => {
    const decided = chooseHighlightTape(createSeedState(), 'tape', 'queued');

    expect(filmDeadlineOf(decided).tape).toBe('queued');
    expect(deriveHighlightTapeEvent(decided)).toMatchObject({
      response: 'queued',
      responseLabel: 'Tape queued with Soto',
      open: true,
    });
  });

  it('leaves Match Day, eligibility, scout delegations, and the booster camera exactly where they were', () => {
    const before = createSeedState();
    const after = chooseHighlightTape(before, 'tape', 'queued');

    expect(after.academicResponse).toBeNull();
    expect(after.matchStarted).toBe(false);
    expect(after.matchEvents).toEqual([]);
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.reviewClosed).toBe(false);
    expect(after.stage).toBe(before.stage);
    expect(after.staffAssignments).toEqual(before.staffAssignments);
    expect(after.boosterFunding).toEqual(before.boosterFunding);
    expect(staffFilmDelegateEvent(after).response).toBeNull();
    expect(returnScoutDelegateEvent(after).response).toBeNull();
  });

  it('ignores a repeat while the week is open and rejects a closed week', () => {
    const queued = chooseHighlightTape(createSeedState(), 'tape', 'queued');
    const closed = closedWeek();

    expect(chooseHighlightTape(queued, 'tape', 'queued')).toBe(queued);
    expect(deriveHighlightTapeEvent(closed).open).toBe(false);
    expect(chooseHighlightTape(closed, 'tape', 'queued')).toBe(closed);
    const decidedThenClosed: WeekState = {
      ...closed,
      filmDeadline: { tape: 'queued' },
    };
    expect(deriveHighlightTapeEvent(decidedThenClosed)).toMatchObject({
      response: 'queued',
      open: false,
    });
  });

  it('rejects an outcome outside the canonical one and ignores other request ids', () => {
    const seed = createSeedState();

    expect(
      chooseHighlightTape(seed, 'tape', 'shipped' as HighlightTapeResponse),
    ).toBe(seed);
    expect(
      chooseHighlightTape(seed, 'cut' as FilmDeadlineRequestId, 'queued'),
    ).toBe(seed);
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(chooseHighlightTape(createSeedState(), 'tape', 'queued')).toEqual(
      chooseHighlightTape(createSeedState(), 'tape', 'queued'),
    );
    expect(deriveHighlightTapeEvent(createSeedState())).toEqual(
      deriveHighlightTapeEvent(createSeedState()),
    );
  });
});

describe('the note the week reports back', () => {
  it('names the queued answer resolved against the authority tokens', () => {
    for (const option of HIGHLIGHT_TAPE_OPTIONS) {
      const decided = chooseHighlightTape(createSeedState(), 'tape', option.id);

      expect(deriveHighlightTapeEvent(decided).consequence).toBe(option.note);
      expect(highlightTapeNote(option.id)).toBe(option.note);
    }
    expect(HIGHLIGHT_TAPE_OPTIONS.map((option) => option.label)).toEqual([
      'Prep Highlight Tape',
    ]);
    expect(highlightTapeNote('queued')).toContain(
      STATE_U_TAPE_AUTHORITY.deadline,
    );
    expect(highlightTapeNote('queued')).toContain(
      STATE_U_TAPE_AUTHORITY.recipient,
    );
  });

  it('says so plainly when the request was answered with nothing', () => {
    expect(highlightTapeNote(null)).toBe(NO_HIGHLIGHT_TAPE_NOTE);
    expect(deriveHighlightTapeEvent(createSeedState()).consequence).toBe(
      NO_HIGHLIGHT_TAPE_NOTE,
    );
  });
});
