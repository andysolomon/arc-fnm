/**
 * Staff delegation — the Scouting Assignments 'cut' task as a Coaching Decision.
 *
 * The Friday-morning walkthrough reel is a coaching tradeoff (Soto vs Pruitt),
 * but the film desk still owns the deadline and the staff note. Recording a
 * delegate never moves Match Day, eligibility, or the JV / special-teams rows
 * that remain session UI. Pure: state in, event out. No clock, no entropy, no I/O.
 */

import type {
  StaffAssignmentId,
  StaffAssignmentTaskId,
  WeekState,
} from './types.ts';

export const SOTO_FILM_AUTHORITY = {
  authority: 'Soto film staff',
  deadline: 'THU 9:00 PM',
  task: 'Cut and tag the Friday-morning walkthrough reel',
} as const;

export interface StaffDelegateOption {
  readonly id: StaffAssignmentId;
  /** Canonical Assignments pill label. Button copy is never re-authored. */
  readonly label: string;
  /** What the pill reads once the decision is on file. */
  readonly acknowledgedLabel: string;
  /** Staff note the Week Hub shows once this delegate is chosen. */
  readonly note: string;
}

export const STAFF_FILM_DELEGATES = [
  {
    id: 'soto',
    label: 'M. Soto',
    acknowledgedLabel: 'Soto on the cut',
    note: 'Standard. Soto has done it every week this season.',
  },
  {
    id: 'pruitt',
    label: 'D. Pruitt',
    acknowledgedLabel: 'Pruitt on the cut',
    note: 'Pruitt cuts it himself and shortens his own install review.',
  },
] as const satisfies readonly StaffDelegateOption[];

/** Reported when the cut has not been assigned. Absence is a decision too. */
export const NO_STAFF_DELEGATE_NOTE =
  'The Friday-morning cut has not been assigned.';

export interface StaffDelegationEvent {
  readonly id: StaffAssignmentTaskId;
  readonly kind: 'Film';
  /** Who owns the film desk. Never the coach. */
  readonly authority: string;
  /** When the reel is due. No coaching decision moves this time. */
  readonly deadline: string;
  /** Whether the coach may still record or change a delegate. */
  readonly open: boolean;
  readonly response: StaffAssignmentId | null;
  readonly responseLabel: string | null;
  /** Resolved for the delegate actually on file — including its absence. */
  readonly consequence: string;
}

export function staffAssignmentsOf(state: WeekState): {
  readonly cut: StaffAssignmentId | null;
} {
  return state.staffAssignments ?? { cut: null };
}

export function staffDelegateOption(
  delegate: StaffAssignmentId | null,
): StaffDelegateOption | null {
  return STAFF_FILM_DELEGATES.find((option) => option.id === delegate) ?? null;
}

/** The staff note for the delegate on file. Total: null has one of its own. */
export function staffDelegateNote(delegate: StaffAssignmentId | null): string {
  return staffDelegateOption(delegate)?.note ?? NO_STAFF_DELEGATE_NOTE;
}

/**
 * The cut-task event. It is always on the board in Week 8 — the Assignments
 * tab shows it from seed — and Saturday's review closes the record.
 */
export function staffFilmDelegateEvent(state: WeekState): StaffDelegationEvent {
  const cut = staffAssignmentsOf(state).cut;
  const option = staffDelegateOption(cut);
  return {
    id: 'cut',
    kind: 'Film',
    authority: SOTO_FILM_AUTHORITY.authority,
    deadline: SOTO_FILM_AUTHORITY.deadline,
    open: !state.reviewClosed,
    response: option === null ? null : option.id,
    responseLabel: option === null ? null : option.acknowledgedLabel,
    consequence: staffDelegateNote(option === null ? null : option.id),
  };
}

/**
 * Record who cuts Friday-morning film. Only the 'cut' task is persisted; JV
 * and special-teams rows stay session UI. Re-choosing the delegate already on
 * file returns the same state so the decision cannot churn.
 */
export function chooseStaffDelegate(
  state: WeekState,
  task: StaffAssignmentTaskId,
  delegate: StaffAssignmentId,
): WeekState {
  if (task !== 'cut') return state;
  const event = staffFilmDelegateEvent(state);
  if (
    !event.open ||
    staffDelegateOption(delegate) === null ||
    staffAssignmentsOf(state).cut === delegate
  )
    return state;
  return {
    ...state,
    staffAssignments: { ...staffAssignmentsOf(state), cut: delegate },
  };
}
