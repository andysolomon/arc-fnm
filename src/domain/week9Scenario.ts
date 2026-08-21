/**
 * Week 9 — at Riverside. Unique film, hypotheses, and answers.
 * Week 8 Central Catholic Match Day stays in scenario.ts / matchDay.ts.
 */

import { GAME_PLAN_OBJECTIVES } from './gamePlanScenario.ts';
import type {
  FilmClip,
  GamePlanAnswer,
  PracticeDay,
  PracticeObjective,
  ScoutingHypothesis,
  Stage,
} from './types.ts';

export const WEEK_9_STAGES: readonly Stage[] = [
  {
    id: 'evidence',
    day: 'MON',
    title: 'Film & evidence',
    date: 'Oct 19',
    surface: 'Film Room',
  },
  {
    id: 'plan',
    day: 'TUE',
    title: 'Game plan',
    date: 'Oct 20',
    surface: 'Game Plan',
  },
  {
    id: 'practice',
    day: 'WED',
    title: 'Practice plan',
    date: 'Oct 21',
    surface: 'Practice',
  },
  {
    id: 'disruption',
    day: 'THU',
    title: 'Depth & availability',
    date: 'Oct 22',
    surface: 'Depth Chart',
  },
  {
    id: 'friday',
    day: 'FRI',
    title: 'Game night',
    date: 'Oct 23',
    surface: 'Decision Room',
  },
  {
    id: 'review',
    day: 'SAT',
    title: 'Decision review',
    date: 'Oct 24',
    surface: 'Review',
  },
];

export const WEEK_9_PRACTICE_DAYS: readonly PracticeDay[] = [
  {
    id: 'MON',
    date: 'Oct 19',
    pads: 'Helmets',
    duration: '1h 15m',
    capacity: 2,
    contact: false,
    note: 'Install day. Nothing live.',
    fixed: [
      { minutes: 10, name: 'Special teams walk-through' },
      { minutes: 20, name: 'Individual' },
      { minutes: 25, name: 'Install — four new plays' },
      { minutes: 20, name: 'Team walk-through' },
    ],
  },
  {
    id: 'TUE',
    date: 'Oct 20',
    pads: 'Full pads',
    duration: '1h 30m',
    capacity: 3,
    contact: true,
    note: 'The only live-contact window left this week.',
    fixed: [
      { minutes: 20, name: 'Individual' },
      { minutes: 20, name: 'Inside run' },
      { minutes: 15, name: 'Seven-on-seven' },
      { minutes: 25, name: 'Team period — live' },
    ],
  },
  {
    id: 'WED',
    date: 'Oct 21',
    pads: 'Shells',
    duration: '1h 20m',
    capacity: 2,
    contact: false,
    note: 'Shoulder pads, thud tempo. Nobody goes to the ground.',
    fixed: [
      { minutes: 15, name: 'Individual' },
      { minutes: 25, name: 'Situational team' },
      { minutes: 15, name: 'Red zone' },
      { minutes: 10, name: 'Two-minute' },
    ],
  },
  {
    id: 'THU',
    date: 'Oct 22',
    pads: 'Walk-through',
    duration: '55m',
    capacity: 1,
    contact: false,
    note: 'Short day. Legs back under them for Friday.',
    fixed: [
      { minutes: 10, name: 'Individual' },
      { minutes: 20, name: 'Special teams — all four units' },
      { minutes: 20, name: 'Team polish' },
      { minutes: 5, name: 'Curfew review' },
    ],
  },
];

