import { deriveMatch } from '../domain/matchDay.ts';
import type { WeekScenario, WeekState } from '../domain/types.ts';

export type ScheduleResultKind = 'win' | 'loss' | 'current' | 'future';

export interface ScheduleGame {
  readonly week: number;
  readonly date: string;
  readonly opponent: string;
  readonly district: boolean;
  readonly site: 'Home' | 'Away';
  readonly result: string;
  readonly kind: ScheduleResultKind;
}

export interface Standing {
  readonly rank: number;
  readonly team: string;
  readonly overall: string;
  readonly district: string;
}

export const SEASON_GAMES: readonly ScheduleGame[] = [
  {
    week: 1,
    date: 'Aug 28',
    opponent: 'Permian Ridge',
    district: false,
    site: 'Home',
    result: 'W 24–13',
    kind: 'win',
  },
  {
    week: 2,
    date: 'Sep 4',
    opponent: 'Odessa Hills',
    district: false,
    site: 'Away',
    result: 'L 20–27',
    kind: 'loss',
  },
  {
    week: 3,
    date: 'Sep 11',
    opponent: 'San Angelo Prep',
    district: false,
    site: 'Home',
    result: 'W 17–14',
    kind: 'win',
  },
  {
    week: 4,
    date: 'Sep 18',
    opponent: 'Lakeview',
    district: true,
    site: 'Away',
    result: 'W 41–7',
    kind: 'win',
  },
  {
    week: 5,
    date: 'Sep 25',
    opponent: 'North Gate',
    district: true,
    site: 'Home',
    result: 'W 28–10',
    kind: 'win',
  },
  {
    week: 6,
    date: 'Oct 2',
    opponent: 'East Ridge',
    district: true,
    site: 'Away',
    result: 'W 35–14',
    kind: 'win',
  },
  {
    week: 7,
    date: 'Oct 9',
    opponent: 'Jefferson',
    district: true,
    site: 'Home',
    result: 'W 31–10',
    kind: 'win',
  },
  {
    week: 8,
    date: 'Oct 16',
    opponent: 'Central Catholic',
    district: true,
    site: 'Home',
    result: '7:30 PM',
    kind: 'current',
  },
  {
    week: 9,
    date: 'Oct 23',
    opponent: 'Riverside',
    district: true,
    site: 'Away',
    result: '7:30 PM',
    kind: 'future',
  },
  {
    week: 10,
    date: 'Oct 30',
    opponent: 'Millbrook',
    district: true,
    site: 'Home',
    result: '7:30 PM',
    kind: 'future',
  },
] as const;

export const DISTRICT_STANDINGS: readonly Standing[] = [
  { rank: 1, team: 'Central Catholic', overall: '7-0', district: '4-0' },
  { rank: 2, team: 'Westfield', overall: '6-1', district: '4-0' },
  { rank: 3, team: 'Riverside', overall: '5-2', district: '3-1' },
  { rank: 4, team: 'East Ridge', overall: '4-3', district: '2-2' },
  { rank: 5, team: 'Jefferson', overall: '3-4', district: '2-2' },
  { rank: 6, team: 'North Gate', overall: '3-4', district: '1-3' },
  { rank: 7, team: 'Lakeview', overall: '2-5', district: '1-3' },
  { rank: 8, team: 'Millbrook', overall: '1-6', district: '0-4' },
] as const;

export interface ScheduleView {
  readonly games: readonly ScheduleGame[];
  readonly standings: readonly Standing[];
  readonly record: string;
  readonly currentWeek: 8 | 9;
  readonly heroTitle: string;
  readonly heroSubtitle: string;
  readonly heroStatus: 'Next game' | 'Final';
  readonly heroWon: boolean | null;
  readonly heroAction: 'Game Plan →' | 'Decision Review →';
}

export function scheduleView(
  state: WeekState,
  scenario: WeekScenario,
): ScheduleView {
  const match = deriveMatch(state, scenario);
  const final = match.phase === 'final';
  const won = final ? match.wScore > match.cScore : null;
  const games = SEASON_GAMES.map((game) => {
    if (game.week === 8 && final) {
      return {
        ...game,
        result: `${won ? 'W' : 'L'} ${match.wScore}–${match.cScore}`,
        kind: won ? ('win' as const) : ('loss' as const),
      };
    }
    if (game.week === 9 && final) return { ...game, kind: 'current' as const };
    return game;
  });
  const standings = final
    ? [
        ...(won
          ? [
              { rank: 1, team: 'Westfield', overall: '7-1', district: '5-0' },
              {
                rank: 2,
                team: 'Central Catholic',
                overall: '7-1',
                district: '4-1',
              },
            ]
          : [
              {
                rank: 1,
                team: 'Central Catholic',
                overall: '8-0',
                district: '5-0',
              },
              { rank: 2, team: 'Westfield', overall: '6-2', district: '4-1' },
            ]),
        ...DISTRICT_STANDINGS.slice(2),
      ]
    : DISTRICT_STANDINGS;

  return {
    games,
    standings,
    record: final
      ? won
        ? '7-1 overall · 5-0 district · #1 in District 7-5A'
        : '6-2 overall · 4-1 district · #2 in District 7-5A'
      : '6-1 overall · 4-0 district · #2 in District 7-5A',
    currentWeek: final ? 9 : 8,
    heroTitle: final
      ? `Week 8 — ${scenario.program.school} ${match.wScore}, Central Catholic ${match.cScore}`
      : 'Week 8 — vs Central Catholic',
    heroSubtitle: final
      ? `Final · Fri Oct 16 · Wildcat Stadium · ${won ? 'head-to-head tiebreak in hand' : 'Central holds the tiebreak'}`
      : 'Fri Oct 16 · 7:30 PM · Wildcat Stadium · winner controls the district',
    heroStatus: final ? 'Final' : 'Next game',
    heroWon: won,
    heroAction: final ? 'Decision Review →' : 'Game Plan →',
  };
}
