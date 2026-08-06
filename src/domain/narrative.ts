/**
 * Narrative visibility, derived from real week state.
 *
 * Small-town narrative beats are gated on decisions the coach actually made —
 * never on a clock, a counter, or entropy. This module owns the single question
 * "has the week produced the state this beat talks about?" and answers it with
 * the same authority the rest of the domain uses: the Thursday disruption gate
 * decides whether a legal right tackle was named, and `reviewClosed` decides
 * whether Saturday's review is on file.
 *
 * Nothing here knows any narrative copy. Screens read the context and choose
 * what to show, so a beat can never contradict roster status or rules.
 */

import { deriveDisruptionGate } from './disruption.ts';
import type { RtStarterId, WeekState } from './types.ts';

export interface NarrativeContext {
  /** Thursday's authority alerts are live — the practice script is locked. */
  readonly disrupted: boolean;
  /** Saturday's Decision Review has been closed by the coach. */
  readonly reviewClosed: boolean;
  /** The chosen Friday right tackle, or null when none is legally named. */
  readonly rtStarter: RtStarterId | null;
  /** Display name for `rtStarter`; `slide` resolves to the man who kicks out. */
  readonly rtStarterName: string | null;
  /** Post-game beats are visible only once both causes are true. */
  readonly postGameOpen: boolean;
}

/**
 * Derive narrative visibility. Pure: state in, context out, no I/O and no
 * reads of anything the coach did not decide.
 */
export function deriveNarrativeContext(state: WeekState): NarrativeContext {
  const disruption = deriveDisruptionGate(state);
  const starterName = disruption.starterName;
  return {
    disrupted: state.practicePlanLocked,
    reviewClosed: state.reviewClosed,
    rtStarter: starterName === null ? null : state.rtStarter,
    rtStarterName: starterName,
    postGameOpen: state.reviewClosed && starterName !== null,
  };
}
