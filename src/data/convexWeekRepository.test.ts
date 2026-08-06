/**
 * Round-trip coverage for the Convex adapter.
 *
 * The mock server below speaks the real `ConvexHttpClient` wire format — POST
 * `/api/query` and `/api/mutation`, Convex-encoded args and values — so a full
 * `WeekState` is proved to survive encoding, storage, and decoding rather than
 * only proving that a stub was called. Storage is a `Map`, and document
 * metadata is fixed, so nothing here reads a clock or entropy.
 */

import { ConvexHttpClient } from 'convex/browser';
import { convexToJson, jsonToConvex, type Value } from 'convex/values';
import { describe, expect, it, vi } from 'vitest';

import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import {
  createConvexWeekRepository,
  WeekRepositoryError,
  type StoredWeekDocument,
  type WeekConvexClient,
} from './convexWeekRepository.ts';
import type { WeekKey } from './weekRepository.ts';

const MOCK_URL = 'https://mock-deployment-123.convex.cloud';
const key: WeekKey = { careerId: 'demo', weekNumber: 8 };

/** Fixed so the mock server stays deterministic across runs. */
const CREATION_TIME = 1_700_000_000_000;

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

/** An in-memory Convex deployment implementing `week:get|save|reset`. */
function mockConvexServer() {
  const documents = new Map<string, StoredWeekDocument>();
  const calls: string[] = [];

  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      path: string;
      args: readonly unknown[];
    };
    const args = jsonToConvex(body.args[0] as never) as Record<string, Value>;
    const documentKey = `${String(args.careerId)}:${String(args.weekNumber)}`;
    calls.push(body.path);

    if (url.endsWith('/api/query') && body.path === 'week:get') {
      const stored = documents.get(documentKey) ?? null;
      return jsonResponse({
        status: 'success',
        value: convexToJson(stored as unknown as Value),
      });
    }

    if (url.endsWith('/api/mutation') && body.path === 'week:save') {
      const id = `week-${documentKey}`;
      documents.set(documentKey, {
        _id: id,
        _creationTime: CREATION_TIME,
        ...args,
      } as unknown as StoredWeekDocument);
      return jsonResponse({ status: 'success', value: convexToJson(id) });
    }

    if (url.endsWith('/api/mutation') && body.path === 'week:reset') {
      documents.delete(documentKey);
      return jsonResponse({ status: 'success', value: null });
    }

    return jsonResponse({
      status: 'error',
      errorMessage: `Unexpected call: ${body.path}`,
    });
  };

  return { documents, calls, fetchImpl };
}

/** A week with every persisted field moved off its seeded value. */
function fullyDecidedWeek(): WeekState {
  return {
    ...createSeedState(),
    stage: 'review',
    selectedHypotheses: ['power', 'sprint', 'cover-3'],
    acceptedRisk: 'return-game',
    dispositions: { trick: 'hold', screen: 'reject' },
    answers: { power: 'spill', sprint: 'contain', 'cover-3': 'flood' },
    offenseScheme: 'Trips',
    defenseScheme: '4-3',
    practiceBlocks: [
      { id: 'block-1', objectiveId: 'spill', day: 'TUE', live: true },
      { id: 'block-2', objectiveId: 'flood', day: 'WED', live: false },
    ],
    practiceUndo: [
      [],
      [{ id: 'block-0', objectiveId: 'spill', day: 'MON', live: false }],
    ],
    practicePlanLocked: true,
    rtStarter: 'webb',
    rtFix: 'promote',
    disruptionConfirmed: true,
    academicResponse: 'study-hall',
    policies: { fourth: 'Short', pat: 'Feel', clock: 'Fix', auto: 'Tempo' },
    matchStarted: true,
    matchSpeed: 'fast',
    matchEvents: [
      { kind: 'advance', plays: 3 },
      { kind: 'skip' },
      { kind: 'decide', decisionId: 'fourth-and-two', optionIndex: 1 },
      { kind: 'quick-adjust', call: 'Blitz Heavy' },
    ],
    reviewRatings: { 'fourth-and-two': 'Sound', 'clock-burn': 'Debatable' },
    lessons: ['Trust the chart on fourth and short.'],
    reviewLessonMessage: true,
    reviewClosed: true,
  };
}

