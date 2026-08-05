/**
 * Convex query/mutation boundary for the Coaching Week.
 *
 * These use the generic (un-codegen'd) primitives so the module typechecks in a
 * clean checkout, before anyone has run `npx convex dev`. Once a deployment
 * exists, swap `queryGeneric`/`mutationGeneric` for the generated `query` and
 * `mutation` from `./_generated/server` — the signatures are unchanged.
 *
 * Persistence stores decisions only. Gates and derived views live in
 * `src/domain/week.ts` and are shared by both adapters.
 */

import {
  mutationGeneric,
  queryGeneric,
  type MutationBuilder,
  type QueryBuilder,
} from 'convex/server';
import { v } from 'convex/values';

import {
  dispositionValidator,
  matchEventValidator,
  matchSpeedValidator,
  policiesValidator,
  practiceBlockValidator,
  reviewRatingValidator,
  rtFixValidator,
  rtStarterValidator,
  stageValidator,
  type DataModel,
} from './schema.ts';

// Bind the generic builders to this schema so handlers get the same table and
// index typing that `./_generated/server` would provide after codegen.
const query = queryGeneric as QueryBuilder<DataModel, 'public'>;
const mutation = mutationGeneric as MutationBuilder<DataModel, 'public'>;

const weekArgs = {
  careerId: v.string(),
  weekNumber: v.number(),
};

/** Read one coaching week. Returns null when the week has never been saved. */
export const get = query({
  args: weekArgs,
  handler: async (ctx, args) => {
    return await ctx.db
      .query('weeks')
      .withIndex('by_career_and_week', (q) =>
        q.eq('careerId', args.careerId).eq('weekNumber', args.weekNumber),
      )
      .unique();
  },
});

/**
 * Persist the whole week decision record. The client owns transition rules via
 * the pure domain module, so this is a deliberate last-write-wins upsert rather
 * than a set of fine-grained mutations.
 */
export const save = mutation({
  args: {
    ...weekArgs,
    stage: stageValidator,
    selectedHypotheses: v.array(v.string()),
    acceptedRisk: v.union(v.string(), v.null()),
    dispositions: v.record(v.string(), dispositionValidator),
    answers: v.record(v.string(), v.string()),
    offenseScheme: v.string(),
    defenseScheme: v.string(),
    practiceBlocks: v.array(practiceBlockValidator),
    practiceUndo: v.array(v.array(practiceBlockValidator)),
    practicePlanLocked: v.boolean(),
    rtStarter: v.union(rtStarterValidator, v.null()),
    rtFix: v.union(rtFixValidator, v.null()),
    disruptionConfirmed: v.boolean(),
    policies: policiesValidator,
    matchStarted: v.boolean(),
    matchSpeed: matchSpeedValidator,
    matchEvents: v.array(matchEventValidator),
    reviewRatings: v.record(v.string(), reviewRatingValidator),
    lessons: v.array(v.string()),
    reviewLessonMessage: v.boolean(),
    reviewClosed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { careerId, weekNumber, ...decisions } = args;
    const existing = await ctx.db
      .query('weeks')
      .withIndex('by_career_and_week', (q) =>
        q.eq('careerId', careerId).eq('weekNumber', weekNumber),
      )
      .unique();

    if (existing === null) {
      return await ctx.db.insert('weeks', {
        careerId,
        weekNumber,
        ...decisions,
      });
    }

    await ctx.db.patch(existing._id, decisions);
    return existing._id;
  },
});

/** Reset Week: drop the stored record so the seeded baseline is restored. */
export const reset = mutation({
  args: weekArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('weeks')
      .withIndex('by_career_and_week', (q) =>
        q.eq('careerId', args.careerId).eq('weekNumber', args.weekNumber),
      )
      .unique();

    if (existing !== null) await ctx.db.delete(existing._id);
    return null;
  },
});
