export interface RosterPlayer {
  readonly name: string;
  readonly number: number;
  readonly grade: string;
  readonly position: string;
  readonly overall: number;
  readonly gpa: number;
}

/** Canonical UI-3 P seed; fictional Week 8 prototype data only. */
export const WEEK_8_ROSTER: readonly RosterPlayer[] = [
  {
    name: 'Marcus Reed',
    number: 7,
    grade: 'JR',
    position: 'QB',
    overall: 84,
    gpa: 3.4,
  },
  {
    name: 'DeShawn Carter',
    number: 22,
    grade: 'SR',
    position: 'RB',
    overall: 86,
    gpa: 2.9,
  },
  {
    name: 'Trey Jackson',
    number: 4,
    grade: 'JR',
    position: 'CB',
    overall: 83,
    gpa: 3.0,
  },
  {
    name: 'Sam Okafor',
    number: 55,
    grade: 'SR',
    position: 'MLB',
    overall: 87,
    gpa: 3.5,
  },
  {
    name: 'Mike Sosa',
    number: 72,
    grade: 'SR',
    position: 'LT',
    overall: 82,
    gpa: 2.4,
  },
  {
    name: 'Jake Whitfield',
    number: 84,
    grade: 'SR',
    position: 'WR',
    overall: 80,
    gpa: 3.1,
  },
  {
    name: 'Caleb Nguyen',
    number: 66,
    grade: 'JR',
    position: 'C',
    overall: 78,
    gpa: 3.8,
  },
  {
    name: 'Isaiah Brooks',
    number: 88,
    grade: 'JR',
    position: 'TE',
    overall: 78,
    gpa: 2.7,
  },
  {
    name: 'Tommy Alvarez',
    number: 11,
    grade: 'SO',
    position: 'WR',
    overall: 77,
    gpa: 3.7,
  },
  {
    name: 'Wyatt Turner',
    number: 63,
    grade: 'JR',
    position: 'LG',
    overall: 75,
    gpa: 2.2,
  },
  {
    name: 'Hunter McCoy',
    number: 33,
    grade: 'SR',
    position: 'FB',
    overall: 74,
    gpa: 2.6,
  },
  {
    name: 'Andre Silva',
    number: 2,
    grade: 'SO',
    position: 'WR',
    overall: 73,
    gpa: 3.3,
  },
  {
    name: 'Dylan Pierce',
    number: 21,
    grade: 'FR',
    position: 'S',
    overall: 72,
    gpa: 3.9,
  },
  {
    name: 'Ryan Kowalski',
    number: 75,
    grade: 'SO',
    position: 'RT',
    overall: 71,
    gpa: 1.9,
  },
  {
    name: 'Colt Ramsey',
    number: 18,
    grade: 'SO',
    position: 'QB',
    overall: 69,
    gpa: 3.2,
  },
];