describe('Convex adapter against a mock deployment', () => {
  it('round-trips a full WeekState through save, load, and clear', async () => {
    const server = mockConvexServer();
    const repository = createConvexWeekRepository(
      new ConvexHttpClient(MOCK_URL, { fetch: server.fetchImpl }),
    );
    const week = fullyDecidedWeek();

    await expect(repository.load(key)).resolves.toBeNull();

    await repository.save(key, week);
    await expect(repository.load(key)).resolves.toEqual(week);

    await repository.clear(key);
    await expect(repository.load(key)).resolves.toBeNull();

    expect(server.documents.size).toBe(0);
    expect(server.calls).toEqual([
      'week:get',
      'week:save',
      'week:get',
      'week:reset',
      'week:get',
    ]);
  });

  it('stores the week key and decisions without document metadata leaking back', async () => {
    const server = mockConvexServer();
    const repository = createConvexWeekRepository(
      new ConvexHttpClient(MOCK_URL, { fetch: server.fetchImpl }),
    );

    await repository.save(key, fullyDecidedWeek());
    const stored = server.documents.get('demo:8');

    expect(stored?.careerId).toBe('demo');
    expect(stored?.weekNumber).toBe(8);
    expect(stored?._creationTime).toBe(CREATION_TIME);

    const loaded = await repository.load(key);

    expect(loaded).not.toBeNull();
    expect(Object.keys(loaded ?? {})).not.toContain('_id');
    expect(Object.keys(loaded ?? {})).not.toContain('careerId');
  });
});

describe('Convex adapter failure surfaces', () => {
  function hungClient(): WeekConvexClient {
    const never = () => new Promise<never>(() => {});
    return {
      query: never as unknown as WeekConvexClient['query'],
      mutation: never as unknown as WeekConvexClient['mutation'],
    };
  }

  it('times out a hung load with a structured error', async () => {
    const repository = createConvexWeekRepository(hungClient(), {
      timeoutMs: 5,
    });

    const error = await repository.load(key).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(WeekRepositoryError);
    expect(error).toMatchObject({ operation: 'load', code: 'timeout' });
    expect((error as WeekRepositoryError).message).toBe(
      'Convex load timed out after 5ms.',
    );
  });

  it('times out hung writes and reports which operation stalled', async () => {
    const repository = createConvexWeekRepository(hungClient(), {
      timeoutMs: 5,
    });

    await expect(repository.save(key, createSeedState())).rejects.toMatchObject(
      { operation: 'save', code: 'timeout' },
    );
    await expect(repository.clear(key)).rejects.toMatchObject({
      operation: 'clear',
      code: 'timeout',
    });
  });

  it('wraps a rejected call, preserving the original message and cause', async () => {
    const cause = new Error('deployment unreachable');
    const client: WeekConvexClient = {
      query: vi.fn(async () => {
        throw cause;
      }) as unknown as WeekConvexClient['query'],
      mutation: vi.fn(
        async () => null,
      ) as unknown as WeekConvexClient['mutation'],
    };
    const repository = createConvexWeekRepository(client);

    const error = await repository.load(key).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(WeekRepositoryError);
    expect(error).toMatchObject({ operation: 'load', code: 'failed', cause });
    expect((error as WeekRepositoryError).message).toBe(
      'Convex load failed: deployment unreachable',
    );
  });

  it('reports a real HTTP failure from the deployment as a failed operation', async () => {
    const failing: typeof globalThis.fetch = async () =>
      ({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'internal error',
      }) as unknown as Response;
    const repository = createConvexWeekRepository(
      new ConvexHttpClient(MOCK_URL, { fetch: failing }),
    );

    await expect(repository.load(key)).rejects.toMatchObject({
      operation: 'load',
      code: 'failed',
    });
  });
});
