import type { ScreenId, TacticsTab } from '../domain/types.ts';

export type InboxMessageKind =
  'Academics' | 'Injury' | 'Scouting' | 'Press' | 'Boosters' | 'District';

export interface InboxAction {
  readonly label: string;
  readonly primary: boolean;
  readonly screen?: ScreenId;
  readonly tacticsTab?: TacticsTab;
}

export interface InboxMessage {
  readonly id: string;
  readonly kind: InboxMessageKind;
  readonly sender: string;
  readonly subject: string;
  readonly time: string;
  readonly initiallyUnread: boolean;
  readonly disruptionOnly?: boolean;
  readonly preview: string;
  readonly body: readonly string[];
  readonly actions: readonly InboxAction[];
  readonly sourceScreen: ScreenId;
}

export interface StaffNote {
  readonly person: string;
  readonly role: string;
  readonly note: string;
  readonly disruptionOnly?: boolean;
}

export const INBOX_MESSAGES: readonly InboxMessage[] = [
  {
    id: 'kowalski-eligibility',
    kind: 'Academics',
    sender: 'Guidance Office',
    subject: 'Eligibility alert: Ryan Kowalski',
    time: '7:42 AM',
    initiallyUnread: true,
    disruptionOnly: true,
    preview:
      'Kowalski has fallen below the 2.0 GPA threshold and is ineligible effective immediately.',
    body: [
      "Coach — Ryan Kowalski's grade in Algebra II dropped to a 58 this week, putting his GPA at 1.9. Per district policy he is ineligible for Friday's game against Central Catholic, effective immediately.",
      'He can regain eligibility at the Oct 26 grading checkpoint if his GPA climbs back above 2.0. His teacher says the problem is missed homework, not comprehension — a tutor assignment or mandatory study hall would go a long way.',
      "You'll need to adjust the depth chart at right tackle before Friday.",
      '— L. Whitmore, Guidance Counselor',
    ],
    actions: [
      { label: 'Assign Tutor', primary: true },
      { label: 'Schedule Study Hall', primary: false },
      {
        label: 'Open Depth Chart',
        primary: false,
        screen: 'game-plan',
        tacticsTab: 'Depth Chart',
      },
    ],
    sourceScreen: 'academics',
  },
  {
    id: 'mccoy-injury',
    kind: 'Injury',
    sender: 'Athletic Trainer',
    subject: 'Injury update: Hunter McCoy (FB)',
    time: '6:55 AM',
    initiallyUnread: true,
    disruptionOnly: true,
    preview:
      'X-rays negative. Bruised ribs — plan on 1–2 weeks without contact.',
    body: [
      "X-rays came back negative — bruised ribs, no fracture. He's day-to-day, but I'd plan on 1–2 weeks and he shouldn't take contact before the Central Catholic game.",
      "He can keep doing light conditioning. I'll re-evaluate him Monday.",
      '— D. Ferris, ATC',
    ],
    actions: [
      { label: 'Rest 2 Weeks', primary: true },
      {
        label: 'Adjust Depth Chart',
        primary: false,
        screen: 'game-plan',
        tacticsTab: 'Depth Chart',
      },
    ],
    sourceScreen: 'squad',
  },
  {
    id: 'state-u-scout',
    kind: 'Scouting',
    sender: 'Recruiting Desk',
    subject: 'State U scout attending Friday’s game',
    time: 'Yesterday',
    initiallyUnread: true,
    preview:
      'An area scout will be in the stands Friday, primarily to watch Marcus Reed.',
    body: [
      "Heads up — State University is sending an area scout to Friday's game, primarily to watch Marcus Reed. Western Tech has requested game film as well.",
      "A strong performance in a rivalry game of this profile could move Reed's college interest significantly.",
    ],
    actions: [
      { label: 'Prep Highlight Tape', primary: true },
      { label: 'Reply', primary: false },
    ],
    sourceScreen: 'week',
  },
  {
    id: 'jefferson-press',
    kind: 'Press',
    sender: 'Westfield Herald',
    subject: '“Wildcats Roll Past Jefferson, 31–10”',
    time: 'Sun',
    initiallyUnread: false,
    preview:
      'Reed threw for 284 yards and three scores as Westfield improved to 6–1.',
    body: [
      'Reed threw for 284 yards and three touchdowns as Westfield improved to 6–1 and kept pace in the district race. The defense forced four three-and-outs in the second half.',
      "“This group plays for each other,” the head coach said. “That's what October football is about.”",
    ],
    actions: [{ label: 'Pin to Bulletin', primary: false }],
    sourceScreen: 'week',
  },
  {
    id: 'booster-vote',
    kind: 'Boosters',
    sender: 'Booster Club',
    subject: 'Weight room funding vote passes 12–3',
    time: 'Sat',
    initiallyUnread: false,
    preview: 'The board approved $8,500 toward new racks and platforms.',
    body: [
      'The board approved $8,500 toward new racks and platforms. Installation is scheduled for the bye week.',
      'Frank wants to present the check at halftime Friday — let us know if that works.',
      '— Westfield Gridiron Boosters',
    ],
    actions: [
      { label: 'Approve Halftime Check', primary: true },
      { label: 'Send Thanks', primary: false },
    ],
    sourceScreen: 'week',
  },
  {
    id: 'district-reseed',
    kind: 'District',
    sender: 'District Office',
    subject: 'Reseeding: Central Catholic moves to #1',
    time: 'Fri',
    initiallyUnread: false,
    preview:
      'Central Catholic (7–0) takes the top seed; Westfield (6–1) holds #2.',
    body: [
      "Updated district standings: Central Catholic (7–0) moves to the #1 seed; Westfield (6–1) holds #2. Friday's head-to-head result will likely decide the district title and home field for the first playoff round.",
    ],
    actions: [{ label: 'View Schedule', primary: false, screen: 'schedule' }],
    sourceScreen: 'schedule',
  },
  {
    id: 'q1-progress',
    kind: 'Academics',
    sender: 'Guidance Office',
    subject: 'Q1 progress reports posted',
    time: 'Thu',
    initiallyUnread: false,
    preview: 'Three players sit below a 2.5 GPA: Sosa, Turner, Kowalski.',
    body: [
      'Q1 progress reports are posted. Three players sit below a 2.5 GPA: Sosa (2.4), Turner (2.2), Kowalski (1.9). Study-hall slots are open Tuesday and Thursday after sixth period.',
    ],
    actions: [{ label: 'Open Academics', primary: true, screen: 'academics' }],
    sourceScreen: 'academics',
  },
] as const;