export const WEEK_9_HYPOTHESES: readonly ScoutingHypothesis[] = [
  {
    id: 'h1',
    short: 'Zone-read keep',
    unit: 'Defense',
    statement:
      'From empty or 11 personnel, Bennett keeps when the end crashes the mesh — early-down zone-read, not a designed QB run.',
    snaps: 38,
    games: 3,
    missing: 'No clips against a true spy. Every look is a crashing end or a two-gap five.',
    confidence: 'Strong',
    confidenceWhy:
      '38 early-down meshes across three games. The two contradicting snaps both came after they were already in the red zone.',
  },
  {
    id: 'h2',
    short: 'Jet-sweep staple',
    unit: 'Defense',
    statement:
      'On first down from the hash, Riverside orbits or jets Parish to the boundary before the ball is snapped.',
    snaps: 22,
    games: 3,
    missing: 'Only two clips of it into a loaded boundary. They may kill it if we show numbers.',
    confidence: 'Moderate',
    confidenceWhy:
      '22 qualifying first downs, but six of them came in one Easton game when the box was light.',
  },
  {
    id: 'h3',
    short: 'Cover 2 post window',
    unit: 'Offense',
    statement:
      'Riverside’s early-down Cover 2 man leaves the post / seam between the two safeties.',
    snaps: 29,
    games: 3,
    missing: 'We have not seen them play it against 12 personnel with an attached tight end.',
    confidence: 'Strong',
    confidenceWhy:
      '29 snaps of the same two-high shell. The one contradiction was a check to quarters after motion they may not see from us.',
  },
  {
    id: 'h4',
    short: 'Rugby-punt threat',
    unit: 'Special Teams',
    statement:
      'Hale’s rugby punt and the one fake they ran both start from the same look. Short of the 40, they will run it.',
    snaps: 5,
    games: 3,
    missing: 'Five punts total. Two opponents never punted. The fake is a sample of one.',
    confidence: 'Low sample',
    confidenceWhy:
      'Five punts exist. Three are rugby, one is a fake, none contradict, and that is not enough to call it a rule.',
  },
];

type ClipTuple = readonly [
  id: string,
  side: FilmClip['side'],
  game: string,
  situation: string,
  personnel: string,
  formation: string,
  motion: string,
  concept: string,
  result: string,
  hypothesisId: string,
  relation: FilmClip['relation'],
  staffNote: string,
];

