/**
 * Pure week-state and gate logic. No React, no I/O, no clock, no randomness.
 *
 * Every function here takes state plus a scenario and returns new state or a
 * derived view. Nothing writes derived values back into `WeekState`.
 */

import { STAGE_ORDER } from './types.ts';
import { deriveDisruptionGate, RT_FIXES, RT_STARTERS } from './disruption.ts';
import { validateWeeklyFullContactMinutes } from './jurisdiction.ts';
import {
  packageMastery,
  playerAvailability,
  playerIdForRtStarter,
  resolvePracticePersonnel,
} from './roster.ts';
import type {
  AnswerId,
  Disposition,
  EvidenceCounts,
  EvidenceGate,
  GateBlocker,
  HypothesisBoardState,
  HypothesisId,
  HypothesisView,
  GamePlanAnswer,
  NextStep,
  PlanGate,
  PracticeBlock,
  PracticeDayId,
  PracticeGate,
  PracticeObjective,
  PracticeObjectiveId,
  PracticeObjectiveSummary,
  ReadinessLabel,
  RtFix,
  RtStarterId,
  ScoutingHypothesis,
  StageId,
  WeekScenario,
  WeekState,
} from './types.ts';

/**
 * The deterministic seed. Returned fresh each call so callers cannot mutate a
 * shared baseline — `resetWeek()` must always produce an identical week.
 */
export function createSeedState(): WeekState {
  return {
    stage: 'evidence',
    selectedHypotheses: [],
    acceptedRisk: null,
    dispositions: {},
    answers: {},
    offenseScheme: 'Spread',
    defenseScheme: '4-2-5',
    practiceBlocks: [],
    practiceUndo: [],
    practicePlanLocked: false,
    rtStarter: null,
    rtFix: null,
    disruptionConfirmed: false,
    academicResponse: null,
    staffAssignments: { cut: null },
    boosterFunding: { camera: null },
    filmDeadline: { tape: null },
    emergencyProcess: { reseed: null },
    policies: { fourth: 'Chart', pat: 'Kick', clock: 'Bank', auto: 'Ask' },
    matchStarted: false,
    matchSpeed: '1x',
    matchEvents: [],
    reviewRatings: {},
    lessons: [],
    reviewLessonMessage: false,
    reviewClosed: false,
  };
}

/** Reset Week: restore the exact seeded baseline, mid-week or after review. */
export function resetWeek(): WeekState {
  return createSeedState();
}

export function stageIndex(stage: StageId): number {
  return STAGE_ORDER.indexOf(stage);
}

function hypothesisIds(scenario: WeekScenario): ReadonlySet<HypothesisId> {
  return new Set(scenario.hypotheses.map((h) => h.id));
}

/**
 * Clean the priority board: drop unknown ids, duplicates, and anything held or
 * rejected, preserving the order the coach picked them in.
 */
function cleanPriorities(
  state: WeekState,
  scenario: WeekScenario,
): HypothesisId[] {
  const ids = hypothesisIds(scenario);
  return [...new Set(state.selectedHypotheses)].filter(
    (id) => ids.has(id) && state.dispositions[id] === undefined,
  );
}

function withoutAnswer(
  answers: WeekState['answers'],
  id: HypothesisId,
): Readonly<Record<HypothesisId, AnswerId>> {
  const next = { ...answers };
  delete next[id];
  return next;
}

/**
 * Derive the evidence gate. Mirrors the prototype exactly: the board must hold
 * exactly `priorityCapacity` clean entries with no stray duplicates, and the
 * accepted risk must be a distinct, eligible hypothesis.
 */
export function deriveEvidenceGate(
  state: WeekState,
  scenario: WeekScenario,
): EvidenceGate {
  const ids = hypothesisIds(scenario);
  const capacity = scenario.priorityCapacity;

  const priorityIds = cleanPriorities(state, scenario);
  const validSelection = priorityIds.slice(0, capacity);

  // A duplicate or dismissed entry leaves `selectedHypotheses` longer than the
  // clean board. That is a corrupt board, not a valid selection.
  const prioritiesExact =
    priorityIds.length === capacity &&
    state.selectedHypotheses.length === capacity;

  const risk = state.acceptedRisk;
  const acceptedRisk =
    risk !== null &&
    ids.has(risk) &&
    !validSelection.includes(risk) &&
    state.dispositions[risk] === undefined
      ? risk
      : null;

  const ready = prioritiesExact && acceptedRisk !== null;

  const blocker: GateBlocker | null = ready
    ? null
    : priorityIds.length < capacity
      ? { kind: 'under-selected', remaining: capacity - priorityIds.length }
      : !prioritiesExact
        ? { kind: 'board-corrupt' }
        : { kind: 'no-risk' };

  return {
    priorityIds,
    validSelection,
    prioritiesExact,
    acceptedRisk,
    ready,
    blocker,
    title: gateTitle(blocker, capacity),
    body: gateBody(blocker, capacity),
  };
}

function gateTitle(blocker: GateBlocker | null, capacity: number): string {
  if (blocker === null) {
    return `Board set — ${capacity} concerns prioritized, one risk accepted`;
  }
  switch (blocker.kind) {
    case 'under-selected': {
      const plural = blocker.remaining > 1 ? 's' : '';
      return `Prioritize ${blocker.remaining} more concern${plural}`;
    }
    case 'board-corrupt':
      return 'Repair the priority board';
    case 'no-risk':
      return 'Name the risk you are accepting';
  }
}

