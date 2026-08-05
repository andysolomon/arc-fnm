/**
 * Reducer over the Coaching Week. All transitions delegate to the pure domain
 * module — this file only maps UI intent onto those functions and carries the
 * transient navigation state alongside.
 */

import type {
  AnswerId,
  Disposition,
  DecisionProcessRating,
  HypothesisId,
  MatchSpeed,
  PolicyId,
  PolicyValue,
  PracticeBlock,
  PracticeDayId,
  PracticeObjectiveId,
  QuickAdjustCall,
  ScoutingTab,
  ScreenId,
  RtFix,
  RtStarterId,
  TacticsTab,
  WeekScenario,
  WeekState,
} from '../domain/types.ts';
import {
  closeReview,
  rateReviewDecision,
  toggleReviewLesson,
} from '../domain/decisionReview.ts';
import {
  advanceMatch,
  chooseMatchOption,
  setMatchSpeed,
  setPolicy,
  setQuickAdjust,
  skipToDecision,
  takeField,
} from '../domain/matchDay.ts';
import {
  acceptRisk,
  adoptAnswerScheme,
  allocatePracticeBlock,
  advanceStage,
  chooseAnswer,
  confirmDisruption,
  createSeedState,
  deriveEvidenceGate,
  derivePlanGate,
  lockPracticePlan,
  movePracticeBlock,
  removePracticeBlock,
  resetPracticeToStaffPlan,
  resetWeek,
  selectRtFix,
  selectRtStarter,
  setDisposition,
  setPracticeBlockLive,
  togglePriority,
  undoPracticeBlocks,
} from '../domain/week.ts';

/** Navigation is transient: it is never persisted and never gates the week. */
export interface NavState {
  readonly screen: ScreenId;
  readonly scoutingTab: ScoutingTab;
  readonly tacticsTab: TacticsTab;
  readonly scoutingHypothesis: HypothesisId | null;
  /** Session-only Inbox presentation state; message copy remains canonical data. */
  readonly inboxReadMessageIds?: readonly string[];
}

export interface AppState {
  readonly week: WeekState;
  readonly nav: NavState;
  /** Session-only allocator draft; intentionally outside persisted WeekState. */
  readonly practiceDraftBlocks: readonly PracticeBlock[] | null;
}

export type WeekAction =
  | {
      type: 'navigate';
      screen: ScreenId;
      scoutingTab?: ScoutingTab;
      tacticsTab?: TacticsTab;
      scoutingHypothesis?: HypothesisId | null;
    }
  | { type: 'mark-inbox-read'; messageId: string }
  | { type: 'toggle-priority'; id: HypothesisId }
  | { type: 'accept-risk'; id: HypothesisId }
  | { type: 'set-disposition'; id: HypothesisId; value: Disposition }
  | {
      type: 'choose-answer';
      hypothesisId: HypothesisId;
      answerId: AnswerId;
    }
  | { type: 'adopt-answer-scheme'; answerId: AnswerId }
  | { type: 'advance-stage' }
  | {
      type: 'allocate-practice-block';
      objectiveId: PracticeObjectiveId;
      day: PracticeDayId;
      live?: boolean;
    }
  | { type: 'move-practice-block'; blockId: string; day: PracticeDayId }
  | { type: 'remove-practice-block'; blockId: string }
  | { type: 'set-practice-block-live'; blockId: string; live: boolean }
  | { type: 'undo-practice-blocks' }
  | { type: 'reset-practice-to-staff-plan' }
  | { type: 'save-practice-draft' }
  | { type: 'lock-practice-plan' }
  | { type: 'select-rt-starter'; starter: RtStarterId }
  | { type: 'select-rt-fix'; fix: RtFix }
  | { type: 'confirm-disruption' }
  | { type: 'set-policy'; id: PolicyId; value: PolicyValue }
  | { type: 'take-field' }
  | { type: 'match-advance'; plays?: number }
  | { type: 'match-skip' }
  | { type: 'match-choose'; decisionId: string; optionIndex: number }
  | { type: 'match-quick-adjust'; call: QuickAdjustCall }
  | { type: 'match-set-speed'; speed: MatchSpeed }
  | {
      type: 'review-rate';
      decisionId: string;
      rating: DecisionProcessRating;
    }
  | { type: 'review-toggle-lesson'; lessonId: string }
  | { type: 'review-close' }
  | { type: 'reset-week' }
  | { type: 'hydrate'; week: WeekState };

export const INITIAL_NAV: NavState = {
  screen: 'career',
  scoutingTab: 'Hypotheses',
  tacticsTab: 'Game Plan',
  scoutingHypothesis: null,
};

export function createInitialState(): AppState {
  return {
    week: createSeedState(),
    nav: INITIAL_NAV,
    practiceDraftBlocks: null,
  };
}

