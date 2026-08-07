/**
 * Phase 4.1 — the end-zone camera must be a coaching decision, not flavor.
 *
 * Every assertion here is causal. The request is on the Boosters board from
 * seed; answering it records the coach's answer and nothing else — Match Day,
 * eligibility, the scout delegations, and the fund's own authority stay
 * untouched; and the note the week reports back names the answer actually on
 * file, including its absence, in Soto's voice.
 */

import { describe, expect, it } from 'vitest';

import {
  BOOSTER_CAMERA_AUTHORITY,
  BOOSTER_CAMERA_OUTCOMES,
  NO_BOOSTER_CAMERA_NOTE,
  boosterCameraNote,
  boosterFundingOf,
  chooseBoosterFunding,
  deriveBoosterFundingEvent,
  type BoosterFundingRequestId,
} from './boosterFunding.ts';
import {
  returnScoutDelegateEvent,
  staffFilmDelegateEvent,
} from './staffDelegation.ts';
import type { FundingOutcome, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

function closedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    reviewClosed: true,
  };
}

describe('camera-request arrival', () => {
  it('seeds the request unanswered under the Westfield Gridiron Boosters', () => {
    const seed = createSeedState();

    expect(boosterFundingOf(seed).camera).toBeNull();
    expect(deriveBoosterFundingEvent(seed)).toEqual({
      id: 'camera',
      kind: 'Boosters',
      authority: 'Westfield Gridiron Boosters',
      deadline: 'NOV board',
      amount: '$1,800',
      open: true,
      response: null,
      responseLabel: null,
      consequence: NO_BOOSTER_CAMERA_NOTE,
    });
  });

  it('keeps the amount and the board date on the authority, not on the coach', () => {
    const approved = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'approved',
    );
    const deferred = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'deferred',
    );

    for (const event of [
      deriveBoosterFundingEvent(approved),
      deriveBoosterFundingEvent(deferred),
    ]) {
      expect(event.authority).toBe(BOOSTER_CAMERA_AUTHORITY.authority);
      expect(event.deadline).toBe(BOOSTER_CAMERA_AUTHORITY.deadline);
      expect(event.amount).toBe(BOOSTER_CAMERA_AUTHORITY.amount);
    }
  });
});

describe('recording the coach’s answer on the camera', () => {
  it('records the chosen outcome on the week', () => {
    const decided = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'approved',
    );

    expect(boosterFundingOf(decided).camera).toBe('approved');
    expect(deriveBoosterFundingEvent(decided)).toMatchObject({
      response: 'approved',
      responseLabel: 'Approved',
      open: true,
    });
  });

  it('treats a deferral as an answer on file, not as an unanswered request', () => {
    const deferred = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'deferred',
    );

    expect(boosterFundingOf(deferred).camera).toBe('deferred');
    expect(deriveBoosterFundingEvent(deferred).response).toBe('deferred');
    expect(deriveBoosterFundingEvent(deferred).responseLabel).toBe(
      'Deferred · Nov board',
    );
    expect(deriveBoosterFundingEvent(deferred).consequence).not.toBe(
      NO_BOOSTER_CAMERA_NOTE,
    );
  });

  it('leaves Match Day, eligibility support, and both scout delegations exactly where they were', () => {
    const before = createSeedState();
    const after = chooseBoosterFunding(before, 'camera', 'approved');

    expect(after.academicResponse).toBeNull();
    expect(after.matchStarted).toBe(false);
    expect(after.matchEvents).toEqual([]);
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.reviewClosed).toBe(false);
    expect(after.stage).toBe(before.stage);
    expect(after.staffAssignments).toEqual(before.staffAssignments);
    expect(staffFilmDelegateEvent(after).response).toBeNull();
    expect(returnScoutDelegateEvent(after).response).toBeNull();
  });

  it('lets the coach switch the answer while the week is open and ignores a repeat', () => {
    const deferred = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'deferred',
    );
    const switched = chooseBoosterFunding(deferred, 'camera', 'approved');

    expect(boosterFundingOf(switched).camera).toBe('approved');
    expect(chooseBoosterFunding(switched, 'camera', 'approved')).toBe(switched);
  });

  it('closes the record when the coach closes the week', () => {
    const closed = closedWeek();

    expect(deriveBoosterFundingEvent(closed).open).toBe(false);
    expect(chooseBoosterFunding(closed, 'camera', 'approved')).toBe(closed);
    const decidedThenClosed: WeekState = {
      ...closed,
      boosterFunding: { camera: 'deferred' },
    };
    expect(deriveBoosterFundingEvent(decidedThenClosed)).toMatchObject({
      response: 'deferred',
      open: false,
    });
  });

  it('rejects an outcome outside the canonical two and ignores the session-only requests', () => {
    const seed = createSeedState();

    expect(
      chooseBoosterFunding(seed, 'camera', 'tabled' as FundingOutcome),
    ).toBe(seed);
    expect(
      chooseBoosterFunding(
        seed,
        'charter-bus' as BoosterFundingRequestId,
        'approved',
      ),
    ).toBe(seed);
    expect(
      chooseBoosterFunding(
        seed,
        'weight-room' as BoosterFundingRequestId,
        'approved',
      ),
    ).toBe(seed);
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(
      chooseBoosterFunding(createSeedState(), 'camera', 'approved'),
    ).toEqual(chooseBoosterFunding(createSeedState(), 'camera', 'approved'));
    expect(deriveBoosterFundingEvent(createSeedState())).toEqual(
      deriveBoosterFundingEvent(createSeedState()),
    );
  });
});

describe('the note the week reports back', () => {
  it('names each answer the coach could have given, resolved against the authority tokens', () => {
    for (const option of BOOSTER_CAMERA_OUTCOMES) {
      const decided = chooseBoosterFunding(
        createSeedState(),
        'camera',
        option.id,
      );

      expect(deriveBoosterFundingEvent(decided).consequence).toBe(option.note);
      expect(boosterCameraNote(option.id)).toBe(option.note);
    }
    expect(BOOSTER_CAMERA_OUTCOMES.map((option) => option.label)).toEqual([
      'Approve',
      'Later',
    ]);
    expect(BOOSTER_CAMERA_OUTCOMES.map((option) => option.note)).toEqual([
      ...new Set(BOOSTER_CAMERA_OUTCOMES.map((option) => option.note)),
    ]);
    expect(boosterCameraNote('approved')).toContain(
      BOOSTER_CAMERA_AUTHORITY.amount,
    );
    expect(boosterCameraNote('deferred')).toContain(
      BOOSTER_CAMERA_AUTHORITY.deadline,
    );
  });

  it('says so plainly when the request was answered with nothing', () => {
    expect(boosterCameraNote(null)).toBe(NO_BOOSTER_CAMERA_NOTE);
    expect(deriveBoosterFundingEvent(createSeedState()).consequence).toBe(
      NO_BOOSTER_CAMERA_NOTE,
    );
  });
});
