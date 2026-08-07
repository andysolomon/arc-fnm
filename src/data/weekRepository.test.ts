import { getFunctionName } from 'convex/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  boosterFundingOf,
  chooseBoosterFunding,
} from '../domain/boosterFunding.ts';
import { chooseHighlightTape, filmDeadlineOf } from '../domain/filmDeadline.ts';
import type { WeekState } from '../domain/types.ts';
import { createSeedState } from '../domain/week.ts';
import {
  createConvexWeekRepository,
  type StoredWeekDocument,
  type WeekConvexClient,
  weekFunctions,
} from './convexWeekRepository.ts';
import {
  checkConvexUrl,
  createLocalWeekRepository,
  localWeekRepository,
  repositoryStatus,
  resolveWeekRepository,
  type WeekKey,
} from './weekRepository.ts';

const key: WeekKey = { careerId: 'demo', weekNumber: 8 };

afterEach(() => {
  vi.unstubAllEnvs();
});

function fakeClient(options?: {
  readonly document?: StoredWeekDocument | null;
}) {
  const query = vi.fn(async (reference: unknown, args: unknown) => {
    void reference;
    void args;
    return options?.document ?? null;
  });
  const mutation = vi.fn(async (reference: unknown, args: unknown) => {
    void reference;
    void args;
    return null;
  });
  const client = {
    query: query as WeekConvexClient['query'],
    mutation: mutation as WeekConvexClient['mutation'],
  };
  return { client, query, mutation };
}

describe('VITE_CONVEX_URL validation', () => {
  it('accepts a deployment origin and normalizes it', () => {
    expect(
      checkConvexUrl('https://example-deployment-123.convex.cloud'),
    ).toEqual({ ok: true, url: 'https://example-deployment-123.convex.cloud' });
    expect(
      checkConvexUrl('  https://example-deployment-123.convex.cloud/  '),
    ).toEqual({ ok: true, url: 'https://example-deployment-123.convex.cloud' });
  });

  it.each([
    ['not-a-url', 'is not a valid URL'],
    ['example-deployment-123.convex.cloud', 'is not a valid URL'],
    ['', 'is empty'],
    ['http://example-deployment-123.convex.cloud', 'must use https://'],
    ['ws://example-deployment-123.convex.cloud', 'must use https://'],
    ['https://localhost:3210', 'is a local address'],
    ['https://127.0.0.1:3210', 'is a local address'],
    ['http://localhost:3210', 'must use https://'],
    ['https://example.com', 'is not a Convex deployment'],
    ['https://convex.cloud.attacker.example', 'is not a Convex deployment'],
    [
      'https://example-deployment-123.convex.cloud/api',
      'bare deployment origin',
    ],
    [
      'https://example-deployment-123.convex.cloud/?token=x',
      'bare deployment origin',
    ],
  ])('rejects %s with an explicit reason', (raw, fragment) => {
    const check = checkConvexUrl(raw);

    expect(check.ok).toBe(false);
    expect(check.ok ? '' : check.reason).toContain(fragment);
    expect(check.ok ? '' : check.reason).toContain('VITE_CONVEX_URL');
  });

  it('names the expected form in every rejection so the fix is obvious', () => {
    const check = checkConvexUrl('http://localhost:3210');

    expect(check.ok ? '' : check.reason).toContain(
      'Expected https://<deployment>.convex.cloud.',
    );
  });
});

describe('repository selection', () => {
  it('uses the deterministic local adapter when VITE_CONVEX_URL is unset', () => {
    vi.stubEnv('VITE_CONVEX_URL', '');

    expect(resolveWeekRepository()).toBe(localWeekRepository);
    expect(repositoryStatus(localWeekRepository).mode).toBe('local');
    expect(repositoryStatus(localWeekRepository).configError).toBeNull();
  });

  it('selects Convex without making a network request when a URL is set', () => {
    vi.stubEnv(
      'VITE_CONVEX_URL',
      'https://example-deployment-123.convex.cloud',
    );

    const repository = resolveWeekRepository();

    expect(repository.name).toBe('Convex persistence');
    expect(repository.persists).toBe(true);
    expect(repositoryStatus(repository).mode).toBe('convex');
  });

  it.each([
    'http://example-deployment-123.convex.cloud',
    'https://localhost:3210',
    'https://example.com',
    'not-a-url',
  ])('falls back to a local adapter when the URL is %s', (raw) => {
    vi.stubEnv('VITE_CONVEX_URL', raw);

    const repository = resolveWeekRepository();
    const status = repositoryStatus(repository);

    expect(repository.persists).toBe(false);
    expect(status.mode).toBe('local');
    expect(status.configError).toContain('VITE_CONVEX_URL');
    expect(status.detail).toContain('Falling back to the local demo adapter');
  });

  it('keeps one misconfigured adapter instance so session state survives', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'https://example.com');

    const first = resolveWeekRepository();
    await first.save(key, createSeedState());
    const second = resolveWeekRepository();

    expect(second).toBe(first);
    await expect(second.load(key)).resolves.toEqual(createSeedState());
  });

  it('reports a status for adapters that do not declare one', () => {
    const status = repositoryStatus({
      name: 'Test double',
      persists: true,
      load: async () => null,
      save: async () => {},
      clear: async () => {},
    });

    expect(status.mode).toBe('convex');
    expect(status.detail).toContain('Test double');
  });
});

