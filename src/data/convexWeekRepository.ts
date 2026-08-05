import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

import type { WeekState } from '../domain/types.ts';
import type { WeekRepository } from './weekRepository.ts';

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

/** Convex-backed implementation of the existing repository boundary. */
export function createConvexWeekRepository(
  client: WeekConvexClient,
): WeekRepository {
  return {
    name: 'Convex persistence',
    persists: true,
    async load(key) {
      const document = await client.query(weekFunctions.get, key);
      return document === null ? null : stateFrom(document);
    },
    async save(key, state) {
      await client.mutation(weekFunctions.save, {
        ...key,
        ...decisionsFrom(state),
      });
    },
    async clear(key) {
      await client.mutation(weekFunctions.reset, key);
    },
  };
}

export function createConvexHttpWeekRepository(url: string): WeekRepository {
  return createConvexWeekRepository(new ConvexHttpClient(url));
}