const CLIP_TUPLES: readonly ClipTuple[] = [
  ['r01', 'OFF', 'W6 vs Oakridge', '1st & 10 · own 32 · R hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+18', 'h1', 'sup', 'End crashed the mesh. Bennett kept and outran the first wave.'],
  ['r02', 'OFF', 'W6 vs Oakridge', '1st & 10 · +47 · L hash', '11 pers', 'Trips left', 'Orbit', 'Jet sweep', '+12', 'h2', 'sup', 'Parish caught it in stride. The alley was empty before the snap.'],
  ['r03', 'DEF', 'W6 vs Oakridge', '2nd & 7 · own 28 · mid', '11 pers', 'Doubles', 'None', 'Cover 2 man', 'Comp +22', 'h3', 'sup', 'Both safeties sat. The post split them for twenty-two.'],
  ['r04', 'ST', 'W6 vs Oakridge', 'Punt · 2Q', 'Punt unit', 'Rugby', '—', 'Rugby punt right', '+38', 'h4', 'sup', 'Same look as the fake. Hale ran the edge and got the roll.'],
  ['r05', 'OFF', 'W6 vs Oakridge', '1st & 10 · own 21 · R hash', '11 pers', 'Empty', 'None', 'Zone give', '+3', 'h1', 'con', 'End stayed home. Bennett gave. The keep was not automatic.'],
  ['r06', 'OFF', 'W6 vs Oakridge', '3rd & 5 · +38 · L hash', '11 pers', 'Trips right', 'None', 'Zone-read keep', '+9', 'h1', 'sup', 'Crash again. Bennett kept for the first down.'],
  ['r07', 'OFF', 'W7 vs Easton', '1st & 10 · own 40 · R hash', '11 pers', 'Bunch', 'Jet', 'Jet sweep', '+16', 'h2', 'sup', 'First-down jet from the hash. Parish hit the boundary untouched.'],
  ['r08', 'DEF', 'W7 vs Easton', '1st & 10 · +35 · mid', '11 pers', 'Trips right', 'None', 'Cover 2 man', 'Comp +31 TD', 'h3', 'sup', 'Seam between the safeties. Voss walked in.'],
  ['r09', 'OFF', 'W7 vs Easton', '1st & 10 · own 18 · L hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+11', 'h1', 'sup', 'Same crash, same keep. Easton’s end never sat.'],
  ['r10', 'OFF', 'W7 vs Easton', '1st & 10 · +44 · R hash', '11 pers', 'Trips left', 'Orbit', 'Jet sweep', '-2', 'h2', 'con', 'They loaded the boundary. Parish was met at the line.'],
  ['r11', 'OFF', 'W7 vs Easton', '2nd & 8 · own 33 · mid', '11 pers', 'Empty', 'None', 'Zone-read keep', '+14', 'h1', 'sup', 'End crashed from a two-gap five. Bennett kept anyway.'],
  ['r12', 'ST', 'W7 vs Easton', 'Punt · 3Q', 'Punt unit', 'Rugby', '—', 'Fake punt', '+11', 'h4', 'sup', 'Identical look to the rugby. Hale kept it and converted.'],
  ['r13', 'DEF', 'W7 vs Easton', '2nd & 6 · own 41 · L hash', '11 pers', 'Doubles', 'None', 'Cover 2 buzz', 'Inc', 'h3', 'sup', 'Post was there. The throw was late. Window still open.'],
  ['r14', 'OFF', 'W7 vs Easton', '1st & 10 · +29 · R hash', '11 pers', 'Empty', 'None', 'QB draw', '+4', 'h1', 'con', 'Designed QB run, not a keep. Do not count it as the mesh.'],
  ['r15', 'OFF', 'W8 vs Clear Creek', '1st & 10 · own 25 · L hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+7', 'h1', 'sup', 'Crash on first down again. Bennett kept for seven.'],
  ['r16', 'OFF', 'W8 vs Clear Creek', '1st & 10 · own 36 · R hash', '11 pers', 'Trips right', 'Jet', 'Jet sweep', '+9', 'h2', 'sup', 'Hash jet, first down. The alley defender chased motion too far.'],
  ['r17', 'DEF', 'W8 vs Clear Creek', '1st & 10 · +42 · mid', '11 pers', 'Doubles', 'None', 'Cover 2 man', 'Comp +18', 'h3', 'sup', 'Same two-high. Same post. Clear Creek never closed it.'],
  ['r18', 'OFF', 'W8 vs Clear Creek', '1st & 10 · +48 · L hash', '11 pers', 'Bunch', 'Orbit', 'Jet sweep', '+21', 'h2', 'sup', 'Orbit declared the alley. Parish took it to the numbers.'],
  ['r19', 'OFF', 'W8 vs Clear Creek', '2nd & 4 · own 44 · R hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+8', 'h1', 'sup', 'Mesh at plus-four. End crashed. Keep.'],
  ['r20', 'ST', 'W8 vs Clear Creek', 'Punt · 1Q', 'Punt unit', 'Rugby', '—', 'Rugby punt left', '+29', 'h4', 'sup', 'Third rugby from the same look. No fake this time.'],
  ['r21', 'DEF', 'W8 vs Clear Creek', '3rd & 8 · own 31 · mid', '11 pers', 'Trips left', 'None', 'Cover 2 man', 'Comp +12', 'h3', 'sup', 'Seam on third down. They will live in it if we leave it.'],
  ['r22', 'OFF', 'W8 vs Clear Creek', '1st & 10 · own 12 · L hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+6', 'h1', 'sup', 'Own-12 mesh. Crash. Keep. They do it everywhere on the field.'],
  ['r23', 'OFF', 'W6 vs Oakridge', '1st & 10 · +38 · R hash', '11 pers', 'Trips left', 'Jet', 'Jet sweep', '+5', 'h2', 'sup', 'First-down jet even when they were already in scoring range.'],
  ['r24', 'DEF', 'W6 vs Oakridge', '1st & 10 · own 47 · mid', '12 pers', 'Ace', 'None', 'Cover 2 quarters', 'Inc', 'h3', 'con', 'Attached tight end. They spun to quarters. The post was gone.'],
  ['r25', 'OFF', 'W6 vs Oakridge', '2nd & 9 · own 22 · L hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+13', 'h1', 'sup', 'Second-and-long keep off the same crash.'],
  ['r26', 'OFF', 'W7 vs Easton', '1st & 10 · +33 · R hash', '11 pers', 'Trips right', 'Orbit', 'Jet sweep', '+8', 'h2', 'sup', 'Orbit into a light box. Parish again.'],
  ['r27', 'DEF', 'W7 vs Easton', '2nd & 5 · +28 · mid', '11 pers', 'Doubles', 'None', 'Cover 2 man', 'Comp +15', 'h3', 'sup', 'Post again. Two-high never moved.'],
  ['r28', 'OFF', 'W8 vs Clear Creek', '1st & 10 · own 48 · L hash', '11 pers', 'Empty', 'None', 'Zone-read keep', '+10', 'h1', 'sup', 'Another first-down keep. The crash is the tell.'],
  ['r29', 'OFF', 'W8 vs Clear Creek', '1st & 10 · +41 · R hash', '11 pers', 'Bunch', 'Jet', 'Jet give inside', '+2', 'h2', 'con', 'They faked the jet and gave inside. Do not overplay the alley every snap.'],
  ['r30', 'DEF', 'W8 vs Clear Creek', '1st & 10 · own 39 · mid', '11 pers', 'Trips right', 'None', 'Cover 2 man', 'Comp +9', 'h3', 'sup', 'Shorter post. Same window, same shell.'],
  ['r31', 'OFF', 'W6 vs Oakridge', '3rd & 2 · own 45 · R hash', '21 pers', 'I-Form', 'None', 'Duo', '+4', 'h1', 'neu', 'Heavy set, not empty. Do not hang a keep read on this snap.'],
  ['r32', 'ST', 'W7 vs Easton', 'Punt · 4Q', 'Punt unit', 'Spread', '—', 'Conventional punt', '+41', '', 'neu', 'Conventional punt from plus territory. Their punt team is not only rugby.'],
];

