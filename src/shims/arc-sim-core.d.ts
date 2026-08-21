/**
 * Type-only surface for `@arc-sim/core`.
 *
 * Vite resolves the package to the sibling `arc-sim` source. Typecheck uses
 * this shim so Friday Night Manager's strict flags do not type the engine.
 */
declare module '@arc-sim/core' {
  export interface PlayerSimProfile {
    playerId: string;
    position: string;
    overall: number;
    depthRank?: number;
  }

  export interface TeamSimProfile {
    teamId: string;
    strength: number;
    players: PlayerSimProfile[];
    coach?: { aggression?: number };
    scheme?: { offense?: string; defense?: string };
    gameplan?: string;
  }

  export interface PbpFeatureGates {
    scoringV2?: boolean;
    penalties?: boolean;
    injuries?: boolean;
    weather?: boolean;
    situational?: boolean;
    balance?: boolean;
    schemes?: boolean;
    timeline?: boolean;
    goalLineYards?: boolean;
    goalLineConversion?: boolean;
    returnStats?: boolean;
    puntReturns?: boolean;
    defensivePat?: boolean;
    rushDistribution?: boolean;
    playCalling?: boolean;
    passingGame?: boolean;
  }

  export interface PbpGameInput {
    home: TeamSimProfile;
    away: TeamSimProfile;
    seed: number;
    features?: PbpFeatureGates;
  }

  export interface PbpDrive {
    plays: readonly unknown[];
  }

  export interface PbpGameLog {
    seed: number;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    drives: readonly PbpDrive[];
    injuries?: readonly unknown[];
  }

  export function simulateGameLog(input: PbpGameInput): PbpGameLog;
}