function gateBody(blocker: GateBlocker | null, capacity: number): string {
  if (blocker === null) {
    return 'Practice objectives were generated from your priorities. The accepted risk stays on the Week page and comes back up in Saturday’s review.';
  }
  switch (blocker.kind) {
    case 'under-selected':
      return `You have practice time for ${capacity}. Read the sample size and the contradicting clips before you commit — two of these are thin.`;
    case 'board-corrupt':
      return 'A disposition changed the board. Use any priority action to repair it before continuing.';
    case 'no-risk':
      return 'One tendency is left. Accepting it is a decision, not an oversight, and it will be reviewed as one.';
  }
}

/** Count supporting and contradicting clips for one hypothesis. */
export function evidenceCounts(
  hypothesisId: HypothesisId,
  scenario: WeekScenario,
): EvidenceCounts {
  let supporting = 0;
  let contradicting = 0;
  for (const clip of scenario.clips) {
    if (clip.hypothesisId !== hypothesisId) continue;
    if (clip.relation === 'sup') supporting += 1;
    else if (clip.relation === 'con') contradicting += 1;
  }
  return { supporting, contradicting, total: supporting + contradicting };
}

/**
 * Toggle a hypothesis on or off the priority board. Repairs a corrupt board as
 * a side effect, which is how the coach gets un-stuck after a disposition
 * change. Accepting a hypothesis as a priority clears it as the risk.
 */
export function togglePriority(
  state: WeekState,
  scenario: WeekScenario,
  id: HypothesisId,
): WeekState {
  if (state.practicePlanLocked) return state;
  const ids = hypothesisIds(scenario);
  if (!ids.has(id) || state.dispositions[id] !== undefined) return state;

  const clean = cleanPriorities(state, scenario).slice(
    0,
    scenario.priorityCapacity,
  );
  const isOn = clean.includes(id);

  if (isOn) {
    return {
      ...state,
      selectedHypotheses: clean.filter((x) => x !== id),
      answers: withoutAnswer(state.answers, id),
    };
  }

  if (clean.length >= scenario.priorityCapacity) {
    // Board is full. Repair it if it was corrupt, but do not silently evict.
    return { ...state, selectedHypotheses: clean };
  }

  return {
    ...state,
    selectedHypotheses: [...clean, id],
    acceptedRisk: state.acceptedRisk === id ? null : state.acceptedRisk,
  };
}

/**
 * Accept a hypothesis as this week's risk, or clear it if already accepted.
 * Naming the risk closes the evidence gate and moves the week to `plan` — the
 * one place stage advances as a direct result of a coaching decision.
 */
export function acceptRisk(
  state: WeekState,
  scenario: WeekScenario,
  id: HypothesisId,
): WeekState {
  if (state.practicePlanLocked) return state;
  const ids = hypothesisIds(scenario);
  const clean = cleanPriorities(state, scenario).slice(
    0,
    scenario.priorityCapacity,
  );
  const base: WeekState = { ...state, selectedHypotheses: clean };

  if (
    !ids.has(id) ||
    clean.includes(id) ||
    state.dispositions[id] !== undefined
  ) {
    return { ...base, acceptedRisk: null };
  }

  if (state.acceptedRisk === id) {
    return { ...base, acceptedRisk: null };
  }

  const next: WeekState = {
    ...base,
    acceptedRisk: id,
    answers: withoutAnswer(base.answers, id),
  };
  return canAdvanceStage(next, scenario) ? advanceStage(next, scenario) : next;
}

/**
 * Hold or reject a hypothesis. Toggling the same value clears the disposition.
 * A dismissed hypothesis drops off both the priority board and the risk slot.
 */
export function setDisposition(
  state: WeekState,
  scenario: WeekScenario,
  id: HypothesisId,
  value: Disposition,
): WeekState {
  if (state.practicePlanLocked) return state;
  const ids = hypothesisIds(scenario);
  if (!ids.has(id)) return state;

  const dispositions: Record<HypothesisId, Disposition> = {
    ...state.dispositions,
  };
  if (dispositions[id] === value) delete dispositions[id];
  else dispositions[id] = value;

  const next: WeekState = { ...state, dispositions };
  const clean = cleanPriorities(next, scenario).slice(
    0,
    scenario.priorityCapacity,
  );
  const risk = next.acceptedRisk;
  const keepRisk =
    risk !== null && !clean.includes(risk) && dispositions[risk] === undefined;

  return {
    ...next,
    selectedHypotheses: clean,
    acceptedRisk: keepRisk ? risk : null,
    answers: Object.fromEntries(
      Object.entries(next.answers).filter(([id]) => clean.includes(id)),
    ),
  };
}

export interface AnswerValidity {
  readonly ok: boolean;
  readonly explanation: string;
}

/** Scheme/package validity is derived from persisted coaching decisions. */
export function answerValidity(
  state: WeekState,
  answer: GamePlanAnswer,
  scenario: WeekScenario,
): AnswerValidity {
  const requirement = answer.schemeRequirement;
  if (
    requirement !== undefined &&
    state[requirement.decision] !== requirement.value
  ) {
    return {
      ok: false,
      explanation: `This answer is built on the ${requirement.label}. You are running ${state[requirement.decision]} — the fits do not carry over, and its practice objective would not rep what you will play.`,
    };
  }

  if (state.practicePlanLocked && answer.id === 'a31') {
    const disruption = deriveDisruptionGate(state);
    const starterPlayerId = playerIdForRtStarter(state.rtStarter);
    const starterAvailability =
      starterPlayerId === null
        ? null
        : playerAvailability(scenario.rosterPlanning, starterPlayerId);
    if (
      !disruption.rtLegal ||
      starterAvailability?.participation !== 'available'
    ) {
      return {
        ok: false,
        explanation:
          'Ryan Kowalski is academically ineligible; Guidance Office status cannot be overridden. An eligible Friday starter is required at right tackle.',
      };
    }
    if (state.rtFix === null) {
      return {
        ok: false,
        explanation:
          'Five-step trips flood needs an explicit protection-package decision on the Depth Chart.',
      };
    }
    if (state.rtFix === 'switch') {
      return {
        ok: false,
        explanation:
          'The selected right-tackle decision switches away from Five-step trips flood.',
      };
    }
  }

  return {
    ok: true,
    explanation: `Prepared for ${answer.packageName} with its named personnel dependencies.`,
  };
}

