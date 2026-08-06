/**
 * Week context and its accessor. Kept apart from `WeekProvider.tsx` so that
 * module exports components only and stays fast-refresh friendly.
 */

import { createContext, useContext } from 'react';

import type {
  EvidenceGate,
  DisruptionGate,
  HypothesisView,
  NextStep,
  PlanGate,
  PracticeGate,
  PracticeObjectiveSummary,
  WeekScenario,
} from '../domain/types.ts';
import type { StaffDelegationEvent } from '../domain/staffDelegation.ts';
import type { WeekRepository } from '../data/weekRepository.ts';
import type { AppState, WeekAction } from './weekStore.ts';

export interface WeekContextValue {
  readonly state: AppState;
  readonly scenario: WeekScenario;
  readonly dispatch: (action: WeekAction) => void;
  /** Derived — recomputed from state on every render, never stored. */
  readonly gate: EvidenceGate;
  readonly planGate: PlanGate;
  readonly practiceGate: PracticeGate;
  readonly disruptionGate: DisruptionGate;
  readonly staffFilmDelegateEvent: StaffDelegationEvent;
  readonly practiceSummaries: readonly PracticeObjectiveSummary[];
  readonly views: readonly HypothesisView[];
  readonly next: NextStep;
  readonly canAdvance: boolean;
  readonly repository: WeekRepository;
}

export const WeekContext = createContext<WeekContextValue | null>(null);

export function useWeek(): WeekContextValue {
  const value = useContext(WeekContext);
  if (value === null) {
    throw new Error('useWeek must be used inside a <WeekProvider>');
  }
  return value;
}
