import { deriveFridayView } from '../domain/playByPlayFriday.ts';
import { FOLLOWING_WEEK_NUMBER } from '../domain/followingWeek.ts';
import type { Week8FinalSnapshot } from '../domain/followingWeek.ts';
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
  readonly canOpenWeek9: boolean;
  readonly onWeek9: boolean;
}

export interface CareerScheduleContext {
  readonly weekNumber: number;
  readonly week8Final: Week8FinalSnapshot | null;
}

export function scheduleView(
  state: WeekState,
  scenario: WeekScenario,
  career: CareerScheduleContext = {
    weekNumber: scenario.weekNumber,
    week8Final: null,
  },
): ScheduleView {
  const onWeek9 = career.weekNumber === FOLLOWING_WEEK_NUMBER;
  const match = deriveFridayView(state, scenario);
  const week8Final = onWeek9
    ? career.week8Final
    : match.phase === 'final'
      ? {
          wScore: match.wScore,
          cScore: match.cScore,
          lessons: state.lessons,
        }
      : career.week8Final;
  const week8Done = week8Final !== null;
  const week8Won = week8Done ? week8Final.wScore > week8Final.cScore : null;
  const week9Final = onWeek9 && match.phase === 'final';
  const week9Won = week9Final ? match.wScore > match.cScore : null;

  const games = SEASON_GAMES.map((game) => {
    if (game.week === 8 && week8Done) {
      return {
        ...game,
        result: `${week8Won ? 'W' : 'L'} ${week8Final.wScore}–${week8Final.cScore}`,
        kind: week8Won ? ('win' as const) : ('loss' as const),
      };
    }
    if (game.week === 9 && week9Final) {
      return {
        ...game,
        result: `${week9Won ? 'W' : 'L'} ${match.wScore}–${match.cScore}`,
        kind: week9Won ? ('win' as const) : ('loss' as const),
      };
    }
    if (game.week === 9 && week8Done) return { ...game, kind: 'current' as const };
    return game;
  });
  const standings = week8Done
    ? [
        ...(week8Won
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

  const heroOnWeek9 = onWeek9;
  const week9HeroFinal = heroOnWeek9 && week9Final;

  return {
    games,
    standings,
    record: week8Done
      ? week8Won
        ? '7-1 overall · 5-0 district · #1 in District 7-5A'
        : '6-2 overall · 4-1 district · #2 in District 7-5A'
      : '6-1 overall · 4-0 district · #2 in District 7-5A',
    currentWeek: week8Done ? 9 : 8,
    heroTitle: heroOnWeek9
      ? week9HeroFinal
        ? `Week 9 — ${scenario.program.school} ${match.wScore}, Riverside ${match.cScore}`
        : 'Week 9 — at Riverside'
      : week8Done
        ? `Week 8 — ${scenario.program.school} ${week8Final.wScore}, Central Catholic ${week8Final.cScore}`
        : 'Week 8 — vs Central Catholic',
    heroSubtitle: heroOnWeek9
      ? week9HeroFinal
        ? `Final · Fri Oct 23 · Riverside Stadium`
        : 'Fri Oct 23 · 7:30 PM · Riverside Stadium · district road game'
      : week8Done
        ? `Final · Fri Oct 16 · Wildcat Stadium · ${week8Won ? 'head-to-head tiebreak in hand' : 'Central holds the tiebreak'}`
        : 'Fri Oct 16 · 7:30 PM · Wildcat Stadium · winner controls the district',
    heroStatus: (heroOnWeek9 ? week9HeroFinal : week8Done)
      ? 'Final'
      : 'Next game',
    heroWon: heroOnWeek9 ? week9Won : week8Won,
    heroAction: (heroOnWeek9 ? week9HeroFinal : week8Done)
      ? 'Decision Review →'
      : 'Game Plan →',
    canOpenWeek9: !onWeek9 && state.reviewClosed,
    onWeek9,
  };
}
