/**
 * Staff delegation — the Scouting Assignments tasks that are Coaching Decisions.
 *
 * Two tasks persist. The Friday-morning walkthrough reel is a coaching tradeoff
 * (Soto vs Pruitt) owned by the film desk; the Central Catholic return-unit
 * breakdown is a coaching tradeoff (Ames vs Soto vs nobody) owned by the
 * scouting desk. Each desk still owns its own deadline and staff note. Recording
 * a delegate never moves Match Day, eligibility, or the JV row that remains
 * session UI. Pure: state in, event out. No clock, no entropy, no I/O.
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

export const RETURN_SCOUT_AUTHORITY = {
  authority: 'Scouting Coordinator',
  deadline: 'WED 4:00 PM',
  task: 'Central Catholic return-unit breakdown',
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

/**
 * The return-unit breakdown. `nobody` is a delegate like the other two: the
 * coach answered the task by declining to spend anybody on it.
 */
export const RETURN_SCOUT_DELEGATES = [
  {
    id: 'ames',
    label: 'K. Ames',
    acknowledgedLabel: 'Ames on the return breakdown',
    note: 'Ames builds a lane-by-lane report. Costs him a coverage period.',
  },
  {
    id: 'soto',
    label: 'M. Soto',
    acknowledgedLabel: 'Soto on the return breakdown',
    note: 'Soto adds it to his plate. Clip tagging slips to Thursday.',
  },
  {
    id: 'nobody',
    label: 'Nobody',
    acknowledgedLabel: 'Nobody on the return breakdown',
    note: 'You go into Friday with six returns and no breakdown.',
  },
] as const satisfies readonly StaffDelegateOption[];

/** Reported when the cut has not been assigned. Absence is a decision too. */
export const NO_STAFF_DELEGATE_NOTE =
  'The Friday-morning cut has not been assigned.';

/** Unanswered is not the same as answering `Nobody` — the week says which. */
export const NO_RETURN_SCOUT_NOTE =
  'The return-unit breakdown has not been assigned.';

/** Every task that persists, with the delegates it will accept. */
const TASK_DELEGATES: Readonly<
  Record<StaffAssignmentTaskId, readonly StaffDelegateOption[]>
> = {
  cut: STAFF_FILM_DELEGATES,
  st: RETURN_SCOUT_DELEGATES,
};

export interface StaffDelegationEvent {
  readonly id: StaffAssignmentTaskId;
  readonly kind: 'Film' | 'Scouting';
  /** Who owns the desk. Never the coach. */
  readonly authority: string;
  /** When the work is due. No coaching decision moves this time. */
  readonly deadline: string;
  /** Whether the coach may still record or change a delegate. */
  readonly open: boolean;
  readonly response: StaffAssignmentId | null;
  readonly responseLabel: string | null;
  /** Resolved for the delegate actually on file — including its absence. */
  readonly consequence: string;
}

export type StaffAssignments = Readonly<
  Record<StaffAssignmentTaskId, StaffAssignmentId | null>
>;

export function staffAssignmentsOf(state: WeekState): StaffAssignments {
  return {
    cut: state.staffAssignments?.cut ?? null,
    st: state.staffAssignments?.st ?? null,
  };
}

/** Empty for anything that is not a persisted task — the `jv` row, say. */
export function staffTaskDelegates(
  task: StaffAssignmentTaskId,
): readonly StaffDelegateOption[] {
  return TASK_DELEGATES[task] ?? [];
}

/** Null whenever the delegate is not one this task accepts. */
export function staffTaskDelegateOption(
  task: StaffAssignmentTaskId,
  delegate: StaffAssignmentId | null,
): StaffDelegateOption | null {
  return (
    staffTaskDelegates(task).find((option) => option.id === delegate) ?? null
  );
}

export function staffDelegateOption(
  delegate: StaffAssignmentId | null,
): StaffDelegateOption | null {
  return staffTaskDelegateOption('cut', delegate);
}

/** The staff note for the delegate on file. Total: null has one of its own. */
export function staffDelegateNote(delegate: StaffAssignmentId | null): string {
  return staffDelegateOption(delegate)?.note ?? NO_STAFF_DELEGATE_NOTE;
}

export function returnScoutNote(delegate: StaffAssignmentId | null): string {
  return staffTaskDelegateOption('st', delegate)?.note ?? NO_RETURN_SCOUT_NOTE;
}

function delegationEvent(
  state: WeekState,
  id: StaffAssignmentTaskId,
  kind: StaffDelegationEvent['kind'],
  desk: { readonly authority: string; readonly deadline: string },
  unassignedNote: string,
): StaffDelegationEvent {
  const option = staffTaskDelegateOption(id, staffAssignmentsOf(state)[id]);
  return {
    id,
    kind,
    authority: desk.authority,
    deadline: desk.deadline,
    open: !state.reviewClosed,
    response: option?.id ?? null,
    responseLabel: option?.acknowledgedLabel ?? null,
    consequence: option?.note ?? unassignedNote,
  };
}

/**
 * The cut-task event. It is always on the board in Week 8 — the Assignments
 * tab shows it from seed — and Saturday's review closes the record.
 */
export function staffFilmDelegateEvent(state: WeekState): StaffDelegationEvent {
  return delegationEvent(
    state,
    'cut',
    'Film',
    SOTO_FILM_AUTHORITY,
    NO_STAFF_DELEGATE_NOTE,
  );
}

/**
 * The return-unit event. Also on the board from seed, on the scouting desk's
 * Wednesday deadline rather than the film desk's Thursday one.
 */
export function returnScoutDelegateEvent(
  state: WeekState,
): StaffDelegationEvent {
  return delegationEvent(
    state,
    'st',
    'Scouting',
    RETURN_SCOUT_AUTHORITY,
    NO_RETURN_SCOUT_NOTE,
  );
}

/**
 * Record who does a scout-assignment task. Only `cut` and `st` persist; the JV
 * row stays session UI, and each task accepts only its own delegates. Choosing
 * the delegate already on file returns the same state so nothing churns.
 */
export function chooseStaffDelegate(
  state: WeekState,
  task: StaffAssignmentTaskId,
  delegate: StaffAssignmentId,
): WeekState {
  if (staffTaskDelegateOption(task, delegate) === null) return state;
  const assignments = staffAssignmentsOf(state);
  if (state.reviewClosed || assignments[task] === delegate) return state;
  const next: StaffAssignments = { ...assignments, [task]: delegate };
  return { ...state, staffAssignments: next };
}
