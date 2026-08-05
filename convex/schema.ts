/**
 * Convex schema for the Coaching Week.
 *
 * Only decisions are persisted. Gates, badges, readiness, and evidence counts
 * stay derived in `src/domain/week.ts` — writing them here would let stored data
 * and computed truth drift apart.
 *
 * The browser adapter writes this exact record only when VITE_CONVEX_URL is set.
 * A clean checkout continues to use the deterministic local adapter.
 */

import {
  defineSchema,
  defineTable,
  type DataModelFromSchemaDefinition,
} from 'convex/server';
import { v } from 'convex/values';

export const stageValidator = v.union(
  v.literal('evidence'),
  v.literal('plan'),
  v.literal('practice'),
  v.literal('disruption'),
  v.literal('friday'),
  v.literal('review'),
);

export const dispositionValidator = v.union(
  v.literal('hold'),
  v.literal('reject'),
);

export const practiceDayValidator = v.union(
  v.literal('MON'),
  v.literal('TUE'),
  v.literal('WED'),
  v.literal('THU'),
);

export const practiceBlockValidator = v.object({
  id: v.string(),
  objectiveId: v.string(),
  day: practiceDayValidator,
  live: v.boolean(),
});

export const rtStarterValidator = v.union(
  v.literal('webb'),
  v.literal('ruiz'),
  v.literal('slide'),
);

export const rtFixValidator = v.union(
  v.literal('promote'),
  v.literal('simplify'),
  v.literal('switch'),
  v.literal('accept'),
);

/** Friday standing policies. Values are canonical UI-3 tokens. */
export const policiesValidator = v.object({
  fourth: v.union(v.literal('Chart'), v.literal('Short'), v.literal('Kick')),
  pat: v.union(v.literal('Kick'), v.literal('Chart'), v.literal('Feel')),
  clock: v.union(v.literal('Bank'), v.literal('Fix'), v.literal('Coord')),
  auto: v.union(v.literal('Front'), v.literal('Tempo'), v.literal('Ask')),
});

export const matchSpeedValidator = v.union(
  v.literal('pause'),
  v.literal('1x'),
  v.literal('fast'),
);

export const reviewRatingValidator = v.union(
  v.literal('Sound'),
  v.literal('Debatable'),
  v.literal('Poor process'),
);

export const quickAdjustValidator = v.union(
  v.literal('Air It Out'),
  v.literal('Pound the Rock'),
  v.literal('Blitz Heavy'),
  v.literal('Prevent'),
);

/**
 * One in-game coach action. Only these are stored — the play feed, log, and
 * scores are re-derived by the domain fold, never persisted.
 */
export const matchEventValidator = v.union(
  v.object({ kind: v.literal('advance'), plays: v.number() }),
  v.object({ kind: v.literal('skip') }),
  v.object({
    kind: v.literal('decide'),
    decisionId: v.string(),
    optionIndex: v.number(),
  }),
  v.object({ kind: v.literal('quick-adjust'), call: quickAdjustValidator }),
);

const schema = defineSchema({
  /**
   * One row per coach per week. `careerId` is an opaque owner key; this slice
   * has no authentication, so the local adapter supplies a fixed demo value.
   */
  weeks: defineTable({
    careerId: v.string(),
    weekNumber: v.number(),
    stage: stageValidator,
    /** Insertion-ordered priority board. Validity is derived, not enforced here. */
    selectedHypotheses: v.array(v.string()),
    acceptedRisk: v.union(v.string(), v.null()),
    dispositions: v.record(v.string(), dispositionValidator),
    /** Active answer id keyed by hypothesis id. Plan validity stays derived. */
    answers: v.record(v.string(), v.string()),
    offenseScheme: v.string(),
    defenseScheme: v.string(),
    practiceBlocks: v.array(practiceBlockValidator),
    practiceUndo: v.array(v.array(practiceBlockValidator)),
    practicePlanLocked: v.boolean(),
    rtStarter: v.optional(v.union(rtStarterValidator, v.null())),
    rtFix: v.optional(v.union(rtFixValidator, v.null())),
    disruptionConfirmed: v.optional(v.boolean()),
    policies: v.optional(policiesValidator),
    matchStarted: v.optional(v.boolean()),
    matchSpeed: v.optional(matchSpeedValidator),
    matchEvents: v.optional(v.array(matchEventValidator)),
    reviewRatings: v.optional(v.record(v.string(), reviewRatingValidator)),
    lessons: v.optional(v.array(v.string())),
    reviewLessonMessage: v.optional(v.boolean()),
    reviewClosed: v.optional(v.boolean()),
  }).index('by_career_and_week', ['careerId', 'weekNumber']),
});

/** Table and index typing for handlers, standing in for codegen output. */
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export default schema;
