/**
 * Emergency process — the District Office reseed that is a Coaching Decision.
 *
 * The District Office owns the standings, the #1 seed, and Friday's title stake;
 * the coach owns only how the building carries the news. Reading it aloud,
 * keeping it to the staff, and leaving it alone are all answers. Recording one
 * never moves Match Day, eligibility, the scout desk, the booster fund, or the
 * film exchange, and it never claims a medical, legal, or rules outcome.
 *
 * Pure: state in, event out. No clock, no entropy, no I/O.
 */

import type { EmergencyProcessResponse, WeekState } from './types.ts';

/** The only emergency-process request that persists as a Coaching Decision. */
export type EmergencyProcessRequestId = 'reseed';

export const DISTRICT_RESEED_AUTHORITY = {
  authority: 'District Office',
  /** When Friday's head-to-head decides the title. No coaching decision moves it. */
  deadline: 'FRI kickoff',
  request: 'Central Catholic #1 reseed',
  /** Who the office placed at the top. The coach does not set this. */
  seedHolder: 'Central Catholic',
  seed: '#1',
} as const;

export interface EmergencyReseedOption {
  readonly id: EmergencyProcessResponse;
  /** Canonical Inbox action label. Button copy is never re-authored. */
  readonly label: string;
  /** What that button reads once the decision is on file. */
  readonly acknowledgedLabel: string;
  /** What the week reports the answer produced, in staff voice. */
  readonly note: string;
}

/**
 * Both notes are token-resolved: the seed holder and the office name come from
 * the authority record, so the coach can never be told a standing the District
 * Office did not set.
 */
export const EMERGENCY_RESEED_OPTIONS = [
  {
    id: 'read-aloud',
    label: 'Read Aloud',
    acknowledgedLabel: 'Read aloud in the team room',
    note: `You read the ${DISTRICT_RESEED_AUTHORITY.authority} reseed aloud — ${DISTRICT_RESEED_AUTHORITY.seedHolder} is ${DISTRICT_RESEED_AUTHORITY.seed} and ${DISTRICT_RESEED_AUTHORITY.deadline} decides the title. The room heard it before we walked to practice.`,
  },
  {
    id: 'staff-only',
    label: 'Staff Only',
    acknowledgedLabel: 'Kept to the staff',
    note: `The ${DISTRICT_RESEED_AUTHORITY.authority} reseed stays with the staff — ${DISTRICT_RESEED_AUTHORITY.seedHolder} is ${DISTRICT_RESEED_AUTHORITY.seed}, and the players hear about Friday when they take the field, not from a bulletin.`,
  },
] as const satisfies readonly EmergencyReseedOption[];

/** Reported when the request was answered with nothing. Absence is a decision too. */
export const NO_EMERGENCY_RESEED_NOTE = `The ${DISTRICT_RESEED_AUTHORITY.authority} reseed is still sitting on your desk. ${DISTRICT_RESEED_AUTHORITY.seedHolder} is ${DISTRICT_RESEED_AUTHORITY.seed} either way — unanswered just means the building has not heard how you want it carried.`;

export interface EmergencyProcessEvent {
  readonly id: EmergencyProcessRequestId;
  readonly kind: 'District';
  /** Who owns the standings. Never the coach. */
  readonly authority: string;
  /** When Friday decides the title. No coaching decision changes this. */
  readonly deadline: string;
  /** Who the office placed at #1. */
  readonly seedHolder: string;
  /** Whether the coach may still record or change an answer. */
  readonly open: boolean;
  readonly response: EmergencyProcessResponse | null;
  readonly responseLabel: string | null;
  /** Resolved for the answer actually on file — including its absence. */
  readonly consequence: string;
}

export type EmergencyProcess = Readonly<
  Record<EmergencyProcessRequestId, EmergencyProcessResponse | null>
>;

export function emergencyProcessOf(state: WeekState): EmergencyProcess {
  return { reseed: state.emergencyProcess?.reseed ?? null };
}

/** Null whenever the response is not one the request accepts. */
export function emergencyReseedOption(
  response: EmergencyProcessResponse | null,
): EmergencyReseedOption | null {
  return (
    EMERGENCY_RESEED_OPTIONS.find((option) => option.id === response) ?? null
  );
}

/** Staff note for the answer on file. Total: null has one of its own. */
export function emergencyReseedNote(
  response: EmergencyProcessResponse | null,
): string {
  return emergencyReseedOption(response)?.note ?? NO_EMERGENCY_RESEED_NOTE;
}

/**
 * The reseed event. It is in the Inbox from seed — the District Office note is
 * already there in canonical Week 8 — and Saturday's review closes the record.
 */
export function deriveEmergencyProcessEvent(
  state: WeekState,
): EmergencyProcessEvent {
  const option = emergencyReseedOption(emergencyProcessOf(state).reseed);
  return {
    id: 'reseed',
    kind: 'District',
    authority: DISTRICT_RESEED_AUTHORITY.authority,
    deadline: DISTRICT_RESEED_AUTHORITY.deadline,
    seedHolder: DISTRICT_RESEED_AUTHORITY.seedHolder,
    open: !state.reviewClosed,
    response: option?.id ?? null,
    responseLabel: option?.acknowledgedLabel ?? null,
    consequence: option?.note ?? NO_EMERGENCY_RESEED_NOTE,
  };
}

/**
 * Record the coach's answer to the district reseed. Only how the building
 * carries the news persists; the standings, the #1 seed, and Friday's title
 * stake belong to the District Office. Answering with the response already on
 * file returns the same state so nothing churns.
 */
export function chooseEmergencyProcess(
  state: WeekState,
  request: EmergencyProcessRequestId,
  response: EmergencyProcessResponse,
): WeekState {
  if (request !== 'reseed' || emergencyReseedOption(response) === null) {
    return state;
  }
  const process = emergencyProcessOf(state);
  if (state.reviewClosed || process[request] === response) return state;
  return { ...state, emergencyProcess: { ...process, [request]: response } };
}
