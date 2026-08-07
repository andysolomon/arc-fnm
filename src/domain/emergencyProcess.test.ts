/**
 * Phase 4.1 — the District Office reseed must be a coaching decision, not flavor.
 *
 * Every assertion here is causal. The request is in the Inbox from seed;
 * answering it records how the building carries the news and nothing else —
 * Match Day, eligibility, scout delegations, the booster fund, and the film
 * exchange stay untouched; the office still owns the standings; and the note
 * the week reports back names the answer actually on file, including its
 * absence. No medical, legal, or rules claim is ever recorded.
 */

import { describe, expect, it } from 'vitest';

import { chooseBoosterFunding, boosterFundingOf } from './boosterFunding.ts';
import {
  DISTRICT_RESEED_AUTHORITY,
  EMERGENCY_RESEED_OPTIONS,
  NO_EMERGENCY_RESEED_NOTE,
  chooseEmergencyProcess,
  deriveEmergencyProcessEvent,
  emergencyProcessOf,
  emergencyReseedNote,
  type EmergencyProcessRequestId,
} from './emergencyProcess.ts';
import { chooseHighlightTape, filmDeadlineOf } from './filmDeadline.ts';
import {
  returnScoutDelegateEvent,
  staffFilmDelegateEvent,
} from './staffDelegation.ts';
import type { EmergencyProcessResponse, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

function closedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    reviewClosed: true,
  };
}

describe('district-reseed arrival', () => {
  it('seeds the request unanswered under the District Office', () => {
    const seed = createSeedState();

    expect(emergencyProcessOf(seed).reseed).toBeNull();
    expect(deriveEmergencyProcessEvent(seed)).toEqual({
      id: 'reseed',
      kind: 'District',
      authority: 'District Office',
      deadline: 'FRI kickoff',
      seedHolder: 'Central Catholic',
      open: true,
      response: null,
      responseLabel: null,
      consequence: NO_EMERGENCY_RESEED_NOTE,
    });
  });

  it('keeps the seed holder and the deadline on the authority, not on the coach', () => {
    const decided = chooseEmergencyProcess(
      createSeedState(),
      'reseed',
      'read-aloud',
    );

    const event = deriveEmergencyProcessEvent(decided);
    expect(event.authority).toBe(DISTRICT_RESEED_AUTHORITY.authority);
    expect(event.deadline).toBe(DISTRICT_RESEED_AUTHORITY.deadline);
    expect(event.seedHolder).toBe(DISTRICT_RESEED_AUTHORITY.seedHolder);
  });
});

describe('recording the coach’s answer on the reseed', () => {
  it('records the read-aloud and staff-only outcomes on the week', () => {
    const readAloud = chooseEmergencyProcess(
      createSeedState(),
      'reseed',
      'read-aloud',
    );
    const staffOnly = chooseEmergencyProcess(
      createSeedState(),
      'reseed',
      'staff-only',
    );

    expect(emergencyProcessOf(readAloud).reseed).toBe('read-aloud');
    expect(deriveEmergencyProcessEvent(readAloud)).toMatchObject({
      response: 'read-aloud',
      responseLabel: 'Read aloud in the team room',
      open: true,
    });
    expect(emergencyProcessOf(staffOnly).reseed).toBe('staff-only');
    expect(deriveEmergencyProcessEvent(staffOnly)).toMatchObject({
      response: 'staff-only',
      responseLabel: 'Kept to the staff',
      open: true,
    });
  });

  it('leaves Match Day, eligibility, scout, boosters, and film tape exactly where they were', () => {
    const before = chooseHighlightTape(
      chooseBoosterFunding(createSeedState(), 'camera', 'approved'),
      'tape',
      'queued',
    );
    const after = chooseEmergencyProcess(before, 'reseed', 'staff-only');

    expect(after.academicResponse).toBeNull();
    expect(after.matchStarted).toBe(false);
    expect(after.matchEvents).toEqual([]);
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.reviewClosed).toBe(false);
    expect(after.stage).toBe(before.stage);
    expect(after.staffAssignments).toEqual(before.staffAssignments);
    expect(boosterFundingOf(after).camera).toBe('approved');
    expect(filmDeadlineOf(after).tape).toBe('queued');
    expect(staffFilmDelegateEvent(after).response).toBeNull();
    expect(returnScoutDelegateEvent(after).response).toBeNull();
  });

  it('allows a switch, ignores a repeat while open, and rejects a closed week', () => {
    const readAloud = chooseEmergencyProcess(
      createSeedState(),
      'reseed',
      'read-aloud',
    );
    const switched = chooseEmergencyProcess(readAloud, 'reseed', 'staff-only');
    const closed = closedWeek();

    expect(emergencyProcessOf(switched).reseed).toBe('staff-only');
    expect(chooseEmergencyProcess(switched, 'reseed', 'staff-only')).toBe(
      switched,
    );
    expect(deriveEmergencyProcessEvent(closed).open).toBe(false);
    expect(chooseEmergencyProcess(closed, 'reseed', 'read-aloud')).toBe(closed);
    const decidedThenClosed: WeekState = {
      ...closed,
      emergencyProcess: { reseed: 'read-aloud' },
    };
    expect(deriveEmergencyProcessEvent(decidedThenClosed)).toMatchObject({
      response: 'read-aloud',
      open: false,
    });
  });

  it('rejects an outcome outside the canonical set and ignores other request ids', () => {
    const seed = createSeedState();

    expect(
      chooseEmergencyProcess(
        seed,
        'reseed',
        'broadcast' as EmergencyProcessResponse,
      ),
    ).toBe(seed);
    expect(
      chooseEmergencyProcess(
        seed,
        'tape' as EmergencyProcessRequestId,
        'read-aloud',
      ),
    ).toBe(seed);
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(
      chooseEmergencyProcess(createSeedState(), 'reseed', 'read-aloud'),
    ).toEqual(
      chooseEmergencyProcess(createSeedState(), 'reseed', 'read-aloud'),
    );
    expect(deriveEmergencyProcessEvent(createSeedState())).toEqual(
      deriveEmergencyProcessEvent(createSeedState()),
    );
  });
});

describe('the note the week reports back', () => {
  it('names each answer resolved against the authority tokens', () => {
    for (const option of EMERGENCY_RESEED_OPTIONS) {
      const decided = chooseEmergencyProcess(
        createSeedState(),
        'reseed',
        option.id,
      );

      expect(deriveEmergencyProcessEvent(decided).consequence).toBe(
        option.note,
      );
      expect(emergencyReseedNote(option.id)).toBe(option.note);
      expect(option.note).toContain(DISTRICT_RESEED_AUTHORITY.authority);
      expect(option.note).toContain(DISTRICT_RESEED_AUTHORITY.seedHolder);
    }
    expect(EMERGENCY_RESEED_OPTIONS.map((option) => option.label)).toEqual([
      'Read Aloud',
      'Staff Only',
    ]);
  });

  it('says so plainly when the request was answered with nothing', () => {
    expect(emergencyReseedNote(null)).toBe(NO_EMERGENCY_RESEED_NOTE);
    expect(deriveEmergencyProcessEvent(createSeedState()).consequence).toBe(
      NO_EMERGENCY_RESEED_NOTE,
    );
  });
});
