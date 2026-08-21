import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import type { WeekScenario } from '../domain/types.ts';
import { deriveBoosterFundingEvent } from '../domain/boosterFunding.ts';
import { deriveCohortCarryOver } from '../domain/cohortCarryOver.ts';
import { deriveDisruptionGate } from '../domain/disruption.ts';
import { deriveEmergencyProcessEvent } from '../domain/emergencyProcess.ts';
import { deriveHighlightTapeEvent } from '../domain/filmDeadline.ts';
import {
  returnScoutDelegateEvent,
  staffFilmDelegateEvent,
} from '../domain/staffDelegation.ts';
import {
  canAdvanceStage,
  deriveEvidenceGate,
  derivePlanGate,
  derivePracticeGate,
  hypothesisViews,
  nextStep,
  practiceObjectiveSummaries,
} from '../domain/week.ts';
import { WEEK_8_SCENARIO } from '../domain/scenario.ts';
import {
  FOLLOWING_WEEK_NUMBER,
  canOpenFollowingWeek,
  followingWeekScenario,
} from '../domain/followingWeek.ts';
import {
  resolveWeekRepository,
  type WeekKey,
  type WeekRepository,
} from '../data/weekRepository.ts';
import { WeekContext, type WeekContextValue } from './weekContext.ts';
import {
  createInitialState,
  weekReducer,
  type AppState,
  type WeekAction,
} from './weekStore.ts';

/** No authentication in this slice; the demo career is a fixed opaque key. */
export const DEMO_CAREER_ID = 'demo';

export function demoWeekKey(weekNumber: number): WeekKey {
  return { careerId: DEMO_CAREER_ID, weekNumber };
}

function resolveScenario(
  weekNumber: number,
  week8Final: AppState['week8Final'],
  override?: WeekScenario,
): WeekScenario {
  if (override !== undefined) return override;
  return weekNumber === FOLLOWING_WEEK_NUMBER
    ? followingWeekScenario(week8Final)
    : WEEK_8_SCENARIO;
}

/**
 * Persistence is best-effort: the week is fully playable from in-memory state,
 * so a repository failure is reported and never thrown into the render tree.
 */
