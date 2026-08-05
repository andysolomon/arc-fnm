import type {
  DevelopmentAssignment,
  PackageDepthAssignment,
  PackageMastery,
  PlayerAvailability,
  PracticePersonnelAssignment,
  PracticeObjectiveId,
  ProtectionPackageId,
  ProtectionPlayer,
  ProtectionPlayerId,
  ReadinessLabel,
  RosterPlanningInput,
  RtStarterId,
} from './types.ts';

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

export const FIVE_STEP_TRIPS_FLOOD: ProtectionPackageId =
  'package-five-step-trips-flood';

/** Narrow deterministic inputs for the existing Webb/RT protection path only. */
export const WEEK_8_RT_PROTECTION: RosterPlanningInput = {
  players: [
    {
      id: 'player-kowalski',
      name: 'Ryan Kowalski',
      shortName: 'R. Kowalski',
      position: 'RT',
    },
    {
      id: 'player-mccoy',
      name: 'Hunter McCoy',
      shortName: 'H. McCoy',
      position: 'FB',
    },
    {
      id: 'player-webb',
      name: 'Levi Webb',
      shortName: 'L. Webb',
      position: 'OT',
    },
    {
      id: 'player-ruiz',
      name: 'Pete Ruiz',
      shortName: 'P. Ruiz',
      position: 'OG',
    },
    {
      id: 'player-mendes',
      name: 'J. Mendes',
      shortName: 'J. Mendes',
      position: 'RG→RT',
    },
  ],
  availability: [
    {
      playerId: 'player-kowalski',
      participation: 'ineligible',
      label: 'Ineligible Friday',
      authority: 'Guidance Office',
      detail:
        'GPA 1.9. Out for Friday. The next eligibility checkpoint is Oct 26 — nothing you do this week changes that.',
      checkpoint: 'Oct 26',
    },
    {
      playerId: 'player-mccoy',
      participation: 'no-contact',
      label: 'No contact',
      authority: 'Athletic Trainer',
      detail:
        'Bruised ribs. Conditioning only through Friday. The trainer re-evaluates him Monday.',
      checkpoint: 'Re-evaluate Monday',
    },
    ...(['player-webb', 'player-ruiz', 'player-mendes'] as const).map(
      (playerId) => ({
        playerId,
        participation: 'available' as const,
        label: 'Active',
        authority: 'Coaching Staff' as const,
        detail: 'Available for practice and Friday package assignment.',
        checkpoint: 'Friday',
      }),
    ),
  ],
  packageDepth: [
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-kowalski',
      role: 'RT',
      order: 1,
      starterOption: null,
      objectiveIds: ['o3', 'o5'],
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-webb',
      role: 'RT',
      order: 2,
      starterOption: 'webb',
      objectiveIds: ['o5'],
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-ruiz',
      role: 'RT',
      order: 3,
      starterOption: 'ruiz',
      objectiveIds: ['o5'],
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-mendes',
      role: 'RT',
      order: 4,
      starterOption: 'slide',
      objectiveIds: [],
    },
  ],
  packageMastery: [
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-kowalski',
      readiness: 'Rehearsed',
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-webb',
      readiness: 'Rehearsed',
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-ruiz',
      readiness: 'Rehearsed',
    },
    {
      packageId: FIVE_STEP_TRIPS_FLOOD,
      playerId: 'player-mendes',
      readiness: 'Rehearsed',
    },
  ],
  developmentAssignments: [
    {
      id: 'development-webb-five-step-protection',
      playerId: 'player-webb',
      packageId: FIVE_STEP_TRIPS_FLOOD,
      objectiveId: 'o5',
      focus: 'Right tackle protection with a backup',
      detail:
        'THU · two catch-up periods · walk-through with Levi Webb at right tackle.',
    },
  ],
  practicePersonnelAssignments: [
    {
      id: 'practice-personnel-o1-scout-counter',
      objectiveId: 'o1',
      playerId: 'player-mccoy',
      requiredParticipation: 'contact-required',
      fallback: {
        name: 'C. Dunn',
        position: 'FB',
        repPenalty: 2,
        detail:
          'McCoy cannot take contact. Dunn runs the scout counter and the look is a step slow.',
      },
    },
  ],
};

