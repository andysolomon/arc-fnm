import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

import type { WeekState } from '../domain/types.ts';
import { CONVEX_STATUS, type WeekRepository } from './weekRepository.ts';

export type WeekOperation = 'load' | 'save' | 'clear';

export type WeekRepositoryErrorCode = 'timeout' | 'failed';

/**
 * A repository failure the app can reason about: which operation broke, and
 * whether the deployment answered at all. Callers get one error type instead of
 * whatever the transport happened to throw.
 */
export class WeekRepositoryError extends Error {
  readonly operation: WeekOperation;
  readonly code: WeekRepositoryErrorCode;

  constructor(
    operation: WeekOperation,
    code: WeekRepositoryErrorCode,
    message: string,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.name = 'WeekRepositoryError';
    this.operation = operation;
    this.code = code;
  }
}

/**
 * A hung deployment must not hang the week. Long enough to absorb a cold start,
 * short enough that the coach is told something is wrong.
 */
export const CONVEX_TIMEOUT_MS = 8_000;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Bound one Convex call. `Promise.race` already attaches a handler to `work`, so
 * a late rejection after a timeout stays handled rather than surfacing as an
 * unhandled rejection.
 */
async function withTimeout<T>(
  operation: WeekOperation,
  timeoutMs: number,
  work: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new WeekRepositoryError(
          operation,
          'timeout',
          `Convex ${operation} timed out after ${timeoutMs}ms.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([work(), expiry]);
  } catch (error) {
    if (error instanceof WeekRepositoryError) throw error;
    throw new WeekRepositoryError(
      operation,
      'failed',
      `Convex ${operation} failed: ${messageOf(error)}`,
      { cause: error },
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** The decision fields stored for a week. Derived gates never cross this boundary. */
export type PersistedWeekState = Pick<
  WeekState,
  | 'stage'
  | 'selectedHypotheses'
  | 'acceptedRisk'
  | 'dispositions'
  | 'answers'
  | 'offenseScheme'
  | 'defenseScheme'
  | 'practiceBlocks'
  | 'practiceUndo'
  | 'practicePlanLocked'
  | 'rtStarter'
  | 'rtFix'
  | 'disruptionConfirmed'
  | 'policies'
  | 'matchStarted'
  | 'matchSpeed'
  | 'matchEvents'
  | 'reviewRatings'
  | 'lessons'
  | 'reviewLessonMessage'
  | 'reviewClosed'
>;

type ConvexWeekKey = {
  readonly careerId: string;
  readonly weekNumber: number;
};

export type SaveWeekArgs = ConvexWeekKey & PersistedWeekState;

export type StoredWeekDocument = SaveWeekArgs & {
  readonly _id: string;
  readonly _creationTime: number;
};

/** Typed references avoid requiring generated bindings before a deployment exists. */
export const weekFunctions = {
  get: makeFunctionReference<'query', ConvexWeekKey, StoredWeekDocument | null>(
    'week:get',
  ),
  save: makeFunctionReference<'mutation', SaveWeekArgs, string>('week:save'),
  reset: makeFunctionReference<'mutation', ConvexWeekKey, null>('week:reset'),
} as const;

export type WeekConvexClient = Pick<ConvexHttpClient, 'query' | 'mutation'>;

function decisionsFrom(state: WeekState): PersistedWeekState {
  return {
    stage: state.stage,
    selectedHypotheses: state.selectedHypotheses,
    acceptedRisk: state.acceptedRisk,
    dispositions: state.dispositions,
    answers: state.answers,
    offenseScheme: state.offenseScheme,
    defenseScheme: state.defenseScheme,
    practiceBlocks: state.practiceBlocks,
    practiceUndo: state.practiceUndo,
    practicePlanLocked: state.practicePlanLocked,
    rtStarter: state.rtStarter,
    rtFix: state.rtFix,
    disruptionConfirmed: state.disruptionConfirmed,
    policies: state.policies,
    matchStarted: state.matchStarted,
    matchSpeed: state.matchSpeed,
    matchEvents: state.matchEvents,
    reviewRatings: state.reviewRatings,
    lessons: state.lessons,
    reviewLessonMessage: state.reviewLessonMessage,
    reviewClosed: state.reviewClosed,
  };
}

function stateFrom(document: StoredWeekDocument): WeekState {
  return {
    stage: document.stage,
    selectedHypotheses: document.selectedHypotheses,
    acceptedRisk: document.acceptedRisk,
    dispositions: document.dispositions,
    answers: document.answers,
    offenseScheme: document.offenseScheme,
    defenseScheme: document.defenseScheme,
    practiceBlocks: document.practiceBlocks,
    practiceUndo: document.practiceUndo,
    practicePlanLocked: document.practicePlanLocked,
    rtStarter: document.rtStarter ?? null,
    rtFix: document.rtFix ?? null,
    disruptionConfirmed: document.disruptionConfirmed ?? false,
    policies: document.policies ?? {
      fourth: 'Chart',
      pat: 'Kick',
      clock: 'Bank',
      auto: 'Ask',
    },
    matchStarted: document.matchStarted ?? false,
    matchSpeed: document.matchSpeed ?? '1x',
    matchEvents: document.matchEvents ?? [],
    reviewRatings: document.reviewRatings ?? {},
    lessons: document.lessons ?? [],
    reviewLessonMessage: document.reviewLessonMessage ?? false,
    reviewClosed: document.reviewClosed ?? false,
  };
}

export interface ConvexWeekRepositoryOptions {
  /** Per-call budget. Overridden in tests to keep timeout coverage fast. */
  readonly timeoutMs?: number;
}

/** Convex-backed implementation of the existing repository boundary. */
export function createConvexWeekRepository(
  client: WeekConvexClient,
  options: ConvexWeekRepositoryOptions = {},
): WeekRepository {
  const timeoutMs = options.timeoutMs ?? CONVEX_TIMEOUT_MS;

  return {
    name: 'Convex persistence',
    persists: true,
    status: CONVEX_STATUS,
    async load(key) {
      const document = await withTimeout('load', timeoutMs, () =>
        client.query(weekFunctions.get, key),
      );
      return document === null ? null : stateFrom(document);
    },
    async save(key, state) {
      await withTimeout('save', timeoutMs, () =>
        client.mutation(weekFunctions.save, {
          ...key,
          ...decisionsFrom(state),
        }),
      );
    },
    async clear(key) {
      await withTimeout('clear', timeoutMs, () =>
        client.mutation(weekFunctions.reset, key),
      );
    },
  };
}

export function createConvexHttpWeekRepository(
  url: string,
  options: ConvexWeekRepositoryOptions = {},
): WeekRepository {
  return createConvexWeekRepository(new ConvexHttpClient(url), options);
}