/**
 * Derive the plan gate from the evidence board, active answer ids, and scheme
 * decisions. No gate/readiness value is persisted.
 */
export function derivePlanGate(
  state: WeekState,
  scenario: WeekScenario,
): PlanGate {
  const evidence = deriveEvidenceGate(state, scenario);
  const priorityIds = evidence.validSelection;
  const activeAnswers: Record<HypothesisId, GamePlanAnswer> = {};

  for (const hypothesisId of priorityIds) {
    const answerId = state.answers[hypothesisId];
    const answer = scenario.answers.find(
      (candidate) =>
        candidate.id === answerId && candidate.hypothesisId === hypothesisId,
    );
    if (answer !== undefined) activeAnswers[hypothesisId] = answer;
  }

  const answeredCount = Object.keys(activeAnswers).length;
  const requiredCount = scenario.priorityCapacity;
  const invalid = priorityIds
    .map((id) => activeAnswers[id])
    .filter((answer): answer is GamePlanAnswer => answer !== undefined)
    .map((answer) => ({
      answer,
      validity: answerValidity(state, answer, scenario),
    }))
    .find(({ validity }) => !validity.ok);

  const blocker = !evidence.ready
    ? ({ kind: 'evidence-incomplete' } as const)
    : answeredCount < requiredCount
      ? ({
          kind: 'unanswered',
          remaining: requiredCount - answeredCount,
        } as const)
      : invalid !== undefined
        ? ({
            kind: 'invalid-answer',
            hypothesisId: invalid.answer.hypothesisId,
            reason: invalid.validity.explanation,
          } as const)
        : null;

  const ready = blocker === null;
  const title = ready
    ? 'Game plan set — three answers, three practice objectives'
    : blocker?.kind === 'evidence-incomplete'
      ? 'Set the evidence board first'
      : blocker?.kind === 'unanswered'
        ? `Choose ${blocker.remaining} more answer${blocker.remaining === 1 ? '' : 's'}`
        : 'One or more active answers are invalid';
  const body = ready
    ? 'Each answer created one practice objective with a rep target. Eight ten-minute blocks compete for six objectives in the Practice Plan.'
    : blocker?.kind === 'evidence-incomplete'
      ? 'Prioritize exactly three concerns and explicitly accept the fourth as risk before building the Game Plan.'
      : blocker?.kind === 'unanswered'
        ? 'Every prioritized concern needs exactly one active answer. Until it has one, there is nothing for practice time to be spent on.'
        : (blocker?.reason ??
          'The active answer is not prepared for the current scheme.');

  return {
    priorityIds,
    answeredCount,
    requiredCount,
    activeAnswers,
    ready,
    blocker,
    title,
    body,
    status: ready
      ? `Plan complete · ${answeredCount}/${requiredCount} answers set`
      : `Plan incomplete · ${answeredCount}/${requiredCount} answers set`,
  };
}

/** Choose or replace the single active answer for one prioritized concern. */
export function chooseAnswer(
  state: WeekState,
  scenario: WeekScenario,
  hypothesisId: HypothesisId,
  answerId: AnswerId,
): WeekState {
  if (state.practicePlanLocked) return state;
  const evidence = deriveEvidenceGate(state, scenario);
  if (
    !evidence.ready ||
    evidence.acceptedRisk === hypothesisId ||
    !evidence.validSelection.includes(hypothesisId)
  ) {
    return state;
  }

  const answer = scenario.answers.find(
    (candidate) =>
      candidate.id === answerId && candidate.hypothesisId === hypothesisId,
  );
  if (answer === undefined) return state;

  return {
    ...state,
    answers: { ...state.answers, [hypothesisId]: answer.id },
  };
}

/** Adopt the scheme required by a prepared answer. */
export function adoptAnswerScheme(
  state: WeekState,
  scenario: WeekScenario,
  answerId: AnswerId,
): WeekState {
  if (state.practicePlanLocked) return state;
  const answer = scenario.answers.find(
    (candidate) => candidate.id === answerId,
  );
  const requirement = answer?.schemeRequirement;
  if (answer === undefined || requirement === undefined) return state;
  if (state.answers[answer.hypothesisId] !== answer.id) return state;
  return { ...state, [requirement.decision]: requirement.value };
}

function totalPracticeCapacity(scenario: WeekScenario): number {
  return scenario.practiceDays.reduce((total, day) => total + day.capacity, 0);
}

/** One canonical opponent-plan block consumes ten full-contact minutes. */
export const FULL_CONTACT_BLOCK_MINUTES = 10;

function weeklyFullContactMinutes(blocks: readonly PracticeBlock[]): number {
  return (
    blocks.filter((block) => block.live).length * FULL_CONTACT_BLOCK_MINUTES
  );
}

