/**
 * Program events — authority-owned situations the coach answers inside the week.
 *
 * A program event is not flavor. It names who owns the underlying call (the
 * coach never owns eligibility), the deadline only that authority can move, and
 * the consequence the coach's own answer produced. The answer itself is a
 * persisted Coaching Decision; everything said about it is derived here, so a
 * later beat can neither credit a support plan that was never assigned nor
 * imply that assigning one moved a date the Guidance Office controls.
 *
 * Pure: state in, event out. No clock, no entropy, no I/O.
 */

import { KOWALSKI_AUTHORITY } from './disruption.ts';
import type { AcademicResponse, WeekState } from './types.ts';

export type ProgramEventId = 'kowalski-eligibility';

export interface AcademicResponseOption {
  readonly id: AcademicResponse;
  /** The canonical Inbox action label. Button copy is never re-authored. */
  readonly label: string;
  /** What that button reads once the decision is on file. */
  readonly acknowledgedLabel: string;
  /** What the counselor reports the response produced, in her voice. */
  readonly consequence: string;
}

export const ACADEMIC_RESPONSES = [
  {
    id: 'tutor',
    label: 'Assign Tutor',
    acknowledgedLabel: 'Tutor assigned',
    consequence: `The tutor you assigned is why the Algebra II work came in this fast. Keep that assignment in place through ${KOWALSKI_AUTHORITY.checkpoint} and the checkpoint takes care of itself.`,
  },
  {
    id: 'study-hall',
    label: 'Schedule Study Hall',
    acknowledgedLabel: 'Study hall scheduled',
    consequence: `The study hall you scheduled is why the Algebra II work came in this fast. Keep him in those seats through ${KOWALSKI_AUTHORITY.checkpoint} and the checkpoint takes care of itself.`,
  },
] as const satisfies readonly AcademicResponseOption[];

/** Reported when the alert was answered with nothing. Absence is a decision too. */
export const NO_ACADEMIC_RESPONSE_CONSEQUENCE = `Nothing was assigned on your end, so he made the Algebra II work up on his own. That held this week; between now and ${KOWALSKI_AUTHORITY.checkpoint} I would rather not find out whether it holds twice.`;

export interface ProgramEvent {
  readonly id: ProgramEventId;
  readonly kind: 'Academics';
  /** Who owns the underlying call. Never the coach. */
  readonly authority: string;
  /** When that authority next moves. No coaching decision changes this date. */
  readonly deadline: string;
  /** Whether the coach may still record or change a response. */
  readonly open: boolean;
  readonly response: AcademicResponse | null;
  readonly responseLabel: string | null;
  /** Resolved for the response actually on file — including its absence. */
  readonly consequence: string;
}

export function academicResponseOption(
  response: AcademicResponse | null,
): AcademicResponseOption | null {
  return ACADEMIC_RESPONSES.find((option) => option.id === response) ?? null;
}

/** The consequence of the response on file. Total: null has one of its own. */
export function academicConsequence(response: AcademicResponse | null): string {
  return (
    academicResponseOption(response)?.consequence ??
    NO_ACADEMIC_RESPONSE_CONSEQUENCE
  );
}

/**
 * Derive the events the week has actually produced. The eligibility event does
 * not exist until Thursday's alert lands, and the alert lands on the same gate
 * the Inbox reads — a locked practice plan — so an event can never be answered
 * before the coach has been told about it.
 */
export function deriveProgramEvents(state: WeekState): readonly ProgramEvent[] {
  if (!state.practicePlanLocked) return [];
  const option = academicResponseOption(state.academicResponse);
  return [
    {
      id: 'kowalski-eligibility',
      kind: 'Academics',
      authority: KOWALSKI_AUTHORITY.authority,
      deadline: KOWALSKI_AUTHORITY.checkpoint,
      // Saturday's review closes the week; the record is final after that.
      open: !state.reviewClosed,
      response: option === null ? null : option.id,
      responseLabel: option === null ? null : option.acknowledgedLabel,
      consequence: academicConsequence(option === null ? null : option.id),
    },
  ];
}

/** The eligibility event, or null while the alert has not arrived. */
export function academicEvent(state: WeekState): ProgramEvent | null {
  return (
    deriveProgramEvents(state).find(
      (event) => event.id === 'kowalski-eligibility',
    ) ?? null
  );
}

/**
 * Record the coach's academic-support response. Support is all it records:
 * eligibility, player availability, and the checkpoint date belong to the
 * Guidance Office and are untouched here. Re-choosing the response already on
 * file returns the same state so the decision cannot churn.
 */
export function chooseAcademicResponse(
  state: WeekState,
  response: AcademicResponse,
): WeekState {
  const event = academicEvent(state);
  if (
    event === null ||
    !event.open ||
    academicResponseOption(response) === null ||
    state.academicResponse === response
  )
    return state;
  return { ...state, academicResponse: response };
}
