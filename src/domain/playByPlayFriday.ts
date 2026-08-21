/**
 * Play-by-play Friday for weeks that are not the canonical teaching week.
 *
 * Week 8 stays on `matchDay.ts`. This module is the only place Friday Night
 * Manager may import `@arc-sim/core`, and it refuses to run for week 8.
 */

import { simulateGameLog } from '@arc-sim/core';
import type { PbpGameInput, TeamSimProfile } from '@arc-sim/core';

import {
  deriveFridaySimInput,
  type FridaySimInput,
  type FridaySimTeam,
} from './arcSimAdapter.ts';
import { deriveMatch, type MatchView } from './matchDay.ts';
import type { WeekScenario, WeekState } from './types.ts';

/** The UI-3 teaching week. Its Friday is Match Day, not this engine. */
export const CANONICAL_TEACHING_WEEK = 8;

export class CanonicalWeekMatchDayError extends Error {
  constructor() {
    super(
      'Week 8 Friday stays on Match Day; the play-by-play engine is for later weeks.',
    );
    this.name = 'CanonicalWeekMatchDayError';
  }
}

export interface FridayPlayByPlayResult {
  readonly weekNumber: number;
  readonly seed: number;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly driveCount: number;
  readonly playCount: number;
  readonly injuriesModelled: boolean;
}

export function usesPlayByPlayFriday(scenario: WeekScenario): boolean {
  return scenario.weekNumber !== CANONICAL_TEACHING_WEEK;
}

function toEngineTeam(team: FridaySimTeam): TeamSimProfile {
  const profile: TeamSimProfile = {
    teamId: team.teamId,
    strength: team.strength,
    players: team.players.map((player) => {
      const mapped = {
        playerId: player.playerId,
        position: player.position,
        overall: player.overall,
      };
      return player.depthRank === undefined
        ? mapped
        : { ...mapped, depthRank: player.depthRank };
    }),
  };
  if (team.coach?.aggression !== undefined) {
    profile.coach = { aggression: team.coach.aggression };
  }
  if (team.scheme !== undefined) {
    profile.scheme = { ...team.scheme };
  }
  if (team.gameplan !== undefined) {
    profile.gameplan = team.gameplan;
  }
  return profile;
}

export function toEngineInput(input: FridaySimInput): PbpGameInput {
  return {
    seed: input.seed,
    home: toEngineTeam(input.home),
    away: toEngineTeam(input.away),
    features: { ...input.features },
  };
}

/**
 * Run a seeded play-by-play Friday. Throws for the canonical teaching week.
 * Does not take the field or write WeekState.
 */
export function simulateNonCanonicalFriday(
  state: WeekState,
  scenario: WeekScenario,
): FridayPlayByPlayResult {
  if (!usesPlayByPlayFriday(scenario)) {
    throw new CanonicalWeekMatchDayError();
  }
  const input = deriveFridaySimInput(state, scenario);
  const log = simulateGameLog(toEngineInput(input));
  const playCount = log.drives.reduce(
    (count, drive) => count + drive.plays.length,
    0,
  );
  return {
    weekNumber: scenario.weekNumber,
    seed: log.seed,
    homeTeamId: log.homeTeamId,
    awayTeamId: log.awayTeamId,
    homeScore: log.homeScore,
    awayScore: log.awayScore,
    driveCount: log.drives.length,
    playCount,
    injuriesModelled: log.injuries !== undefined,
  };
}

/**
 * Friday view for the Match Day screen and Saturday review.
 *
 * Week 8 stays on `deriveMatch`. Later weeks keep the same pregame, then jump
 * to a final from `simulateNonCanonicalFriday` — no scripted queue, no
 * take-the-field write from this module.
 */
export function deriveFridayView(
  state: WeekState,
  scenario: WeekScenario,
): MatchView {
  if (!usesPlayByPlayFriday(scenario) || !state.matchStarted) {
    return deriveMatch(state, scenario);
  }
  const result = simulateNonCanonicalFriday(state, scenario);
  const summary = `${result.driveCount} drives · ${result.playCount} plays`;
  return {
    phase: 'final',
    qt: 'Air It Out',
    plays: [
      {
        q: 'FINAL',
        c: '0:00',
        t: `${summary}. Injuries off. Process still grades the week, not the scoreboard.`,
        k: 'end',
        key: false,
        tag: 'Play-by-play Friday',
        tagC: '#D6D6D6',
      },
    ],
    log: [
      {
        kind: 'note',
        when: 'Final',
        title: 'Final',
        note: summary,
        key: false,
      },
    ],
    wScore: result.homeScore,
    cScore: result.awayScore,
    mom: 50,
    ball: 50,
    fd: 50,
    drv: 50,
    quarter: 'FINAL',
    clock: '0:00',
    dd: summary,
    pending: null,
    keyCount: 0,
    decisionCount: 0,
  };
}