function isWithinWeeklyFullContactLimit(
  blocks: readonly PracticeBlock[],
  scenario: WeekScenario,
): boolean {
  return (
    validateWeeklyFullContactMinutes(
      scenario.jurisdictionRuleSet,
      weeklyFullContactMinutes(blocks),
    ).status === 'within-limit'
  );
}

function practiceDayCounts(
  blocks: readonly PracticeBlock[],
): Record<PracticeDayId, number> {
  const counts: Record<PracticeDayId, number> = {
    MON: 0,
    TUE: 0,
    WED: 0,
    THU: 0,
  };
  for (const block of blocks) counts[block.day] += 1;
  return counts;
}

/** Standing objectives are always available; linked objectives need a valid active answer. */
export function practiceObjectiveAvailability(
  state: WeekState,
  scenario: WeekScenario,
  objective: PracticeObjective,
): PracticeObjectiveSummary['availability'] {
  if (objective.hypothesisId === null) return 'available';
  const evidence = deriveEvidenceGate(state, scenario);
  if (evidence.acceptedRisk === objective.hypothesisId) return 'accepted-risk';
  if (!evidence.validSelection.includes(objective.hypothesisId)) {
    return 'off-board';
  }
  const answer = derivePlanGate(state, scenario).activeAnswers[
    objective.hypothesisId
  ];
  return answer?.objectiveId === objective.id &&
    answerValidity(state, answer, scenario).ok
    ? 'available'
    : 'invalid-answer';
}

function validatePracticeBlocks(
  state: WeekState,
  scenario: WeekScenario,
): string | null {
  if (!derivePlanGate(state, scenario).ready) {
    return 'The Game Plan must be clean before practice time can be allocated.';
  }
  const ids = new Set<string>();
  const counts = practiceDayCounts(state.practiceBlocks);
  for (const block of state.practiceBlocks) {
    if (ids.has(block.id)) return 'Practice block ids must be unique.';
    ids.add(block.id);
    const day = scenario.practiceDays.find(
      (candidate) => candidate.id === block.day,
    );
    const objective = scenario.objectives.find(
      (candidate) => candidate.id === block.objectiveId,
    );
    if (day === undefined || objective === undefined) {
      return 'Every block must use a canonical practice day and objective.';
    }
    if (block.live && !day.contact) {
      return 'Only Tuesday Full Pads can produce a live contact rep.';
    }
    if (
      practiceObjectiveAvailability(state, scenario, objective) !== 'available'
    ) {
      return 'Accepted-risk, off-board, and invalid objectives cannot take practice time.';
    }
  }
  for (const day of scenario.practiceDays) {
    if (counts[day.id] > day.capacity) {
      return `${day.id} exceeds its ${day.capacity}-block capacity.`;
    }
  }
  if (state.practiceBlocks.length > totalPracticeCapacity(scenario)) {
    return 'The opponent plan contains more than eight blocks.';
  }
  if (!isWithinWeeklyFullContactLimit(state.practiceBlocks, scenario)) {
    return `Live contact exceeds the jurisdiction limit of ${scenario.jurisdictionRuleSet.weeklyFullContact.maximumMinutes} minutes.`;
  }
  return null;
}

/** Practice validity is derived from the current answers and persisted block set. */
export function derivePracticeGate(
  state: WeekState,
  scenario: WeekScenario,
): PracticeGate {
  const capacity = totalPracticeCapacity(scenario);
  const placedCount = state.practiceBlocks.length;
  const remaining = Math.max(0, capacity - placedCount);
  const planReady = derivePlanGate(state, scenario).ready;
  const invalidReason = planReady
    ? validatePracticeBlocks(state, scenario)
    : null;
  const blocker = !planReady
    ? ({ kind: 'plan-incomplete' } as const)
    : invalidReason !== null
      ? ({ kind: 'invalid-blocks', reason: invalidReason } as const)
      : remaining > 0
        ? ({ kind: 'blocks-remaining', remaining } as const)
        : null;
  const ready = blocker === null && placedCount === capacity;

  return {
    capacity,
    placedCount,
    remaining,
    dayCounts: practiceDayCounts(state.practiceBlocks),
    locked: state.practicePlanLocked,
    ready,
    blocker,
    title: state.practicePlanLocked
      ? 'Practice plan locked'
      : !planReady
        ? 'Set the game plan first'
        : remaining > 0
          ? `Allocate ${remaining} more block${remaining === 1 ? '' : 's'}`
          : (invalidReason ?? 'All eight opponent-plan blocks are valid'),
    body: state.practicePlanLocked
      ? 'The staff script is fixed. Reset Week is the deterministic way to start over.'
      : !planReady
        ? 'Every priority needs one valid answer before practice time can be spent.'
        : remaining > 0
          ? 'All eight ten-minute blocks must be allocated across Monday through Thursday before the plan can lock.'
          : (invalidReason ??
            'Locking the script moves the week to Thursday. Later stages remain guarded.'),
    status: state.practicePlanLocked
      ? 'Plan locked · 8/8 blocks placed'
      : `${placedCount} of ${capacity} blocks placed`,
  };
}

function rememberBlocks(
  state: WeekState,
  practiceBlocks: readonly PracticeBlock[],
): WeekState {
  return {
    ...state,
    practiceBlocks,
    practiceUndo: [...state.practiceUndo, state.practiceBlocks].slice(-25),
  };
}

function nextPracticeBlockId(blocks: readonly PracticeBlock[]): string {
  let number = 1;
  let id = '';
  do {
    id = `practice-block-${String(number).padStart(2, '0')}`;
    number += 1;
  } while (blocks.some((block) => block.id === id));
  return id;
}

