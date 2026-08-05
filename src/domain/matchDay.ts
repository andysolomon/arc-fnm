/**
 * Friday Match Day / Decision Room, ported from the canonical UI-3 prototype
 * (`buildGame`, `execSeed`, `execRoll`, `execPrep`, `advance`, `choose`,
 * `logQt` in `Friday Night Manager Vercel.dc.html`).
 *
 * Two rules carry over without exception:
 *   1. All variance is pure hash-derived. `execSeed` folds the take-the-field
 *      snapshot with FNV-1a in the exact canonical input order; `execRoll`
 *      mixes in the situation key. No `Math.random`, no clock reads.
 *   2. Only coach actions persist. The queue, play feed, execution log,
 *      scores, and field state are re-derived by folding `MatchEvent`s over
 *      the canonical queue — a stored result could drift from computed truth.
 *
 * String literals below are transcribed verbatim from the prototype; they are
 * the spec, not copy to be improved.
 */

import { rtStarterName } from './disruption.ts';
import { playerIdForRtStarter } from './roster.ts';
import {
  deriveEvidenceGate,
  derivePlanGate,
  practiceObjectiveSummaries,
} from './week.ts';
import { WEEK_8_SCENARIO } from './scenario.ts';
import { PRIORITY_SITUATIONS } from './types.ts';
import type {
  MatchEvent,
  MatchSpeed,
  PolicyId,
  PolicyState,
  PolicyValue,
  PrioritySituationId,
  ProtectionPlayerId,
  QuickAdjustCall,
  ReadinessLabel,
  WeekScenario,
  WeekState,
} from './types.ts';

/** Canonical policy value tokens, used to validate `set-policy` input. */
export const POLICY_VALUES: Readonly<Record<PolicyId, readonly PolicyValue[]>> =
  {
    fourth: ['Chart', 'Short', 'Kick'],
    pat: ['Kick', 'Chart', 'Feel'],
    clock: ['Bank', 'Fix', 'Coord'],
    auto: ['Front', 'Tempo', 'Ask'],
  };

export const QUICK_ADJUST_CALLS: readonly QuickAdjustCall[] = [
  'Air It Out',
  'Pound the Rock',
  'Blitz Heavy',
  'Prevent',
];

/** Canonical playback pacing (`loop()` delays). Presentation-only. */
export const MATCH_SPEED_DELAY_MS: Readonly<Record<MatchSpeed, number>> = {
  pause: 600,
  '1x': 2300,
  fast: 850,
};

export type MatchPhase = 'pregame' | 'live' | 'final';

export type MatchPlayKind = 'n' | 'f' | 'td' | 'to' | 'end';

/** One line of the play feed. Field names mirror the prototype byte-for-byte. */
export interface MatchPlay {
  readonly q: string;
  readonly c: string;
  readonly t: string;
  readonly k: MatchPlayKind;
  readonly dd?: string;
  readonly b?: number;
  readonly fd?: number;
  readonly dv?: number;
  readonly m?: number;
  readonly w?: number;
  readonly cw?: number;
  readonly tag?: string;
  readonly tagC?: string;
  readonly key?: boolean;
}

export interface MatchScore {
  readonly w: number;
  readonly c: number;
  readonly qt: QuickAdjustCall;
}

export interface MatchDecisionOption {
  readonly name: string;
  readonly sub: string;
  readonly res?: (score: MatchScore) => readonly QueueItem[];
}

export interface MatchDecision {
  readonly id: string;
  readonly key: boolean;
  readonly when: string;
  readonly title: string;
  readonly chips: readonly string[];
  readonly evid: string;
  readonly staff: string;
  readonly who: string;
  readonly opts: readonly MatchDecisionOption[];
}

export type QueueItem =
  | { readonly play: MatchPlay }
  | { readonly dec: MatchDecision }
  | { readonly gen: (score: MatchScore) => readonly QueueItem[] };

export interface MatchLogNote {
  readonly kind: 'note';
  readonly when: string;
  readonly title: string;
  readonly note: string;
  readonly key: boolean;
}

export interface MatchLogOutcome {
  readonly t: string;
  readonly tag: string;
  readonly tagC: string;
  readonly key: boolean;
}

export interface MatchLogDecision {
  readonly kind: 'decision';
  readonly id: string;
  readonly oi: number;
  readonly chips: readonly string[];
  readonly evid: string;
  readonly staff: string;
  readonly who: string;
  readonly choice: string;
  readonly sub: string;
  readonly scW: number;
  readonly scC: number;
  readonly out: readonly MatchLogOutcome[];
  readonly pts: { readonly w: number; readonly c: number };
  readonly when: string;
  readonly title: string;
  readonly note: string;
  readonly key: boolean;
}

export type MatchLogEntry = MatchLogNote | MatchLogDecision;

/** One rendered feed row (newest first, capped at 60 like the prototype). */
export interface FeedPlay {
  readonly q: string;
  readonly c: string;
  readonly t: string;
  readonly k: MatchPlayKind;
  readonly key: boolean;
  readonly tag: string;
  readonly tagC: string;
}

export interface MatchView {
  readonly phase: MatchPhase;
  readonly qt: QuickAdjustCall;
  readonly plays: readonly FeedPlay[];
  readonly log: readonly MatchLogEntry[];
  readonly wScore: number;
  readonly cScore: number;
  readonly mom: number;
  readonly ball: number;
  readonly fd: number;
  readonly drv: number;
  readonly quarter: string;
  readonly clock: string;
  readonly dd: string;
  readonly pending: MatchDecision | null;
  readonly keyCount: number;
  readonly decisionCount: number;
}

/** A prepared answer as the game engine sees it. `cue` is the success cue. */
export interface ContextAnswer {
  readonly id: string;
  readonly name: string;
  readonly gist: string;
  readonly cue: string;
}

/**
 * The take-the-field snapshot. Everything the queue depends on, derived from
 * persisted decisions at kickoff — never edited afterwards.
 *
 * `sits` and `outs` are optional and normalized: absent or empty means the
 * canonical Week 8 snapshot, which declares no situational period and carries
 * no unavailability that the other fields don't already account for. Both are
 * appended to `execSeedInputFor` only when non-empty, so the canonical seed
 * input stays byte-for-byte what it was before they existed.
 */
export interface TakeFieldContext {
  readonly lvl: Readonly<Record<string, number>>;
  readonly pol: PolicyState;
  readonly rtFix: WeekState['rtFix'];
  readonly rtName: string;
  readonly ansBy: Readonly<Partial<Record<string, ContextAnswer>>>;
  readonly risk: string | null;
  /** Prepared situational periods, deduped and in `PRIORITY_SITUATIONS` order. */
  readonly sits?: readonly PrioritySituationId[];
  /** Unavailable players no other field carries, by ascending player id. */
  readonly outs?: readonly ProtectionPlayerId[];
}

/** Normalized situational periods for a snapshot. Empty on canonical Week 8. */
export function prioritySituationsOf(
  context: TakeFieldContext,
): readonly PrioritySituationId[] {
  return context.sits ?? [];
}

/** Normalized unrepresented unavailability. Empty on canonical Week 8. */
export function unavailablePlayersOf(
  context: TakeFieldContext,
): readonly ProtectionPlayerId[] {
  return context.outs ?? [];
}

const READINESS_LEVEL: Readonly<Record<ReadinessLabel, number>> = {
  Unseen: 0,
  Introduced: 1,
  Repped: 2,
  Rehearsed: 3,
};

export const READINESS_WORDS = [
  'Unseen',
  'Introduced',
  'Repped',
  'Rehearsed',
] as const;

/**
 * Unavailability that no other take-the-field input already carries.
 *
 * The right-tackle decision (`rtFix`/`rtName`) already speaks for the depth-one
 * body it replaced and for the starter it promoted; a practice-personnel
 * assignment already speaks for its player through the rep penalty folded into
 * `lvl`. Anyone else who cannot play is invisible to the snapshot unless it is
 * listed here, so on canonical Week 8 — Kowalski ineligible, McCoy no-contact —
 * this is empty and the seed input is unchanged.
 */
function unrepresentedUnavailable(
  state: WeekState,
  scenario: WeekScenario,
): readonly ProtectionPlayerId[] {
  const roster = scenario.rosterPlanning;
  const carried = new Set<ProtectionPlayerId>();
  const starterId = playerIdForRtStarter(state.rtStarter);
  if (starterId !== null) carried.add(starterId);
  for (const entry of roster.packageDepth) {
    if (entry.starterOption === null) carried.add(entry.playerId);
  }
  for (const assignment of roster.practicePersonnelAssignments) {
    carried.add(assignment.playerId);
  }
  const outs = new Set(
    roster.availability
      .filter((entry) => entry.participation !== 'available')
      .map((entry) => entry.playerId)
      .filter((playerId) => !carried.has(playerId)),
  );
  return [...outs].sort();
}

/**
 * The situational periods the week actually prepared: declared by an objective
 * that is on the board, is not the accepted risk, and got at least one block.
 * Deduped into `PRIORITY_SITUATIONS` order so ordering never depends on how the
 * scenario happens to list its objectives.
 */
function preparedPrioritySituations(
  state: WeekState,
  scenario: WeekScenario,
): readonly PrioritySituationId[] {
  const gate = deriveEvidenceGate(state, scenario);
  const declared = new Set<PrioritySituationId>();
  for (const summary of practiceObjectiveSummaries(state, scenario)) {
    const objective = summary.objective;
    if (objective.prioritySituation === undefined) continue;
    if (READINESS_LEVEL[summary.readiness] < 1) continue;
    if (objective.hypothesisId !== null) {
      if (objective.hypothesisId === gate.acceptedRisk) continue;
      if (!gate.validSelection.includes(objective.hypothesisId)) continue;
    }
    declared.add(objective.prioritySituation);
  }
  return PRIORITY_SITUATIONS.filter((situation) => declared.has(situation));
}

/** Derive the canonical snapshot (`takeField`'s ctx) from persisted decisions. */
export function deriveTakeFieldContext(
  state: WeekState,
  scenario: WeekScenario,
): TakeFieldContext {
  const lvl: Record<string, number> = {};
  for (const summary of practiceObjectiveSummaries(state, scenario)) {
    lvl[summary.objective.id] = READINESS_LEVEL[summary.readiness];
  }
  const ansBy: Record<string, ContextAnswer> = {};
  const active = derivePlanGate(state, scenario).activeAnswers;
  for (const [hypothesisId, answer] of Object.entries(active)) {
    ansBy[hypothesisId] = {
      id: answer.id,
      name: answer.name,
      gist: answer.gist,
      cue: answer.successCue,
    };
  }
  return {
    lvl,
    pol: state.policies,
    rtFix: state.rtFix,
    rtName: rtStarterName(state.rtStarter) ?? '',
    ansBy,
    risk: deriveEvidenceGate(state, scenario).acceptedRisk,
    sits: preparedPrioritySituations(state, scenario),
    outs: unrepresentedUnavailable(state, scenario),
  };
}

/**
 * FNV-1a over the snapshot in the exact canonical input order:
 * risk, rtFix, RT name, fourth/pat/clock/auto policies, then `id:level`
 * pairs for every objective with ids sorted, all joined by `|`.
 *
 * Prepared situations and unrepresented unavailability are appended after that
 * — and only when non-empty — so a canonical Week 8 snapshot still hashes the
 * exact string it hashed before either input existed.
 */
export function execSeedInputFor(context: TakeFieldContext): string {
  const parts = [
    context.risk ?? '',
    context.rtFix ?? '',
    context.rtName,
    context.pol.fourth,
    context.pol.pat,
    context.pol.clock,
    context.pol.auto,
  ];
  Object.keys(context.lvl)
    .sort()
    .forEach((key) => parts.push(`${key}:${context.lvl[key]}`));
  const sits = prioritySituationsOf(context);
  if (sits.length > 0) parts.push(`sit:${sits.join(',')}`);
  const outs = unavailablePlayersOf(context);
  if (outs.length > 0) parts.push(`out:${outs.join(',')}`);
  return parts.join('|');
}

