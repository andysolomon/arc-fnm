import type { PolicyId, PolicyValue, TacticsTab } from '../domain/types.ts';

export type { TacticsTab };
export type DepthPhase = 'Offense' | 'Defense' | 'Special Teams';

export interface PolicyOption {
  readonly value: PolicyValue;
  readonly label: string;
  readonly cost: string;
}

export interface SituationalPolicy {
  readonly id: PolicyId;
  readonly title: string;
  readonly when: string;
  readonly owner: string;
  readonly defaultValue: PolicyValue;
  readonly defaultLabel: string;
  readonly options: readonly PolicyOption[];
}

export const SITUATIONAL_POLICIES: readonly SituationalPolicy[] = [
  {
    id: 'fourth',
    title: 'Fourth down',
    when: 'Between midfield and their 30',
    owner: 'D. Pruitt',
    defaultValue: 'Chart',
    defaultLabel: 'follow the chart',
    options: [
      {
        value: 'Chart',
        label: 'Follow the chart',
        cost: 'You will go for it three or four times Friday. The chart does not know we are protecting with a sophomore right tackle.',
      },
      {
        value: 'Short',
        label: 'Go only on fourth and two or less',
        cost: 'Safer, and it keeps Whitfield’s leg in play. You will punt at least once from their 34 and hear about it.',
      },
      {
        value: 'Kick',
        label: 'Take the points, punt the rest',
        cost: 'Predictable. Against a 7–0 team, field goals may not be enough to stay with them.',
      },
    ],
  },
  {
    id: 'pat',
    title: 'After a touchdown',
    when: 'Every conversion',
    owner: 'D. Pruitt',
    defaultValue: 'Kick',
    defaultLabel: 'kick until the fourth',
    options: [
      {
        value: 'Kick',
        label: 'Kick until the fourth quarter',
        cost: 'Ramsey is 21 of 22. You give up any chance to lead by an odd number before the fourth.',
      },
      {
        value: 'Chart',
        label: 'Follow the two-point chart all night',
        cost: 'Two-point tries run out of the short-yardage package — the same package Kowalski blocked in.',
      },
      {
        value: 'Feel',
        label: 'Call it in the moment',
        cost: 'Flexible, but the staff cannot pre-plan it, so the huddle waits on you every time.',
      },
    ],
  },
  {
    id: 'clock',
    title: 'Clock and timeouts',
    when: 'First three quarters',
    owner: 'You',
    defaultValue: 'Bank',
    defaultLabel: 'bank all three',
    options: [
      {
        value: 'Bank',
        label: 'Save all three for offense',
        cost: 'If Central catches us in a bad front, we play the down. Nothing gets fixed before the snap.',
      },
      {
        value: 'Fix',
        label: 'Spend one on defense if the look is wrong',
        cost: 'Buys Tillman one reset. You may reach the last two minutes with two instead of three.',
      },
      {
        value: 'Coord',
        label: 'Each coordinator may call one',
        cost: 'Fastest response, least control. Both can be gone before halftime.',
      },
    ],
  },
  {
    id: 'auto',
    title: 'The one adjustment your staff may make without asking',
    when: 'Any series',
    owner: 'B. Tillman',
    defaultValue: 'Ask',
    defaultLabel: 'everything through you',
    options: [
      {
        value: 'Front',
        label: 'Tillman may change the front on his own',
        cost: 'If power is hurting us he fixes it next series instead of next quarter. You lose the chance to weigh it against the pass.',
      },
      {
        value: 'Tempo',
        label: 'Pruitt may go up-tempo on his own',
        cost: 'Good while we are moving. It also shortens rest for a defense chasing sprint-outs.',
      },
      {
        value: 'Ask',
        label: 'Everything comes through me',
        cost: 'Nothing changes without you — including the things you miss while managing the clock.',
      },
    ],
  },
];

export interface DepthPlayer {
  readonly position: string;
  readonly name: string;
  readonly overall: number;
  readonly unavailable?: string;
}

export interface DepthUnit {
  readonly subtitle: string;
  readonly starters: readonly DepthPlayer[];
  readonly bench: readonly DepthPlayer[];
  readonly schemes: readonly {
    name: string;
    description: string;
  }[];
}