function reportRepositoryFailure(operation: string, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Week repository ${operation} failed: ${detail}`);
}

interface WeekProviderProps {
  readonly children: ReactNode;
  readonly scenario?: WeekScenario;
  readonly repository?: WeekRepository;
}

export function WeekProvider({
  children,
  scenario: scenarioOverride,
  repository,
}: WeekProviderProps) {
  const repo = useMemo(
    () => repository ?? resolveWeekRepository(),
    [repository],
  );

  const [state, rawDispatch] = useReducer(
    (current: AppState, action: WeekAction) =>
      weekReducer(
        current,
        action,
        resolveScenario(
          action.type === 'open-week' ? action.weekNumber : current.weekNumber,
          action.type === 'open-week'
            ? (action.week8Final === undefined
                ? current.week8Final
                : action.week8Final)
            : current.week8Final,
          scenarioOverride,
        ),
      ),
    undefined,
    createInitialState,
  );
  const scenario = resolveScenario(
    state.weekNumber,
    state.week8Final,
    scenarioOverride,
  );

  const latestWeek = useRef(state.week);
  const latestWeekNumber = useRef(state.weekNumber);
  useEffect(() => {
    latestWeek.current = state.week;
    latestWeekNumber.current = state.weekNumber;
  }, [state.week, state.weekNumber]);
  const writeQueue = useRef(Promise.resolve());
  const enqueueWrite = useCallback((write: () => Promise<void>) => {
    // A failed write must not poison the queue or escape as an unhandled
    // rejection: the coach keeps working locally, and the reason is reported.
    writeQueue.current = writeQueue.current
      .then(write, write)
      .catch((error: unknown) => {
        reportRepositoryFailure('save', error);
      });
    void writeQueue.current;
  }, []);

  // Hydrate once from the repository. A miss is normal — it means a fresh week.
  const hydrated = useRef(false);
  const skipNextSave = useRef(false);
  const weekMutationVersion = useRef(0);
  useEffect(() => {
    hydrated.current = false;
    skipNextSave.current = false;
    const hydrateVersion = weekMutationVersion.current;
    let cancelled = false;
    const loaded = repo.load(demoWeekKey(8)).catch((error: unknown) => {
      // A failed read is a miss: the seeded week stands and writes resume.
      reportRepositoryFailure('load', error);
      return null;
    });
    void loaded.then((stored) => {
      if (cancelled) return;
      hydrated.current = true;
      if (weekMutationVersion.current !== hydrateVersion) {
        if (skipNextSave.current) {
          skipNextSave.current = false;
        } else {
          enqueueWrite(() =>
            repo.save(
              demoWeekKey(latestWeekNumber.current),
              latestWeek.current,
            ),
          );
        }
        return;
      }
      if (stored !== null) {
        skipNextSave.current = true;
        rawDispatch({ type: 'hydrate', week: stored });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enqueueWrite, repo]);

  // Mirror decisions to the repository after hydrate completes. The initial
  // seed and repository-loaded state are not writes.
  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    enqueueWrite(() =>
      repo.save(demoWeekKey(state.weekNumber), state.week),
    );
  }, [enqueueWrite, repo, state.week]);

  const dispatch = useCallback(
    (action: WeekAction) => {
      if (action.type === 'open-week') {
        if (action.weekNumber === latestWeekNumber.current) return;
        if (
          action.weekNumber === FOLLOWING_WEEK_NUMBER &&
          !canOpenFollowingWeek(
            latestWeekNumber.current,
            latestWeek.current,
          )
        ) {
          return;
        }
        const fromKey = demoWeekKey(latestWeekNumber.current);
        const toKey = demoWeekKey(action.weekNumber);
        const seed = action.week;
        const week8Final = action.week8Final;
        weekMutationVersion.current += 1;
        skipNextSave.current = true;
        enqueueWrite(() => repo.save(fromKey, latestWeek.current));
        void repo
          .load(toKey)
          .catch((error: unknown) => {
            reportRepositoryFailure('load', error);
            return null;
          })
          .then((stored) => {
            skipNextSave.current = true;
            rawDispatch({
              type: 'open-week',
              weekNumber: action.weekNumber,
              week: stored ?? seed,
              ...(week8Final === undefined ? {} : { week8Final }),
            });
            if (stored === null) {
              enqueueWrite(() => repo.save(toKey, seed));
            }
          });
        return;
      }
      if (action.type === 'reset-week') {
        weekMutationVersion.current += 1;
        skipNextSave.current = true;
        rawDispatch(action);
        enqueueWrite(() =>
          repo.clear(demoWeekKey(latestWeekNumber.current)),
        );
        return;
      }
      if (
        action.type !== 'navigate' &&
        action.type !== 'mark-inbox-read' &&
        action.type !== 'hydrate' &&
        action.type !== 'save-practice-draft'
      ) {
        weekMutationVersion.current += 1;
      }
      rawDispatch(action);
    },
    [enqueueWrite, repo],
  );

  const value = useMemo<WeekContextValue>(
    () => ({
      state,
      scenario,
      dispatch,
      gate: deriveEvidenceGate(state.week, scenario),
      planGate: derivePlanGate(state.week, scenario),
      practiceGate: derivePracticeGate(state.week, scenario),
      disruptionGate: deriveDisruptionGate(state.week),
      staffFilmDelegateEvent: staffFilmDelegateEvent(state.week),
      returnScoutDelegateEvent: returnScoutDelegateEvent(state.week),
      boosterFundingEvent: deriveBoosterFundingEvent(state.week),
      highlightTapeEvent: deriveHighlightTapeEvent(state.week),
      emergencyProcessEvent: deriveEmergencyProcessEvent(state.week),
      cohortCarryOver: deriveCohortCarryOver(state.week),
      practiceSummaries: practiceObjectiveSummaries(state.week, scenario),
      views: hypothesisViews(state.week, scenario),
      next: nextStep(state.week, scenario),
      canAdvance: canAdvanceStage(state.week, scenario),
      repository: repo,
    }),
    [state, scenario, dispatch, repo],
  );

  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}