export function execSeedFor(context: TakeFieldContext): number {
  let h = 2166136261;
  for (const ch of execSeedInputFor(context)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mix the situation key into the seed; returns a roll in 0–99. */
export function execRollFor(seed: number, sit: string): number {
  let x = seed;
  for (let i = 0; i < sit.length; i += 1) {
    x = Math.imul(x ^ sit.charCodeAt(i), 2246822519);
  }
  x ^= x >>> 16;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return (x >>> 0) % 100;
}

export interface ExecPrepResult {
  readonly roll: number;
  readonly band: number;
  readonly preparedWins: boolean;
}

/** Canonical readiness bands: Unseen 24 · Introduced 40 · Repped 56 · Rehearsed 74. */
export function execPrepFor(
  seed: number,
  sit: string,
  lvl: number,
): ExecPrepResult {
  const roll = execRollFor(seed, sit);
  const band = [24, 40, 56, 74][Math.min(3, Math.max(0, lvl | 0))]!;
  return { roll, band, preparedWins: roll < band };
}

/**
 * The canonical Week 8 queue: Westfield vs Central Catholic, six coach
 * decisions, preparation-aware branches. Transcribed verbatim from UI-3
 * `buildGame(C)`; do not "improve" strings or reorder inputs.
 */
export function buildGame(C: TakeFieldContext): QueueItem[] {
  const X = (y: number) => 8 + 0.84 * y;
  const P = (
    q: string,
    c: string,
    t: string,
    k: MatchPlayKind | '',
    o?: Omit<MatchPlay, 'q' | 'c' | 't' | 'k'>,
  ): QueueItem => ({ play: { q, c, t, k: k === '' ? 'n' : k, ...(o ?? {}) } });
  const G = (f: (score: MatchScore) => readonly QueueItem[]): QueueItem => ({
    gen: f,
  });
  const L = C.lvl;
  const pol = C.pol;
  const rt = C.rtName;
  const ans = C.ansBy;
  const risk = C.risk;
  const RD = READINESS_WORDS;
  const GRN = '#45A557';
  const AMB = '#FF990A';
  const RED = '#E5484D';
  const BLU = '#52AEFF';
  const o1 = L.o1 ?? 0;
  const o2 = L.o2 ?? 0;
  const o3 = L.o3 ?? 0;
  const o4 = L.o4 ?? 0;
  const o6 = L.o6 ?? 0;
  const seed = execSeedFor(C);
  const sits = prioritySituationsOf(C);
  const outs = unavailablePlayersOf(C);
  // A week pointed at situational periods resolves its execution rolls inside
  // those periods. Canonical Week 8 declares none, so the key is untouched.
  const situationKey = (sit: string) =>
    sits.length === 0 ? sit : `${sit}@${sits.join('+')}`;
  const execPrep = (sit: string, lvl: number) =>
    execPrepFor(seed, situationKey(sit), lvl);

  const Q: QueueItem[] = [];
  const koHot = (q: string, c1: string, c2: string): QueueItem[] => {
    if (risk === 'h4')
      return [
        P(
          q,
          c1,
          'Malone answers — 41 yards on the return, Central at midfield',
          'to',
          {
            dd: '1st & 10 · 50',
            b: X(50),
            fd: X(40),
            dv: X(50),
            m: -5,
            tag: 'Accepted risk — return game, second bite',
            tagC: AMB,
          },
        ),
        P(
          q,
          c2,
          'The defense bows up — but the 44-yard field goal cashes the field position',
          'n',
          { dd: 'Kickoff', cw: 3, m: -1 },
        ),
      ];
    if (o4 >= 2)
      return [
        P(
          q,
          c1,
          'Sky kick to the pylon — Malone fair-catches at the CEN 16',
          'f',
          {
            dd: '1st & 10 · CEN 16',
            b: X(84),
            fd: X(74),
            dv: X(84),
            m: 1,
            tag: 'Practiced — kick coverage · ' + RD[o4],
            tagC: GRN,
          },
        ),
      ];
    return [
      P(q, c1, 'Malone slips one tackle — out to the CEN 34', 'n', {
        dd: '1st & 10 · CEN 34',
        b: X(66),
        fd: X(56),
        dv: X(66),
        m: -1,
        tag: 'Thin — kick coverage · ' + RD[o4],
        tagC: AMB,
      }),
    ];
  };
  const koQuiet = (q: string, c: string): QueueItem[] =>
    risk === 'h4'
      ? [
          P(
            q,
            c,
            'Malone again — 32 yards to the CEN 44. The bet keeps paying yards',
            'n',
            {
              dd: '1st & 10 · CEN 44',
              b: X(56),
              fd: X(46),
              dv: X(56),
              m: -2,
              tag: 'Accepted risk — return game',
              tagC: AMB,
            },
          ),
        ]
      : [
          P(q, c, 'Touchback', 'n', {
            dd: '1st & 10 · CEN 25',
            b: X(75),
            fd: X(65),
            dv: X(75),
          }),
        ];
  const OT = (): QueueItem[] =>
    o1 >= 2 || o2 >= 2
      ? [
          P(
            'OT',
            '15:00',
            'OVERTIME — the repped rules force a field goal on Central’s possession',
            'n',
            {
              dd: 'OT · WST ball',
              cw: 3,
              m: 3,
              tag: 'Practiced — the fits held one more time',
              tagC: GRN,
            },
          ),
          P(
            'OT',
            '13:40',
            'Carter punches in the winner from the 4 — TOUCHDOWN WESTFIELD',
            'td',
            { dd: 'Final · OT', w: 7, m: 9 },
          ),
        ]
      : [
          P(
            'OT',
            '15:00',
            'OVERTIME — Malone needs four snaps to end it. TOUCHDOWN CENTRAL',
            'td',
            {
              dd: 'Final · OT',
              cw: 7,
              m: -9,
              tag: 'The overtime script ran through everything you didn’t rep',
              tagC: RED,
            },
          ),
        ];
  // The surge needs its reps, its right tackle, and eleven bodies. An
  // unavailability nothing else accounts for takes the third one away.
  const surgeOk = () => o6 >= 2 && C.rtFix !== 'accept' && outs.length === 0;
  const FINISH = (need: number): QueueItem[] => {
    if (need < 3)
      return [
        P(
          'Q4',
          '0:03',
          'Ramsey from 43… it turns over once, twice — GOOD AS TIME EXPIRES',
          'td',
          {
            dd: 'Final',
            w: 3,
            m: 9,
            tag: 'One completion bought the leg a chance',
            tagC: BLU,
          },
        ),
      ];
    const hail = P(
      'Q4',
      '0:04',
      'One shot at the end zone — Reed lofts it and BROOKS COMES DOWN WITH IT. TOUCHDOWN',
      'td',
      { dd: 'Conversion', w: 6, m: 6 },
    );
    if (need === 3)
      return [
        hail,
        P(
          'Q4',
          '0:03',
          'Ramsey knocks in the extra point — Westfield wins at the gun',
          'f',
          { dd: 'Final', w: 1, m: 3 },
        ),
      ];
    if (need <= 5)
      return [
        P(
          'Q4',
          '0:04',
          'One shot at the end zone — Reed lofts it and BROOKS COMES DOWN WITH IT. TOUCHDOWN WESTFIELD',
          'td',
          {
            dd: 'Final',
            w: 6,
            m: 9,
            tag: 'Finished on a jump ball',
            tagC: BLU,
          },
        ),
      ];
    if (need === 6)
      return [
        hail,
        P(
          'Q4',
          '0:03',
          'Ramsey knocks in the extra point — Westfield wins at the gun',
          'f',
          { dd: 'Final', w: 1, m: 3 },
        ),
      ];
    if (need === 7)
      return [
        hail,
        surgeOk()
          ? P(
              'Q4',
              '0:03',
              'Carter surges in — TWO POINTS. Westfield wins at the gun',
              'f',
              {
                dd: 'Final',
                w: 2,
                m: 3,
                tag: 'Practiced — short yardage · ' + RD[o6],
                tagC: GRN,
              },
            )
          : P(
              'Q4',
              '0:03',
              'Two-point try stopped short — Central holds on',
              'n',
              {
                dd: 'Final',
                w: 0,
                m: -6,
                tag: 'The surge package lost its blocker and its reps this week',
                tagC: AMB,
              },
            ),
      ];
    if (need === 8) {
      const ok = surgeOk();
      return [
        hail,
        ok
          ? P('Q4', '0:03', 'Two to tie — Carter surges in. OVERTIME', 'f', {
              dd: 'Overtime',
              w: 2,
              m: 4,
              tag: 'Practiced — short yardage · ' + RD[o6],
              tagC: GRN,
            })
          : P(
              'Q4',
              '0:03',
              'Two to tie — stood up short. That’s the ball game',
              'n',
              {
                dd: 'Final',
                w: 0,
                m: -6,
                tag: 'The surge package lost its blocker and its reps this week',
                tagC: AMB,
              },
            ),
      ].concat(ok ? OT() : []);
    }
    return [
      P(
        'Q4',
        '0:03',
        'The clock beats the math — the last snap dies at the 20',
        'n',
        { dd: 'Final', m: -4 },
      ),
    ];
  };
  const WINDRIVE = (need: number): QueueItem[] => {
    const steps = [
      P(
        'Q4',
        '0:24',
        'Trips right, flood — the curl-flat defender bites one last time and Whitfield is behind him. THIRTY-EIGHT YARDS, TOUCHDOWN',
        'td',
        {
          dd: 'Conversion',
          w: 6,
          m: 9,
          tag:
            'Practiced — trips flood · ' +
            RD[o3] +
            '. The week, cashed at the wire.',
          tagC: GRN,
        },
      ),
    ];
    const ok = surgeOk();
    if (need >= 7) {
      steps.push(
        ok
          ? P(
              'Q4',
              '0:18',
              need === 8
                ? 'Two to tie — Carter surges in. OVERTIME'
                : 'You need two to win — Carter surges in behind the whole left side. TWO POINTS',
              'f',
              {
                dd: need === 8 ? 'Overtime' : 'Final',
                w: 2,
                m: need === 8 ? 4 : 9,
                tag: 'Practiced — short yardage · ' + RD[o6],
                tagC: GRN,
              },
            )
          : P(
              'Q4',
              '0:18',
              need === 8
                ? 'Two to tie — stood up short. That’s the ball game'
                : 'You need two — the surge is stood up at the line. One point short — Central holds on',
              'n',
              {
                dd: 'Final',
                w: 0,
                m: -6,
                tag: 'The two-point package was built around Kowalski',
                tagC: AMB,
              },
            ),
      );
      if (need === 8 && ok) steps.push(...OT());
    } else if (need === 6)
      steps.push(
        P(
          'Q4',
          '0:18',
          'The extra point is good — Westfield wins at the gun',
          'f',
          { dd: 'Final', w: 1, m: 3 },
        ),
      );
    else
      steps.push(
        P('Q4', '0:18', 'The extra point is good', 'n', { dd: 'Final', w: 1 }),
      );
    return steps;
  };

  // ---- Q1 · opening kickoff (return-game test)
  Q.push(
    P('Q1', '12:00', 'Ramsey tees it up — Westfield kicks off to Malone', 'n', {
      dd: 'Kickoff',
      b: X(50),
      fd: X(50),
      dv: X(50),
    }),
  );
  if (risk === 'h4') {
    Q.push(
      P(
        'Q1',
        '11:54',
        'Malone splits the 3 and 4 lanes — 46 yards before Ramsey trips him at the WST 41',
        'to',
        {
          dd: '1st & 10 · WST 41',
          b: X(41),
          fd: X(31),
          dv: X(41),
          m: -7,
          tag: 'Accepted risk — return game. You knew, and spent the week elsewhere.',
          tagC: AMB,
          key: true,
        },
      ),
    );
    Q.push(
      P('Q1', '11:10', 'Malone off tackle for 3', 'n', {
        dd: '2nd & 7 · WST 38',
        b: X(38),
        m: -1,
      }),
    );
  } else if (o4 >= 2) {
    Q.push(
      P(
        'Q1',
        '11:54',
        'Lanes hold exactly as scripted — Malone swallowed at the CEN 22',
        'f',
        {
          dd: '1st & 10 · CEN 22',
          b: X(78),
          fd: X(68),
          dv: X(78),
          m: 3,
          tag: 'Practiced — kick coverage · ' + RD[o4],
          tagC: GRN,
          key: true,
        },
      ),
    );
    Q.push(
      P('Q1', '11:10', 'Herrera play-fake, tight end drag for 18', 'n', {
        dd: '1st & 10 · CEN 40',
        b: X(60),
        fd: X(50),
        m: -2,
      }),
    );
    Q.push(
      P(
        'Q1',
        '10:26',
        'Counter left — Malone through an arm tackle for 22',
        'n',
        { dd: '1st & 10 · WST 38', b: X(38), fd: X(28), m: -3 },
      ),
    );
  } else {
    Q.push(
      P('Q1', '11:54', 'Malone slips the first wave — out to the CEN 38', 'n', {
        dd: '1st & 10 · CEN 38',
        b: X(62),
        fd: X(52),
        dv: X(62),
        m: -3,
        tag: 'Thin — kick coverage · ' + RD[o4],
        tagC: AMB,
        key: true,
      }),
    );
    Q.push(
      P(
        'Q1',
        '10:26',
        'Two Malone carries move the sticks — Central at the WST 38',
        'n',
        { dd: '2nd & 6 · WST 38', b: X(38), fd: X(28), m: -2 },
      ),
    );
  }
  // ---- Q1 · DECISION: the power test
  const a1 = ans.h1;
  Q.push({
    dec: {
      id: 's_power',
      key: true,
      when: 'Q1 · 10:02',
      title: 'I-formation, twin tight ends — the exact look from the film',
      chips: ['2nd down · WST 38', 'Central ball · early down'],
      evid: a1
        ? '41 early-down snaps across 3 games — 9 of 11 I-formation runs went at the tight-end surface. Your answer: “' +
          a1.name +
          '” · ' +
          RD[o1] +
          '.'
        : risk === 'h1'
          ? 'Power was your accepted risk. Nothing was installed against it — on purpose.'
          : 'You saw this tendency in the Film Room and left it off the board. No answer was installed.',
      staff: a1
        ? 'Same formation, same splits as Millbrook. ' +
          a1.cue +
          ' If the fits are right, this dies at the line.'
        : 'That’s their bread and butter and we never built a fit rule for it. Base defense and tackle well — that’s what we have.',
      who: 'B. Tillman, DC',
      opts: [
        {
          name: a1
            ? 'Trust the plan — ' + a1.gist
            : 'Play base and rally to the ball',
          sub: a1
            ? 'Repped to ' + RD[o1] + ' this week.'
            : 'No install to lean on — tackling decides it.',
          res: () => {
            if (o1 >= 3) {
              const ex = execPrep('power', o1);
              if (ex.preparedWins)
                return [
                  P(
                    'Q1',
                    '9:52',
                    'Power right — the end wrong-arms the pull and Okafor scrapes over the top. Malone dropped for -2',
                    'f',
                    {
                      dd: '3rd & 8 · WST 40',
                      b: X(40),
                      m: 4,
                      tag: 'Practiced — puller fits · Rehearsed',
                      tagC: GRN,
                    },
                  ),
                  P(
                    'Q1',
                    '9:10',
                    'Third and long — Herrera hurries it into the flat, nowhere close. Punt',
                    'n',
                    { dd: 'Punt', m: 2 },
                  ),
                  P('Q1', '8:58', 'Whitfield fair-catches at the WST 24', 'n', {
                    dd: '1st & 10 · WST 24',
                    b: X(24),
                    fd: X(34),
                    dv: X(24),
                  }),
                ];
              return [
                P(
                  'Q1',
                  '9:52',
                  'Power right — the pull wins one-on-one and Malone grinds 7 before the gang arrives',
                  'n',
                  {
                    dd: '1st & 10 · WST 31',
                    b: X(31),
                    fd: X(21),
                    m: -2,
                    tag: 'Rehearsed — but execution missed the scrape fit',
                    tagC: AMB,
                  },
                ),
                P(
                  'Q1',
                  '8:59',
                  'Counter keeps the drive alive — Central to the WST 18 before the line stiffens',
                  'n',
                  { dd: '4th & 2 · WST 18', b: X(18), m: -3 },
                ),
                P(
                  'Q1',
                  '8:21',
                  'Field goal is good from 35 — Central strikes first',
                  'n',
                  { dd: 'Kickoff', cw: 3, m: -2 },
                ),
                P('Q1', '8:13', 'Touchback — Westfield from its own 25', 'n', {
                  dd: '1st & 10 · WST 25',
                  b: X(25),
                  fd: X(35),
                  dv: X(25),
                }),
              ];
            }
            if (o1 === 2)
              return [
                P(
                  'Q1',
                  '9:52',
                  'Power right — the fit holds, Malone grinds out 3',
                  'f',
                  {
                    dd: '3rd & 3 · WST 35',
                    b: X(35),
                    m: 2,
                    tag: 'Practiced — puller fits · Repped',
                    tagC: GRN,
                  },
                ),
                P(
                  'Q1',
                  '9:10',
                  'They convert once, then Dean and Okafor close the crease twice. Punt',
                  'n',
                  { dd: 'Punt', m: 2 },
                ),
                P('Q1', '8:52', 'Downed at the WST 20', 'n', {
                  dd: '1st & 10 · WST 20',
                  b: X(20),
                  fd: X(30),
                  dv: X(20),
                }),
              ];
            if (o1 === 1)
              return [
                P(
                  'Q1',
                  '9:52',
                  'Power right for 7 — the scrape arrives late',
                  'n',
                  {
                    dd: '1st & 10 · WST 31',
                    b: X(31),
                    fd: X(21),
                    m: -2,
                    tag: 'Introduced — one block of fits wasn’t enough',
                    tagC: AMB,
                  },
                ),
                P(
                  'Q1',
                  '8:59',
                  'Counter, power, counter — Central to the 9 before the line stiffens',
                  'n',
                  { dd: '4th & 2 · WST 9', b: X(9), m: -3 },
                ),
                P(
                  'Q1',
                  '8:21',
                  'Field goal is good from 26 — Central strikes first',
                  'n',
                  { dd: 'Kickoff', cw: 3, m: -2 },
                ),
                P('Q1', '8:13', 'Touchback — Westfield from its own 25', 'n', {
                  dd: '1st & 10 · WST 25',
                  b: X(25),
                  fd: X(35),
                  dv: X(25),
                }),
              ];
            if (execPrep('power', 0).preparedWins)
              return [
                P(
                  'Q1',
                  '9:52',
                  'Power right — Okafor splits the double and drops Malone for -1',
                  'f',
                  {
                    dd: '2nd & 6 · WST 38',
                    b: X(38),
                    m: 3,
                    tag: 'Execution beat scheme — one clean fit despite an unseen week',
                    tagC: BLU,
                  },
                ),
                P(
                  'Q1',
                  '9:14',
                  'Play-action glance dies at the line — punt',
                  'n',
                  { dd: 'Punt', m: 2 },
                ),
                P('Q1', '8:58', 'Whitfield fair-catches at the WST 24', 'n', {
                  dd: '1st & 10 · WST 24',
                  b: X(24),
                  fd: X(34),
                  dv: X(24),
                }),
              ];
            return [
              P(
                'Q1',
                '9:52',
                'Power right — the pull turns the corner untouched. Malone 38 yards, TOUCHDOWN CENTRAL',
                'td',
                {
                  dd: 'Kickoff',
                  cw: 7,
                  m: -8,
                  tag:
                    risk === 'h1'
                      ? 'Accepted risk — power. This is the bet you made.'
                      : 'Unseen — power fits. Nobody had a rule for the pull.',
                  tagC: risk === 'h1' ? AMB : RED,
                },
              ),
              P('Q1', '8:40', 'Jackson returns to the WST 26', 'n', {
                dd: '1st & 10 · WST 26',
                b: X(26),
                fd: X(36),
                dv: X(26),
              }),
            ];
          },
        },
        {
          name: 'Walk Pierce down — sell out against the run',
          sub: 'An eighth man kills the pull. Play-action over the top is live all night.',
          res: () => {
            if (o1 >= 2)
              return [
                P(
                  'Q1',
                  '9:52',
                  'Pierce walks down — eight in the box, power stuffed for nothing',
                  'f',
                  { dd: '2nd & 6 · WST 38', b: X(38), m: 3 },
                ),
                P(
                  'Q1',
                  '9:14',
                  'Play-action off the fake — Pierce recovers and breaks up the glance at the last instant',
                  'f',
                  {
                    dd: '3rd & 6 · WST 38',
                    m: 3,
                    tag: 'You sold out and survived — Pierce made a play behind the bet',
                    tagC: BLU,
                  },
                ),
                P(
                  'Q1',
                  '8:37',
                  'Sprint-out short of the sticks. Punt — Westfield at its own 20',
                  'n',
                  { dd: '1st & 10 · WST 20', b: X(20), fd: X(30), dv: X(20) },
                ),
              ];
            return [
              P(
                'Q1',
                '9:52',
                'Eight in the box — and Herrera pulls it. The glance sails over the top for the score',
                'td',
                {
                  dd: 'Kickoff',
                  cw: 7,
                  m: -7,
                  tag: 'Sold out against a fake you hadn’t repped an answer for',
                  tagC: RED,
                },
              ),
              P('Q1', '8:40', 'Jackson out to the WST 26', 'n', {
                dd: '1st & 10 · WST 26',
                b: X(26),
                fd: X(36),
                dv: X(26),
              }),
            ];
          },
        },
        {
          name: 'Bend — soft box, keep everything in front',
          sub: 'Concede four a carry, protect the big play, let them earn twelve snaps.',
          res: () => [
            P(
              'Q1',
              '9:52',
              'Soft box — Malone takes 4, 5, 4. Central converts twice and keeps grinding',
              'n',
              { dd: '1st & 10 · WST 15', b: X(15), fd: X(5), m: -3 },
            ),
            P(
              'Q1',
              '7:44',
              'The drive stalls at the 8 — 25-yard field goal is good',
              'n',
              {
                dd: 'Kickoff',
                cw: 3,
                m: -1,
                tag: 'You conceded it — eleven plays, three points, five minutes of clock',
                tagC: BLU,
              },
            ),
            P('Q1', '7:31', 'Touchback — Westfield from its own 25', 'n', {
              dd: '1st & 10 · WST 25',
              b: X(25),
              fd: X(35),
              dv: X(25),
            }),
          ],
        },
      ],
    },
  });
  // ---- Q1 · Westfield series: the protection test (auto)
  Q.push(
    P('Q1', '7:05', 'Carter off tackle for 5', 'n', { dd: '2nd & 5', m: 1 }),
  );
  Q.push(
    P('Q1', '6:28', 'Quick out to Alvarez — 7 more, FIRST DOWN', 'f', {
      dd: '1st & 10 · WST 37',
      b: X(37),
      fd: X(47),
      m: 1,
    }),
  );
  Q.push(
    P('Q1', '5:52', 'Screen loses a yard — Buck read it all the way', 'n', {
      dd: '3rd & 7 · WST 38',
      b: X(38),
      m: -1,
    }),
  );
  if (C.rtFix === 'promote') {
    Q.push(
      P(
        'Q1',
        '5:16',
        'Five-step — ' +
          rt +
          ' rides the rusher wide and Reed hits Whitfield for 16',
        'f',
        {
          dd: '1st & 10 · CEN 46',
          b: X(54),
          fd: X(64),
          m: 3,
          tag:
            'Practiced — RT protection · ' +
            RD[L.o5 ?? 0] +
            ' after Thursday’s catch-up reps',
          tagC: GRN,
          key: true,
        },
      ),
    );
    Q.push(
      P(
        'Q1',
        '4:24',
        'Carter and Brooks move it to the CEN 17 before third down dies',
        'n',
        { dd: '4th & 4 · CEN 17', b: X(83) },
      ),
    );
    Q.push(
      P('Q1', '3:58', 'Ramsey from 34 — GOOD', 'f', {
        dd: 'Kickoff',
        w: 3,
        m: 2,
      }),
    );
  } else if (C.rtFix === 'simplify') {
    Q.push(
      P(
        'Q1',
        '5:16',
        'Three-step timing — Whitfield on the stop for 9, FIRST DOWN',
        'f',
        {
          dd: '1st & 10 · WST 47',
          b: X(47),
          fd: X(57),
          m: 2,
          tag: 'Simplified package — you kept the concept, not its best throw',
          tagC: BLU,
          key: true,
        },
      ),
    );
    Q.push(
      P(
        'Q1',
        '4:24',
        'Short throws stack up — Westfield reaches the CEN 21 before stalling',
        'n',
        { dd: '4th & 5 · CEN 21', b: X(79) },
      ),
    );
    Q.push(
      P('Q1', '3:58', 'Ramsey from 38 — GOOD', 'f', {
        dd: 'Kickoff',
        w: 3,
        m: 2,
      }),
    );
  } else if (C.rtFix === 'switch') {
    Q.push(
      P('Q1', '5:16', 'Quick game — Alvarez for 6, a yard short. Punt', 'n', {
        dd: 'Punt',
        m: 0,
        tag: 'Switched answer Thursday — the quick game moves it, slowly',
        tagC: BLU,
        key: true,
      }),
    );
    Q.push(
      P('Q1', '4:40', 'Whitfield pins them at the CEN 12', 'n', {
        dd: '1st & 10 · CEN 12',
        b: X(88),
        fd: X(78),
        dv: X(88),
        m: 1,
      }),
    );
  } else {
    Q.push(
      P(
        'Q1',
        '5:16',
        'Five-step — the rusher works ' +
          rt +
          ' inside and buries Reed. Loss of 8',
        'n',
        {
          dd: 'Punt',
          m: -3,
          tag: 'Accepted risk — protection, capped at Introduced. It showed.',
          tagC: AMB,
          key: true,
        },
      ),
    );
    Q.push(
      P('Q1', '4:40', 'Whitfield’s punt rolls dead at the CEN 30', 'n', {
        dd: '1st & 10 · CEN 30',
        b: X(70),
        fd: X(60),
        dv: X(70),
      }),
    );
  }
  // ---- Q2 · bridge + DECISION: fourth down policy
  Q.push(
    P(
      'Q2',
      '11:58',
      'Quarter turns — Central’s next series dies on a holding flag. Punt',
      'n',
      { dd: 'Punt', m: 2 },
    ),
  );
  Q.push(
    P('Q2', '11:20', 'Whitfield fields it — Westfield at its own 44', 'n', {
      dd: '1st & 10 · WST 44',
      b: X(44),
      fd: X(54),
      dv: X(44),
    }),
  );
  Q.push(
    P('Q2', '10:44', 'Reed to Brooks for 11 over the middle', 'f', {
      dd: '1st & 10 · CEN 45',
      b: X(55),
      fd: X(65),
      m: 2,
    }),
  );
  Q.push(
    P('Q2', '10:01', 'Two Carter runs — seven yards', 'n', {
      dd: '3rd & 3 · CEN 38',
      b: X(62),
    }),
  );
  Q.push(
    P(
      'Q2',
      '9:24',
      'Swing to Dunn — wrapped up a yard short. Fourth down',
      'n',
      { dd: '4th & 2 · CEN 38', b: X(62), m: -1 },
    ),
  );
  const f4 = pol.fourth;
  Q.push({
    dec: {
      id: 's_fourth',
      key: true,
      when: 'Q2 · 9:12',
      title: 'Fourth and two at their 38',
      chips: [
        '4th & 2 · CEN 38',
        'Policy · ' +
          ({
            Chart: 'follow the chart',
            Short: 'go inside two',
            Kick: 'take points, punt the rest',
          }[f4] ?? ''),
      ],
      evid:
        'A 55-yard field goal is not in Ramsey’s range. Short yardage runs through the surge package — ' +
        RD[o6] +
        ' this week.',
      staff:
        'The chart says go. The chart also doesn’t know who’s at right tackle.',
      who: 'D. Pruitt, OC',
      opts: [
        {
          name: 'Go for it — Carter behind Sosa',
          sub:
            f4 === 'Kick'
              ? 'Overrides your policy — the policy kicked here.'
              : 'Fourth and two — this is your policy.',
          res: () => {
            if (o6 >= 2)
              return [
                P('Q2', '9:06', 'Carter surges for 4 — moved the chains', 'f', {
                  dd: '1st & 10 · CEN 34',
                  b: X(66),
                  fd: X(76),
                  m: 3,
                  tag: 'Practiced — short yardage · ' + RD[o6],
                  tagC: GRN,
                }),
                P(
                  'Q2',
                  '8:22',
                  'Four plays later Reed finds Silva on the dig — TOUCHDOWN WESTFIELD. PAT good',
                  'td',
                  { dd: 'Kickoff', w: 7, m: 6 },
                ),
                P('Q2', '8:10', 'Touchback', 'n', {
                  dd: '1st & 10 · CEN 25',
                  b: X(75),
                  fd: X(65),
                  dv: X(75),
                }),
              ];
            if (o6 === 1)
              return [
                P('Q2', '9:06', 'Carter falls forward — just enough', 'f', {
                  dd: '1st & 10 · CEN 34',
                  b: X(66),
                  fd: X(76),
                  m: 2,
                  tag: 'Introduced — short yardage got one block this week',
                  tagC: AMB,
                }),
                P(
                  'Q2',
                  '8:22',
                  'The drive stalls at the 24 — Ramsey from 41 is GOOD',
                  'f',
                  { dd: 'Kickoff', w: 3, m: 2 },
                ),
                P('Q2', '8:10', 'Touchback', 'n', {
                  dd: '1st & 10 · CEN 25',
                  b: X(75),
                  fd: X(65),
                  dv: X(75),
                }),
              ];
            return [
              P(
                'Q2',
                '9:06',
                'Buck knifes through — Carter stopped cold. Turnover on downs',
                'to',
                {
                  dd: '1st & 10 · CEN 39',
                  b: X(61),
                  fd: X(51),
                  dv: X(61),
                  m: -5,
                  tag: 'Unrehearsed — the surge package never got a rep this week',
                  tagC: RED,
                },
              ),
              P(
                'Q2',
                '8:15',
                'Central cashes the short field — 38-yard field goal is good',
                'n',
                { dd: 'Kickoff', cw: 3, m: -2 },
              ),
            ];
          },
        },
        {
          name: 'Punt — pin them deep',
          sub:
            f4 === 'Kick'
              ? 'Your policy — take the field position.'
              : 'Overrides your policy tonight.',
          res: () => [
            P('Q2', '9:06', 'Whitfield drops it at the CEN 8 — downed', 'f', {
              dd: '1st & 10 · CEN 8',
              b: X(92),
              fd: X(82),
              dv: X(92),
              m: 2,
            }),
            o1 >= 2
              ? P(
                  'Q2',
                  '8:20',
                  'Three power runs into a ready front — three and out',
                  'f',
                  {
                    dd: 'Punt',
                    m: 3,
                    tag:
                      'Practiced — puller fits · ' +
                      RD[o1] +
                      '. Field position won.',
                    tagC: GRN,
                  },
                )
              : P(
                  'Q2',
                  '8:20',
                  'Malone churns out two first downs before the drive dies at midfield',
                  'n',
                  { dd: 'Punt', m: -1 },
                ),
            P('Q2', '7:52', 'Fair catch — the teams trade series', 'n', {
              dd: 'Change of possession',
              m: 0,
            }),
          ],
        },
        {
          name: 'Hard count — try to draw them off',
          sub: 'A free five if they jump. If not, take the delay and punt.',
          res: () => [
            P(
              'Q2',
              '9:06',
              'Nobody jumps — delay of game, punt from the 43',
              'n',
              { dd: 'Punt', m: -1 },
            ),
            P('Q2', '8:40', 'Fair catch at the CEN 15', 'n', {
              dd: '1st & 10 · CEN 15',
              b: X(85),
              fd: X(75),
              dv: X(85),
            }),
            o1 >= 2
              ? P(
                  'Q2',
                  '8:05',
                  'The front squeezes power again — three and out',
                  'f',
                  {
                    dd: 'Punt',
                    m: 2,
                    tag: 'Practiced — puller fits · ' + RD[o1],
                    tagC: GRN,
                  },
                )
              : P(
                  'Q2',
                  '8:05',
                  'Central grinds out to midfield before punting it back',
                  'n',
                  { dd: 'Punt', m: -1 },
                ),
          ],
        },
      ],
    },
  });
  // ---- Q2 · sprint-out test (auto, Quick Adjust aware)
  Q.push(
    P(
      'Q2',
      '7:45',
      'Series later — Central faces third and six at its own 37',
      'n',
      { dd: '3rd & 6 · CEN 37', b: X(63), fd: X(53), dv: X(63) },
    ),
  );
  Q.push(
    G((sc) => {
      if (sc.qt === 'Prevent' && o2 >= 2)
        return [
          P(
            'Q2',
            '7:12',
            'Sprint-out right — the flat is open underneath and Herrera takes 11 before the sideline',
            'n',
            {
              dd: '1st & 10 · WST 44',
              b: X(44),
              fd: X(34),
              m: -2,
              tag: 'Quick Adjust — Prevent conceded the flat, not the score',
              tagC: BLU,
              key: true,
            },
          ),
          P(
            'Q2',
            '6:30',
            'Okafor cleans up the next two snaps — Central punts it away',
            'f',
            { dd: '1st & 10 · WST 20', b: X(20), fd: X(30), dv: X(20), m: 2 },
          ),
        ];
      if (o2 >= 3) {
        const ex = execPrep('sprint', o2);
        if (ex.preparedWins)
          return [
            P(
              'Q2',
              '7:12',
              'Sprint-out right — Cruz mirrors the contain and forces an incompletion',
              'f',
              {
                dd: 'Punt',
                m: 3,
                tag: 'Practiced — sprint-out contain · Rehearsed',
                tagC: GRN,
                key: true,
              },
            ),
            P('Q2', '6:38', 'Punt — Westfield at its own 20', 'n', {
              dd: '1st & 10 · WST 20',
              b: X(20),
              fd: X(30),
              dv: X(20),
            }),
          ];
        return [
          P(
            'Q2',
            '7:12',
            'Sprint-out right — Reyes overruns the contain and Herrera cuts inside for 14',
            'n',
            {
              dd: '1st & 10 · 50',
              b: X(50),
              fd: X(40),
              m: -2,
              tag: 'Rehearsed — and still missed. Right call, missed tackle.',
              tagC: AMB,
              key: true,
            },
          ),
          P(
            'Q2',
            '6:30',
            'Okafor cleans up the next two snaps — Central punts it away',
            'f',
            { dd: '1st & 10 · WST 20', b: X(20), fd: X(30), dv: X(20), m: 2 },
          ),
        ];
      }
      if (o2 === 2) {
        const t2 =
          ans.h2 && ans.h2.id === 'a23'
            ? 'Cruz comes free off the boundary edge — Herrera grounds it at his own feet'
            : ans.h2 && ans.h2.id === 'a22'
              ? 'Reyes mirrors the sprint to the sideline — nothing there, throwaway'
              : 'Cruz squats at six yards — Herrera pulls up and throws it away';
        return [
          P('Q2', '7:12', t2, 'f', {
            dd: 'Punt',
            m: 3,
            tag: 'Practiced — sprint-out contain · Repped',
            tagC: GRN,
            key: true,
          }),
          P('Q2', '6:38', 'Punt — Westfield at its own 20', 'n', {
            dd: '1st & 10 · WST 20',
            b: X(20),
            fd: X(30),
            dv: X(20),
          }),
        ];
      }
      if (o2 === 1)
        return [
          P(
            'Q2',
            '7:12',
            'Sprint-out right — complete for 9 at the boundary',
            'n',
            {
              dd: '1st & 10 · CEN 46',
              b: X(54),
              fd: X(44),
              m: -2,
              tag: 'Introduced — contain got a walkthrough, not reps',
              tagC: AMB,
              key: true,
            },
          ),
          P(
            'Q2',
            '6:20',
            'Central reaches the WST 22 before stalling — 39-yard field goal is good',
            'n',
            { dd: 'Kickoff', cw: 3, m: -2 },
          ),
          P('Q2', '6:04', 'Jackson out to the WST 27', 'n', {
            dd: '1st & 10 · WST 27',
            b: X(27),
            fd: X(37),
            dv: X(27),
          }),
        ];
      if (execPrep('sprint', 0).preparedWins)
        return [
          P(
            'Q2',
            '7:12',
            'Sprint-out right — Cruz arrives late and the throw dies at his feet',
            'f',
            {
              dd: 'Punt',
              m: 3,
              tag: 'Execution beat scheme — one free rusher despite an unseen week',
              tagC: BLU,
              key: true,
            },
          ),
          P('Q2', '6:38', 'Punt — Westfield at its own 20', 'n', {
            dd: '1st & 10 · WST 20',
            b: X(20),
            fd: X(30),
            dv: X(20),
          }),
        ];
      return [
        P(
          'Q2',
          '7:12',
          'Sprint-out right — 19 yards down the boundary, nobody home',
          'n',
          {
            dd: '1st & 10 · WST 44',
            b: X(44),
            fd: X(34),
            m: -4,
            tag:
              risk === 'h2'
                ? 'Accepted risk — sprint-out. The bet is being tested.'
                : 'Unseen — sprint-out contain',
            tagC: risk === 'h2' ? AMB : RED,
            key: true,
          },
        ),
        P(
          'Q2',
          '6:20',
          'Four snaps later Malone finishes it from the 6 — TOUCHDOWN CENTRAL',
          'td',
          { dd: 'Kickoff', cw: 7, m: -6 },
        ),
        P('Q2', '6:04', 'Jackson out to the WST 27', 'n', {
          dd: '1st & 10 · WST 27',
          b: X(27),
          fd: X(37),
          dv: X(27),
        }),
      ];
    }),
  );
  // ---- Q2 · DECISION: two-minute clock call
  Q.push(
    P(
      'Q2',
      '1:38',
      'Central moves it late — three Herrera completions to the WST 24',
      'n',
      { dd: '2nd & 4 · WST 24', b: X(24), fd: X(14), dv: X(45), m: -3 },
    ),
  );
  const autoFront = pol.auto === 'Front';
  const clockOpts: MatchDecisionOption[] = [];
  if (autoFront) {
    clockOpts.push({
      name: 'Ride Tillman’s check',
      sub: 'Your policy put the front in his hands — it’s already fixed.',
      res: () => [
        P(
          'Q2',
          '0:49',
          'Tillman’s check fits it — Malone stopped, two throws die. The 38-yarder is good at the gun',
          'n',
          {
            dd: 'Halftime',
            cw: 3,
            m: 2,
            tag: 'Policy — the front is Tillman’s. The check held.',
            tagC: BLU,
          },
        ),
      ],
    });
    clockOpts.push({
      name: 'Timeout anyway — full reset',
      sub: 'Belt and suspenders. Costs one of three.',
      res: () => [
        P(
          'Q2',
          '0:49',
          'Timeout — stuff, incompletion, incompletion. The 41-yarder clangs off the upright',
          'f',
          {
            dd: 'Halftime',
            m: 4,
            tag: 'The timeout bought certainty — and you play the fourth quarter with two.',
            tagC: BLU,
          },
        ),
      ],
    });
  } else {
    clockOpts.push({
      name: 'Spend a timeout — reset the front',
      sub:
        pol.clock === 'Fix'
          ? 'This is exactly the timeout your policy set aside.'
          : pol.clock === 'Bank'
            ? 'Against your policy — you banked all three for offense.'
            : 'Your policy gave the coordinators this call, but you’re making it.',
      res: () => [
        P(
          'Q2',
          '0:49',
          'Timeout — the front resets. Stuff, incompletion, incompletion. The 41-yarder clangs off the upright',
          'f',
          {
            dd: 'Halftime',
            m: 4,
            tag: 'The timeout bought alignment — and you play the fourth quarter with two.',
            tagC: BLU,
          },
        ),
      ],
    });
    clockOpts.push({
      name: 'Play the down — trust the rules you repped',
      sub: 'Run fits are ' + RD[o1] + ' this week.',
      res: () =>
        o1 >= 2
          ? [
              P(
                'Q2',
                '0:49',
                'The repped rules hold — two stops, and they settle for three at the gun',
                'n',
                {
                  dd: 'Halftime',
                  cw: 3,
                  m: 1,
                  tag: 'Practiced — the rules travelled · ' + RD[o1],
                  tagC: GRN,
                },
              ),
            ]
          : [
              P(
                'Q2',
                '0:49',
                'The look you never repped finds the crease — Malone walks in from the 11. TOUCHDOWN CENTRAL',
                'td',
                {
                  dd: 'Halftime',
                  cw: 7,
                  m: -6,
                  tag: 'Unprepared for the wrinkle — and no timeout spent to fix it',
                  tagC: RED,
                },
              ),
            ],
    });
    clockOpts.push({
      name: 'Show pressure, back out late',
      sub: 'Steal the snap count without spending anything.',
      res: () =>
        o1 >= 1
          ? [
              P(
                'Q2',
                '0:49',
                'The bluff buys a checkdown — and the 47-yarder is up and good anyway',
                'n',
                {
                  dd: 'Halftime',
                  cw: 3,
                  m: 0,
                  tag: 'The bluff worked — the leg beat you anyway',
                  tagC: BLU,
                },
              ),
            ]
          : [
              P(
                'Q2',
                '0:49',
                'The hot throw beats the bluff to the goal line — TOUCHDOWN CENTRAL',
                'td',
                {
                  dd: 'Halftime',
                  cw: 7,
                  m: -6,
                  tag: 'A bluff with nothing behind it',
                  tagC: RED,
                },
              ),
            ],
    });
  }
  Q.push({
    dec: {
      id: 's_clock',
      key: true,
      when: 'Q2 · 0:55',
      title: autoFront
        ? 'Tillman already checked the front — your policy gave him that'
        : 'A heavy set you haven’t seen — 55 seconds to halftime',
      chips: [
        '2nd & 4 · WST 24',
        '0:55 · Central, 1 TO',
        'Policy · ' +
          ({
            Bank: 'bank all three',
            Fix: 'one for defense',
            Coord: 'coordinators call one',
          }[pol.clock] ?? ''),
      ],
      evid:
        'Nothing on three weeks of film showed this package. ' +
        (autoFront
          ? 'Your standing policy lets Tillman fix the front without finding you.'
          : 'Your timeout policy: ' +
            ({
              Bank: 'save all three for offense.',
              Fix: 'one may be spent on defense when the look is wrong.',
              Coord: 'each coordinator may call one.',
            }[pol.clock] ?? '')),
      staff: autoFront
        ? 'Front’s checked. If you want a full reset it still costs a timeout.'
        : 'That’s an unbalanced heavy set. I can fix the front if you give me a timeout — or we play it with the rules we repped.',
      who: 'B. Tillman, DC',
      opts: clockOpts,
    },
  });
  Q.push(
    G((sc) => [
      P(
        'Q2',
        '0:00',
        'HALFTIME — Westfield ' + sc.w + ', Central ' + sc.c,
        'end',
        { dd: 'Halftime', key: true },
      ),
      P(
        'Q3',
        '12:00',
        'Second half — Jackson returns the kick to the WST 31',
        'n',
        { dd: '1st & 10 · WST 31', b: X(31), fd: X(41), dv: X(31), m: 2 },
      ),
    ]),
  );
  // ---- Q3 · DECISION: the flood shot
  Q.push(
    P('Q3', '11:22', 'Carter for 6, then 4 — FIRST DOWN by inches', 'f', {
      dd: '1st & 10 · WST 41',
      b: X(41),
      fd: X(51),
    }),
  );
  const a3 = ans.h3;
  const groundOpt: MatchDecisionOption = {
    name: 'Stay on the ground',
    sub: 'They’re light in the box with the safety cheating to trips.',
    res: (sc) => {
      if (sc.qt === 'Pound the Rock' || o6 >= 2)
        return [
          P(
            'Q3',
            '10:38',
            'Carter five straight — 46 yards of downhill football to the CEN 13',
            'f',
            {
              dd: '1st & 10 · CEN 13',
              b: X(87),
              fd: X(97),
              m: 3,
              tag:
                sc.qt === 'Pound the Rock'
                  ? 'Quick Adjust — Pound the Rock. The box count agreed with you.'
                  : 'The ground game travels',
              tagC: BLU,
            },
          ),
          P(
            'Q3',
            '9:24',
            'Stuffed twice at the 9 — Ramsey from 26 is GOOD',
            'f',
            { dd: 'Kickoff', w: 3, m: 1 },
          ),
        ].concat(koHot('Q3', '9:12', '9:00'));
      return [
        P(
          'Q3',
          '10:38',
          'Buck squeezes it — six yards on three carries. Punt',
          'n',
          { dd: 'Punt', m: -1 },
        ),
        P('Q3', '9:52', 'Downed at the CEN 18', 'n', {
          dd: '1st & 10 · CEN 18',
          b: X(82),
          fd: X(72),
          dv: X(82),
        }),
      ];
    },
  };
  const rhythmOpt: MatchDecisionOption = {
    name: 'Three-step rhythm — stay underneath',
    sub: 'Protects the tackle. Death by paper cuts if they allow it.',
    res: () =>
      [
        P(
          'Q3',
          '10:38',
          'Hitches and slants — two first downs to the CEN 30',
          'n',
          { dd: '1st & 10 · CEN 30', b: X(70), fd: X(80), m: 2 },
        ),
        P(
          'Q3',
          '9:42',
          'Third and four dies at the 26 — Ramsey from 43 is GOOD',
          'f',
          { dd: 'Kickoff', w: 3, m: 2 },
        ),
      ].concat(koHot('Q3', '9:30', '9:18')),
  };
  let shotOpt: MatchDecisionOption;
  if (a3 && C.rtFix !== 'switch') {
    shotOpt = {
      name:
        C.rtFix === 'simplify'
          ? 'Take the shot — three-step flood'
          : 'Take the shot — trips flood',
      sub:
        C.rtFix === 'simplify'
          ? 'The version you kept. Shorter throw, same window.'
          : C.rtFix === 'promote'
            ? 'Five-step behind ' + rt + ' — he’s had the catch-up reps.'
            : 'Five-step behind a protection you chose not to fix.',
      res: () => {
        if (C.rtFix === 'simplify')
          return [
            P(
              'Q3',
              '10:38',
              'Trips right — the curl-flat defender chases and Whitfield takes the stop for 12',
              'f',
              {
                dd: '1st & 10 · CEN 47',
                b: X(53),
                fd: X(63),
                m: 3,
                tag: 'Practiced — flood, three-step version · ' + RD[o3],
                tagC: GRN,
              },
            ),
            P(
              'Q3',
              '9:50',
              'The short game carries it to the CEN 13 — Ramsey from 30 is GOOD',
              'f',
              { dd: 'Kickoff', w: 3, m: 2 },
            ),
          ].concat(koHot('Q3', '9:38', '9:26'));
        if (C.rtFix === 'accept')
          return [
            P(
              'Q3',
              '10:38',
              'Five-step — pressure through the right side before the window opens. Reed swallowed, loss of 9',
              'n',
              {
                dd: 'Punt',
                m: -4,
                tag: 'Accepted risk — protection. The best throw on the sheet needs time you didn’t buy.',
                tagC: AMB,
              },
            ),
            P('Q3', '10:02', 'Punt — Central at its own 28', 'n', {
              dd: '1st & 10 · CEN 28',
              b: X(72),
              fd: X(62),
              dv: X(72),
            }),
          ];
        if (o3 >= 2) {
          const ex = execPrep('flood', o3);
          if (ex.preparedWins)
            return [
              P(
                'Q3',
                '10:38',
                'Trips right, flood — the curl-flat defender chases the flat and Whitfield is ALONE behind him. 59 yards, TOUCHDOWN WESTFIELD',
                'td',
                {
                  dd: 'Kickoff',
                  w: 7,
                  m: 8,
                  tag:
                    'Practiced — trips flood · ' +
                    RD[o3] +
                    '. The window from film, hit in a game.',
                  tagC: GRN,
                },
              ),
            ].concat(koHot('Q3', '10:24', '10:12'));
          return [
            P(
              'Q3',
              '10:38',
              'The window is there — the timing isn’t. Overthrown by a yard',
              'n',
              {
                dd: '2nd & 10 · WST 41',
                m: -1,
                tag: 'Rehearsed — right call, missed throw',
                tagC: AMB,
              },
            ),
            P(
              'Q3',
              '9:55',
              'Westfield grinds to the CEN 26 — Ramsey from 43 is GOOD',
              'f',
              { dd: 'Kickoff', w: 3, m: 2 },
            ),
          ].concat(koHot('Q3', '9:41', '9:29'));
        }
        if (o3 === 1 && execPrep('flood', 1).preparedWins)
          return [
            P(
              'Q3',
              '10:38',
              'Trips right — the curl-flat defender chases and Whitfield takes the stop for 12',
              'f',
              {
                dd: '1st & 10 · CEN 47',
                b: X(53),
                fd: X(63),
                m: 3,
                tag: 'Introduced — the timing survived on nerve',
                tagC: AMB,
              },
            ),
            P(
              'Q3',
              '9:50',
              'The short game carries it to the CEN 13 — Ramsey from 30 is GOOD',
              'f',
              { dd: 'Kickoff', w: 3, m: 2 },
            ),
          ].concat(koHot('Q3', '9:38', '9:26'));
        return [
          P(
            'Q3',
            '10:38',
            'The window is there — the timing isn’t. Overthrown by a yard',
            'n',
            {
              dd: '2nd & 10 · WST 41',
              m: -1,
              tag: 'Introduced — one block wasn’t enough for this throw',
              tagC: AMB,
            },
          ),
          P(
            'Q3',
            '9:55',
            'Westfield grinds to the CEN 26 — Ramsey from 43 is GOOD',
            'f',
            { dd: 'Kickoff', w: 3, m: 2 },
          ),
        ].concat(koHot('Q3', '9:41', '9:29'));
      },
    };
  } else if (a3) {
    shotOpt = {
      name: 'Quick-game ladder — the Thursday answer',
      sub: 'You traded the flood for this on Thursday. Short, safe, repeatable.',
      res: () =>
        o3 >= 1
          ? [
              P(
                'Q3',
                '10:38',
                'The ladder works it down to the CEN 24 — Ramsey from 41 is GOOD',
                'f',
                {
                  dd: 'Kickoff',
                  w: 3,
                  m: 2,
                  tag: 'Switched answer — it scores in threes, not sevens',
                  tagC: BLU,
                },
              ),
            ].concat(koHot('Q3', '10:20', '10:08'))
          : [
              P(
                'Q3',
                '10:38',
                'The quick game starts from scratch — three and out',
                'n',
                {
                  dd: 'Punt',
                  m: -2,
                  tag: 'Switched Thursday — the reps never transferred',
                  tagC: AMB,
                },
              ),
              P('Q3', '10:02', 'Punt — Central at its own 30', 'n', {
                dd: '1st & 10 · CEN 30',
                b: X(70),
                fd: X(60),
                dv: X(70),
              }),
            ],
    };
  } else {
    shotOpt = {
      name: 'Sketch it on the sideline — call the flood cold',
      sub:
        risk === 'h3'
          ? 'Cover 3 leverage was your accepted risk. This was never installed.'
          : 'You didn’t prioritize their shell — no beater was installed.',
      res: () => [
        P(
          'Q3',
          '10:38',
          'The picture is right — the execution isn’t. Reed and Whitfield read it two different ways. Incomplete, and again. Punt',
          'n',
          {
            dd: 'Punt',
            m: -2,
            tag:
              risk === 'h3'
                ? 'Accepted risk — the window was there and nobody had repped the throw'
                : 'Unseen — a play sketched on a wristband is not a play',
            tagC: risk === 'h3' ? AMB : RED,
          },
        ),
        P('Q3', '9:56', 'Punt — Central at its own 25', 'n', {
          dd: '1st & 10 · CEN 25',
          b: X(75),
          fd: X(65),
          dv: X(75),
        }),
      ],
    };
  }
  Q.push({
    dec: {
      id: 's_flood',
      key: true,
      when: 'Q3 · 10:46',
      title: 'Their shell hasn’t changed — the trips-side window is open',
      chips: ['1st & 10 · WST 41', 'Cover 3 sky · same rotation as film'],
      evid: a3
        ? '33 snaps of the same rotation on film — 7 supporting, 1 against. Your answer: “' +
          a3.name +
          '” · flood work is ' +
          RD[o3] +
          '.'
        : risk === 'h3'
          ? 'You accepted this risk on Monday: 33 snaps of leverage, no practice time.'
          : 'The rotation was on film, but it never made your board.',
      staff:
        'Their curl-flat guy has chased every flat all night. Whatever we’re going to do about it, this is the field position to do it from.',
      who: 'D. Pruitt, OC',
      opts: [shotOpt, rhythmOpt, groundOpt],
    },
  });
  // ---- Q3 · the power drive (auto, Quick Adjust aware)
  Q.push(
    P(
      'Q3',
      '5:10',
      'Central leans in — power, counter, power. The chains move to the WST 33',
      'n',
      { dd: '1st & 10 · WST 33', b: X(33), fd: X(23), dv: X(70), m: -3 },
    ),
  );
  Q.push(
    G((sc) => {
      if (o1 >= 2) {
        const bh = sc.qt === 'Blitz Heavy';
        const pr = sc.qt === 'Prevent';
        return [
          P(
            'Q3',
            '4:22',
            bh
              ? 'Quick Adjust — Dean shoots the gap and blows up the pull for -3'
              : pr
                ? 'Quick Adjust — Prevent softens the box and Malone takes 4 before the sideline arrives'
                : 'Spill, scrape, sideline — the fits hold for 1',
            'f',
            {
              dd: '3rd & 7 · WST 32',
              b: X(32),
              m: pr ? 1 : 3,
              tag: bh
                ? 'Quick Adjust — Blitz Heavy into their best play'
                : pr
                  ? 'Quick Adjust — Prevent traded grass for a fresh set of downs'
                  : 'Practiced — puller fits · ' + RD[o1],
              tagC: pr ? BLU : GRN,
              key: true,
            },
          ),
          o2 >= 2
            ? P(
                'Q3',
                '3:40',
                'Third-and-long sprint-out — contained, thrown away. Fourth down is stuffed. TURNOVER ON DOWNS',
                'to',
                {
                  dd: '1st & 10 · WST 30',
                  b: X(30),
                  fd: X(40),
                  dv: X(30),
                  m: 6,
                  tag: 'Two answers, back to back — the week showing up',
                  tagC: GRN,
                },
              )
            : P(
                'Q3',
                '3:40',
                'Herrera escapes third and long on the sprint-out — the drive reaches the 21 before dying. Field goal is GOOD',
                'n',
                {
                  dd: 'Kickoff',
                  cw: 3,
                  m: -1,
                  tag: 'The contain you didn’t rep kept the drive alive',
                  tagC: AMB,
                },
              ),
        ];
      }
      return [
        P(
          'Q3',
          '4:22',
          'Okafor sheds two blocks and drops Malone for -2 — a player making a play',
          'f',
          {
            dd: '2nd & 12 · WST 35',
            b: X(35),
            m: 3,
            tag: 'Execution beat scheme — that one wasn’t the plan',
            tagC: BLU,
            key: true,
          },
        ),
        P(
          'Q3',
          '3:40',
          'Two snaps later the pull springs Malone through the alley — 24 yards, TOUCHDOWN CENTRAL',
          'td',
          {
            dd: 'Kickoff',
            cw: 7,
            m: -7,
            tag:
              risk === 'h1'
                ? 'Accepted risk — power, cashing in'
                : 'Underprepared — power fits · ' + RD[o1],
            tagC: risk === 'h1' ? AMB : RED,
          },
        ),
      ];
    }),
  );
  // ---- Q4 · Westfield touchdown + DECISION: conversion policy
  Q.push(
    P(
      'Q4',
      '10:55',
      'Quarter turns with Westfield driving — Reed to Brooks twice, Carter for 12',
      'n',
      { dd: '1st & 10 · CEN 18', b: X(82), fd: X(92), dv: X(60), m: 3 },
    ),
  );
  Q.push(
    P(
      'Q4',
      '9:12',
      'TOUCHDOWN WESTFIELD — Carter walks in behind Sosa from the 3',
      'td',
      { dd: 'Conversion', w: 6, m: 6, key: true },
    ),
  );
  Q.push(
    G((sc) => {
      const diff = sc.w - sc.c;
      return [
        {
          dec: {
            id: 's_pat',
            key: true,
            when: 'Q4 · 9:12',
            title:
              diff === 0
                ? 'Kick to take the lead by one, or press for two?'
                : diff > 0
                  ? 'Up ' + diff + ' — take the point or press it?'
                  : 'Down ' +
                    -diff +
                    ' after the touchdown — the conversion decides the math',
            chips: [
              'Conversion · CEN 3',
              'Policy · ' +
                ({
                  Kick: 'kick until the fourth',
                  Chart: 'two-point chart all night',
                  Feel: 'coach’s call',
                }[pol.pat] ?? ''),
            ],
            evid:
              'Your standing call was “' +
              ({
                Kick: 'kick until the fourth quarter',
                Chart: 'follow the two-point chart',
                Feel: 'call it in the moment',
              }[pol.pat] ?? '') +
              '” — and it is the fourth quarter now. The two-point play lives in the surge package: ' +
              RD[o6] +
              ' this week.',
            staff:
              'The surge set is the one Kowalski blocked in. ' +
              (C.rtFix === 'promote'
                ? rt + ' has had the catch-up reps in it.'
                : 'It never got live reps after Thursday.'),
            who: 'D. Pruitt, OC',
            opts: [
              {
                name: 'Kick — Ramsey, 21 of 22',
                sub: 'The point is nearly certain.',
                res: () =>
                  [
                    P('Q4', '9:12', 'Extra point is GOOD', 'n', {
                      dd: 'Kickoff',
                      w: 1,
                      m: 1,
                    }),
                  ].concat(koQuiet('Q4', '9:04')),
              },
              {
                name: 'Go for two — the surge package',
                sub:
                  o6 >= 2 && C.rtFix !== 'accept'
                    ? 'It got real reps this week.'
                    : 'It lost its blocker and its reps this week.',
                res: () =>
                  [
                    o6 >= 2 && C.rtFix !== 'accept'
                      ? P('Q4', '9:12', 'Carter surges in — TWO POINTS', 'f', {
                          dd: 'Kickoff',
                          w: 2,
                          m: 3,
                          tag: 'Practiced — short yardage · ' + RD[o6],
                          tagC: GRN,
                        })
                      : P('Q4', '9:12', 'Stood up at the line — NO GOOD', 'n', {
                          dd: 'Kickoff',
                          m: -2,
                          tag: 'The surge package was built around Kowalski. Tonight it showed.',
                          tagC: AMB,
                        }),
                  ].concat(koQuiet('Q4', '9:04')),
              },
            ],
          },
        },
      ];
    }),
  );
  // ---- Q4 · the closing situation (score-aware)
  Q.push(
    P(
      'Q4',
      '6:48',
      'The defenses tighten — the teams trade punts as the clock leans on everybody',
      'n',
      { dd: 'Q4 · winding down', m: 0 },
    ),
  );
  Q.push(
    G((sc) => {
      const diff = sc.w - sc.c;
      if (diff > 0)
        return [
          P(
            'Q4',
            '2:10',
            'Central takes over at its own 34 — ' +
              (diff > 8
                ? 'two scores down and out of miracles'
                : 'one drive for the district'),
            'n',
            { dd: '1st & 10 · CEN 34', b: X(66), fd: X(56), dv: X(66) },
          ),
          {
            dec: {
              id: 's_close_def',
              key: true,
              when: 'Q4 · 1:58',
              title: 'Their last drive — protect a ' + diff + '-point lead',
              chips: ['1st & 10 · CEN 34', '1:58 · they have 1 TO'],
              evid:
                'What you repped travels or it doesn’t: power fits ' +
                RD[o1] +
                ', sprint-out contain ' +
                RD[o2] +
                '.',
              staff:
                'They have to throw it now. This is the down where our week either shows up or it doesn’t.',
              who: 'B. Tillman, DC',
              opts: [
                {
                  name: 'Base rules — play what you practiced',
                  sub: 'The week decides it.',
                  res: (sc2) => {
                    const soft = sc2.qt === 'Prevent';
                    if (o1 >= 2 || o2 >= 2 || (soft && o1 >= 1))
                      return [
                        P(
                          'Q4',
                          '1:20',
                          'Two throws die at the sticks — and on fourth down Cruz arrives with the ball still in Herrera’s hand. TURNOVER ON DOWNS',
                          'to',
                          {
                            dd: 'Victory formation',
                            b: X(60),
                            m: 8,
                            tag: soft
                              ? 'Quick Adjust — Prevent kept everything underneath and the clock ran'
                              : 'Practiced — the week held up when it mattered',
                            tagC: soft ? BLU : GRN,
                          },
                        ),
                        P('Q4', '0:24', 'Reed kneels. Once, twice.', 'n', {
                          dd: 'Kneel',
                        }),
                      ];
                    return [
                      P(
                        'Q4',
                        '1:20',
                        'Herrera picks the rules apart — sprint-out, glance, sprint-out. TOUCHDOWN CENTRAL with 0:31 left',
                        'td',
                        {
                          dd: 'Kickoff',
                          cw: 7,
                          m: -8,
                          tag: 'Underprepared — nothing on the call sheet answered it',
                          tagC: RED,
                        },
                      ),
                      P(
                        'Q4',
                        '0:22',
                        'The last kickoff return dies at the 34 — one heave, batted down',
                        'n',
                        { dd: 'Final seconds', m: -2 },
                      ),
                    ];
                  },
                },
                {
                  name: 'Prevent — two-deep shell, everything in front',
                  sub:
                    diff > 3
                      ? 'Trade grass for clock — the math is on your side.'
                      : 'Trade grass for clock — but a field goal ' +
                        (diff === 3 ? 'ties it' : 'beats you') +
                        '.',
                  res: () => {
                    if (diff > 3)
                      return [
                        P(
                          'Q4',
                          '1:12',
                          'Checkdown, checkdown, checkdown — midfield with 0:20 and no timeouts. The heave falls incomplete',
                          'f',
                          {
                            dd: 'Victory formation',
                            m: 5,
                            tag: 'The shell gave up grass and nothing else',
                            tagC: BLU,
                          },
                        ),
                        P('Q4', '0:04', 'Kneel down. That’s it.', 'n', {
                          dd: 'Kneel',
                        }),
                      ];
                    if (diff === 3)
                      return [
                        P(
                          'Q4',
                          '1:04',
                          'The underneath stuff bleeds to the WST 27 — the field goal ties it at the gun',
                          'n',
                          {
                            dd: 'Overtime',
                            cw: 3,
                            m: -4,
                            tag: 'Prevent prevented nothing but the touchdown',
                            tagC: AMB,
                          },
                        ),
                      ].concat(OT());
                    return [
                      P(
                        'Q4',
                        '1:04',
                        'They bleed underneath to the WST 24 — and the 41-yarder wins it at the gun',
                        'n',
                        {
                          dd: 'Final',
                          cw: 3,
                          m: -6,
                          tag: 'The shell conceded exactly the yards a field goal needed',
                          tagC: RED,
                        },
                      ),
                    ];
                  },
                },
                {
                  name: 'Send Cruz — end it at the quarterback',
                  sub: 'One free runner ends drives. One missed assignment ends seasons.',
                  res: (sc2) =>
                    o2 >= 2 || (sc2.qt === 'Blitz Heavy' && o1 >= 2)
                      ? [
                          P(
                            'Q4',
                            '1:20',
                            'Cruz off the boundary edge — strip sack, Okafor falls on it. BALL GAME',
                            'to',
                            {
                              dd: 'Victory formation',
                              b: X(55),
                              m: 9,
                              tag: 'The pressure answer from the film room, one last time',
                              tagC: GRN,
                            },
                          ),
                          P('Q4', '0:30', 'Kneel downs.', 'n', { dd: 'Kneel' }),
                        ]
                      : [
                          P(
                            'Q4',
                            '1:20',
                            'The hot throw beats the blitz — 68 yards, TOUCHDOWN CENTRAL',
                            'td',
                            {
                              dd: 'Kickoff',
                              cw: 7,
                              m: -9,
                              tag: 'The blitz you never repped left the slot uncovered',
                              tagC: RED,
                            },
                          ),
                          P(
                            'Q4',
                            '0:18',
                            'The return stalls at the 29 — the last heave is short',
                            'n',
                            { dd: 'Final seconds', m: -2 },
                          ),
                        ],
                },
              ],
            },
          },
        ];
      const need = -diff;
      if (need > 8)
        return [
          P(
            'Q4',
            '1:58',
            'Two scores down — Reed moves them to midfield, but the math is the math. The last heave dies at the CEN 20',
            'n',
            { dd: 'Final seconds', m: -2 },
          ),
        ];
      return [
        P(
          'Q4',
          '2:04',
          'Reed to Whitfield twice — Westfield to the CEN 38, clock running, no timeouts',
          'n',
          {
            dd: '4th & 6 · CEN 38 · 0:31',
            b: X(62),
            fd: X(72),
            dv: X(44),
            m: 2,
          },
        ),
        {
          dec: {
            id: 's_close_off',
            key: true,
            when: 'Q4 · 0:31',
            title:
              need === 0
                ? 'Tied — fourth and six to keep the winning drive alive'
                : 'Down ' + need + ' — fourth and six at their 38',
            chips: ['4th & 6 · CEN 38', '0:31 · no timeouts'],
            evid: a3
              ? 'The flood is ' +
                RD[o3] +
                ' and the window has been open all night.'
              : 'No beater was ever installed against their shell — the call sheet is thin right here.',
            staff:
              'Fifty-five is beyond Ramsey. We convert here or we shake hands.',
            who: 'D. Pruitt, OC',
            opts: [
              a3
                ? {
                    name: 'The flood — one more time',
                    sub: 'Live on the week’s work.',
                    res: () => {
                      if (o3 >= 2 && C.rtFix !== 'accept')
                        return WINDRIVE(need);
                      if (o3 >= 1)
                        return [
                          P(
                            'Q4',
                            '0:24',
                            'The window opens late — complete to Silva for 11, out of bounds at the 27',
                            'f',
                            {
                              dd: '1st & 10 · CEN 27 · 0:19',
                              b: X(73),
                              m: 3,
                              tag: 'Introduced — the timing survived on nerve',
                              tagC: AMB,
                            },
                          ),
                        ].concat(FINISH(need));
                      return [
                        P(
                          'Q4',
                          '0:24',
                          'Pressure — the throw sails. Incomplete, and that’s the ball game',
                          'n',
                          {
                            dd: 'Final',
                            m: -6,
                            tag: 'Unrepped — the best call needed a week it never got',
                            tagC: RED,
                          },
                        ),
                      ];
                    },
                  }
                : {
                    name: 'Four verticals — give somebody a chance',
                    sub: 'Unrepped. A jump ball decides it.',
                    res: () => [
                      P(
                        'Q4',
                        '0:24',
                        'Four streaks — double coverage everywhere. Batted down. FINAL',
                        'n',
                        {
                          dd: 'Final',
                          m: -6,
                          tag:
                            risk === 'h3'
                              ? 'Accepted risk — the shell you left uncovered closed the season’s last window'
                              : 'Unseen — no beater was built for this shell',
                          tagC: risk === 'h3' ? AMB : RED,
                        },
                      ),
                    ],
                  },
              {
                name: 'Carter screen — take the chunk underneath',
                sub: 'Buck has jumped every screen since the first quarter.',
                res: () => [
                  P(
                    'Q4',
                    '0:24',
                    'Buck jumps it — the screen dies three yards short. Central in victory formation',
                    'n',
                    {
                      dd: 'Final',
                      m: -6,
                      tag: 'The film warned you — Buck reads screens',
                      tagC: RED,
                    },
                  ),
                ],
              },
              {
                name: 'Boot Reed — extend and find somebody',
                sub: 'Off script. His legs against their rush.',
                res: (sc2) =>
                  sc2.qt === 'Air It Out' || o6 >= 2
                    ? [
                        P(
                          'Q4',
                          '0:24',
                          'Reed boots right, buys three seconds — Brooks drags open for 12, out of bounds at the 26',
                          'f',
                          {
                            dd: '1st & 10 · CEN 26 · 0:18',
                            b: X(74),
                            m: 3,
                            tag:
                              sc2.qt === 'Air It Out'
                                ? 'Quick Adjust — Air It Out kept the field spread for the scramble'
                                : 'Situational work paying off',
                            tagC: BLU,
                          },
                        ),
                      ].concat(FINISH(need))
                    : [
                        P(
                          'Q4',
                          '0:24',
                          'Reed boots into the chase — dragged down at the line. FINAL',
                          'n',
                          { dd: 'Final', m: -6 },
                        ),
                      ],
              },
            ],
          },
        },
      ];
    }),
  );
  Q.push(
    G((sc) => [
      P(
        'Q4',
        '0:00',
        'FINAL — Westfield ' +
          sc.w +
          ', Central Catholic ' +
          sc.c +
          (sc.w > sc.c
            ? '. The district runs through Wildcat Stadium.'
            : '. A quiet handshake line, and a long film session coming.'),
        'end',
        { dd: 'Final' },
      ),
    ]),
  );
  return Q;
}
/** Mutable fold accumulator. Local to `deriveMatch`; never escapes. */
interface Simulation {
  phase: MatchPhase;
  qt: QuickAdjustCall;
  queue: QueueItem[];
  plays: MatchPlay[];
  log: MatchLogEntry[];
  wScore: number;
  cScore: number;
  mom: number;
  ball: number;
  fd: number;
  drv: number;
  mQ: string;
  mClock: string;
  dd: string;
  pending: MatchDecision | null;
  keySeen: number;
}

function pushPlay(sim: Simulation, play: MatchPlay): void {
  sim.plays.unshift(play);
  if (sim.plays.length > 60) sim.plays.length = 60;
}

/** Canonical `advance(n)`, minus the setState plumbing. */
function applyAdvance(sim: Simulation, n: number): void {
  if (sim.phase !== 'live' || sim.pending !== null) return;
  let guard = 0;
  let remaining = n;
  while (remaining > 0 && sim.queue.length > 0 && guard++ < 500) {
    const item = sim.queue.shift()!;
    if ('gen' in item) {
      sim.queue = [
        ...(item.gen({ w: sim.wScore, c: sim.cScore, qt: sim.qt }) ?? []),
        ...sim.queue,
      ];
      continue;
    }
    if ('dec' in item) {
      const d = item.dec;
      if (d.key) {
        const parts = (d.when || '').split('·');
        pushPlay(sim, {
          q: (parts[0] ?? '').trim() || sim.mQ,
          c: (parts[1] ?? '').trim() || sim.mClock,
          t: d.title,
          k: 'n',
          key: true,
          tag: 'Key situation',
          tagC: '#0072F5',
        });
        sim.keySeen += 1;
      }
      sim.pending = d;
      break;
    }
    const p = item.play;
    pushPlay(sim, p);
    if (p.key) sim.keySeen += 1;
    sim.wScore += p.w ?? 0;
    sim.cScore += p.cw ?? 0;
    if (p.m) sim.mom = Math.max(8, Math.min(92, sim.mom + p.m));
    if (p.b !== undefined) sim.ball = p.b;
    if (p.fd !== undefined) sim.fd = p.fd;
    if (p.dv !== undefined) sim.drv = p.dv;
    if (p.q !== undefined) sim.mQ = p.q;
    if (p.c !== undefined) sim.mClock = p.c;
    if (p.dd !== undefined) sim.dd = p.dd;
    if (p.tag !== undefined) {
      sim.log.push({
        kind: 'note',
        when: (p.q || sim.mQ) + ' · ' + (p.c || sim.mClock),
        title: p.tag,
        note: p.t,
        key: p.key ?? false,
      });
    }
    remaining -= 1;
  }
  if (sim.queue.length === 0 && sim.pending === null) sim.phase = 'final';
}

/** Canonical `choose(opt)` plus its scheduled `advance(1)`. */
function applyDecision(sim: Simulation, optionIndex: number): void {
  const dec = sim.pending;
  if (dec === null) return;
  const opt = dec.opts[optionIndex];
  if (opt === undefined) return;
  const score: MatchScore = { w: sim.wScore, c: sim.cScore, qt: sim.qt };
  const steps = opt.res !== undefined ? [...(opt.res(score) ?? [])] : [];
  const outs = steps.filter(
    (item): item is Extract<QueueItem, { play: MatchPlay }> => 'play' in item,
  );
  sim.pending = null;
  sim.queue = [...steps, ...sim.queue];
  const entry: MatchLogDecision = {
    kind: 'decision',
    id: dec.id,
    oi: dec.opts.indexOf(opt),
    chips: dec.chips,
    evid: dec.evid,
    staff: dec.staff,
    who: dec.who,
    choice: opt.name,
    sub: opt.sub,
    scW: score.w,
    scC: score.c,
    out: outs.map((item) => ({
      t: item.play.t,
      tag: item.play.tag ?? '',
      tagC: item.play.tagC ?? '#D6D6D6',
      key: item.play.key ?? false,
    })),
    pts: outs.reduce(
      (acc, item) => ({
        w: acc.w + (item.play.w ?? 0),
        c: acc.c + (item.play.cw ?? 0),
      }),
      { w: 0, c: 0 },
    ),
    when: dec.when,
    title: dec.title,
    note: 'You chose — ' + opt.name,
    key: dec.key,
  };
  sim.log.push(entry);
  applyAdvance(sim, 1);
}

/** Canonical `logQt(q)`. */
function applyQuickAdjust(sim: Simulation, call: QuickAdjustCall): void {
  if (sim.qt === call) return;
  sim.qt = call;
  sim.log.push({
    kind: 'note',
    when: (sim.mQ || 'Q1') + ' · ' + (sim.mClock || '12:00'),
    title: 'Quick Adjust — ' + call,
    note: 'Coordinator dial set — later situations resolve against this look.',
    key: false,
  });
}

const PREGAME_VIEW: Omit<MatchView, 'phase'> = {
  qt: 'Air It Out',
  plays: [],
  log: [],
  wScore: 0,
  cScore: 0,
  mom: 50,
  ball: 44.1,
  fd: 52.5,
  drv: 31.5,
  quarter: 'Q1',
  clock: '7:30',
  dd: 'Kickoff · 7:30 PM',
  pending: null,
  keyCount: 0,
  decisionCount: 0,
};

/**
 * Re-derive the whole game from persisted decisions. Deterministic: the same
 * `WeekState` always yields the same view, with no clock reads or randomness.
 */
export function deriveMatch(
  state: WeekState,
  scenario: WeekScenario,
): MatchView {
  if (!state.matchStarted) return { phase: 'pregame', ...PREGAME_VIEW };

  const sim: Simulation = {
    phase: 'live',
    qt: 'Air It Out',
    queue: buildGame(deriveTakeFieldContext(state, scenario)),
    plays: [],
    log: [],
    wScore: 0,
    cScore: 0,
    mom: 50,
    ball: 44.1,
    fd: 52.5,
    drv: 31.5,
    mQ: 'Q1',
    mClock: '12:00',
    dd: 'Kickoff',
    pending: null,
    keySeen: 0,
  };

  for (const event of state.matchEvents) {
    switch (event.kind) {
      case 'advance':
        applyAdvance(sim, event.plays);
        break;
      case 'skip':
        applyAdvance(sim, 500);
        break;
      case 'decide':
        if (sim.pending?.id === event.decisionId) {
          applyDecision(sim, event.optionIndex);
        }
        break;
      case 'quick-adjust':
        applyQuickAdjust(sim, event.call);
        break;
    }
  }

  return {
    phase: sim.phase,
    qt: sim.qt,
    plays: sim.plays.map((p) => ({
      q: p.q,
      c: p.c,
      t: p.t,
      k: p.k,
      key: p.key ?? false,
      tag: p.tag ?? '',
      tagC: p.tagC ?? '#D6D6D6',
    })),
    log: sim.log,
    wScore: sim.wScore,
    cScore: sim.cScore,
    mom: sim.mom,
    ball: sim.ball,
    fd: sim.fd,
    drv: sim.drv,
    quarter: sim.mQ,
    clock: sim.mClock,
    dd: sim.dd,
    pending: sim.pending,
    keyCount: sim.keySeen,
    decisionCount: sim.log.filter((entry) => entry.kind === 'decision').length,
  };
}

/** One line of the pregame "What you take onto the field" snapshot. */
export interface SnapshotItem {
  readonly name: string;
  readonly note: string;
}

export interface FieldSnapshot {
  readonly prepared: readonly SnapshotItem[];
  readonly thin: readonly SnapshotItem[];
  readonly uncovered: readonly SnapshotItem[];
  readonly riskTitle: string;
  readonly riskNamed: boolean;
}

/** Canonical pregame snapshot lists, derived from readiness — never stored. */
export function deriveFieldSnapshot(
  state: WeekState,
  scenario: WeekScenario,
): FieldSnapshot {
  const gate = deriveEvidenceGate(state, scenario);
  const prepared: SnapshotItem[] = [];
  const thin: SnapshotItem[] = [];
  const uncovered: SnapshotItem[] = [];
  // A package missing a body it never accounted for cannot claim the readiness
  // its rep count implies, so it drops one tier and says whose absence did it.
  const outs = unrepresentedUnavailable(state, scenario);
  const shortPackages = new Map<string, string[]>();
  for (const entry of scenario.rosterPlanning.packageDepth) {
    if (!outs.includes(entry.playerId)) continue;
    const name =
      scenario.rosterPlanning.players.find(
        (player) => player.id === entry.playerId,
      )?.shortName ?? entry.playerId;
    const named = shortPackages.get(entry.packageId) ?? [];
    if (!named.includes(name)) named.push(name);
    shortPackages.set(entry.packageId, named);
  }
  for (const summary of practiceObjectiveSummaries(state, scenario)) {
    const objective = summary.objective;
    const onBoard =
      objective.hypothesisId === null ||
      gate.validSelection.includes(objective.hypothesisId);
    const isRisk =
      objective.hypothesisId !== null &&
      objective.hypothesisId === gate.acceptedRisk;
    if (isRisk) {
      uncovered.push({
        name: objective.name,
        note: 'Accepted risk — no practice time, by choice.',
      });
      continue;
    }
    if (!onBoard) continue;
    const missing =
      objective.packageId === undefined
        ? undefined
        : shortPackages.get(objective.packageId);
    if (missing !== undefined) {
      const who = missing.join(' and ');
      if (READINESS_LEVEL[summary.readiness] >= 3) {
        thin.push({
          name: objective.name,
          note: `${summary.readiness} on paper · ${who} unavailable, the package is a body short`,
        });
      } else {
        uncovered.push({
          name: objective.name,
          note: `${who} unavailable — the package has no repped body left.`,
        });
      }
      continue;
    }
    const level = READINESS_LEVEL[summary.readiness];
    if (level >= 3) {
      prepared.push({
        name: objective.name,
        note: `${summary.expectedReps} reps across ${summary.blocks.length} blocks`,
      });
    } else if (level >= 1) {
      thin.push({
        name: objective.name,
        note: `${summary.readiness} · ${summary.expectedReps} reps${summary.contactCapped ? ' · never went live' : ''}`,
      });
    } else {
      uncovered.push({
        name: objective.name,
        note: 'Unseen — no blocks placed.',
      });
    }
  }
  const risk = scenario.hypotheses.find((h) => h.id === gate.acceptedRisk);
  return {
    prepared,
    thin,
    uncovered,
    riskTitle: risk ? `${risk.short} — ${risk.unit}` : 'None accepted yet',
    riskNamed: risk !== undefined,
  };
}

// ---------------------------------------------------------------------------
// Transitions. Pure `(state, …) → state`; rejected actions preserve identity.
// ---------------------------------------------------------------------------

/** Set one Friday standing policy. Frozen once the coach has taken the field. */
export function setPolicy(
  state: WeekState,
  id: PolicyId,
  value: PolicyValue,
): WeekState {
  if (state.matchStarted) return state;
  if (!POLICY_VALUES[id].includes(value)) return state;
  if (state.policies[id] === value) return state;
  return { ...state, policies: { ...state.policies, [id]: value } };
}

/** Take the field. Only from a confirmed Thursday, once, on Friday. */
export function takeField(state: WeekState): WeekState {
  if (state.stage !== 'friday' || !state.disruptionConfirmed) return state;
  if (state.matchStarted) return state;
  return { ...state, matchStarted: true, matchSpeed: '1x', matchEvents: [] };
}

function withEvent(
  state: WeekState,
  scenario: WeekScenario,
  event: MatchEvent,
): WeekState {
  // Coalesce consecutive advances so the persisted record stays compact.
  const previous = state.matchEvents[state.matchEvents.length - 1];
  const matchEvents =
    event.kind === 'advance' && previous?.kind === 'advance'
      ? [
          ...state.matchEvents.slice(0, -1),
          { kind: 'advance', plays: previous.plays + event.plays } as const,
        ]
      : [...state.matchEvents, event];
  const next: WeekState = { ...state, matchEvents };
  // Park playback at the final horn and open Saturday's canonical review gate.
  // Match events remain untouched, so score, feed, and decision log stay exact.
  if (deriveMatch(next, scenario).phase === 'final') {
    return { ...next, stage: 'review', matchSpeed: 'pause' };
  }
  return next;
}

/** Advance the live game by `plays` resolved plays. */
export function advanceMatch(
  state: WeekState,
  scenario: WeekScenario,
  plays = 1,
): WeekState {
  if (!Number.isInteger(plays) || plays < 1) return state;
  const view = deriveMatch(state, scenario);
  if (view.phase !== 'live' || view.pending !== null) return state;
  return withEvent(state, scenario, { kind: 'advance', plays });
}

/** Run ahead to the next key situation (`skipToDec`). */
export function skipToDecision(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  const view = deriveMatch(state, scenario);
  if (view.phase !== 'live' || view.pending !== null) return state;
  return withEvent(state, scenario, { kind: 'skip' });
}

/** Answer the pending key situation with one of its canonical options. */
export function chooseMatchOption(
  state: WeekState,
  scenario: WeekScenario,
  decisionId: string,
  optionIndex: number,
): WeekState {
  const view = deriveMatch(state, scenario);
  if (view.pending === null || view.pending.id !== decisionId) return state;
  if (view.pending.opts[optionIndex] === undefined) return state;
  return withEvent(state, scenario, {
    kind: 'decide',
    decisionId,
    optionIndex,
  });
}

/** Move the coordinator dial. Later situations resolve against this look. */
export function setQuickAdjust(
  state: WeekState,
  scenario: WeekScenario,
  call: QuickAdjustCall,
): WeekState {
  if (!state.matchStarted) return state;
  if (!QUICK_ADJUST_CALLS.includes(call)) return state;
  const view = deriveMatch(state, scenario);
  if (view.phase === 'final') return state;
  if (view.qt === call) return state;
  return withEvent(state, scenario, { kind: 'quick-adjust', call });
}

/** Playback setting only — it never changes what the queue resolves to. */
export function setMatchSpeed(
  state: WeekState,
  speed: MatchSpeed,
  scenario: WeekScenario = WEEK_8_SCENARIO,
): WeekState {
  if (!state.matchStarted || state.matchSpeed === speed) return state;
  if (deriveMatch(state, scenario).phase === 'final') return state;
  return { ...state, matchSpeed: speed };
}