export interface ResolvedPracticePersonnel {
  readonly assignment: PracticePersonnelAssignment;
  readonly player: ProtectionPlayer;
  readonly availability: PlayerAvailability;
  readonly fallback: PracticePersonnelAssignment['fallback'] | null;
}

export interface ResolvedPackageDepth extends PackageDepthAssignment {
  readonly player: ProtectionPlayer;
  readonly availability: PlayerAvailability;
  readonly mastery: PackageMastery | null;
  readonly eligible: boolean;
}

export function playerAvailability(
  input: RosterPlanningInput,
  playerId: ProtectionPlayerId,
): PlayerAvailability | null {
  return (
    input.availability.find((entry) => entry.playerId === playerId) ?? null
  );
}

/** Resolve objective personnel and any availability-driven practice fallback. */
export function resolvePracticePersonnel(
  input: RosterPlanningInput,
  objectiveId: PracticeObjectiveId,
): readonly ResolvedPracticePersonnel[] {
  return input.practicePersonnelAssignments
    .filter((assignment) => assignment.objectiveId === objectiveId)
    .flatMap((assignment) => {
      const player = input.players.find(
        (entry) => entry.id === assignment.playerId,
      );
      const availability = playerAvailability(input, assignment.playerId);
      if (player === undefined || availability === null) return [];
      const needsFallback =
        assignment.requiredParticipation === 'contact-required' &&
        availability.participation !== 'available';
      return [
        {
          assignment,
          player,
          availability,
          fallback: needsFallback ? assignment.fallback : null,
        },
      ];
    });
}

/** Package depth is ordered, typed, and eligibility-filterable without mutation. */
export function packageDepth(
  input: RosterPlanningInput,
  packageId: ProtectionPackageId,
): readonly ResolvedPackageDepth[] {
  return input.packageDepth
    .filter((entry) => entry.packageId === packageId)
    .sort((a, b) => a.order - b.order)
    .flatMap((entry) => {
      const player = input.players.find((item) => item.id === entry.playerId);
      const availability = playerAvailability(input, entry.playerId);
      if (player === undefined || availability === null) return [];
      return [
        {
          ...entry,
          player,
          availability,
          mastery:
            input.packageMastery.find(
              (item) =>
                item.packageId === packageId &&
                item.playerId === entry.playerId,
            ) ?? null,
          eligible: availability.participation === 'available',
        },
      ];
    });
}

export function eligiblePackageDepth(
  input: RosterPlanningInput,
  packageId: ProtectionPackageId,
): readonly ResolvedPackageDepth[] {
  return packageDepth(input, packageId).filter((entry) => entry.eligible);
}

export function playerIdForRtStarter(
  starter: RtStarterId | null,
): ProtectionPlayerId | null {
  if (starter === null) return null;
  const playerByStarter: Readonly<Record<RtStarterId, ProtectionPlayerId>> = {
    webb: 'player-webb',
    ruiz: 'player-ruiz',
    slide: 'player-mendes',
  };
  return playerByStarter[starter];
}

export function packageMastery(
  input: RosterPlanningInput,
  packageId: ProtectionPackageId,
  playerId: ProtectionPlayerId,
): ReadinessLabel {
  return (
    input.packageMastery.find(
      (entry) => entry.packageId === packageId && entry.playerId === playerId,
    )?.readiness ?? 'Unseen'
  );
}

export function developmentAssignments(
  input: RosterPlanningInput,
  objectiveId: PracticeObjectiveId,
  playerId?: ProtectionPlayerId,
): readonly DevelopmentAssignment[] {
  return input.developmentAssignments.filter(
    (entry) =>
      entry.objectiveId === objectiveId &&
      (playerId === undefined || entry.playerId === playerId),
  );
}

export function packageDepthForObjective(
  input: RosterPlanningInput,
  packageId: ProtectionPackageId,
  objectiveId: PracticeObjectiveId,
): readonly ResolvedPackageDepth[] {
  return packageDepth(input, packageId).filter((entry) =>
    entry.objectiveIds.includes(objectiveId),
  );
}
