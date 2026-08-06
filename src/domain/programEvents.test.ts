/**
 * Phase 4.1 — the eligibility event must be a coaching decision, not flavor.
 *
 * Every assertion here is causal. The event does not exist before the Guidance
 * Office alert lands; answering it records support and nothing else — the
 * ineligible player stays ineligible, the Friday personnel decision is
 * untouched, and the Oct 26 checkpoint does not move; and the consequence the
 * week reports back names the response actually on file, including its absence.
 */

import { describe, expect, it } from 'vitest';

import { KOWALSKI_AUTHORITY } from './disruption.ts';
import {
  ACADEMIC_RESPONSES,
  academicConsequence,
  academicEvent,
  chooseAcademicResponse,
  deriveProgramEvents,
  NO_ACADEMIC_RESPONSE_CONSEQUENCE,
} from './programEvents.ts';
import { playerAvailability } from './roster.ts';
import { WEEK_8_SCENARIO } from './scenario.ts';
import type { AcademicResponse, WeekState } from './types.ts';
import { createSeedState } from './week.ts';

/** Thursday: the practice plan is locked, so the alert has been delivered. */
function alertedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'disruption',
    practicePlanLocked: true,
  };
}

function closedWeek(): WeekState {
  return {
    ...alertedWeek(),
    stage: 'review',
    rtStarter: 'webb',
    rtFix: 'promote',
    disruptionConfirmed: true,
    reviewClosed: true,
  };
}

describe('eligibility event arrival', () => {
  it('produces no event until the Guidance Office alert lands', () => {
    const seed = createSeedState();

    expect(seed.academicResponse).toBeNull();
    expect(deriveProgramEvents(seed)).toEqual([]);
    expect(academicEvent(seed)).toBeNull();
  });

  it('opens one event owned by the Guidance Office once the week is disrupted', () => {
    const event = academicEvent(alertedWeek());

    expect(event).toMatchObject({
      id: 'kowalski-eligibility',
      kind: 'Academics',
      authority: KOWALSKI_AUTHORITY.authority,
      deadline: KOWALSKI_AUTHORITY.checkpoint,
      open: true,
      response: null,
      responseLabel: null,
    });
    expect(deriveProgramEvents(alertedWeek())).toHaveLength(1);
  });
});

describe('recording the coach’s support response', () => {
  it('refuses a response before the coach has been told about it', () => {
    const seed = createSeedState();

    expect(chooseAcademicResponse(seed, 'tutor')).toBe(seed);
    expect(chooseAcademicResponse(seed, 'study-hall')).toBe(seed);
  });

  it('records the chosen support plan on the week', () => {
    const decided = chooseAcademicResponse(alertedWeek(), 'tutor');

    expect(decided.academicResponse).toBe('tutor');
    expect(academicEvent(decided)).toMatchObject({
      response: 'tutor',
      responseLabel: 'Tutor assigned',
      open: true,
    });
  });

  it('leaves eligibility, availability, and the checkpoint exactly where authority put them', () => {
    const before = alertedWeek();
    const after = chooseAcademicResponse(before, 'study-hall');

    // The support plan is not a personnel decision.
    expect(after.rtStarter).toBeNull();
    expect(after.rtFix).toBeNull();
    expect(after.disruptionConfirmed).toBe(false);
    expect(after.stage).toBe(before.stage);
    // The Guidance Office still owns the player and the date.
    expect(
      playerAvailability(WEEK_8_SCENARIO.rosterPlanning, 'player-kowalski'),
    ).toMatchObject({
      participation: 'ineligible',
      authority: 'Guidance Office',
    });
    expect(academicEvent(after)?.deadline).toBe(KOWALSKI_AUTHORITY.checkpoint);
  });

  it('lets the coach switch plans while the week is open and ignores a repeat', () => {
    const tutor = chooseAcademicResponse(alertedWeek(), 'tutor');
    const switched = chooseAcademicResponse(tutor, 'study-hall');

    expect(switched.academicResponse).toBe('study-hall');
    // Re-choosing what is already on file cannot churn the decision.
    expect(chooseAcademicResponse(switched, 'study-hall')).toBe(switched);
  });

  it('closes the record when the coach closes the week', () => {
    const closed = closedWeek();

    expect(academicEvent(closed)?.open).toBe(false);
    expect(chooseAcademicResponse(closed, 'tutor')).toBe(closed);
    // A plan recorded before the close survives it.
    const decidedThenClosed = {
      ...closed,
      academicResponse: 'tutor' as AcademicResponse,
    };
    expect(academicEvent(decidedThenClosed)).toMatchObject({
      response: 'tutor',
      open: false,
    });
  });

  it('rejects a response outside the canonical two', () => {
    const alerted = alertedWeek();

    expect(chooseAcademicResponse(alerted, 'expel' as AcademicResponse)).toBe(
      alerted,
    );
  });

  it('is deterministic — identical input yields identical state', () => {
    expect(chooseAcademicResponse(alertedWeek(), 'tutor')).toEqual(
      chooseAcademicResponse(alertedWeek(), 'tutor'),
    );
    expect(deriveProgramEvents(alertedWeek())).toEqual(
      deriveProgramEvents(alertedWeek()),
    );
  });
});

describe('the consequence the week reports back', () => {
  it('names each support plan the coach could have chosen', () => {
    for (const option of ACADEMIC_RESPONSES) {
      const decided = chooseAcademicResponse(alertedWeek(), option.id);

      expect(academicEvent(decided)?.consequence).toBe(option.consequence);
      expect(academicConsequence(option.id)).toBe(option.consequence);
    }
    expect(ACADEMIC_RESPONSES.map((option) => option.consequence)).toEqual([
      ...new Set(ACADEMIC_RESPONSES.map((option) => option.consequence)),
    ]);
  });

  it('says so plainly when the alert was answered with nothing', () => {
    expect(academicConsequence(null)).toBe(NO_ACADEMIC_RESPONSE_CONSEQUENCE);
    expect(academicEvent(alertedWeek())?.consequence).toBe(
      NO_ACADEMIC_RESPONSE_CONSEQUENCE,
    );
  });

  it('never claims a coaching decision moved eligibility, and always cites the checkpoint', () => {
    const consequences = [
      ...ACADEMIC_RESPONSES.map((option) => option.consequence),
      NO_ACADEMIC_RESPONSE_CONSEQUENCE,
    ];

    for (const consequence of consequences) {
      expect(consequence).toContain(KOWALSKI_AUTHORITY.checkpoint);
      expect(consequence).not.toMatch(/eligib/i);
    }
  });
});
