import type { DisruptionGate, RtFix, RtStarterId, WeekState } from './types.ts';

export const KOWALSKI_AUTHORITY = {
  name: 'Ryan Kowalski',
  position: 'RT',
  gpa: '1.9',
  course: 'Algebra II',
  status: 'Ineligible',
  authority: 'Guidance Office',
  checkpoint: 'Oct 26',
  alert:
    "Coach — Ryan Kowalski's grade in Algebra II dropped to a 58 this week, putting his GPA at 1.9. Per district policy he is ineligible for Friday's game against Central Catholic, effective immediately.",
} as const;

export const MCCOY_AUTHORITY = {
  name: 'Hunter McCoy',
  position: 'FB',
  status: 'No contact',
  authority: 'Athletic Trainer',
  detail: 'Bruised ribs. Conditioning only through Friday.',
  checkpoint: 'Re-evaluate Monday',
} as const;

export const RT_STARTERS = [
  {
    id: 'webb',
    name: 'Levi Webb',
    position: 'OT',
    overall: 62,
    cost: 'The only true tackle on the bench. He has never started, but the rest of the line does not move.',
  },
  {
    id: 'ruiz',
    name: 'Pete Ruiz',
    position: 'OG',
    overall: 61,
    cost: 'A guard out in space. He can anchor, but he has never had to run with a wide rusher.',
  },
  {
    id: 'slide',
    name: 'Slide the line',
    position: 'RG→RT',
    overall: 70,
    cost: 'Mendes kicks out to tackle and Ruiz takes right guard. Your best available body is at tackle, and the new man is inside where there is help.',
  },
] as const satisfies readonly {
  id: RtStarterId;
  name: string;
  position: string;
  overall: number;
  cost: string;
}[];

export const RT_FIXES = [
  {
    id: 'promote',
    name: 'Promote and rep the backup',
    gist: 'Keep the five-step package and buy the new tackle two Thursday catch-up periods.',
    cost: 'Thursday is walk-through only. The reps are real but light, and they come out of the polish you had planned.',
    effect: 'Protection reps count again',
  },
  {
    id: 'simplify',
    name: 'Simplify the package',
    gist: 'Cut the five-step flood to its three-step version so the tackle only holds two seconds.',
    cost: 'The intermediate window you found on film comes off the call sheet. You keep the concept, not its best throw.',
    effect: 'Target drops to 8 reps',
  },
  {
    id: 'switch',
    name: 'Switch to the quick-game answer',
    gist: 'Replace the flood with an answer that never asks the tackle to hold a long drop.',
    cost: 'Every rep already spent on the flood was spent on a call you are no longer making.',
    effect: 'Reps do not transfer',
  },
  {
    id: 'accept',
    name: 'Accept lower readiness',
    gist: 'Run it as written with an untested tackle and let Friday tell you.',
    cost: 'Nothing changes on the practice script. The protection stays thin and it joins the accepted-risk list.',
    effect: 'Capped at Introduced',
  },
] as const satisfies readonly {
  id: RtFix;
  name: string;
  gist: string;
  cost: string;
  effect: string;
}[];

export function rtStarterName(id: RtStarterId | null): string | null {
  if (id === 'slide') return 'J. Mendes';
  return RT_STARTERS.find((starter) => starter.id === id)?.name ?? null;
}

export function deriveDisruptionGate(state: WeekState): DisruptionGate {
  const active =
    state.practicePlanLocked &&
    (state.stage === 'disruption' ||
      state.stage === 'friday' ||
      state.stage === 'review');
  const starterName = active ? rtStarterName(state.rtStarter) : null;
  const rtLegal = starterName !== null;
  const response = active ? state.rtFix : null;
  const rtResolved = rtLegal && response !== null;
  const unresolved = (rtLegal ? 0 : 1) + (response === null ? 1 : 0);
  const confirmed = rtResolved && state.disruptionConfirmed;
  return {
    rtLegal,
    rtResolved,
    starterName,
    response,
    unresolved,
    confirmed,
    ready: rtResolved,
    title: confirmed
      ? 'Thursday disruption resolved'
      : rtResolved
        ? 'Friday personnel is legal'
        : rtLegal
          ? 'Decide what happens to the protection package'
          : 'Right tackle is open for Friday',
    body: confirmed
      ? `${starterName} is set at right tackle and the package response is recorded. The week has moved to Friday — the Decision Room is open.`
      : rtResolved
        ? `${starterName} has right tackle and the package decision is made. Confirm the Thursday resolution to move the week to Friday.`
        : rtLegal
          ? `${starterName} is in the slot. The five-step package built for Kowalski still needs one explicit response.`
          : 'Kowalski is out. Before Friday, assign an eligible right tackle and decide what happens to the package built around him.',
    status: confirmed
      ? 'Resolved · Friday open'
      : rtResolved
        ? '2 of 2 resolved'
        : `${2 - unresolved} of 2 resolved`,
  };
}