export const STAFF_NOTES: readonly StaffNote[] = [
  {
    person: 'M. Soto',
    role: 'Graduate Assistant · Film',
    note: 'Thirty-two clips are cut and tagged. Two of them argue against the power read — I left them in.',
  },
  {
    person: 'B. Tillman',
    role: 'Defensive Coordinator',
    note: 'If we spend Tuesday on run fits, sprint-out contain becomes a Thursday walkthrough in shells. That is the trade.',
  },
  {
    person: 'D. Ferris',
    role: 'Athletic Trainer',
    note: 'McCoy can condition. He does not take contact this week. That one is not a coaching decision.',
    disruptionOnly: true,
  },
] as const;

export function visibleInboxMessages(disrupted: boolean) {
  return INBOX_MESSAGES.filter(
    (message) => disrupted || message.disruptionOnly !== true,
  );
}

export function visibleStaffNotes(disrupted: boolean) {
  return STAFF_NOTES.filter(
    (note) => disrupted || note.disruptionOnly !== true,
  );
}

export function inboxUnreadCount(
  disrupted: boolean,
  readMessageIds: readonly string[],
) {
  return visibleInboxMessages(disrupted).filter(
    (message) =>
      message.initiallyUnread && !readMessageIds.includes(message.id),
  ).length;
}
