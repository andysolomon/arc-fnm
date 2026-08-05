/**
 * Typed domain contract for the Coaching Week.
 *
 * Derived from the accepted UI-3 prototype (`prototypes/Friday Night Manager UI-3/`)
 * and `CONTEXT.md`. The prototype remains canonical for labels and behavior; this
 * module restates its rules as pure, testable types and functions.
 *
 * Two invariants carry over verbatim:
 *   1. Derived state is computed, never persisted (readiness, gates, badges).
 *   2. No wall-clock reads and no random entropy. Everything is deterministic.
 */

export type StageId =
  'evidence' | 'plan' | 'practice' | 'disruption' | 'friday' | 'review';

/** Canonical Monday→Saturday ordering. `STAGE_ORDER[0]` is the seeded stage. */
export const STAGE_ORDER = [
  'evidence',
  'plan',
  'practice',
  'disruption',
  'friday',
  'review',
] as const satisfies readonly StageId[];

export type HypothesisId = string;

export type AnswerId = string;

export type PracticeObjectiveId = string;

export type PracticeDayId = 'MON' | 'TUE' | 'WED' | 'THU';

export type ReadinessLabel = 'Unseen' | 'Introduced' | 'Repped' | 'Rehearsed';

export type RtStarterId = 'webb' | 'ruiz' | 'slide';

export type RtFix = 'promote' | 'simplify' | 'switch' | 'accept';

/** A coach may park (`hold`) or discard (`reject`) a hypothesis. */
export type Disposition = 'hold' | 'reject';

/** The four Friday standing policies. Values are the canonical UI-3 tokens. */
export type PolicyId = 'fourth' | 'pat' | 'clock' | 'auto';

export interface PolicyValueById {
  readonly fourth: 'Chart' | 'Short' | 'Kick';
  readonly pat: 'Kick' | 'Chart' | 'Feel';
  readonly clock: 'Bank' | 'Fix' | 'Coord';
  readonly auto: 'Front' | 'Tempo' | 'Ask';
}

export type PolicyValue = PolicyValueById[PolicyId];

export type PolicyState = Readonly<PolicyValueById>;

/** The coordinator dial on Match Day. Later situations resolve against it. */
export type QuickAdjustCall =
  'Air It Out' | 'Pound the Rock' | 'Blitz Heavy' | 'Prevent';

/** Playback setting. Pacing is presentation-only; state never reads a clock. */
export type MatchSpeed = 'pause' | '1x' | 'fast';

/** Coach and staff process grades deliberately exclude the play result. */
export type DecisionProcessRating = 'Sound' | 'Debatable' | 'Poor process';

/**
 * One persisted coach action inside the live game. The play feed, log, scores,
 * and field state are always re-derived by folding these over the canonical
 * queue — no match result is ever stored.
 */
export type MatchEvent =
  | { readonly kind: 'advance'; readonly plays: number }
  | { readonly kind: 'skip' }
  | {
      readonly kind: 'decide';
      readonly decisionId: string;
      readonly optionIndex: number;
    }
  | { readonly kind: 'quick-adjust'; readonly call: QuickAdjustCall };

/** Evidence quality label. Never a numeric score — the sample must stay legible. */
export type ConfidenceLabel = 'Strong' | 'Moderate' | 'Low sample';

export type UnitLabel = 'Defense' | 'Offense' | 'Special Teams';

export type ClipSide = 'OFF' | 'DEF' | 'ST';

/** How a clip relates to a hypothesis: supporting, contradicting, or neutral. */
export type ClipRelation = 'sup' | 'con' | 'neu';

export type FilmAngle = 'Tight' | 'Wide';

export interface Stage {
  readonly id: StageId;
  readonly day: string;
  readonly title: string;
  readonly date: string;
  readonly surface: string;
}

export interface ScoutingHypothesis {
  readonly id: HypothesisId;
  readonly short: string;
  readonly unit: UnitLabel;
  /** The testable belief, stated in full so the coach can argue with it. */
  readonly statement: string;
  readonly snaps: number;
  readonly games: number;
  /** What evidence is absent — displayed alongside what is present. */
  readonly missing: string;
  readonly confidence: ConfidenceLabel;
  readonly confidenceWhy: string;
}

export interface FilmClip {
  readonly id: string;
  readonly side: ClipSide;
  readonly game: string;
  readonly situation: string;
  readonly personnel: string;
  readonly formation: string;
  readonly motion: string;
  readonly concept: string;
  readonly result: string;
  readonly angles: readonly FilmAngle[];
  readonly hypothesisId: HypothesisId | null;
  readonly relation: ClipRelation;
  readonly staffNote: string;
}