const WIDE_ONLY = new Set(['r04', 'r12', 'r20', 'r32']);
const TIGHT_ONLY = new Set(['r05', 'r10', 'r14', 'r24', 'r29']);

function toClip(tuple: ClipTuple): FilmClip {
  const [
    id,
    side,
    game,
    situation,
    personnel,
    formation,
    motion,
    concept,
    result,
    hypothesisId,
    relation,
    staffNote,
  ] = tuple;
  return {
    id,
    side,
    game,
    situation,
    personnel,
    formation,
    motion,
    concept,
    result,
    angles: WIDE_ONLY.has(id)
      ? ['Wide']
      : TIGHT_ONLY.has(id)
        ? ['Tight']
        : ['Tight', 'Wide'],
    hypothesisId: hypothesisId === '' ? null : hypothesisId,
    relation,
    staffNote,
  };
}

export const WEEK_9_CLIPS: readonly FilmClip[] = CLIP_TUPLES.map(toClip);

const WEEK_9_PRIORITY_OBJECTIVES: readonly PracticeObjective[] = [
  {
    id: 'o1',
    name: 'Zone-read keep fits',
    unit: 'DEF',
    group: 'Front seven',
    hypothesisId: 'h1',
    coach: 'Tillman',
    contact: true,
  },
  {
    id: 'o2',
    name: 'Jet-sweep alley contain',
    unit: 'DEF',
    group: 'Edge / overhang',
    hypothesisId: 'h2',
    coach: 'Tillman',
    contact: false,
  },
  {
    id: 'o3',
    name: 'Post / seam vs Cover 2',
    unit: 'OFF',
    group: 'Quarterbacks / receivers',
    hypothesisId: 'h3',
    coach: 'Pruitt',
    contact: false,
    packageId: 'package-five-step-trips-flood',
  },
  {
    id: 'o4',
    name: 'Punt-rush and fake-punt alert',
    unit: 'ST',
    group: 'Punt return',
    hypothesisId: 'h4',
    coach: 'Ames',
    contact: false,
  },
];

export const WEEK_9_OBJECTIVES: readonly PracticeObjective[] = [
  ...WEEK_9_PRIORITY_OBJECTIVES,
  ...GAME_PLAN_OBJECTIVES.filter(
    (objective) => objective.id === 'o5' || objective.id === 'o6',
  ),
];

