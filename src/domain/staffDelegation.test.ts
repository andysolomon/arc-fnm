/**
 * Phase 4.2 — the Friday-morning cut must be a coaching decision, not flavor.
 * Phase 4.1 — so must the Central Catholic return-unit breakdown.
 *
 * Every assertion here is causal. Each task is on the board from seed; answering
 * one records who does that work and nothing else — Match Day, eligibility, the
 * JV session row, and the other task stay untouched; and the staff note the week
 * reports back names the delegate actually on file, including its absence.
 */

import { describe, expect, it } from 'vitest';

import {
  NO_RETURN_SCOUT_NOTE,
  NO_STAFF_DELEGATE_NOTE,
  RETURN_SCOUT_AUTHORITY,
  RETURN_SCOUT_DELEGATES,
  SOTO_FILM_AUTHORITY,
  STAFF_FILM_DELEGATES,
  chooseStaffDelegate,
  returnScoutDelegateEvent,
  returnScoutNote,
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

describe('return-unit task arrival', () => {
  it('seeds the breakdown unassigned under the Scouting Coordinator', () => {
    const seed = createSeedState();

    expect(staffAssignmentsOf(seed).st).toBeNull();
    expect(returnScoutDelegateEvent(seed)).toMatchObject({
      id: 'st',
      kind: 'Scouting',
      authority: RETURN_SCOUT_AUTHORITY.authority,
      deadline: RETURN_SCOUT_AUTHORITY.deadline,
      open: true,
      response: null,
      responseLabel: null,
      consequence: NO_RETURN_SCOUT_NOTE,
    });
  });

  it('keeps the scouting desk’s Wednesday deadline off the film desk’s Thursday one', () => {
    expect(RETURN_SCOUT_AUTHORITY.deadline).toBe('WED 4:00 PM');
    expect(RETURN_SCOUT_AUTHORITY.deadline).not.toBe(
      SOTO_FILM_AUTHORITY.deadline,
    );
  });
});

describe('recording the coach’s return-unit scout', () => {
  it('records the chosen scout on the week', () => {
    const decided = chooseStaffDelegate(createSeedState(), 'st', 'ames');

    expect(staffAssignmentsOf(decided).st).toBe('ames');
    expect(returnScoutDelegateEvent(decided)).toMatchObject({
      response: 'ames',
      responseLabel: 'Ames on the return breakdown',
      open: true,
    });
  });

  it('treats “Nobody” as an answer on file, not as an unanswered task', () => {
    const declined = chooseStaffDelegate(createSeedState(), 'st', 'nobody');

    expect(staffAssignmentsOf(declined).st).toBe('nobody');
    expect(returnScoutDelegateEvent(declined).response).toBe('nobody');
    expect(returnScoutDelegateEvent(declined).consequence).toBe(
      'You go into Friday with six returns and no breakdown.',
    );
    expect(returnScoutDelegateEvent(declined).consequence).not.toBe(
      NO_RETURN_SCOUT_NOTE,
    );
  });

  it('leaves Match Day, eligibility support, and the cut exactly where they were', () => {
    const before = createSeedState();
    const after = chooseStaffDelegate(before, 'st', 'soto');

    expect(staffAssignmentsOf(after).cut).toBeNull();
    expect(staffFilmDelegateEvent(after).consequence).toBe(
      NO_STAFF_DELEGATE_NOTE,
    );
    expect(after.academicResponse).toBeNull();
    expect(after.matchStarted).toBe(false);
    expect(after.matchEvents).toEqual([]);
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.reviewClosed).toBe(false);
    expect(after.stage).toBe(before.stage);
  });

  it('carries both tasks independently once each is answered', () => {
    const cut = chooseStaffDelegate(createSeedState(), 'cut', 'pruitt');
    const both = chooseStaffDelegate(cut, 'st', 'nobody');

    expect(staffAssignmentsOf(both)).toEqual({ cut: 'pruitt', st: 'nobody' });
    expect(staffFilmDelegateEvent(both).response).toBe('pruitt');
    expect(returnScoutDelegateEvent(both).response).toBe('nobody');
  });

  it('lets the coach switch scouts while the week is open and ignores a repeat', () => {
    const ames = chooseStaffDelegate(createSeedState(), 'st', 'ames');
    const switched = chooseStaffDelegate(ames, 'st', 'soto');

    expect(staffAssignmentsOf(switched).st).toBe('soto');
    expect(chooseStaffDelegate(switched, 'st', 'soto')).toBe(switched);
  });

  it('closes the record when the coach closes the week', () => {
    const closed = closedWeek();

    expect(returnScoutDelegateEvent(closed).open).toBe(false);
    expect(chooseStaffDelegate(closed, 'st', 'ames')).toBe(closed);
    const decidedThenClosed = {
      ...closed,
      staffAssignments: { cut: null, st: 'ames' as StaffAssignmentId },
    };
    expect(returnScoutDelegateEvent(decidedThenClosed)).toMatchObject({
      response: 'ames',
      open: false,
    });
  });

  it('scopes delegates to the task that accepts them', () => {
    const seed = createSeedState();

    expect(chooseStaffDelegate(seed, 'st', 'pruitt')).toBe(seed);
    expect(chooseStaffDelegate(seed, 'cut', 'ames')).toBe(seed);
    expect(chooseStaffDelegate(seed, 'cut', 'nobody')).toBe(seed);
    // Soto is the one name both tasks accept, and each records its own note.
    expect(
      staffFilmDelegateEvent(chooseStaffDelegate(seed, 'cut', 'soto'))
        .consequence,
    ).not.toBe(
      returnScoutDelegateEvent(chooseStaffDelegate(seed, 'st', 'soto'))
        .consequence,
    );
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(chooseStaffDelegate(createSeedState(), 'st', 'ames')).toEqual(
      chooseStaffDelegate(createSeedState(), 'st', 'ames'),
    );
    expect(returnScoutDelegateEvent(createSeedState())).toEqual(
      returnScoutDelegateEvent(createSeedState()),
    );
  });
});

describe('the return-unit note the week reports back', () => {
  it('names each scout the coach could have chosen, in canonical UI-3 cost copy', () => {
    for (const option of RETURN_SCOUT_DELEGATES) {
      const decided = chooseStaffDelegate(createSeedState(), 'st', option.id);

      expect(returnScoutDelegateEvent(decided).consequence).toBe(option.note);
      expect(returnScoutNote(option.id)).toBe(option.note);
    }
    expect(RETURN_SCOUT_DELEGATES.map((option) => option.label)).toEqual([
      'K. Ames',
      'M. Soto',
      'Nobody',
    ]);
    expect(RETURN_SCOUT_DELEGATES.map((option) => option.note)).toEqual([
      ...new Set(RETURN_SCOUT_DELEGATES.map((option) => option.note)),
    ]);
  });

  it('says so plainly when the breakdown was never answered at all', () => {
    expect(returnScoutNote(null)).toBe(NO_RETURN_SCOUT_NOTE);
    expect(returnScoutDelegateEvent(createSeedState()).consequence).toBe(
      NO_RETURN_SCOUT_NOTE,
    );
  });
});