export interface PracticeObjective {
  readonly id: PracticeObjectiveId;
  readonly name: string;
  readonly unit: ClipSide | 'BOTH';
  readonly group: string;
  /** Null for a standing objective that does not come from opponent evidence. */
  readonly hypothesisId: HypothesisId | null;
  readonly coach: string;
  readonly contact: boolean;
  readonly note?: string;
}

export interface FixedPracticePeriod {
  readonly minutes: number;
  readonly name: string;
}

export interface PracticeDay {
  readonly id: PracticeDayId;
  readonly date: string;
  readonly pads: string;
  readonly duration: string;
  readonly capacity: number;
  readonly contact: boolean;
  readonly note: string;
  readonly fixed: readonly FixedPracticePeriod[];
}

/** The only persisted part of an allocated ten-minute opponent-plan block. */
export interface PracticeBlock {
  readonly id: string;
  readonly objectiveId: PracticeObjectiveId;
  readonly day: PracticeDayId;
  readonly live: boolean;
}

export interface PersonnelDependency {
  readonly role: string;
  readonly player: string;
  readonly requires: string;
}

export interface SchemeRequirement {
  readonly decision: 'offenseScheme' | 'defenseScheme';
  readonly value: string;
  readonly label: string;
}

/** A prepared answer transcribed from the canonical UI-3 `ANSW` concepts. */
export interface GamePlanAnswer {
  readonly id: AnswerId;
  readonly hypothesisId: HypothesisId;
  readonly name: string;
  readonly gist: string;
  readonly how: string;
  readonly personnel: string;
  readonly owner: string;
  readonly ownerRole: string;
  readonly buys: string;
  readonly exposes: string;
  readonly counterRisk: string;
  readonly successCue: string;
  readonly packageName: string;
  readonly personnelDependencies: readonly PersonnelDependency[];
  readonly objectiveId: PracticeObjectiveId;
  readonly targetReps: number;
  readonly contact: boolean;
  readonly schemeRequirement?: SchemeRequirement;
}

export interface Opponent {
  readonly name: string;
  readonly record: string;
  readonly rank: string;
  readonly district: string;
}

export interface Program {
  readonly school: string;
  readonly mascot: string;
  readonly record: string;
  readonly rank: string;
}

export interface WeekScenario {
  readonly weekNumber: number;
  readonly program: Program;
  readonly opponent: Opponent;
  readonly kickoff: string;
  readonly venue: string;
  readonly stakes: string;
  readonly stages: readonly Stage[];
  readonly hypotheses: readonly ScoutingHypothesis[];
  readonly clips: readonly FilmClip[];
  readonly objectives: readonly PracticeObjective[];
  readonly answers: readonly GamePlanAnswer[];
  readonly practiceDays: readonly PracticeDay[];
  /** How many concerns get practice time. The rest is accepted risk. */
  readonly priorityCapacity: number;
}

/**
 * The complete persisted week state. Everything else — gates, badges, counts,
 * readiness — is derived from this plus the scenario.
 */
export interface WeekState {
  readonly stage: StageId;
  /** Insertion-ordered priority board. May transiently hold invalid entries. */
  readonly selectedHypotheses: readonly HypothesisId[];
  readonly acceptedRisk: HypothesisId | null;
  readonly dispositions: Readonly<Record<HypothesisId, Disposition>>;
  /** One active answer id per concern. Invalid/stale entries never open a gate. */
  readonly answers: Readonly<Record<HypothesisId, AnswerId>>;
  /** Persisted coaching choices; answer validity is derived from these values. */
  readonly offenseScheme: string;
  readonly defenseScheme: string;
  readonly practiceBlocks: readonly PracticeBlock[];
  /** Previous block sets only; bounded and deterministic, newest last. */
  readonly practiceUndo: readonly (readonly PracticeBlock[])[];
  readonly practicePlanLocked: boolean;
  /** Thursday choices. Eligibility itself is seeded authority data, never state. */
  readonly rtStarter: RtStarterId | null;
  readonly rtFix: RtFix | null;
  readonly disruptionConfirmed: boolean;
  /** Friday standing policies. Frozen once the coach takes the field. */
  readonly policies: PolicyState;
  /** The take-the-field decision. The snapshot itself is derived, not stored. */
  readonly matchStarted: boolean;
  readonly matchSpeed: MatchSpeed;
  /** Ordered in-game coach actions; everything else about the game is derived. */
  readonly matchEvents: readonly MatchEvent[];
  /** Saturday review choices. Candidate copy and staff grades stay derived. */
  readonly reviewRatings: Readonly<Record<string, DecisionProcessRating>>;
  readonly lessons: readonly string[];
  readonly reviewLessonMessage: boolean;
  readonly reviewClosed: boolean;
}

