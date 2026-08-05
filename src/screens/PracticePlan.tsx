import { useMemo, useState, type DragEvent } from 'react';

import {
  Button,
  Card,
  Kicker,
  PillButton,
  ScreenHeading,
  StatusChip,
  StatusDot,
  type StatusTone,
} from '../components/ui.tsx';
import { evidenceCounts, expectedPracticeReps } from '../domain/week.ts';
import { rtStarterName } from '../domain/disruption.ts';
import type {
  PracticeBlock,
  PracticeDayId,
  PracticeObjectiveId,
  PracticeObjectiveSummary,
  WeekState,
} from '../domain/types.ts';
import { useWeek } from '../state/weekContext.ts';

type TrainingTab = 'Practice Plan' | 'Development';

interface ObjectivePerson {
  readonly name: string;
  readonly position: string;
  readonly constrained?: 'No contact' | 'Ineligible';
}

const OBJECTIVE_PERSONNEL: Readonly<
  Record<PracticeObjectiveId, readonly ObjectivePerson[]>
> = {
  o1: [
    { name: 'S. Okafor', position: 'MLB' },
    { name: 'C. Dean', position: 'WLB' },
    { name: 'H. McCoy', position: 'FB', constrained: 'No contact' },
  ],
  o2: [
    { name: 'N. Reyes', position: 'LB' },
    { name: 'B. Hartley', position: 'DE' },
    { name: 'D. Ford', position: 'NB' },
  ],
  o3: [
    { name: 'M. Reed', position: 'QB' },
    { name: 'A. Silva', position: 'WR' },
    { name: 'R. Kowalski', position: 'RT', constrained: 'Ineligible' },
  ],
  o4: [
    { name: 'C. Ramsey', position: 'K' },
    { name: 'D. Pierce', position: 'S' },
    { name: 'T. Coker', position: 'LB' },
  ],
  o5: [
    { name: 'R. Kowalski', position: 'RT', constrained: 'Ineligible' },
    { name: 'L. Webb', position: 'OT' },
    { name: 'P. Ruiz', position: 'OG' },
  ],
  o6: [
    { name: 'M. Reed', position: 'QB' },
    { name: 'D. Carter', position: 'RB' },
    { name: 'T. Jackson', position: 'CB' },
  ],
};

const DEVELOPMENT_DAYS = [
  {
    day: 'MON',
    title: 'Film & Walkthrough',
    focus: 'Central’s Cover 3 shell — beaters from trips. Install 4 new plays.',
    load: 'Light',
    tone: 'good' as const,
  },
  {
    day: 'TUE',
    title: 'Full Pads',
    focus: 'Inside run vs their pulling guards. Goal-line package live reps.',
    load: 'Heavy',
    tone: 'danger' as const,
  },
  {
    day: 'WED',
    title: 'Situational',
    focus: 'Two-minute drill, 3rd-and-medium script, red-zone shots.',
    load: 'Moderate',
    tone: 'risk' as const,
  },
  {
    day: 'THU',
    title: 'Special Teams & Polish',
    focus: 'All four units. Walkthrough script, curfew reminder.',
    load: 'Light',
    tone: 'good' as const,
  },
] as const;

const DEVELOPMENT_PLAYERS = [
  ['Marcus Reed', 'QB', 'Throw accuracy', 'deep outs vs Cover 3', '▲'],
  ['Andre Silva', 'WR', 'Route running', 'sharper breaks on the dig', '▲'],
  ['Colt Ramsey', 'QB', 'Kicking', 'extra 10 min after practice', '▲'],
  ['Wyatt Turner', 'LG', 'Strength', 'limited — study hall Tue/Thu', '→'],
  ['Dylan Pierce', 'S', 'Awareness', 'film with Coach Tillman', '▲'],
] as const;

const AVAILABILITY_LABEL = {
  available: 'Available',
  'accepted-risk': 'Accepted risk',
  'off-board': 'Off the board',
  'invalid-answer': 'Invalid answer',
} as const;

const READINESS_TONE: Readonly<Record<string, StatusTone>> = {
  Unseen: 'neutral',
  Introduced: 'risk',
  Repped: 'accent',
  Rehearsed: 'good',
};

function planSignature(blocks: readonly PracticeBlock[]): string {
  return blocks
    .map((block) =>
      [block.id, block.objectiveId, block.day, block.live ? '1' : '0'].join(
        ':',
      ),
    )
    .sort()
    .join('|');
}

function contactLabel(day: PracticeDayId, live: boolean): string {
  if (day === 'TUE') return live ? 'Live' : 'Thud';
  if (day === 'THU') return 'Walk-through';
  if (day === 'WED') return 'Thud';
  return 'On air';
}

