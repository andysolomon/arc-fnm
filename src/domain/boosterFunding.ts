/**
 * Booster funding — the end-zone camera request that is a Coaching Decision.
 *
 * The Westfield Gridiron Boosters own the fund, the amount, and the November
 * board date; the coach owns only the answer to the request in front of him.
 * Approving buys Soto the angle he has been asking for, deferring sends the
 * request to the next board, and leaving it alone is an answer too. Recording
 * one never moves Match Day, eligibility, the scout delegations, or the three
 * other seeded requests, which stay Boosters-screen session UI.
 *
 * Pure: state in, event out. No clock, no entropy, no I/O.
 */

import type { FundingOutcome, WeekState } from './types.ts';

/** The only funding request that persists as a Coaching Decision. */
export type BoosterFundingRequestId = 'camera';

export const BOOSTER_CAMERA_AUTHORITY = {
  authority: 'Westfield Gridiron Boosters',
  /** The board date. No coaching decision moves it. */
  deadline: 'NOV board',
  request: 'End-zone camera',
  amount: '$1,800',
} as const;

export interface BoosterFundingOption {
  readonly id: FundingOutcome;
  /** Canonical Boosters button copy. Never re-authored. */
  readonly label: string;
  /** What the request row reads once the decision is on file. */
  readonly acknowledgedLabel: string;
  /** What Soto reports the answer produced, in his voice. */
  readonly note: string;
}

/**
 * Both notes are token-resolved: the amount and the board date come from the
 * authority record, so the coach can never be told a figure or a date the
 * Boosters did not set.
 */
export const BOOSTER_CAMERA_OUTCOMES = [
  {
    id: 'approved',
    label: 'Approve',
    acknowledgedLabel: 'Approved',
    note: `The ${BOOSTER_CAMERA_AUTHORITY.amount} came out of the fund, so the end-zone camera is up for Friday. Next week’s cut finally has the angle I have been asking for.`,
  },
  {
    id: 'deferred',
    label: 'Later',
    acknowledgedLabel: 'Deferred · Nov board',
    note: `The camera goes to the ${BOOSTER_CAMERA_AUTHORITY.deadline}, so I cut Central Catholic off the sideline angle again. You will see the same blind side you saw last week.`,
  },
] as const satisfies readonly BoosterFundingOption[];

/** Reported when the request was answered with nothing. Absence is a decision too. */
export const NO_BOOSTER_CAMERA_NOTE = `The ${BOOSTER_CAMERA_AUTHORITY.amount} request is still sitting with you. Unanswered is not the same as no — it just means Friday arrives either way.`;

export interface BoosterFundingEvent {
  readonly id: BoosterFundingRequestId;
  readonly kind: 'Boosters';
  /** Who owns the fund. Never the coach. */
  readonly authority: string;
  /** When the board next sits. No coaching decision changes this date. */
  readonly deadline: string;
  readonly amount: string;
  /** Whether the coach may still record or change an answer. */
  readonly open: boolean;
  readonly response: FundingOutcome | null;
  readonly responseLabel: string | null;
  /** Resolved for the answer actually on file — including its absence. */
  readonly consequence: string;
}

export type BoosterFunding = Readonly<
  Record<BoosterFundingRequestId, FundingOutcome | null>
>;

export function boosterFundingOf(state: WeekState): BoosterFunding {
  return { camera: state.boosterFunding?.camera ?? null };
}

/** Null whenever the outcome is not one the request accepts. */
export function boosterFundingOption(
  outcome: FundingOutcome | null,
): BoosterFundingOption | null {
  return (
    BOOSTER_CAMERA_OUTCOMES.find((option) => option.id === outcome) ?? null
  );
}

/** Soto's note for the answer on file. Total: null has one of its own. */
export function boosterCameraNote(outcome: FundingOutcome | null): string {
  return boosterFundingOption(outcome)?.note ?? NO_BOOSTER_CAMERA_NOTE;
}

/**
 * The camera event. It is on the Boosters board from seed — the request is
 * pending there in canonical Week 8 — and Saturday's review closes the record.
 */
export function deriveBoosterFundingEvent(
  state: WeekState,
): BoosterFundingEvent {
  const option = boosterFundingOption(boosterFundingOf(state).camera);
  return {
    id: 'camera',
    kind: 'Boosters',
    authority: BOOSTER_CAMERA_AUTHORITY.authority,
    deadline: BOOSTER_CAMERA_AUTHORITY.deadline,
    amount: BOOSTER_CAMERA_AUTHORITY.amount,
    open: !state.reviewClosed,
    response: option?.id ?? null,
    responseLabel: option?.acknowledgedLabel ?? null,
    consequence: option?.note ?? NO_BOOSTER_CAMERA_NOTE,
  };
}

/**
 * Record the coach's answer to a booster funding request. Only the camera
 * persists; the weight room, charter bus, and team meals stay session UI, and
 * the fund balance, amount, and board date belong to the Boosters. Answering
 * with the outcome already on file returns the same state so nothing churns.
 */
export function chooseBoosterFunding(
  state: WeekState,
  request: BoosterFundingRequestId,
  outcome: FundingOutcome,
): WeekState {
  if (request !== 'camera' || boosterFundingOption(outcome) === null) {
    return state;
  }
  const funding = boosterFundingOf(state);
  if (state.reviewClosed || funding[request] === outcome) return state;
  return { ...state, boosterFunding: { ...funding, [request]: outcome } };
}