export interface DisruptionGate {
  readonly rtLegal: boolean;
  readonly rtResolved: boolean;
  readonly starterName: string | null;
  readonly response: RtFix | null;
  readonly unresolved: number;
  readonly confirmed: boolean;
  readonly ready: boolean;
  readonly title: string;
  readonly body: string;
  readonly status: string;
}

/** Why the evidence gate is closed, in the coach's language. */
export type GateBlocker =
  | { readonly kind: 'under-selected'; readonly remaining: number }
  | { readonly kind: 'board-corrupt' }
  | { readonly kind: 'no-risk' };

export interface EvidenceGate {
  /** Unique, in-scenario, non-dismissed selections in board order. */
  readonly priorityIds: readonly HypothesisId[];
  /** The first `priorityCapacity` priorities — what actually gets practice time. */
  readonly validSelection: readonly HypothesisId[];
  /** True only when the board holds exactly `priorityCapacity` clean entries. */
  readonly prioritiesExact: boolean;
  /** The accepted risk after validation, or null if it no longer qualifies. */
  readonly acceptedRisk: HypothesisId | null;
  readonly ready: boolean;
  readonly blocker: GateBlocker | null;
  readonly title: string;
  readonly body: string;
}

export interface EvidenceCounts {
  readonly supporting: number;
  readonly contradicting: number;
  readonly total: number;
}

export type PlanGateBlocker =
  | { readonly kind: 'evidence-incomplete' }
  | { readonly kind: 'unanswered'; readonly remaining: number }
  | {
      readonly kind: 'invalid-answer';
      readonly hypothesisId: HypothesisId;
      readonly reason: string;
    };

export interface PlanGate {
  readonly priorityIds: readonly HypothesisId[];
  readonly answeredCount: number;
  readonly requiredCount: number;
  readonly activeAnswers: Readonly<Record<HypothesisId, GamePlanAnswer>>;
  readonly ready: boolean;
  readonly blocker: PlanGateBlocker | null;
  readonly title: string;
  readonly body: string;
  readonly status: string;
}

export type PracticeGateBlocker =
  | { readonly kind: 'plan-incomplete' }
  | { readonly kind: 'invalid-blocks'; readonly reason: string }
  | { readonly kind: 'blocks-remaining'; readonly remaining: number };

export interface PracticeGate {
  readonly capacity: number;
  readonly placedCount: number;
  readonly remaining: number;
  readonly dayCounts: Readonly<Record<PracticeDayId, number>>;
  readonly locked: boolean;
  readonly ready: boolean;
  readonly blocker: PracticeGateBlocker | null;
  readonly title: string;
  readonly body: string;
  readonly status: string;
}

export type ObjectiveAvailability =
  'available' | 'accepted-risk' | 'off-board' | 'invalid-answer';

export interface PracticeObjectiveSummary {
  readonly objective: PracticeObjective;
  readonly availability: ObjectiveAvailability;
  readonly readiness: ReadinessLabel;
  readonly blocks: readonly PracticeBlock[];
  readonly expectedReps: number;
  readonly targetReps: number;
  readonly hasLiveRep: boolean;
  readonly contactCapped: boolean;
  readonly reason: string;
}

/** Board status for one hypothesis. Presentation reads this, never raw state. */
export type HypothesisBoardState =
  | 'Priority'
  | 'Accepted risk'
  | 'Candidate'
  | 'Left off the board'
  | 'On hold'
  | 'Rejected';

export interface HypothesisView {
  readonly hypothesis: ScoutingHypothesis;
  readonly counts: EvidenceCounts;
  readonly boardState: HypothesisBoardState;
  readonly isPriority: boolean;
  readonly isAcceptedRisk: boolean;
  readonly isHeld: boolean;
  readonly isRejected: boolean;
  /** False when the board is full or a disposition blocks it. */
  readonly canPrioritize: boolean;
  readonly canAcceptRisk: boolean;
  /** Present whenever an action is unavailable; explains why. */
  readonly blockedReason: string | null;
}

export type ScreenId =
  | 'career'
  | 'week'
  | 'scouting'
  | 'game-plan'
  | 'practice'
  | 'inbox'
  | 'schedule'
  | 'academics'
  | 'squad'
  | 'boosters'
  | 'school'
  | 'match'
  | 'review';

export type TacticsTab = 'Game Plan' | 'Depth Chart' | 'Situational Policies';

export type ScoutingTab =
  'Overview' | 'Film Room' | 'Hypotheses' | 'Assignments';

/** A deep link into the exact surface that unblocks the week. */
export interface NextStep {
  readonly label: string;
  readonly title: string;
  readonly screen: ScreenId;
  readonly scoutingTab?: ScoutingTab;
  readonly tacticsTab?: TacticsTab;
  readonly blocker: boolean;
}
