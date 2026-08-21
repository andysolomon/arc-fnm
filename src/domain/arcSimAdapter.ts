/**
 * Snapshot → play-by-play input for non-canonical Fridays.
 *
 * Canonical Week 8 Match Day stays in `matchDay.ts`. This module maps the
 * snapshot and never turns injuries on. `playByPlayFriday.ts` is the only
 * caller of the engine, and only for later weeks.
 */

import {
  deriveTakeFieldContext,
  execSeedFor,
  unavailablePlayersOf,
  type TakeFieldContext,
} from './matchDay.ts';
import { WEEK_8_ROSTER, type RosterPlayer } from './roster.ts';
import type {
  PlayerParticipation,
  PolicyState,
  ProtectionPlayerId,
  WeekScenario,
  WeekState,
} from './types.ts';

export interface FridaySimPlayer {
  readonly playerId: string;
  readonly position: string;
  readonly overall: number;
  readonly depthRank?: number;
}

export interface FridaySimTeam {
  readonly teamId: string;
  readonly strength: number;
  readonly players: readonly FridaySimPlayer[];
  readonly coach?: { readonly aggression?: number };
  readonly scheme?: {
    readonly offense?: string;
    readonly defense?: string;
  };
  readonly gameplan?: string;
}

export interface FridaySimFeatureGates {
  readonly scoringV2: boolean;
  readonly penalties: boolean;
  readonly injuries: boolean;
  readonly weather: boolean;
  readonly situational: boolean;
  readonly balance: boolean;
  readonly schemes: boolean;
  readonly timeline: boolean;
  readonly goalLineYards: boolean;
  readonly goalLineConversion: boolean;
  readonly returnStats: boolean;
  readonly puntReturns: boolean;
  readonly defensivePat: boolean;
  readonly rushDistribution: boolean;
  readonly playCalling: boolean;
  readonly passingGame: boolean;
}

/** Varsity-like football, never an in-game injury roll. */
export const FNM_FRIDAY_FEATURES: FridaySimFeatureGates = Object.freeze({
  scoringV2: true,
  penalties: true,
  injuries: false,
  weather: true,
  situational: true,
  balance: true,
  schemes: true,
  timeline: false,
  goalLineYards: true,
  goalLineConversion: true,
  returnStats: true,
  puntReturns: true,
  defensivePat: true,
  rushDistribution: true,
  playCalling: true,
  passingGame: true,
});

export interface FridaySimInput {
  readonly home: FridaySimTeam;
  readonly away: FridaySimTeam;
  readonly seed: number;
  readonly features: FridaySimFeatureGates;
}

const OFFENSE_SCHEME_IDS: Readonly<Record<string, string>> = {
  Spread: 'spread',
  'Air Raid': 'air_raid',
  'Pro Style': 'pro_style',
  Flexbone: 'flexbone',
  'Wing-T': 'wing_t',
  Balanced: 'balanced',
};