/** Allocate one canonical ten-minute block. Rejected actions preserve identity. */
export function allocatePracticeBlock(
  state: WeekState,
  scenario: WeekScenario,
  objectiveId: PracticeObjectiveId,
  dayId: PracticeDayId,
  live?: boolean,
): WeekState {
  if (state.practicePlanLocked || !derivePlanGate(state, scenario).ready)
    return state;
  const objective = scenario.objectives.find((item) => item.id === objectiveId);
  const day = scenario.practiceDays.find((item) => item.id === dayId);
  if (objective === undefined || day === undefined) return state;
  if (
    practiceObjectiveAvailability(state, scenario, objective) !== 'available'
  ) {
    return state;
  }
  if (state.practiceBlocks.length >= totalPracticeCapacity(scenario))
    return state;
  if (
    state.practiceBlocks.filter((block) => block.day === dayId).length >=
    day.capacity
  ) {
    return state;
  }
  let isLive = live ?? day.contact;
  if (isLive && !day.contact) return state;
  const candidate: PracticeBlock = {
    id: nextPracticeBlockId(state.practiceBlocks),
    objectiveId,
    day: dayId,
    live: isLive,
  };
  if (
    isLive &&
    !isWithinWeeklyFullContactLimit(
      [...state.practiceBlocks, candidate],
      scenario,
    )
  ) {
    if (live === true) return state;
    isLive = false;
  }
  return rememberBlocks(state, [
    ...state.practiceBlocks,
    { ...candidate, live: isLive },
  ]);
}

export function movePracticeBlock(
  state: WeekState,
  scenario: WeekScenario,
  blockId: string,
  dayId: PracticeDayId,
): WeekState {
  if (state.practicePlanLocked || !derivePlanGate(state, scenario).ready)
    return state;
  const block = state.practiceBlocks.find((item) => item.id === blockId);
  const day = scenario.practiceDays.find((item) => item.id === dayId);
  if (block === undefined || day === undefined || block.day === dayId)
    return state;
  if (
    state.practiceBlocks.filter((item) => item.day === dayId).length >=
    day.capacity
  ) {
    return state;
  }
  const movedBlocks = state.practiceBlocks.map((item) =>
    item.id === blockId ? { ...item, day: dayId, live: day.contact } : item,
  );
  const practiceBlocks = isWithinWeeklyFullContactLimit(movedBlocks, scenario)
    ? movedBlocks
    : movedBlocks.map((item) =>
        item.id === blockId ? { ...item, live: false } : item,
      );
  return rememberBlocks(state, practiceBlocks);
}

export function removePracticeBlock(
  state: WeekState,
  blockId: string,
): WeekState {
  if (state.practicePlanLocked) return state;
  if (!state.practiceBlocks.some((block) => block.id === blockId)) return state;
  return rememberBlocks(
    state,
    state.practiceBlocks.filter((block) => block.id !== blockId),
  );
}

export function setPracticeBlockLive(
  state: WeekState,
  scenario: WeekScenario,
  blockId: string,
  live: boolean,
): WeekState {
  if (state.practicePlanLocked) return state;
  const block = state.practiceBlocks.find((item) => item.id === blockId);
  const day = scenario.practiceDays.find((item) => item.id === block?.day);
  if (block === undefined || day === undefined || (live && !day.contact))
    return state;
  if (block.live === live) return state;
  const practiceBlocks = state.practiceBlocks.map((item) =>
    item.id === blockId ? { ...item, live } : item,
  );
  if (live && !isWithinWeeklyFullContactLimit(practiceBlocks, scenario)) {
    return state;
  }
  return rememberBlocks(state, practiceBlocks);
}

export function undoPracticeBlocks(state: WeekState): WeekState {
  if (state.practicePlanLocked || state.practiceUndo.length === 0) return state;
  const history = state.practiceUndo.slice(0, -1);
  const previous = state.practiceUndo[state.practiceUndo.length - 1] ?? [];
  return { ...state, practiceBlocks: previous, practiceUndo: history };
}

/**
 * Canonical UI-3 staff allocation. Contact objectives take the scarce Tuesday
 * windows first; every result fills the fixed 2/3/2/1 day capacities.
 */
