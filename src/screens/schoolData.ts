export interface Facility {
  readonly name: string;
  readonly detail: string;
  readonly condition: 'Good' | 'Upgrading' | 'Fair';
}

export interface StaffMember {
  readonly role: string;
  readonly name: string;
  readonly note: string;
  readonly ability: 'Very Good' | 'Good';
}

export interface Administrator {
  readonly name: string;
  readonly role: string;
  readonly influence: number;
}

export interface ProgramHistoryFact {
  readonly label: string;
  readonly value: string;
  readonly tone: 'risk' | 'good' | 'neutral';
}

export const FACILITIES = [
  {
    name: 'Wildcat Stadium',
    detail: 'Capacity 8,200 · turf replaced 2021',
    condition: 'Good',
  },
  {
    name: 'Weight Room',
    detail: 'Racks funded by boosters — install on bye week',
    condition: 'Upgrading',
  },
  {
    name: 'Film Room',
    detail: 'Two stations · software license expires Dec',
    condition: 'Good',
  },
  {
    name: 'Practice Fields',
    detail: 'East field drainage poor after rain',
    condition: 'Fair',
  },
] as const satisfies readonly Facility[];

export const STAFF = [
  {
    role: 'OC',
    name: 'D. Pruitt',
    note: 'Spread disciple · calls it from the box',
    ability: 'Very Good',
  },
  {
    role: 'DC',
    name: 'B. Tillman',
    note: '25 years · Cover 3 core · scouts JV Thu',
    ability: 'Good',
  },
  {
    role: 'ST',
    name: 'K. Ames',
    note: 'Also coaches track · gone in spring',
    ability: 'Good',
  },
  {
    role: 'ATC',
    name: 'D. Ferris',
    note: 'Trainer · conservative with return timelines',
    ability: 'Good',
  },
  {
    role: 'GA',
    name: 'M. Soto',
    note: 'Film & analytics · wants the end-zone camera',
    ability: 'Very Good',
  },
] as const satisfies readonly StaffMember[];

export const ADMINISTRATION = [
  { name: 'Dr. E. Vaughn', role: 'Principal', influence: 74 },
  { name: 'R. Castillo', role: 'Athletic Director', influence: 81 },
] as const satisfies readonly Administrator[];

export const PROGRAM_HISTORY = [
  { label: 'State titles', value: '1987 · 2004', tone: 'risk' },
  { label: 'District titles', value: '9 · last 2023', tone: 'good' },
  { label: 'All-time record', value: '612–388–14', tone: 'neutral' },
  { label: 'Playoff appearances', value: '31', tone: 'neutral' },
] as const satisfies readonly ProgramHistoryFact[];