const DEFENSE_SCHEME_IDS: Readonly<Record<string, string>> = {
  '4-2-5': 'four_two_five',
  '4-3': 'four_three',
  '3-4': 'three_four',
  '46': 'forty_six',
  Balanced: 'balanced',
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function winRate(record: string): number | null {
  const match = record.match(/^(\d+)[–-](\d+)/);
  if (match === null) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const games = wins + losses;
  return games === 0 ? null : wins / games;
}

function meanReadiness(lvl: TakeFieldContext['lvl']): number {
  const values = Object.values(lvl);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function homeOverallScale(context: TakeFieldContext): number {
  return 0.88 + 0.12 * (meanReadiness(context.lvl) / 3);
}

function coachAggression(pol: PolicyState): number {
  if (pol.fourth === 'Short') return 80;
  if (pol.fourth === 'Kick') return 25;
  return 50;
}

function gameplanFocus(pol: PolicyState): string {
  if (pol.fourth === 'Short') return 'establish_run';
  if (pol.clock === 'Fix') return 'tempo_up';
  if (pol.clock === 'Bank') return 'control_clock';
  return 'balanced';
}

function unavailableRosterNames(
  scenario: WeekScenario,
  context: TakeFieldContext,
): ReadonlySet<string> {
  const names = new Set<string>();
  const extraOuts = new Set<ProtectionPlayerId>(unavailablePlayersOf(context));
  for (const entry of scenario.rosterPlanning.availability) {
    const blocked: PlayerParticipation[] = ['ineligible', 'no-contact'];
    if (
      !blocked.includes(entry.participation) &&
      !extraOuts.has(entry.playerId)
    ) {
      continue;
    }
    const player = scenario.rosterPlanning.players.find(
      (item) => item.id === entry.playerId,
    );
    if (player !== undefined) names.add(player.name);
  }
  return names;
}

function depthRanks(
  players: readonly RosterPlayer[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  const ranks = new Map<string, number>();
  for (const player of players) {
    const seen = counts.get(player.position) ?? 0;
    counts.set(player.position, seen + 1);
    ranks.set(`${player.number}:${player.name}`, seen + 1);
  }
  return ranks;
}

function toSimPlayer(
  player: RosterPlayer,
  teamId: string,
  overall: number,
  rank: number,
): FridaySimPlayer {
  return {
    playerId: `${teamId}-${slug(player.name)}`,
    position: player.position,
    overall: clamp(Math.round(overall), 0, 99),
    depthRank: rank,
  };
}

function teamStrength(players: readonly FridaySimPlayer[]): number {
  if (players.length === 0) return 50;
  const total = players.reduce((sum, player) => sum + player.overall, 0);
  return clamp(Math.round(total / players.length), 0, 99);
}

function mappedScheme(
  offenseScheme: string,
  defenseScheme: string,
): FridaySimTeam['scheme'] | undefined {
  const offense = OFFENSE_SCHEME_IDS[offenseScheme];
  const defense = DEFENSE_SCHEME_IDS[defenseScheme];
  if (offense === undefined && defense === undefined) return undefined;
  return {
    ...(offense === undefined ? {} : { offense }),
    ...(defense === undefined ? {} : { defense }),
  };
}

/**
 * Build a Friday engine input from an already-derived snapshot.
 * Does not take the field and does not replace Match Day.
 */
export function fridaySimInputFromSnapshot(
  context: TakeFieldContext,
  scenario: WeekScenario,
  schemes?: {
    readonly offenseScheme: string;
    readonly defenseScheme: string;
  },
): FridaySimInput {
  const seed = execSeedFor(context);
  const blocked = unavailableRosterNames(scenario, context);
  const homeEligible = WEEK_8_ROSTER.filter(
    (player) => !blocked.has(player.name),
  );
  const ranks = depthRanks(homeEligible);
  const scale = homeOverallScale(context);
  const awayRate = winRate(scenario.opponent.record);
  const homeRate = winRate(scenario.program.record);
  const recordDelta = Math.round(
    ((awayRate ?? 0.5) - (homeRate ?? 0.5)) * 20,
  );

  const homeId = slug(scenario.program.school);
  const awayId = slug(scenario.opponent.name);

  const homePlayers = homeEligible.map((player) =>
    toSimPlayer(
      player,
      homeId,
      player.overall * scale,
      ranks.get(`${player.number}:${player.name}`) ?? 1,
    ),
  );

  const awayRanks = depthRanks(WEEK_8_ROSTER);
  const awayPlayers = WEEK_8_ROSTER.map((player) =>
    toSimPlayer(
      player,
      awayId,
      player.overall + recordDelta,
      awayRanks.get(`${player.number}:${player.name}`) ?? 1,
    ),
  );

  const scheme = mappedScheme(
    schemes?.offenseScheme ?? '',
    schemes?.defenseScheme ?? '',
  );

  return {
    seed,
    features: FNM_FRIDAY_FEATURES,
    home: {
      teamId: homeId,
      strength: teamStrength(homePlayers),
      players: homePlayers,
      coach: { aggression: coachAggression(context.pol) },
      ...(scheme === undefined ? {} : { scheme }),
      gameplan: gameplanFocus(context.pol),
    },
    away: {
      teamId: awayId,
      strength: teamStrength(awayPlayers),
      players: awayPlayers,
      coach: { aggression: 50 },
    },
  };
}

/** Derive the snapshot from persisted decisions, then map it. */
export function deriveFridaySimInput(
  state: WeekState,
  scenario: WeekScenario,
): FridaySimInput {
  return fridaySimInputFromSnapshot(
    deriveTakeFieldContext(state, scenario),
    scenario,
    {
      offenseScheme: state.offenseScheme,
      defenseScheme: state.defenseScheme,
    },
  );
}