export function staffPracticeBlocks(
  state: WeekState,
  scenario: WeekScenario,
): readonly PracticeBlock[] {
  if (!derivePlanGate(state, scenario).ready) return [];

  const activeObjectiveIds = state.selectedHypotheses
    .map((id) => derivePlanGate(state, scenario).activeAnswers[id]?.objectiveId)
    .filter((id): id is PracticeObjectiveId => id !== undefined);
  for (const standing of ['o5', 'o6']) {
    if (
      scenario.objectives.some((objective) => objective.id === standing) &&
      !activeObjectiveIds.includes(standing)
    ) {
      activeObjectiveIds.push(standing);
    }
  }
  if (activeObjectiveIds.length === 0) return [];

  const capacity = totalPracticeCapacity(scenario);
  const wanted: PracticeObjectiveId[] = [];
  activeObjectiveIds.forEach((id, index) => {
    const count = index < 2 ? 2 : 1;
    for (let repeat = 0; repeat < count; repeat += 1) wanted.push(id);
  });
  let fillIndex = 0;
  while (wanted.length < capacity) {
    wanted.push(activeObjectiveIds[fillIndex % activeObjectiveIds.length]!);
    fillIndex += 1;
  }
  wanted.length = capacity;

  const remaining = Object.fromEntries(
    scenario.practiceDays.map((day) => [day.id, day.capacity]),
  ) as Record<PracticeDayId, number>;
  const blocks: PracticeBlock[] = [];
  const place = (
    objectiveId: PracticeObjectiveId,
    preferredDays: readonly PracticeDayId[],
  ) => {
    const dayId = preferredDays.find((day) => remaining[day] > 0);
    if (dayId === undefined) return;
    const day = scenario.practiceDays.find((item) => item.id === dayId);
    if (day === undefined) return;
    remaining[dayId] -= 1;
    const block: PracticeBlock = {
      id: `practice-block-${String(blocks.length + 1).padStart(2, '0')}`,
      objectiveId,
      day: dayId,
      live: day.contact,
    };
    blocks.push(
      isWithinWeeklyFullContactLimit([...blocks, block], scenario)
        ? block
        : { ...block, live: false },
    );
  };

  const contact = wanted.filter(
    (id) =>
      scenario.objectives.find((objective) => objective.id === id)?.contact,
  );
  const nonContact = wanted.filter(
    (id) =>
      !scenario.objectives.find((objective) => objective.id === id)?.contact,
  );
  contact.forEach((id) => place(id, ['TUE', 'WED', 'MON', 'THU']));
  nonContact.forEach((id) => place(id, ['MON', 'WED', 'TUE', 'THU']));
  return blocks;
}

/** Replace the current allocator with one deterministic staff plan and one undo step. */
export function resetPracticeToStaffPlan(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  if (state.practicePlanLocked || !derivePlanGate(state, scenario).ready) {
    return state;
  }
  return rememberBlocks(state, staffPracticeBlocks(state, scenario));
}

export function expectedPracticeReps(
  block: PracticeBlock,
  scenario: WeekScenario,
  state?: WeekState,
): number {
  const day = scenario.practiceDays.find((item) => item.id === block.day);
  if (day === undefined) return 0;
  let reps = day.id === 'THU' ? 4 : block.live && day.contact ? 8 : 6;
  if (state?.practicePlanLocked) {
    if (block.live && day.contact) {
      reps -= resolvePracticePersonnel(
        scenario.rosterPlanning,
        block.objectiveId,
      ).reduce(
        (penalty, resolution) =>
          penalty + (resolution.fallback?.repPenalty ?? 0),
        0,
      );
    }
    if (block.objectiveId === 'o5' && !deriveDisruptionGate(state).rtLegal)
      reps = 0;
    if (
      block.objectiveId === 'o5' &&
      state.rtFix === 'promote' &&
      deriveDisruptionGate(state).rtLegal
    )
      reps += 2;
  }
  return reps;
}

function readinessFor(
  state: WeekState,
  objective: PracticeObjective,
  blocks: readonly PracticeBlock[],
  scenario: WeekScenario,
): { readiness: ReadinessLabel; hasLiveRep: boolean; contactCapped: boolean } {
  let weight = 0;
  let hasLiveRep = false;
  for (const block of blocks) {
    const day = scenario.practiceDays.find((item) => item.id === block.day);
    if (day === undefined) continue;
    const isLive = block.live && day.contact;
    hasLiveRep ||= isLive;
    let blockWeight = objective.contact
      ? isLive
        ? 1
        : day.id === 'THU'
          ? 0.3
          : 0.4
      : day.id === 'THU'
        ? 0.7
        : 1;
    if (state.practicePlanLocked) {
      if (objective.id === 'o5' && !deriveDisruptionGate(state).rtLegal)
        blockWeight = 0;
      if (
        objective.id === 'o5' &&
        state.rtFix === 'promote' &&
        deriveDisruptionGate(state).rtLegal
      )
        blockWeight += 0.4;
      if (objective.id === 'o3' && state.rtFix === 'switch') blockWeight *= 0.5;
    }
    weight += blockWeight;
  }
  let level = weight <= 0 ? 0 : weight < 1 ? 1 : weight < 2 ? 2 : 3;
  const contactCapped = objective.contact && !hasLiveRep && level > 2;
  if (contactCapped) level = 2;
  if (state.practicePlanLocked) {
    if (objective.id === 'o5' && state.rtFix === 'promote' && level < 1)
      level = 1;
    if (objective.id === 'o3' && state.rtFix === 'simplify' && level < 2)
      level = 2;
    if (objective.id === 'o3' && state.rtFix === 'switch' && level > 1)
      level = 1;
    if (objective.id === 'o5' && state.rtFix === 'accept' && level > 1)
      level = 1;
    const starterPlayerId = playerIdForRtStarter(state.rtStarter);
    if (objective.packageId !== undefined && starterPlayerId !== null) {
      const mastery = packageMastery(
        scenario.rosterPlanning,
        objective.packageId,
        starterPlayerId,
      );
      const masteryLevel = [
        'Unseen',
        'Introduced',
        'Repped',
        'Rehearsed',
      ].indexOf(mastery);
      level = Math.min(level, Math.max(0, masteryLevel));
    }
  }
  const labels: readonly ReadinessLabel[] = [
    'Unseen',
    'Introduced',
    'Repped',
    'Rehearsed',
  ];
  return { readiness: labels[level] ?? 'Unseen', hasLiveRep, contactCapped };
}