export const WEEK_9_ANSWERS: readonly GamePlanAnswer[] = [
  {
    id: 'a11',
    hypothesisId: 'h1',
    name: 'End sits the mesh — crash is a give',
    gist: 'The end owns the quarterback. The back gets what he gets.',
    how: 'Boundary end stays square on the mesh. Will scrapes the give. Nobody crashes until Bennett’s shoulders turn.',
    personnel: 'Base nickel — Pham at end, Okafor at Will',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'The keep dies. Thirty-eight meshes say the crash is the tell — take it away and they hand it off.',
    exposes:
      'The give can still hit if Okafor is late. Parish is a real back when the ball is handed.',
    counterRisk:
      'Tag a late scrape for Okafor so the give is tackled at three, not seven.',
    successCue: 'Bennett’s shoulders turn to give, or he is tackled at the mesh.',
    packageName: 'Sit-the-mesh end',
    personnelDependencies: [
      { role: 'Boundary end', player: 'Starting DE', requires: 'Active' },
      { role: 'Will', player: 'S. Okafor', requires: 'Active' },
    ],
    objectiveId: 'o1',
    targetReps: 18,
    contact: true,
    schemeRequirement: {
      decision: 'defenseScheme',
      value: '4-2-5',
      label: '4-2-5 nickel front',
    },
  },
  {
    id: 'a12',
    hypothesisId: 'h1',
    name: 'Spy Bennett with Reyes — everyone else fits the give',
    gist: 'One player owns the quarterback. The rest play the run.',
    how: 'Reyes sits the mesh on every empty/11 early down. The front two-gaps the give.',
    personnel: 'Reyes as QB spy — fastest linebacker we have',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'Cheapest keep-killer on the board. It costs one player and no new front.',
    exposes:
      'We rush four instead of five. If they throw off the mesh, Reyes is gone.',
    counterRisk:
      'Reyes carries a pass-alert: if Bennett’s eyes go to the field, he drops to the hook.',
    successCue: 'Reyes is in Bennett’s face before the keep turns upfield.',
    packageName: 'QB spy on empty',
    personnelDependencies: [
      { role: 'Spy', player: 'N. Reyes', requires: 'Active' },
    ],
    objectiveId: 'o1',
    targetReps: 14,
    contact: true,
    schemeRequirement: {
      decision: 'defenseScheme',
      value: '4-2-5',
      label: '4-2-5 nickel front',
    },
  },
  {
    id: 'a13',
    hypothesisId: 'h1',
    name: 'Crash anyway — make them beat us with the give',
    gist: 'Take the back away and live with the keep.',
    how: 'End crashes every mesh. Box fits the give. The keep is a footrace we accept.',
    personnel: 'Base nickel — aggressive crash',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'Parish never gets started. If Bennett is not a runner this week, the crash is free.',
    exposes:
      'The film says Bennett keeps when you crash. This answer dares the exact tendency.',
    counterRisk:
      'Ames has a one-series hook: two keeps past eight yards and we sit the end.',
    successCue: 'The give is dead at the line. The keep is a known cost.',
    packageName: 'Crash-the-mesh',
    personnelDependencies: [
      { role: 'Crashing end', player: 'Starting DE', requires: 'Active' },
    ],
    objectiveId: 'o1',
    targetReps: 12,
    contact: true,
    schemeRequirement: {
      decision: 'defenseScheme',
      value: '46 Bear',
      label: '46 Bear front',
    },
  },
  {
    id: 'a21',
    hypothesisId: 'h2',
    name: 'Load the boundary before the snap',
    gist: 'Numbers in the alley so the jet has nowhere to go.',
    how: 'Overhang walks to the hash on first down. Corner stays square. Safety fills the cutback.',
    personnel: 'Base personnel — no substitution',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'The Easton clip where they loaded the boundary is the one that stopped Parish.',
    exposes:
      'Light field. If they fake the jet and give inside, we are a man short in the box.',
    counterRisk:
      'The Will stays home on orbit. Only the overhang chases the motion.',
    successCue: 'Parish is met at the numbers, or they kill the jet.',
    packageName: 'Loaded-boundary first down',
    personnelDependencies: [
      { role: 'Overhang', player: 'J. Cruz', requires: 'Active' },
    ],
    objectiveId: 'o2',
    targetReps: 12,
    contact: false,
  },
  {
    id: 'a22',
    hypothesisId: 'h2',
    name: 'Force the jet, then trail — do not overplay it',
    gist: 'Let them run it once. Tackle it. Do not empty the box.',
    how: 'Corner trails the motion. The box stays intact. No extra body to the boundary until second down.',
    personnel: 'Base nickel',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'Protects against the fake-jet give the Clear Creek clip showed.',
    exposes:
      'If Parish wins the first one, they will keep throwing it at a trailing corner.',
    counterRisk:
      'After one explosive jet, we load the boundary for the rest of the series.',
    successCue: 'The first jet is tackled inside eight. The box still fits the give.',
    packageName: 'Trail-and-tackle',
    personnelDependencies: [
      { role: 'Boundary corner', player: 'J. Cruz', requires: 'Active' },
    ],
    objectiveId: 'o2',
    targetReps: 10,
    contact: false,
  },
  {
    id: 'a23',
    hypothesisId: 'h2',
    name: 'Nickel off the motion — hit the catch',
    gist: 'Blitz the jet at the mesh so Parish never gets started.',
    how: 'Cruz comes off the boundary on first-down jet/orbit. Safety rotates over the slot.',
    personnel: 'Nickel Cruz off the edge',
    owner: 'B. Tillman',
    ownerRole: 'Defensive Coordinator',
    buys: 'The explosive jet dies at the catch. This is the answer that ends drives.',
    exposes:
      'If they fake it, Cruz is gone and the slot is uncovered.',
    counterRisk:
      'Cruz aborts if the ball is handed inside. The safety still replaces the slot.',
    successCue: 'Parish is hit as he catches it, or they check out of the jet.',
    packageName: 'Jet-mesh pressure',
    personnelDependencies: [
      { role: 'Blitz nickel', player: 'J. Cruz', requires: 'Active' },
      { role: 'Rotation safety', player: 'Starting FS', requires: 'Active' },
    ],
    objectiveId: 'o2',
    targetReps: 14,
    contact: false,
  },
  {
    id: 'a31',
    hypothesisId: 'h3',
    name: 'Post / seam vs the two-high shell',
    gist: 'Throw the window twenty-nine snaps say is open.',
    how: 'Trips, five-step, post from the #2. Reed throws it if both safeties sit.',
    personnel: '11 personnel trips — Reed, Voss-side Jackson',
    owner: 'D. Pruitt',
    ownerRole: 'Offensive Coordinator',
    buys: 'Highest-percentage shot on this tape. They have not closed the window.',
    exposes:
      'Five-step and hold. It needs a right tackle who can protect — Kowalski is still ineligible.',
    counterRisk:
      'Reed carries a built-in glance at three steps if the edge wins early.',
    successCue: 'Both safeties sit. The post splits them.',
    packageName: 'Five-step post vs Cover 2',
    personnelDependencies: [
      { role: 'QB', player: 'M. Reed', requires: 'Active' },
      {
        role: 'RT',
        player: 'Eligible depth-chart starter',
        requires: 'Eligible Friday',
      },
    ],
    objectiveId: 'o3',
    targetReps: 12,
    contact: false,
    packageId: 'package-five-step-trips-flood',
    schemeRequirement: {
      decision: 'offenseScheme',
      value: 'Spread',
      label: 'Spread offense',
    },
  },
  {
    id: 'a32',
    hypothesisId: 'h3',
    name: '12 personnel — make them declare',
    gist: 'Attach Brooks and see if they spin to quarters like Oakridge.',
    how: '12 personnel, Brooks attached. If they stay two-high, throw the seam. If they spin, run it.',
    personnel: '12 personnel — Brooks attached',
    owner: 'D. Pruitt',
    ownerRole: 'Offensive Coordinator',
    buys: 'The only clip they closed the post was against an attached tight end.',
    exposes:
      'One clip. If that was a call and not a rule, we spend a week on a picture we never see.',
    counterRisk:
      'If the shell does not spin, Reed kills the seam and checks to duo.',
    successCue: 'The safety spins, or the seam is thrown.',
    packageName: '12-personnel coverage check',
    personnelDependencies: [
      { role: 'Attached TE', player: 'Brooks', requires: 'Active' },
      { role: 'QB', player: 'M. Reed', requires: 'Active' },
    ],
    objectiveId: 'o3',
    targetReps: 10,
    contact: false,
  },
  {
    id: 'a33',
    hypothesisId: 'h3',
    name: 'High-low the hole with a glance',
    gist: 'Do not need the deep post if the glance is there.',
    how: 'Play-action glance off zone. One read. Throw it or throw it away.',
    personnel: '11 personnel — max protect',
    owner: 'D. Pruitt',
    ownerRole: 'Offensive Coordinator',
    buys: 'Shorter throw, same two-high picture, less time for the backup tackle.',
    exposes:
      'Slow developing. If the safety sits on the glance, there is no second read.',
    counterRisk:
      'Tag the back into the flat so Reed has an outlet instead of holding it.',
    successCue: 'The front safety takes a false step on the fake.',
    packageName: 'Play-action glance',
    personnelDependencies: [
      { role: 'QB', player: 'M. Reed', requires: 'Active' },
    ],
    objectiveId: 'o3',
    targetReps: 8,
    contact: false,
  },
  {
    id: 'a41',
    hypothesisId: 'h4',
    name: 'Safe return — contain the rugby, ignore the fake',
    gist: 'Numbers on Hale. Do not sell out for a sample of one.',
    how: 'Return sets the edge on the rugby. Personal protector is not the spy. Fair catch inside the 20.',
    personnel: 'Standard return — Silva as the edge',
    owner: 'K. Ames',
    ownerRole: 'Special Teams',
    buys: 'The three rugby punts are the real sample. Field position stays honest.',
    exposes:
      'If they fake it again, we are not built to stop Hale on the edge.',
    counterRisk:
      'Inside the 40, Ames checks to the fake-punt alert automatically.',
    successCue: 'Hale is forced to punt. The return dies inside the 25.',
    packageName: 'Rugby-contain return',
    personnelDependencies: [
      { role: 'Edge', player: 'Silva', requires: 'Active' },
    ],
    objectiveId: 'o4',
    targetReps: 10,
    contact: false,
  },
  {
    id: 'a42',
    hypothesisId: 'h4',
    name: 'Fake-punt alert inside the 40',
    gist: 'The look is the same. Inside their 40, treat it as a run.',
    how: 'Personal protector is the spy. Ends sit. No return, just a tackle.',
    personnel: 'Safe punt-safe — no returner deep',
    owner: 'K. Ames',
    ownerRole: 'Special Teams',
    buys: 'The Easton fake converted. Do not give them that free first down.',
    exposes:
      'We take the return off the table every time they punt from plus territory.',
    counterRisk:
      'Outside the 40, Ames reverts to the rugby contain automatically.',
    successCue: 'Hale is tackled or forced to kick. No conversion.',
    packageName: 'Plus-territory fake alert',
    personnelDependencies: [
      { role: 'Spy', player: 'N. Reyes', requires: 'Active' },
    ],
    objectiveId: 'o4',
    targetReps: 8,
    contact: false,
  },
  {
    id: 'a43',
    hypothesisId: 'h4',
    name: 'Rush Hale — make him kick it',
    gist: 'Pressure the rugby so the fake never develops.',
    how: 'Two-man rush off the edge Hale wants to roll. Everyone else accounts for the fake.',
    personnel: 'Rush return — Pierce and Cruz',
    owner: 'K. Ames',
    ownerRole: 'Special Teams',
    buys: 'If Hale has to kick under pressure, the rugby roll dies.',
    exposes:
      'Five punts is a thin sample to rush from. A clean rugby still flips the field.',
    counterRisk:
      'Ames owns a one-punt hook: if Hale beats the rush once, we sit in contain.',
    successCue: 'Hale’s shoulders turn to kick, or the fake is stuffed.',
    packageName: 'Edge rush the rugby',
    personnelDependencies: [
      { role: 'Rushers', player: 'Pierce + Cruz', requires: 'Active' },
    ],
    objectiveId: 'o4',
    targetReps: 6,
    contact: false,
  },
];
