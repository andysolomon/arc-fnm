/**
 * Phase 4.2 — the Friday-morning cut must be a coaching decision, not flavor.
 *
 * Every assertion here is causal. The cut task is on the board from seed; answering
 * it records who cuts film and nothing else — Match Day, eligibility, and the
 * JV / special-teams session rows stay untouched; and the staff note the week
 * reports back names the delegate actually on file, including its absence.
 */

import { describe, expect, it } from 'vitest';

import {
  NO_STAFF_DELEGATE_NOTE,
  SOTO_FILM_AUTHORITY,
  STAFF_FILM_DELEGATES,
  chooseStaffDelegate,
  staffAssignmentsOf,
  staffDelegateNote,
  staffFilmDelegateEvent,
} from './staffDelegation.ts';
import type { StaffAssignmentId, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

function closedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    reviewClosed: true,
  };
}

describe('cut-task arrival', () => {
  it('seeds the cut unassigned under Soto film staff', () => {
    const seed = createSeedState();

    expect(staffAssignmentsOf(seed).cut).toBeNull();
    expect(staffFilmDelegateEvent(seed)).toMatchObject({
      id: 'cut',
      kind: 'Film',
      authority: SOTO_FILM_AUTHORITY.authority,
      deadline: SOTO_FILM_AUTHORITY.deadline,
      open: true,
      response: null,
      responseLabel: null,
      consequence: NO_STAFF_DELEGATE_NOTE,
    });
  });
});

describe('recording the coach’s film delegate', () => {
  it('records the chosen cutter on the week', () => {
    const decided = chooseStaffDelegate(createSeedState(), 'cut', 'pruitt');

    expect(staffAssignmentsOf(decided).cut).toBe('pruitt');
    expect(staffFilmDelegateEvent(decided)).toMatchObject({
      response: 'pruitt',
      responseLabel: 'Pruitt on the cut',
      open: true,
    });
  });

  it('leaves Match Day, eligibility support, and review state exactly where they were', () => {
    const before = createSeedState();
    const after = chooseStaffDelegate(before, 'cut', 'soto');

    expect(after.academicResponse).toBeNull();
    expect(after.matchStarted).toBe(false);
    expect(after.matchEvents).toEqual([]);
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.reviewClosed).toBe(false);
    expect(after.stage).toBe(before.stage);
    expect(staffFilmDelegateEvent(after)?.authority).toBe(
      SOTO_FILM_AUTHORITY.authority,
    );
    expect(staffFilmDelegateEvent(after)?.deadline).toBe(
      SOTO_FILM_AUTHORITY.deadline,
    );
  });

  it('lets the coach switch cutters while the week is open and ignores a repeat', () => {
    const soto = chooseStaffDelegate(createSeedState(), 'cut', 'soto');
    const switched = chooseStaffDelegate(soto, 'cut', 'pruitt');

    expect(staffAssignmentsOf(switched).cut).toBe('pruitt');
    expect(chooseStaffDelegate(switched, 'cut', 'pruitt')).toBe(switched);
  });

  it('closes the record when the coach closes the week', () => {
    const closed = closedWeek();

    expect(staffFilmDelegateEvent(closed).open).toBe(false);
    expect(chooseStaffDelegate(closed, 'cut', 'soto')).toBe(closed);
    const decidedThenClosed = {
      ...closed,
      staffAssignments: { cut: 'pruitt' as StaffAssignmentId },
    };
    expect(staffFilmDelegateEvent(decidedThenClosed)).toMatchObject({
      response: 'pruitt',
      open: false,
    });
  });

  it('rejects a delegate outside the canonical two and ignores non-cut tasks', () => {
    const seed = createSeedState();

    expect(
      chooseStaffDelegate(seed, 'cut', 'tillman' as StaffAssignmentId),
    ).toBe(seed);
    expect(chooseStaffDelegate(seed, 'jv' as 'cut', 'soto')).toBe(seed);
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(chooseStaffDelegate(createSeedState(), 'cut', 'soto')).toEqual(
      chooseStaffDelegate(createSeedState(), 'cut', 'soto'),
    );
    expect(staffFilmDelegateEvent(createSeedState())).toEqual(
      staffFilmDelegateEvent(createSeedState()),
    );
  });
});

describe('the staff note the week reports back', () => {
  it('names each cutter the coach could have chosen, in canonical UI-3 cost copy', () => {
    for (const option of STAFF_FILM_DELEGATES) {
      const decided = chooseStaffDelegate(createSeedState(), 'cut', option.id);

      expect(staffFilmDelegateEvent(decided).consequence).toBe(option.note);
      expect(staffDelegateNote(option.id)).toBe(option.note);
    }
    expect(STAFF_FILM_DELEGATES.map((option) => option.note)).toEqual([
      ...new Set(STAFF_FILM_DELEGATES.map((option) => option.note)),
    ]);
  });

  it('says so plainly when the cut was answered with nothing', () => {
    expect(staffDelegateNote(null)).toBe(NO_STAFF_DELEGATE_NOTE);
    expect(staffFilmDelegateEvent(createSeedState()).consequence).toBe(
      NO_STAFF_DELEGATE_NOTE,
    );
  });
});