/** Rep totals and readiness are always recomputed; neither is persisted. */
export function practiceObjectiveSummaries(
  state: WeekState,
  scenario: WeekScenario,
): readonly PracticeObjectiveSummary[] {
  const plan = derivePlanGate(state, scenario);
  return scenario.objectives.map((objective) => {
    const availability = practiceObjectiveAvailability(
      state,
      scenario,
      objective,
    );
    const blocks = state.practiceBlocks.filter(
      (block) => block.objectiveId === objective.id,
    );
    const expectedReps = blocks.reduce(
      (total, block) => total + expectedPracticeReps(block, scenario, state),
      0,
    );
    const targetReps =
      Object.values(plan.activeAnswers).find(
        (answer) => answer.objectiveId === objective.id,
      )?.targetReps ?? (objective.id === 'o5' ? 14 : 10);
    const disruptedTarget =
      state.practicePlanLocked &&
      ((objective.id === 'o3' && state.rtFix === 'simplify') ||
        (objective.id === 'o5' && state.rtFix === 'accept'))
        ? state.rtFix === 'simplify'
          ? 8
          : 6
        : targetReps;
    const readiness = readinessFor(state, objective, blocks, scenario);
    const reason =
      availability === 'accepted-risk'
        ? 'Knowingly uncovered. No practice time is going here.'
        : availability === 'off-board'
          ? 'Not prioritized, so it cannot take practice time this week.'
          : availability === 'invalid-answer'
            ? 'The active answer is missing or invalid; repair the Game Plan first.'
            : `${blocks.length} block${blocks.length === 1 ? '' : 's'} · ${expectedReps} expected reps.${
                objective.contact
                  ? ' Only Tuesday Full Pads can create a live rep.'
                  : ' No live contact required.'
              }${readiness.contactCapped ? ' No live rep, so readiness stops at Repped.' : ''}`;
    return {
      objective,
      availability,
      readiness: readiness.readiness,
      blocks,
      expectedReps,
      targetReps: disruptedTarget,
      hasLiveRep: readiness.hasLiveRep,
      contactCapped: readiness.contactCapped,
      reason,
    };
  });
}

/** Lock once, only when all eight canonical slots are valid. */
export function lockPracticePlan(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  if (state.practicePlanLocked || !derivePracticeGate(state, scenario).ready) {
    return state;
  }
  return {
    ...state,
    stage: 'disruption',
    practicePlanLocked: true,
    practiceUndo: [],
  };
}

function isAvailableRtStarter(
  scenario: WeekScenario,
  starter: RtStarterId | null,
): boolean {
  const playerId = playerIdForRtStarter(starter);
  return (
    playerId !== null &&
    playerAvailability(scenario.rosterPlanning, playerId)?.participation ===
      'available'
  );
}

/** Assign an available canonical Thursday right-tackle option. */
export function selectRtStarter(
  state: WeekState,
  scenario: WeekScenario,
  starter: RtStarterId,
): WeekState {
  if (
    !state.practicePlanLocked ||
    state.stage !== 'disruption' ||
    state.disruptionConfirmed ||
    !RT_STARTERS.some((candidate) => candidate.id === starter) ||
    !isAvailableRtStarter(scenario, starter)
  )
    return state;
  return { ...state, rtStarter: starter };
}

/** Record the canonical package response; switching also changes the active h3 answer. */
export function selectRtFix(state: WeekState, fix: RtFix): WeekState {
  if (
    !state.practicePlanLocked ||
    state.stage !== 'disruption' ||
    state.disruptionConfirmed ||
    !RT_FIXES.some((candidate) => candidate.id === fix)
  )
    return state;
  return {
    ...state,
    rtFix: fix,
    answers:
      fix === 'switch' &&
      (state.answers.h3 === 'a31' || state.answers.h3 === undefined)
        ? { ...state.answers, h3: 'a32' }
        : state.answers,
  };
}

/** Confirm Thursday after both legal-personnel steps; the week moves to Friday. */
export function confirmDisruption(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  const gate = deriveDisruptionGate(state);
  if (
    !gate.ready ||
    state.disruptionConfirmed ||
    !isAvailableRtStarter(scenario, state.rtStarter)
  )
    return state;
  return { ...state, disruptionConfirmed: true, stage: 'friday' };
}

/**
 * Whether the week may leave its current stage through the generic continue
 * action. Practice advances only through `lockPracticePlan`.
 */
export function canAdvanceStage(
  state: WeekState,
  scenario: WeekScenario,
): boolean {
  if (state.stage === 'evidence')
    return deriveEvidenceGate(state, scenario).ready;
  if (state.stage === 'plan') return derivePlanGate(state, scenario).ready;
  return false;
}

/** Advance one stage if the current gate is open. Otherwise return state. */
export function advanceStage(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  if (!canAdvanceStage(state, scenario)) return state;
  const next = STAGE_ORDER[stageIndex(state.stage) + 1];
  if (next === undefined) return state;
  return { ...state, stage: next };
}

function boardState(
  hypothesis: ScoutingHypothesis,
  gate: EvidenceGate,
  state: WeekState,
  capacity: number,
): HypothesisBoardState {
  const disposition = state.dispositions[hypothesis.id];
  if (disposition === 'reject') return 'Rejected';
  if (disposition === 'hold') return 'On hold';
  if (gate.acceptedRisk === hypothesis.id) return 'Accepted risk';
  if (gate.validSelection.includes(hypothesis.id)) return 'Priority';
  if (gate.validSelection.length >= capacity) return 'Left off the board';
  return 'Candidate';
}

/**
 * Build the per-hypothesis view the Hypotheses screen renders. Every disabled
 * action carries its reason — the board never refuses silently.
 */