export const DEPTH_UNITS: Readonly<Record<DepthPhase, DepthUnit>> = {
  Offense: {
    subtitle: 'Offense · Spread — 11 personnel',
    starters: [
      { position: 'WR', name: 'T. Alvarez', overall: 77 },
      { position: 'WR', name: 'A. Silva', overall: 73 },
      { position: 'LT', name: 'M. Sosa', overall: 82 },
      { position: 'LG', name: 'W. Turner', overall: 75 },
      { position: 'C', name: 'C. Nguyen', overall: 78 },
      { position: 'RG', name: 'J. Mendes', overall: 70 },
      {
        position: 'RT',
        name: 'R. Kowalski',
        overall: 71,
        unavailable: 'Ineligible Friday',
      },
      { position: 'TE', name: 'I. Brooks', overall: 78 },
      { position: 'WR', name: 'J. Whitfield', overall: 80 },
      { position: 'QB', name: 'M. Reed', overall: 84 },
      { position: 'RB', name: 'D. Carter', overall: 86 },
    ],
    bench: [
      { position: 'QB', name: 'Colt Ramsey', overall: 69 },
      { position: 'RB', name: 'Cody Dunn', overall: 68 },
      { position: 'WR', name: 'Malik Price', overall: 66 },
      {
        position: 'FB',
        name: 'Hunter McCoy',
        overall: 74,
        unavailable: 'No contact',
      },
      { position: 'TE', name: 'Drew Foster', overall: 63 },
      { position: 'OT', name: 'Levi Webb', overall: 62 },
      { position: 'OG', name: 'Pete Ruiz', overall: 61 },
    ],
    schemes: [
      {
        name: 'Spread',
        description:
          '4-wide sets that space the field. Suits Reed’s accuracy and gives Carter light boxes.',
      },
      {
        name: 'Wing-T',
        description:
          'Misdirection ground game. Protects a thin offensive line and shortens the game.',
      },
      {
        name: 'Air Raid',
        description:
          'Pass-first, up-tempo. High ceiling — high risk with a sophomore right tackle.',
      },
    ],
  },
  Defense: {
    subtitle: 'Defense · 4-2-5 — nickel base',
    starters: [
      { position: 'DE', name: 'J. Ricks', overall: 74 },
      { position: 'DT', name: 'G. Boyd', overall: 70 },
      { position: 'DT', name: 'L. Ellison', overall: 68 },
      { position: 'DE', name: 'B. Hartley', overall: 72 },
      { position: 'MLB', name: 'S. Okafor', overall: 87 },
      { position: 'WLB', name: 'C. Dean', overall: 71 },
      { position: 'NB', name: 'D. Ford', overall: 66 },
      { position: 'CB', name: 'T. Jackson', overall: 83 },
      { position: 'CB', name: 'R. Vann', overall: 69 },
      { position: 'S', name: 'D. Pierce', overall: 72 },
      { position: 'S', name: 'K. Ortiz', overall: 70 },
    ],
    bench: [
      { position: 'LB', name: 'Tre Coker', overall: 64 },
      { position: 'DB', name: 'Joel Cruz', overall: 63 },
      { position: 'DL', name: 'Hank Bates', overall: 62 },
      { position: 'LB', name: 'Nico Reyes', overall: 61 },
      { position: 'DE', name: 'Sonny Pham', overall: 60 },
      { position: 'S', name: 'Marcus Ott', overall: 59 },
    ],
    schemes: [
      {
        name: '4-2-5',
        description:
          'Nickel base built on speed. Matches spread teams; Okafor runs sideline to sideline.',
      },
      {
        name: '3-4 Stack',
        description:
          'Two-gaps the front to keep Okafor and Dean clean. Needs a true nose tackle.',
      },
      {
        name: '46 Bear',
        description:
          'Crowds the box against power run teams. Built for Central’s pulling guards.',
      },
    ],
  },
  'Special Teams': {
    subtitle: 'Special Teams · Safe Hands',
    starters: [
      { position: 'K', name: 'Colt Ramsey', overall: 69 },
      { position: 'KR', name: 'Trey Jackson', overall: 83 },
      { position: 'P', name: 'Jake Whitfield', overall: 72 },
      { position: 'LS', name: 'C. Nguyen', overall: 78 },
    ],
    bench: [],
    schemes: [
      {
        name: 'Safe Hands',
        description:
          'Fair-catch heavy, no return risks. Protects a lead in the fourth quarter.',
      },
      {
        name: 'Aggressive Returns',
        description:
          'Jackson takes everything out of the end zone. Field position swings; fumble risk up.',
      },
      {
        name: 'Block Hunt',
        description:
          'Overload the edge on punt rush. High reward — roughing-the-kicker risk.',
      },
    ],
  },
};