function periodLabel(day: PracticeDayId, live: boolean): string {
  if (day === 'TUE') return live ? 'live' : 'thud';
  if (day === 'THU') return 'walk-through';
  return 'no pads';
}

function objectivePeople(
  objectiveId: PracticeObjectiveId,
  week: WeekState,
): readonly (ObjectivePerson & { readonly status: string })[] {
  const starter = rtStarterName(week.rtStarter);
  return (OBJECTIVE_PERSONNEL[objectiveId] ?? []).map((person) => {
    const replaceRt =
      week.practicePlanLocked &&
      starter !== null &&
      person.name === 'R. Kowalski';
    return {
      ...person,
      name: replaceRt ? starter : person.name,
      status: replaceRt
        ? 'Active'
        : week.practicePlanLocked
          ? (person.constrained ?? 'Active')
          : 'Active',
    };
  });
}

/** Canonical UI-3 Training surface, backed only by pure practice actions. */
export function PracticePlan() {
  const {
    scenario,
    state,
    gate,
    planGate,
    practiceGate,
    practiceSummaries,
    dispatch,
  } = useWeek();
  const [tab, setTab] = useState<TrainingTab>('Practice Plan');
  const [selectedObjective, setSelectedObjective] =
    useState<PracticeObjectiveId | null>(null);
  const [pickMessage, setPickMessage] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [intensity, setIntensity] = useState('Normal');

  const locked = state.week.practicePlanLocked;
  const currentSignature = planSignature(state.week.practiceBlocks);
  const draftSignature =
    state.practiceDraftBlocks === null
      ? null
      : planSignature(state.practiceDraftBlocks);
  const draftDirty =
    state.practiceDraftBlocks === null
      ? state.week.practiceBlocks.length > 0
      : currentSignature !== draftSignature;
  const selected = practiceSummaries.find(
    (summary) => summary.objective.id === selectedObjective,
  );
  const acceptedRisk = scenario.hypotheses.find(
    (hypothesis) => hypothesis.id === gate.acceptedRisk,
  );

  const unitBalance = useMemo(
    () =>
      [
        ['OFF', 'Offense'],
        ['DEF', 'Defense'],
        ['ST', 'Special teams'],
      ].map(([unit, label]) => {
        const blocks = state.week.practiceBlocks.filter((block) => {
          const objective = scenario.objectives.find(
            (item) => item.id === block.objectiveId,
          );
          return objective?.unit === unit || objective?.unit === 'BOTH';
        });
        const reps = blocks.reduce(
          (total, block) =>
            total + expectedPracticeReps(block, scenario, state.week),
          0,
        );
        return { unit, label, blocks: blocks.length, reps };
      }),
    [scenario, state.week],
  );

  const objectiveSource = (summary: PracticeObjectiveSummary): string => {
    const answer = Object.values(planGate.activeAnswers).find(
      (item) => item.objectiveId === summary.objective.id,
    );
    if (answer !== undefined) {
      return `Answer — “${answer.name}” · ${answer.owner}`;
    }
    if (summary.objective.hypothesisId !== null) {
      if (summary.availability === 'accepted-risk') {
        return 'Accepted risk — no answer, by choice';
      }
      return summary.availability === 'off-board'
        ? 'Candidate concern — not prioritized this week'
        : 'Prioritized concern — no answer chosen yet';
    }
    return summary.objective.note ?? 'Standing objective';
  };

  const readinessReasons = (
    summary: PracticeObjectiveSummary,
  ): readonly string[] => {
    const people = objectivePeople(summary.objective.id, state.week);
    const reasons = summary.blocks.map(
      (block) =>
        `${block.day} · ${periodLabel(block.day, block.live)} · ${expectedPracticeReps(block, scenario, state.week)} reps`,
    );
    if (reasons.length === 0) {
      reasons.push(
        summary.availability === 'accepted-risk'
          ? 'Knowingly uncovered. No practice time is going here.'
          : summary.availability === 'off-board'
            ? 'Not prioritized, so it cannot take practice time this week.'
            : 'No blocks placed — this one goes into Friday unseen.',
      );
    }
    reasons.push(
      `Personnel — ${people.map((person) => `${person.name} (${person.position}, ${person.status.toLowerCase()})`).join(', ')}.`,
    );
    reasons.push(
      summary.objective.contact
        ? 'Constraint — only Tuesday full pads can create a live rep; every other day is capped at non-live work.'
        : 'Constraint — no live contact required; all non-Tuesday work remains on air, shells, or walk-through.',
    );
    if (summary.contactCapped) {
      reasons.push(
        'No live rep in it, so it stops at Repped no matter how many blocks it gets.',
      );
    } else if (
      summary.objective.contact &&
      !summary.hasLiveRep &&
      summary.blocks.length > 0
    ) {
      reasons.push('Needs a Tuesday live block to get past Repped.');
    }
    if (locked && summary.objective.id === 'o1') {
      reasons.push(
        'McCoy cannot take contact. Dunn runs the scout counter and the look is a step slow.',
      );
    }
    if (
      locked &&
      summary.objective.id === 'o5' &&
      state.week.rtFix === 'promote'
    ) {
      reasons.push(
        `THU · two catch-up periods · walk-through with ${rtStarterName(state.week.rtStarter) ?? 'the backup'} at right tackle.`,
      );
    }
    if (
      locked &&
      summary.objective.id === 'o3' &&
      state.week.rtFix === 'switch'
    ) {
      reasons.push(
        'The answer changed Thursday. Reps spent on the old call do not carry over.',
      );
    }
    if (
      locked &&
      summary.objective.id === 'o5' &&
      state.week.rtFix === 'accept'
    ) {
      reasons.push(
        'You accepted lower readiness here Thursday. It stays at Introduced by choice.',
      );
    }
    return reasons;
  };

  const place = (objectiveId: PracticeObjectiveId, day: PracticeDayId) => {
    dispatch({ type: 'allocate-practice-block', objectiveId, day });
    setPickMessage(false);
  };

  const dropOnDay = (event: DragEvent<HTMLElement>, day: PracticeDayId) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain') || dragging || '';
    setDragging(null);
    if (raw.startsWith('block:')) {
      dispatch({
        type: 'move-practice-block',
        blockId: raw.slice('block:'.length),
        day,
      });
    } else if (raw.startsWith('objective:')) {
      place(raw.slice('objective:'.length), day);
    }
  };

  const prepared = practiceSummaries.filter(
    (summary) =>
      summary.availability === 'available' && summary.readiness === 'Rehearsed',
  );
  const thin = practiceSummaries.filter(
    (summary) =>
      summary.availability === 'available' &&
      summary.readiness !== 'Unseen' &&
      summary.readiness !== 'Rehearsed',
  );
  const uncovered = practiceSummaries.filter(
    (summary) =>
      summary.availability === 'accepted-risk' ||
      (summary.availability === 'available' && summary.readiness === 'Unseen'),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ScreenHeading
          title="Practice · Week 8"
          subtitle="Monday–Thursday script · preparing for Central Catholic (Fri)"
        />
        <span className="flex-1" />
        <p role="status" aria-live="polite" aria-atomic="true" className="m-0">
          <StatusChip
            tone={locked ? 'good' : practiceGate.remaining ? 'risk' : 'accent'}
          >
            {locked
              ? 'Plan locked'
              : `${practiceGate.placedCount} of ${practiceGate.capacity} blocks placed`}
          </StatusChip>
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Training sections"
        className="flex gap-1.5"
      >
        {(['Practice Plan', 'Development'] as const).map((label) => (
          <PillButton
            key={label}
            role="tab"
            aria-selected={tab === label}
            pressed={tab === label}
            onClick={() => setTab(label)}
          >
            {label}
          </PillButton>
        ))}
      </div>

      {tab === 'Development' ? (
        <DevelopmentPanel intensity={intensity} setIntensity={setIntensity} />
      ) : (
        <>
          {!planGate.ready && (
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <StatusDot tone="risk" />
              <p className="text-ink-muted m-0 min-w-0 flex-[1_1_320px] text-[12.5px] leading-relaxed">
                Practice is gated by the current Game Plan. Three distinct
                priorities, a separate accepted risk, and one
                scheme/personnel-valid answer per priority are required before
                blocks can be allocated or locked.
              </p>
              <Button
                variant="primary"
                onClick={() =>
                  dispatch({ type: 'navigate', screen: 'game-plan' })
                }
              >
                Open Game Plan
              </Button>
            </Card>
          )}

          {!locked && (selected !== undefined || pickMessage) && (
            <div
              role="status"
              className="edge bg-surface flex flex-wrap items-center gap-2 rounded-[10px] px-3.5 py-2.5"
            >
              <StatusDot tone={selected === undefined ? 'risk' : 'accent'} />
              <span className="text-ink min-w-0 flex-1 text-[12.5px] font-medium">
                {selected === undefined
                  ? 'Pick an objective first, then choose the day it gets repped.'
                  : `Placing “${selected.objective.name}” — choose an open block on any day.`}
              </span>
              {selected !== undefined && (
                <Button
                  variant="quiet"
                  className="h-7"
                  onClick={() => setSelectedObjective(null)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          <section aria-label="Monday through Thursday practice script">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {scenario.practiceDays.map((day) => {
                const blocks = state.week.practiceBlocks.filter(
                  (block) => block.day === day.id,
                );
                const openSlots = day.capacity - blocks.length;
                return (
                  <Card
                    key={day.id}
                    as="article"
                    aria-labelledby={`practice-day-${day.id}`}
                    className="overflow-hidden p-0"
                  >
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropOnDay(event, day.id)}
                    >
                      <header className="edge px-3.5 py-3">
                        <div className="flex items-baseline gap-2">
                          <h2
                            id={`practice-day-${day.id}`}
                            className="text-ink-subtle m-0 font-mono text-[11px] font-normal"
                          >
                            {day.id} · {day.date}
                          </h2>
                          <span className="flex-1" />
                          <span className="text-ink-subtle font-mono text-[11px]">
                            {day.duration}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <StatusDot
                            tone={
                              day.id === 'TUE'
                                ? 'danger'
                                : day.id === 'WED'
                                  ? 'risk'
                                  : 'good'
                            }
                          />
                          <span className="text-ink text-[13px] font-medium">
                            {day.pads}
                          </span>
                        </div>
                        <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-relaxed">
                          {day.note}
                        </p>
                      </header>

                      <div className="edge bg-surface-sunken px-3.5 py-3">
                        <Kicker tone="neutral">Fixed script</Kicker>
                        <ul className="mt-2 mb-0 flex list-none flex-col gap-1 p-0">
                          {day.fixed.map((period) => (
                            <li
                              key={`${period.minutes}-${period.name}`}
                              className="text-ink-subtle flex gap-2 text-[11.5px]"
                            >
                              <span className="w-7 shrink-0 font-mono">
                                {period.minutes}m
                              </span>
                              <span>{period.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="px-3.5 py-3">
                        <div className="mb-2 flex items-baseline gap-2">
                          <Kicker tone="neutral">Opponent plan</Kicker>
                          <span className="flex-1" />
                          <span className="text-ink-subtle font-mono text-[11px]">
                            {blocks.length} of {day.capacity}
                          </span>
                        </div>
                        <ol
                          aria-label={`${day.id} opponent-plan blocks`}
                          className="m-0 flex list-none flex-col gap-2 p-0"
                        >
                          {blocks.map((block) => {
                            const summary = practiceSummaries.find(
                              (item) => item.objective.id === block.objectiveId,
                            );
                            if (summary === undefined) return null;
                            return (
                              <li
                                key={block.id}
                                draggable={!locked}
                                onDragStart={(event) => {
                                  const value = `block:${block.id}`;
                                  event.dataTransfer.setData(
                                    'text/plain',
                                    value,
                                  );
                                  event.dataTransfer.effectAllowed = 'move';
                                  setDragging(value);
                                }}
                                onDragEnd={() => setDragging(null)}
                                title={
                                  locked ? undefined : 'Drag to another day'
                                }
                                className="edge bg-surface rounded-[8px] p-2.5"
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    aria-hidden="true"
                                    className="text-ink-faint text-[11px] tracking-widest"
                                  >
                                    ⠿
                                  </span>
                                  <span className="text-ink min-w-0 flex-1 text-[12.5px] leading-snug font-medium">
                                    {summary.objective.name}
                                  </span>
                                  {!locked && (
                                    <button
                                      type="button"
                                      aria-label={`Remove ${summary.objective.name} from ${day.id}`}
                                      className="text-ink-faint hover:text-danger cursor-pointer border-0 bg-transparent p-0 text-[15px] leading-none"
                                      onClick={() =>
                                        dispatch({
                                          type: 'remove-practice-block',
                                          blockId: block.id,
                                        })
                                      }
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <MetaPill>{day.id} · 10 min</MetaPill>
                                  <MetaPill>
                                    {summary.objective.unit} ·{' '}
                                    {summary.objective.group}
                                  </MetaPill>
                                  <MetaPill>
                                    {expectedPracticeReps(
                                      block,
                                      scenario,
                                      state.week,
                                    )}{' '}
                                    expected reps
                                  </MetaPill>
                                  <MetaPill>
                                    <StatusDot
                                      tone={block.live ? 'danger' : 'neutral'}
                                    />
                                    {contactLabel(day.id, block.live)}
                                  </MetaPill>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-ink-subtle text-[11px]">
                                    {summary.objective.coach}
                                  </span>
                                  <span className="flex-1" />
                                  {day.contact && !locked && (
                                    <button
                                      type="button"
                                      className="text-accent cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-medium"
                                      onClick={() =>
                                        dispatch({
                                          type: 'set-practice-block-live',
                                          blockId: block.id,
                                          live: !block.live,
                                        })
                                      }
                                    >
                                      {block.live
                                        ? 'Take it to thud'
                                        : 'Take it live'}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                          {Array.from({ length: openSlots }, (_, index) => {
                            const slotNumber = blocks.length + index + 1;
                            if (locked || !planGate.ready) {
                              return (
                                <li
                                  key={`unused-${slotNumber}`}
                                  className="edge bg-surface-sunken text-ink-faint rounded-[8px] p-2.5 text-[11.5px]"
                                >
                                  {locked
                                    ? 'Unused block — practice time you did not spend'
                                    : 'Waiting on the game plan'}
                                </li>
                              );
                            }
                            return (
                              <li key={`open-${slotNumber}`}>
                                <button
                                  type="button"
                                  aria-label={
                                    selected === undefined
                                      ? `Open block ${slotNumber} on ${day.id}; select an objective first`
                                      : `Place ${selected.objective.name} on ${day.id}, block ${slotNumber}`
                                  }
                                  onClick={() => {
                                    if (selected === undefined) {
                                      setPickMessage(true);
                                      return;
                                    }
                                    place(selected.objective.id, day.id);
                                  }}
                                  className={`edge w-full cursor-pointer rounded-[8px] px-2.5 py-3 text-left text-[12px] font-medium ${
                                    selected === undefined
                                      ? 'bg-surface-sunken text-ink-subtle'
                                      : 'bg-accent-soft text-accent'
                                  }`}
                                >
                                  +{' '}
                                  {selected === undefined
                                    ? 'Open block'
                                    : `Place — ${selected.objective.name}`}
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <Card
              className="overflow-hidden p-0"
              aria-labelledby="objectives-heading"
            >
              <div className="edge flex items-center gap-2 px-4 py-3">
                <h2
                  id="objectives-heading"
                  className="text-ink m-0 text-[13px] font-medium"
                >
                  Objectives competing for the plan
                </h2>
                <span className="flex-1" />
                <span className="text-ink-subtle font-mono text-[11.5px]">
                  {practiceSummaries.length} objectives visible ·{' '}
                  {practiceGate.placedCount} of {practiceGate.capacity} blocks
                  placed
                </span>
              </div>
              <div>
                {practiceSummaries.map((summary) => {
                  const available = summary.availability === 'available';
                  const selectedNow =
                    selectedObjective === summary.objective.id;
                  const canPlace =
                    available &&
                    planGate.ready &&
                    !locked &&
                    practiceGate.remaining > 0;
                  const people = objectivePeople(
                    summary.objective.id,
                    state.week,
                  );
                  const readiness = available
                    ? summary.readiness
                    : AVAILABILITY_LABEL[summary.availability];
                  const hypothesis = scenario.hypotheses.find(
                    (item) => item.id === summary.objective.hypothesisId,
                  );
                  const counts =
                    hypothesis === undefined
                      ? null
                      : evidenceCounts(hypothesis.id, scenario);
                  return (
                    <article
                      key={summary.objective.id}
                      aria-labelledby={`objective-${summary.objective.id}`}
                      draggable={canPlace}
                      onDragStart={(event) => {
                        const value = `objective:${summary.objective.id}`;
                        event.dataTransfer.setData('text/plain', value);
                        event.dataTransfer.effectAllowed = 'copy';
                        setDragging(value);
                        setSelectedObjective(summary.objective.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={`edge px-4 py-3.5 ${
                        summary.availability === 'accepted-risk'
                          ? 'bg-surface-sunken'
                          : 'bg-surface'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1.5">
                          <StatusDot
                            tone={
                              available
                                ? (READINESS_TONE[summary.readiness] ??
                                  'neutral')
                                : summary.availability === 'invalid-answer'
                                  ? 'danger'
                                  : summary.availability === 'accepted-risk'
                                    ? 'risk'
                                    : 'neutral'
                            }
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3
                              id={`objective-${summary.objective.id}`}
                              className="text-ink m-0 text-[13.5px] font-medium tracking-[-0.14px]"
                            >
                              {summary.objective.name}
                            </h3>
                            <MetaPill>{summary.objective.unit}</MetaPill>
                            <span className="text-ink-subtle text-[10.5px] font-medium">
                              {summary.objective.contact
                                ? 'Needs contact'
                                : 'No contact needed'}
                            </span>
                          </div>
                          <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-relaxed">
                            {objectiveSource(summary)}
                            {counts === null
                              ? ''
                              : ` · ${counts.supporting} supporting clips, ${counts.contradicting} against · ${hypothesis?.snaps ?? counts.total} snaps across ${hypothesis?.games ?? 0} games`}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[11.5px] font-medium ${
                            readiness === 'Rehearsed'
                              ? 'text-good-ink'
                              : readiness === 'Accepted risk'
                                ? 'text-risk-ink'
                                : readiness === 'Invalid answer'
                                  ? 'text-danger'
                                  : 'text-ink-muted'
                          }`}
                        >
                          {readiness}
                        </span>
                      </div>

                      <div className="mt-2.5 ml-[19px] flex flex-wrap items-center gap-2.5">
                        <div className="bg-surface-raised h-1 min-w-[120px] flex-[1_1_180px] overflow-hidden rounded-full">
                          <div
                            className={`h-full ${
                              summary.expectedReps >= summary.targetReps
                                ? 'bg-good'
                                : summary.expectedReps > 0
                                  ? 'bg-ink'
                                  : 'bg-hairline'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (summary.expectedReps / summary.targetReps) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-ink-muted font-mono text-[11px]">
                          {summary.expectedReps} reps · target{' '}
                          {summary.targetReps}
                        </span>
                        <span className="text-ink-subtle font-mono text-[11px]">
                          {summary.blocks.length}{' '}
                          {summary.blocks.length === 1 ? 'block' : 'blocks'} ·{' '}
                          {summary.objective.coach}
                        </span>
                      </div>

                      <ul className="text-ink-muted mt-2.5 mb-0 ml-[19px] flex list-none flex-col gap-1 p-0 text-[11.5px] leading-relaxed">
                        {readinessReasons(summary).map((reason, index) => (
                          <li key={`${index}-${reason}`}>{reason}</li>
                        ))}
                      </ul>

                      <div className="mt-2.5 ml-[19px] flex flex-wrap items-center gap-2.5">
                        <div className="flex min-w-0 flex-[1_1_240px] flex-wrap gap-2.5">
                          {people.map((person) => (
                            <span
                              key={`${person.name}-${person.position}`}
                              className="text-ink-subtle inline-flex items-center gap-1.5 text-[11px]"
                            >
                              <StatusDot
                                tone={
                                  person.status === 'Ineligible'
                                    ? 'danger'
                                    : person.status === 'No contact'
                                      ? 'risk'
                                      : 'good'
                                }
                              />
                              {person.name}{' '}
                              <span className="text-ink-faint font-mono">
                                {person.position}
                              </span>{' '}
                              {person.status}
                            </span>
                          ))}
                        </div>
                        {canPlace && (
                          <Button
                            variant={selectedNow ? 'primary' : 'secondary'}
                            className="h-[30px] px-3 text-[12px]"
                            aria-pressed={selectedNow}
                            onClick={() => {
                              setSelectedObjective(
                                selectedNow ? null : summary.objective.id,
                              );
                              setPickMessage(false);
                            }}
                          >
                            {selectedNow
                              ? 'Choose a day above'
                              : summary.blocks.length
                                ? 'Add another block'
                                : 'Place a block'}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>

            <aside className="flex flex-col gap-3">
              <Card aria-labelledby="plan-controls-heading" className="p-4">
                <h2
                  id="plan-controls-heading"
                  className="text-ink mt-0 mb-3 text-[13px] font-medium"
                >
                  The plan
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={locked || state.week.practiceUndo.length === 0}
                    onClick={() => dispatch({ type: 'undo-practice-blocks' })}
                  >
                    Undo
                  </Button>
                  <Button
                    disabled={locked || !planGate.ready}
                    onClick={() => {
                      dispatch({ type: 'reset-practice-to-staff-plan' });
                      setSelectedObjective(null);
                      setPickMessage(false);
                    }}
                  >
                    Reset to staff plan
                  </Button>
                  <Button
                    disabled={locked || !draftDirty}
                    onClick={() => dispatch({ type: 'save-practice-draft' })}
                  >
                    Save draft
                  </Button>
                </div>
                <p
                  className={`mt-2 mb-0 text-[11.5px] leading-relaxed ${
                    locked || (draftSignature !== null && !draftDirty)
                      ? 'text-good-ink'
                      : draftDirty
                        ? 'text-risk-ink'
                        : 'text-ink-subtle'
                  }`}
                >
                  {locked
                    ? 'Locked plan · no draft changes allowed.'
                    : draftSignature === null
                      ? state.week.practiceBlocks.length
                        ? 'Unsaved changes · save a draft before leaving the allocator.'
                        : 'No saved draft · allocate a block to begin.'
                      : draftDirty
                        ? 'Unsaved changes since the saved draft.'
                        : 'Draft saved · no unsaved changes.'}
                </p>
                <Button
                  variant="primary"
                  className="mt-3 w-full justify-center"
                  disabled={locked || !practiceGate.ready}
                  title={practiceGate.body}
                  onClick={() => {
                    dispatch({ type: 'lock-practice-plan' });
                    setSelectedObjective(null);
                  }}
                >
                  {locked
                    ? 'Plan locked'
                    : practiceGate.remaining > 0
                      ? `Allocate ${practiceGate.remaining} more to lock`
                      : 'Lock the practice plan'}
                </Button>
                <p className="text-ink-subtle mt-2 mb-0 text-[11.5px] leading-relaxed">
                  {locked
                    ? 'Locked Tuesday 2:30 PM. Reset Week starts the week over.'
                    : !planGate.ready
                      ? 'The Game Plan is invalid. Every priority needs one valid answer, the accepted risk must stay distinct, and all scheme/personnel dependencies must match.'
                      : practiceGate.remaining > 0
                        ? `${practiceGate.remaining} ${practiceGate.remaining === 1 ? 'block is' : 'blocks are'} still unplaced. All eight 10-minute blocks must be allocated before the plan can lock.`
                        : 'Locking prints the script for the staff and moves the week to Thursday.'}
                </p>
              </Card>

              {locked && (
                <Card
                  aria-labelledby="friday-summary-heading"
                  className="overflow-hidden p-0"
                >
                  <h2
                    id="friday-summary-heading"
                    className="edge text-ink m-0 px-4 py-3 text-[13px] font-medium"
                  >
                    What Friday looks like
                  </h2>
                  <SummaryGroup label="Prepared" tone="good" items={prepared} />
                  <SummaryGroup label="Thin" tone="risk" items={thin} />
                  <SummaryGroup
                    label="Knowingly uncovered"
                    tone="neutral"
                    items={uncovered}
                  />
                </Card>
              )}

              <Card aria-labelledby="risk-heading" className="p-4">
                <div className="flex items-center gap-2">
                  <StatusDot tone="risk" />
                  <h2
                    id="risk-heading"
                    className="text-ink m-0 text-[13px] font-medium"
                  >
                    Accepted risk
                  </h2>
                </div>
                <p className="text-ink mt-2 mb-0 text-[12.5px] font-medium">
                  {acceptedRisk === undefined
                    ? 'No risk accepted yet.'
                    : `${acceptedRisk.short} — ${acceptedRisk.unit}`}
                </p>
                <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-relaxed">
                  {acceptedRisk === undefined
                    ? 'Three concerns get practice time. The fourth is a risk you take on purpose — you name it in the Film Room.'
                    : `${acceptedRisk.statement} It gets no practice time, and it stays on this page all week.`}
                </p>
              </Card>

              <Card
                aria-labelledby="constraints-heading"
                className="overflow-hidden p-0"
              >
                <div className="edge flex items-center gap-2 px-4 py-3">
                  <h2
                    id="constraints-heading"
                    className="text-ink m-0 text-[13px] font-medium"
                  >
                    Not yours to override
                  </h2>
                  <span className="flex-1" />
                  <span className="text-good-ink font-mono text-[11px] font-medium">
                    All accounted for
                  </span>
                </div>
                {locked && (
                  <ConstraintRow
                    title="Ryan Kowalski · RT"
                    status="Ineligible"
                    tone="danger"
                    detail="GPA 1.9. Out for Friday. The next eligibility checkpoint is Oct 26 — nothing you do this week changes that."
                    authority="Guidance Office"
                  />
                )}
                {locked && (
                  <ConstraintRow
                    title="Hunter McCoy · FB"
                    status="No contact"
                    tone="risk"
                    detail="Bruised ribs. Conditioning only through Friday. The trainer re-evaluates him Monday."
                    authority="Athletic Trainer"
                  />
                )}
                <ConstraintRow
                  title="One full-pads day left"
                  status="Tuesday"
                  tone="accent"
                  detail="District contact limits leave Tuesday as the only heavy-contact window. Anything that needs live reps has to live there."
                  authority="District policy"
                />
              </Card>

              <Card aria-labelledby="balance-heading" className="p-4">
                <h2
                  id="balance-heading"
                  className="text-ink mt-0 mb-3 text-[13px] font-medium"
                >
                  Where the reps went
                </h2>
                {unitBalance.map((unit) => (
                  <div key={unit.unit} className="mb-3 last:mb-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-ink-muted flex-1 text-[12.5px]">
                        {unit.label}
                      </span>
                      <span className="text-ink-subtle font-mono text-[11px]">
                        {unit.blocks} {unit.blocks === 1 ? 'block' : 'blocks'}
                      </span>
                      <span className="text-ink-muted font-mono text-[11px]">
                        {unit.reps} reps
                      </span>
                    </div>
                    <div className="bg-surface-raised mt-1.5 h-1 overflow-hidden rounded-full">
                      <div
                        className={unit.blocks ? 'bg-ink h-full' : 'h-full'}
                        style={{
                          width: `${Math.min(100, Math.round((unit.reps / 34) * 100))}%`,
                        }}
                      />
                    </div>
                    {unit.blocks === 0 && (
                      <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
                        Nothing on the plan for this unit.
                      </p>
                    )}
                  </div>
                ))}
                <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-relaxed">
                  Blocks on a both-units objective count for offense and defense
                  alike.
                </p>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function MetaPill({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="edge bg-surface-sunken text-ink-muted inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium">
      {children}
    </span>
  );
}

function SummaryGroup({
  label,
  tone,
  items,
}: {
  readonly label: string;
  readonly tone: StatusTone;
  readonly items: readonly PracticeObjectiveSummary[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="edge px-4 py-3" aria-label={label}>
      <div className="text-ink-subtle flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.05em] uppercase">
        <StatusDot tone={tone} />
        {label}
      </div>
      {items.map((summary) => (
        <div key={summary.objective.id} className="mt-2">
          <p className="text-ink m-0 text-[12.5px] font-medium">
            {summary.objective.name}
          </p>
          <p className="text-ink-subtle mt-0.5 mb-0 text-[11px]">
            {summary.availability === 'accepted-risk'
              ? 'Accepted risk — no practice time, by choice.'
              : summary.readiness === 'Rehearsed'
                ? `${summary.expectedReps} reps across ${summary.blocks.length} blocks`
                : `${summary.readiness} · ${summary.expectedReps} reps${summary.contactCapped ? ' · never went live' : ''}`}
          </p>
        </div>
      ))}
    </section>
  );
}

function ConstraintRow({
  title,
  status,
  tone,
  detail,
  authority,
}: {
  readonly title: string;
  readonly status: string;
  readonly tone: StatusTone;
  readonly detail: string;
  readonly authority: string;
}) {
  return (
    <div className="edge px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusDot tone={tone} />
        <span className="text-ink min-w-0 flex-1 text-[12.5px] font-medium">
          {title}
        </span>
        <span className="text-ink-muted font-mono text-[11px] font-medium">
          {status}
        </span>
      </div>
      <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-relaxed">
        {detail}
      </p>
      <p className="text-ink-faint mt-1 mb-0 text-[11px]">
        Decided by {authority}
      </p>
    </div>
  );
}

function DevelopmentPanel({
  intensity,
  setIntensity,
}: {
  readonly intensity: string;
  readonly setIntensity: (value: string) => void;
}) {
  return (
    <section
      aria-labelledby="development-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2
            id="development-heading"
            className="text-ink m-0 text-[13.5px] font-semibold tracking-[-0.27px]"
          >
            Individual development · Week 8
          </h2>
          <p className="text-ink-subtle mt-0.5 mb-0 text-[12px]">
            Runs underneath the opponent plan every week
          </p>
        </div>
        <span className="flex-1" />
        <Kicker tone="neutral">Intensity</Kicker>
        <div className="flex gap-1.5">
          {['Light', 'Normal', 'Heavy'].map((label) => (
            <PillButton
              key={label}
              pressed={intensity === label}
              onClick={() => setIntensity(label)}
            >
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEVELOPMENT_DAYS.map((day) => (
          <Card key={day.day} className="p-4">
            <span className="text-ink-subtle font-mono text-[11px]">
              {day.day}
            </span>
            <h3 className="text-ink mt-1 mb-0 text-[13.5px] font-semibold tracking-[-0.27px]">
              {day.title}
            </h3>
            <p className="text-ink-muted mt-1 mb-0 text-[12px] leading-relaxed">
              {day.focus}
            </p>
            <div className="text-ink-subtle mt-3 flex items-center gap-2 text-[11.5px]">
              <StatusDot tone={day.tone} />
              {day.load} load
            </div>
          </Card>
        ))}
      </div>

      <Card aria-labelledby="individual-development-list" className="p-4">
        <Kicker tone="neutral">Individual Development</Kicker>
        <h3 id="individual-development-list" className="sr-only">
          Individual development assignments
        </h3>
        <ul className="mt-2 mb-0 list-none p-0">
          {DEVELOPMENT_PLAYERS.map(([name, position, focus, note, trend]) => (
            <li
              key={name}
              className="edge grid gap-2 py-2 text-[12.5px] sm:grid-cols-[130px_36px_1fr_24px]"
            >
              <span className="text-ink font-medium">{name}</span>
              <span className="text-ink-subtle font-mono text-[11px]">
                {position}
              </span>
              <span className="text-ink-muted">
                {focus} — <span className="text-ink-subtle">{note}</span>
              </span>
              <span
                className={trend === '▲' ? 'text-good-ink' : 'text-ink-subtle'}
              >
                {trend}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
