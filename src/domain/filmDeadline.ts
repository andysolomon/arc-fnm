/**
 * Film deadline — the State U highlight tape that is a Coaching Decision.
 *
 * The Recruiting Desk owns the scout's Friday visit, Western Tech's standing
 * film request, and the Saturday exchange that carries both; the coach owns only
 * whether Reed's tape is queued before that exchange goes out. Queuing it is an
 * answer and leaving it alone is an answer too. Recording one never moves Match
 * Day, eligibility, the scout delegations, the booster fund, or the rest of the
 * Inbox, which stays session UI.
 *
 * Pure: state in, event out. No clock, no entropy, no I/O.
 */

import type { HighlightTapeResponse, WeekState } from './types.ts';

/** The only film-deadline request that persists as a Coaching Decision. */
export type FilmDeadlineRequestId = 'tape';

export const STATE_U_TAPE_AUTHORITY = {
  authority: 'Recruiting Desk',
  /** When the exchange goes out. No coaching decision moves it. */
  deadline: 'SAT film exchange',
  request: 'Reed highlight tape',
  /** The program that asked for film. The desk answers it, not the coach. */
  recipient: 'Western Tech',
} as const;

export interface HighlightTapeOption {
  readonly id: HighlightTapeResponse;
  /** Canonical Inbox action label. Button copy is never re-authored. */
  readonly label: string;
  /** What that button reads once the decision is on file. */
  readonly acknowledgedLabel: string;
  /** What Soto reports the answer produced, in his voice. */
  readonly note: string;
}

/**
 * The single answer the request accepts. Its note is token-resolved: the
 * exchange date and the requesting program come from the authority record, so
 * the coach can never be told a deadline or a recipient the desk did not set.
 */
export const HIGHLIGHT_TAPE_OPTIONS = [
  {
    id: 'queued',
    label: 'Prep Highlight Tape',
    acknowledgedLabel: 'Tape queued with Soto',
    note: `Reed's tape is queued with me, so it rides the ${STATE_U_TAPE_AUTHORITY.deadline} out to ${STATE_U_TAPE_AUTHORITY.recipient}. The scout in the stands watches Friday either way — this is the copy the ones who stayed home get.`,
  },
] as const satisfies readonly HighlightTapeOption[];

/** Reported when the request was answered with nothing. Absence is a decision too. */
export const NO_HIGHLIGHT_TAPE_NOTE = `Nothing is cut for Reed, so the ${STATE_U_TAPE_AUTHORITY.deadline} carries the game film and nothing else. ${STATE_U_TAPE_AUTHORITY.recipient} asked for tape and gets what everybody else gets.`;

export interface FilmDeadlineEvent {
  readonly id: FilmDeadlineRequestId;
  readonly kind: 'Scouting';
  /** Who owns the exchange. Never the coach. */
  readonly authority: string;
  /** When the film goes out. No coaching decision changes this date. */
  readonly deadline: string;
  /** Who asked for the film. */
  readonly recipient: string;
  /** Whether the coach may still record an answer. */
  readonly open: boolean;
  readonly response: HighlightTapeResponse | null;
  readonly responseLabel: string | null;
  /** Resolved for the answer actually on file — including its absence. */
  readonly consequence: string;
}

export type FilmDeadline = Readonly<
  Record<FilmDeadlineRequestId, HighlightTapeResponse | null>
>;

export function filmDeadlineOf(state: WeekState): FilmDeadline {
  return { tape: state.filmDeadline?.tape ?? null };
}

/** Null whenever the response is not one the request accepts. */
export function highlightTapeOption(
  response: HighlightTapeResponse | null,
): HighlightTapeOption | null {
  return (
    HIGHLIGHT_TAPE_OPTIONS.find((option) => option.id === response) ?? null
  );
}

/** Soto's note for the answer on file. Total: null has one of its own. */
export function highlightTapeNote(
  response: HighlightTapeResponse | null,
): string {
  return highlightTapeOption(response)?.note ?? NO_HIGHLIGHT_TAPE_NOTE;
}

/**
 * The tape event. It is in the Inbox from seed — the Recruiting Desk's note is
 * unread in canonical Week 8 — and Saturday's review closes the record.
 */
export function deriveHighlightTapeEvent(state: WeekState): FilmDeadlineEvent {
  const option = highlightTapeOption(filmDeadlineOf(state).tape);
  return {
    id: 'tape',
    kind: 'Scouting',
    authority: STATE_U_TAPE_AUTHORITY.authority,
    deadline: STATE_U_TAPE_AUTHORITY.deadline,
    recipient: STATE_U_TAPE_AUTHORITY.recipient,
    open: !state.reviewClosed,
    response: option?.id ?? null,
    responseLabel: option?.acknowledgedLabel ?? null,
    consequence: option?.note ?? NO_HIGHLIGHT_TAPE_NOTE,
  };
}

/**
 * Record the coach's answer to the film deadline. Only the highlight tape
 * persists; the rest of the Inbox stays session acknowledgement, and the
 * exchange date, the scout's visit, and Western Tech's request belong to the
 * Recruiting Desk. Answering with the response already on file returns the same
 * state so nothing churns.
 */
export function chooseHighlightTape(
  state: WeekState,
  request: FilmDeadlineRequestId,
  response: HighlightTapeResponse,
): WeekState {
  if (request !== 'tape' || highlightTapeOption(response) === null) {
    return state;
  }
  const deadline = filmDeadlineOf(state);
  if (state.reviewClosed || deadline[request] === response) return state;
  return { ...state, filmDeadline: { ...deadline, [request]: response } };
}
