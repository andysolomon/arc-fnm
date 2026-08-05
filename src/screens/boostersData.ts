export type FundingRequestSeedState = 'approved' | 'pending';

export interface FundingRequest {
  readonly id: 'weight-room' | 'charter-bus' | 'end-zone-camera' | 'team-meals';
  readonly name: string;
  readonly description: string;
  readonly amount: string;
  readonly seedState: FundingRequestSeedState;
}

export type FundingRequestOutcome = 'approved' | 'deferred';

export interface KeyBooster {
  readonly name: string;
  readonly business: string;
  readonly note: string;
  readonly sentiment: 'good' | 'risk';
}

export interface BoosterEvent {
  readonly date: string;
  readonly description: string;
}

export const FUNDING_REQUESTS = [
  {
    id: 'weight-room',
    name: 'Weight room racks & platforms',
    description: 'Board vote passed 12–3 · install on bye week',
    amount: '$8,500',
    seedState: 'approved',
  },
  {
    id: 'charter-bus',
    name: 'Charter bus — playoff travel',
    description: 'Regional rounds are 200+ miles out',
    amount: '$2,400',
    seedState: 'pending',
  },
  {
    id: 'end-zone-camera',
    name: 'End-zone camera',
    description: 'Film room request from Coach Soto',
    amount: '$1,800',
    seedState: 'pending',
  },
  {
    id: 'team-meals',
    name: 'Friday team meals',
    description: 'Pre-game · Delgado Motors sponsors half',
    amount: '$600',
    seedState: 'approved',
  },
] as const satisfies readonly FundingRequest[];

export const KEY_BOOSTERS = [
  {
    name: 'Frank Delgado',
    business: 'Delgado Motors',
    note: 'Wants the halftime check moment Friday — say yes',
    sentiment: 'good',
  },
  {
    name: 'Patty Nguyen',
    business: 'Nguyen Realty',
    note: 'Underwrites film software · renews in Dec',
    sentiment: 'good',
  },
  {
    name: 'Earl Hodges',
    business: 'Hodges Feed & Supply',
    note: 'Still sore the Wing-T got shelved',
    sentiment: 'risk',
  },
] as const satisfies readonly KeyBooster[];

export const BOOSTER_EVENTS = [
  {
    date: 'FRI',
    description: 'Halftime check presentation — weight room',
  },
  {
    date: 'OCT 24',
    description: 'Booster BBQ at Delgado Motors',
  },
] as const satisfies readonly BoosterEvent[];