export function weekReducer(
  state: AppState,
  action: WeekAction,
  scenario: WeekScenario,
): AppState {
  switch (action.type) {
    case 'navigate':
      if (
        action.screen === 'game-plan' &&
        !deriveEvidenceGate(state.week, scenario).ready
      ) {
        return state;
      }
      if (
        action.screen === 'practice' &&
        !derivePlanGate(state.week, scenario).ready
      ) {
        return state;
      }
      return {
        ...state,
        week:
          action.screen === 'practice' && state.week.stage === 'plan'
            ? advanceStage(state.week, scenario)
            : state.week,
        nav: {
          ...state.nav,
          screen: action.screen,
          scoutingTab: action.scoutingTab ?? state.nav.scoutingTab,
          tacticsTab: action.tacticsTab ?? state.nav.tacticsTab,
          scoutingHypothesis:
            action.scoutingHypothesis === undefined
              ? state.nav.scoutingHypothesis
              : action.scoutingHypothesis,
        },
      };

    case 'mark-inbox-read':
      return (state.nav.inboxReadMessageIds ?? []).includes(action.messageId)
        ? state
        : {
            ...state,
            nav: {
              ...state.nav,
              inboxReadMessageIds: [
                ...(state.nav.inboxReadMessageIds ?? []),
                action.messageId,
              ],
            },
          };

    case 'toggle-priority':
      return {
        ...state,
        week: togglePriority(state.week, scenario, action.id),
      };

    case 'accept-risk':
      return { ...state, week: acceptRisk(state.week, scenario, action.id) };

    case 'set-disposition':
      return {
        ...state,
        week: setDisposition(state.week, scenario, action.id, action.value),
      };

    case 'choose-answer':
      return {
        ...state,
        week: chooseAnswer(
          state.week,
          scenario,
          action.hypothesisId,
          action.answerId,
        ),
      };

    case 'adopt-answer-scheme':
      return {
        ...state,
        week: adoptAnswerScheme(state.week, scenario, action.answerId),
      };

    case 'advance-stage':
      return { ...state, week: advanceStage(state.week, scenario) };

    case 'allocate-practice-block':
      return {
        ...state,
        week: allocatePracticeBlock(
          state.week,
          scenario,
          action.objectiveId,
          action.day,
          action.live,
        ),
      };

    case 'move-practice-block':
      return {
        ...state,
        week: movePracticeBlock(
          state.week,
          scenario,
          action.blockId,
          action.day,
        ),
      };

    case 'remove-practice-block':
      return {
        ...state,
        week: removePracticeBlock(state.week, action.blockId),
      };

    case 'set-practice-block-live':
      return {
        ...state,
        week: setPracticeBlockLive(
          state.week,
          scenario,
          action.blockId,
          action.live,
        ),
      };

    case 'undo-practice-blocks':
      return { ...state, week: undoPracticeBlocks(state.week) };

    case 'reset-practice-to-staff-plan':
      return {
        ...state,
        week: resetPracticeToStaffPlan(state.week, scenario),
      };

    case 'save-practice-draft':
      if (state.week.practicePlanLocked) return state;
      return { ...state, practiceDraftBlocks: state.week.practiceBlocks };

    case 'lock-practice-plan': {
      const week = lockPracticePlan(state.week, scenario);
      return week === state.week
        ? state
        : { ...state, week, practiceDraftBlocks: week.practiceBlocks };
    }

    case 'select-rt-starter':
      return {
        ...state,
        week: selectRtStarter(state.week, action.starter),
      };

    case 'select-rt-fix':
      return { ...state, week: selectRtFix(state.week, action.fix) };

    case 'confirm-disruption':
      return { ...state, week: confirmDisruption(state.week) };

    case 'set-policy':
      return {
        ...state,
        week: setPolicy(state.week, action.id, action.value),
      };

    case 'take-field':
      return { ...state, week: takeField(state.week) };

    case 'match-advance':
      return {
        ...state,
        week: advanceMatch(state.week, scenario, action.plays ?? 1),
      };

    case 'match-skip':
      return { ...state, week: skipToDecision(state.week, scenario) };

    case 'match-choose':
      return {
        ...state,
        week: chooseMatchOption(
          state.week,
          scenario,
          action.decisionId,
          action.optionIndex,
        ),
      };

    case 'match-quick-adjust':
      return {
        ...state,
        week: setQuickAdjust(state.week, scenario, action.call),
      };

    case 'match-set-speed':
      return { ...state, week: setMatchSpeed(state.week, action.speed) };

    case 'review-rate':
      return {
        ...state,
        week: rateReviewDecision(
          state.week,
          scenario,
          action.decisionId,
          action.rating,
        ),
      };

    case 'review-toggle-lesson':
      return {
        ...state,
        week: toggleReviewLesson(state.week, scenario, action.lessonId),
      };

    case 'review-close': {
      const week = closeReview(state.week, scenario);
      return week === state.week
        ? state
        : { ...state, week, nav: { ...state.nav, screen: 'week' } };
    }

    case 'reset-week':
      // Canonical WEEK_SEED + UI_SEED intent: reset decisions and return to the
      // Week landing surface while preserving only viewport-owned shell state.
      return {
        ...state,
        week: resetWeek(),
        nav: {
          screen: 'week',
          scoutingTab: 'Overview',
          tacticsTab: 'Game Plan',
          scoutingHypothesis: null,
        },
        practiceDraftBlocks: null,
      };

    case 'hydrate':
      return { ...state, week: action.week };
  }
}