export function hypothesisViews(
  state: WeekState,
  scenario: WeekScenario,
): readonly HypothesisView[] {
  const gate = deriveEvidenceGate(state, scenario);
  const capacity = scenario.priorityCapacity;
  const boardFull = gate.validSelection.length >= capacity;

  return scenario.hypotheses.map((hypothesis) => {
    const disposition = state.dispositions[hypothesis.id];
    const isHeld = disposition === 'hold';
    const isRejected = disposition === 'reject';
    const isPriority = gate.validSelection.includes(hypothesis.id);
    const isAcceptedRisk = gate.acceptedRisk === hypothesis.id;
    const dismissed = isHeld || isRejected;

    const canPrioritize = isPriority || (!dismissed && !boardFull);
    const canAcceptRisk =
      isAcceptedRisk ||
      (!dismissed && !isPriority && boardFull && gate.acceptedRisk === null);

    const blockedReason = isRejected
      ? 'Rejected hypotheses cannot be prioritized or accepted as risk. Undo Reject to reconsider it.'
      : isHeld
        ? 'Held hypotheses stay off the priority and risk board until Hold is removed.'
        : isAcceptedRisk
          ? 'No practice time goes here. It stays visible all week.'
          : !canPrioritize
            ? `${capacity} concerns are already prioritized. Remove one to swap this in.`
            : null;

    return {
      hypothesis,
      counts: evidenceCounts(hypothesis.id, scenario),
      boardState: boardState(hypothesis, gate, state, capacity),
      isPriority,
      isAcceptedRisk,
      isHeld,
      isRejected,
      canPrioritize,
      canAcceptRisk,
      blockedReason,
    };
  });
}

/**
 * The single next action that unblocks the week, computed from real state
 * rather than the stage marker. Deep-links to the exact surface.
 */
export function nextStep(state: WeekState, scenario: WeekScenario): NextStep {
  const gate = deriveEvidenceGate(state, scenario);

  if (gate.blocker !== null) {
    const scouting = { screen: 'scouting', scoutingTab: 'Hypotheses' } as const;
    switch (gate.blocker.kind) {
      case 'board-corrupt':
        return {
          ...scouting,
          label: 'Continue · Repair priority board',
          title: `The board must contain exactly ${scenario.priorityCapacity} distinct eligible priorities`,
          blocker: true,
        };
      case 'under-selected':
        return {
          ...scouting,
          label: `Continue · Prioritize concerns · ${gate.priorityIds.length}/${scenario.priorityCapacity}`,
          title: 'Pick your opponent concerns in the Film Room',
          blocker: false,
        };
      case 'no-risk':
        return {
          ...scouting,
          label: 'Continue · Name the accepted risk',
          title: 'One concern gets no practice time — choose it on purpose',
          blocker: false,
        };
    }
  }

  // Once Practice is locked, Thursday's personnel gate owns the next action.
  // A dependent Game Plan answer may be temporarily invalid by design.
  if (state.practicePlanLocked) {
    const disruption = deriveDisruptionGate(state);
    if (!disruption.rtLegal) {
      return {
        label: 'Blocker · No legal right tackle',
        title: 'Kowalski is ineligible — put an eligible body in the RT slot',
        screen: 'game-plan',
        tacticsTab: 'Depth Chart',
        blocker: true,
      };
    }
    if (disruption.response === null) {
      return {
        label: 'Blocker · Decide the RT package',
        title:
          'The five-step package was built for Kowalski — decide what happens to it',
        screen: 'game-plan',
        tacticsTab: 'Depth Chart',
        blocker: true,
      };
    }
    if (!disruption.confirmed) {
      return {
        label: 'Continue · Confirm Thursday resolution',
        title: 'Personnel is legal — confirm the disruption response',
        screen: 'game-plan',
        tacticsTab: 'Depth Chart',
        blocker: false,
      };
    }
    if (state.stage === 'review') {
      return {
        label: state.reviewClosed
          ? 'Week complete · Reopen review'
          : 'Continue · Decision review',
        title: state.reviewClosed
          ? 'Week 8 is closed — Riverside, away, Friday Oct 23'
          : 'Walk the chain — decision, execution, outcome',
        screen: 'review',
        blocker: false,
      };
    }
    if (!state.matchStarted) {
      return {
        label: 'Continue · Decision Room',
        title: 'Confirm four game-night policies and take the field',
        screen: 'match',
        blocker: false,
      };
    }
    return {
      label: 'Continue · Match Day',
      title: 'The game is live',
      screen: 'match',
      blocker: false,
    };
  }

  const plan = derivePlanGate(state, scenario);
  if (plan.blocker?.kind === 'unanswered') {
    return {
      label: `Continue · Set answers · ${plan.answeredCount}/${plan.requiredCount}`,
      title: 'Every prioritized concern needs one answer on the Game Plan',
      screen: 'game-plan',
      blocker: false,
    };
  }
  if (plan.blocker?.kind === 'invalid-answer') {
    return {
      label: 'Continue · Fix the conflicted answer',
      title: plan.blocker.reason,
      screen: 'game-plan',
      blocker: true,
    };
  }

  const practice = derivePracticeGate(state, scenario);
  if (!practice.locked) {
    return {
      label: practice.remaining
        ? `Continue · Allocate practice · ${practice.placedCount}/${practice.capacity}`
        : 'Continue · Lock the practice plan',
      title: practice.body,
      screen: 'practice',
      blocker: practice.blocker?.kind === 'invalid-blocks',
    };
  }
  // The only remaining path is a locked plan, handled above.
  return {
    label: 'Continue · Lock the practice plan',
    title: practice.body,
    screen: 'practice',
    blocker: true,
  };
}