describe('Convex week adapter', () => {
  it('loads a complete WeekState and removes document metadata', async () => {
    const state: WeekState = {
      ...createSeedState(),
      stage: 'practice',
      selectedHypotheses: ['power', 'sprint', 'cover-3'],
      acceptedRisk: 'return-game',
      dispositions: { trick: 'hold' },
      answers: { power: 'spill', sprint: 'contain', 'cover-3': 'flood' },
      offenseScheme: 'Trips',
      defenseScheme: '4-3',
      practiceBlocks: [
        { id: 'block-1', objectiveId: 'spill', day: 'TUE', live: true },
      ],
      practiceUndo: [
        [],
        [{ id: 'block-0', objectiveId: 'spill', day: 'MON', live: false }],
      ],
      practicePlanLocked: true,
    };
    const document: StoredWeekDocument = {
      _id: 'week-document-id',
      _creationTime: 1234,
      ...key,
      ...state,
    };
    const { client, query } = fakeClient({ document });
    const repository = createConvexWeekRepository(client);

    await expect(repository.load(key)).resolves.toEqual(state);
    expect(query).toHaveBeenCalledWith(weekFunctions.get, key);
    expect(getFunctionName(weekFunctions.get)).toBe('week:get');
  });

  it('saves only the key and persisted WeekState decision fields', async () => {
    const state: WeekState = {
      ...createSeedState(),
      stage: 'plan',
      selectedHypotheses: ['power'],
      dispositions: { return: 'reject' },
      answers: { power: 'spill' },
    };
    const { client, mutation } = fakeClient();
    const repository = createConvexWeekRepository(client);

    await repository.save(key, state);

    const persisted = { ...state };
    delete persisted.staffAssignments;
    delete persisted.boosterFunding;
    delete persisted.filmDeadline;
    expect(mutation).toHaveBeenCalledWith(weekFunctions.save, {
      ...key,
      ...persisted,
    });
    expect(Object.keys(mutation.mock.calls[0]?.[1] ?? {}).sort()).toEqual(
      [
        'academicResponse',
        'acceptedRisk',
        'answers',
        'careerId',
        'defenseScheme',
        'disruptionConfirmed',
        'dispositions',
        'lessons',
        'matchEvents',
        'matchSpeed',
        'matchStarted',
        'offenseScheme',
        'policies',
        'practiceBlocks',
        'practicePlanLocked',
        'practiceUndo',
        'reviewClosed',
        'reviewLessonMessage',
        'reviewRatings',
        'rtFix',
        'rtStarter',
        'selectedHypotheses',
        'stage',
        'weekNumber',
      ].sort(),
    );
    expect(getFunctionName(weekFunctions.save)).toBe('week:save');
  });

  it('hydrates booster funding as seed, since it is not a Convex column yet', async () => {
    const state = chooseBoosterFunding(createSeedState(), 'camera', 'approved');
    const document: StoredWeekDocument = {
      _id: 'week-document-id',
      _creationTime: 1234,
      ...key,
      ...state,
    };
    const { client } = fakeClient({ document });
    const repository = createConvexWeekRepository(client);

    const loaded = await repository.load(key);

    expect(loaded?.boosterFunding).toEqual({ camera: null });
    expect(loaded?.staffAssignments).toEqual({ cut: null });
    expect(loaded?.filmDeadline).toEqual({ tape: null });
  });

  it('maps repository clear to the Convex reset mutation', async () => {
    const { client, mutation } = fakeClient();
    const repository = createConvexWeekRepository(client);

    await repository.clear(key);

    expect(mutation).toHaveBeenCalledWith(weekFunctions.reset, key);
    expect(getFunctionName(weekFunctions.reset)).toBe('week:reset');
  });
});

describe('local adapter round-trip', () => {
  it('carries the booster funding answer through save and load for the session', async () => {
    const repository = createLocalWeekRepository();
    const decided = chooseBoosterFunding(
      createSeedState(),
      'camera',
      'deferred',
    );

    await repository.save(key, decided);
    const loaded = await repository.load(key);

    expect(loaded).toEqual(decided);
    expect(boosterFundingOf(loaded ?? createSeedState()).camera).toBe(
      'deferred',
    );
  });

  it('carries the highlight-tape answer through save and load for the session', async () => {
    const repository = createLocalWeekRepository();
    const decided = chooseHighlightTape(createSeedState(), 'tape', 'queued');

    await repository.save(key, decided);
    const loaded = await repository.load(key);

    expect(loaded).toEqual(decided);
    expect(filmDeadlineOf(loaded ?? createSeedState()).tape).toBe('queued');
  });

  it('drops the answer on clear, so the next load is the seeded week again', async () => {
    const repository = createLocalWeekRepository();
    await repository.save(
      key,
      chooseBoosterFunding(createSeedState(), 'camera', 'approved'),
    );

    await repository.clear(key);

    await expect(repository.load(key)).resolves.toBeNull();
    expect(boosterFundingOf(createSeedState()).camera).toBeNull();
    expect(filmDeadlineOf(createSeedState()).tape).toBeNull();
  });
});
