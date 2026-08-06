import type { ReactNode } from 'react';

import type {
  PracticeObjective,
  ScoutingTab,
  ScreenId,
  StageId,
  TacticsTab,
} from '../domain/types.ts';
import { RT_FIXES } from '../domain/disruption.ts';
import { deriveDecisionReview } from '../domain/decisionReview.ts';
import { evidenceCounts, stageIndex } from '../domain/week.ts';
import { useWeek } from '../state/weekContext.ts';
import { StatusDot, type StatusTone } from '../components/ui.tsx';

type StageProgress = 'done' | 'current' | 'upcoming';

const PROGRESS: Record<
  StageProgress,
  { readonly label: string; readonly tone: StatusTone }
> = {
  done: { label: 'Done', tone: 'good' },
  current: { label: 'Now', tone: 'accent' },
  upcoming: { label: 'Ahead', tone: 'neutral' },
};

const OBJECTIVE_PERSONNEL: Readonly<Record<string, string>> = {
  o1: 'S. Okafor (MLB, active), C. Dean (WLB, active), H. McCoy (FB, active)',
  o2: 'N. Reyes (LB, active), B. Hartley (DE, active), D. Ford (NB, active)',
  o3: 'M. Reed (QB, active), A. Silva (WR, active), R. Kowalski (RT, active)',
  o4: 'C. Ramsey (K, active), D. Pierce (S, active), T. Coker (LB, active)',
  o5: 'R. Kowalski (RT, active), L. Webb (OT, active), P. Ruiz (OG, active)',
  o6: 'M. Reed (QB, active), D. Carter (RB, active), T. Jackson (CB, active)',
};

const UNIT_LABEL: Readonly<Record<PracticeObjective['unit'], string>> = {
  OFF: 'OFF',
  DEF: 'DEF',
  ST: 'ST',
  BOTH: 'BOTH',
};

interface DecisionCopy {
  readonly due: string;
  readonly title: string;
  readonly body: string;
  readonly why: string;
  readonly cta: string;
  readonly screen?: ScreenId;
  readonly scoutingTab?: ScoutingTab;
  readonly tacticsTab?: TacticsTab;
  readonly alt: string;
  readonly altScreen?: ScreenId;
  readonly unsupported?: string;
}

const DECISIONS: Readonly<Record<StageId, DecisionCopy>> = {
  evidence: {
    due: 'Due Monday 4:00 PM',
    title: 'Choose three opponent concerns worth practice time',
    body: 'Coach Soto cut 32 clips from Central Catholic’s last three games and put four candidate tendencies on the board. You have practice time for three. The fourth becomes a risk you accept on purpose.',
    why: 'Tuesday’s install script and every practice block this week are built from what you prioritize today.',
    cta: 'Open Film Room',
    screen: 'scouting',
    scoutingTab: 'Film Room',
    alt: 'Read the staff notes',
    altScreen: 'inbox',
  },
  plan: {
    due: 'Due Tuesday 7:00 AM',
    title: 'Pick one answer for each concern you prioritized',
    body: 'Each concern needs a single active answer — a fit rule, a call, or a personnel package. Every answer buys you something and leaves something else exposed.',
    why: 'Practice objectives are generated from your answers. Until they exist there is nothing to allocate reps to.',
    cta: 'Open Game Plan',
    screen: 'game-plan',
    alt: 'Back to the evidence',
    altScreen: 'scouting',
  },
  practice: {
    due: 'Due Tuesday 2:30 PM',
    title: 'Allocate eight opponent-plan blocks',
    body: 'The fixed periods are already on the script. You control eight ten-minute priority blocks across Monday through Thursday, and six objectives are competing for them.',
    why: 'Tuesday is the last full-pads day. Contact-dependent objectives cannot be repped after it.',
    cta: 'Open Practice Plan',
    screen: 'practice',
    alt: 'Review the game plan',
    altScreen: 'game-plan',
  },
  disruption: {
    due: 'Due Thursday 6:00 PM',
    title: 'Resolve right tackle and reallocate the lost reps',
    body: 'Kowalski is ineligible and the protection answer built around him has no body. Promote a backup, simplify the package, or accept lower readiness — each one costs something different.',
    why: 'Friday personnel has to be legal before kickoff, and blocks assigned to an unavailable player produce no readiness.',
    cta: 'Open Depth Chart',
    screen: 'game-plan',
    tacticsTab: 'Depth Chart',
    alt: 'Open Academics',
    altScreen: 'academics',
  },
  friday: {
    due: 'Due Friday 7:15 PM',
    title: 'Confirm Friday policies and take the field',
    body: 'Four calls are yours before kickoff: fourth down, conversions, clock and timeouts, and the one adjustment your coordinators may make without asking.',
    why: 'Once the game starts you answer situations, not scripts. Policies decide what happens when nobody has time to consult you.',
    cta: 'Enter Decision Room',
    screen: 'match',
    alt: 'Review the plan',
    altScreen: 'game-plan',
  },
  review: {
    due: 'Saturday morning',
    title: 'Review the week — decision, execution, result',
    body: 'The scoreboard is one output of many. Walk the chain: what you knew, what you chose, what you practiced, and what actually happened on the field.',
    why: 'Next week’s opponent board is seeded from the lessons you save tonight.',
    cta: 'Open Decision Review',
    screen: 'review',
    alt: '',
  },
};

function Section({
  children,
  labelledBy,
  className = '',
  ...rest
}: {
  children: ReactNode;
  labelledBy: string;
  className?: string;
  'data-cohort-note'?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`edge-raised overflow-hidden rounded-xl bg-white ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

function TextButton({
  children,
  onClick,
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="text-accent disabled:text-ink-faint shrink-0 cursor-pointer border-0 bg-transparent p-0 font-sans text-[11.5px] font-medium hover:text-[#005fcc] disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function stageProgress(stage: StageId, current: StageId): StageProgress {
  const delta = stageIndex(stage) - stageIndex(current);
  return delta < 0 ? 'done' : delta === 0 ? 'current' : 'upcoming';
}

export function WeekHub() {
  const {
    scenario,
    state,
    gate,
    planGate,
    practiceGate,
    practiceSummaries,
    disruptionGate,
    staffFilmDelegateEvent,
    cohortCarryOver,
    dispatch,
  } = useWeek();
  const { week } = state;
  const review = deriveDecisionReview(week, scenario);
  const disrupted = week.practicePlanLocked;
  const cutAssigned = staffFilmDelegateEvent.response !== null;
  const baseDecision = DECISIONS[week.stage];
  const decision: DecisionCopy = week.reviewClosed
    ? {
        due: `Final · ${review.score.replace(`${scenario.program.school} `, '').replace(` ${scenario.opponent.name}`, '')}`,
        title: `${review.result === 'WIN' ? 'Beat' : 'Fell to'} Central Catholic — Riverside is next`,
        body: 'The review is on file and your saved lessons are pinned to the Riverside board. Away, Friday Oct 23 — Soto’s first cut of film arrives Sunday night.',
        why: 'A week is closed when its lessons are written down, not when the clock hits zero.',
        cta: 'Reopen the review',
        screen: 'review' as const,
        alt: '',
      }
    : week.stage === 'disruption'
      ? {
          ...baseDecision,
          title: disruptionGate.title,
          body: disruptionGate.body,
          cta: disruptionGate.confirmed
            ? 'Review resolution'
            : 'Open Depth Chart',
        }
      : baseDecision;
  const currentStage = scenario.stages.find((stage) => stage.id === week.stage);
  const risk =
    gate.acceptedRisk === null
      ? null
      : (scenario.hypotheses.find(
          (hypothesis) => hypothesis.id === gate.acceptedRisk,
        ) ?? null);

  const navigate = (
    screen: ScreenId,
    scoutingTab?: ScoutingTab,
    tacticsTab?: TacticsTab,
  ) =>
    dispatch({
      type: 'navigate',
      screen,
      ...(scoutingTab === undefined ? {} : { scoutingTab }),
      ...(tacticsTab === undefined ? {} : { tacticsTab }),
    });

  function objectiveTrace(objective: PracticeObjective): string {
    if (objective.hypothesisId === null) return objective.note ?? '';
    const hypothesis = scenario.hypotheses.find(
      (item) => item.id === objective.hypothesisId,
    );
    if (hypothesis === undefined) return '';
    const counts = evidenceCounts(hypothesis.id, scenario);
    return `From “${hypothesis.short}” · ${counts.supporting} supporting clips, ${counts.contradicting} against · ${hypothesis.snaps} snaps across ${hypothesis.games} games`;
  }

  function objectiveReason(
    objective: PracticeObjective,
    summary: (typeof practiceSummaries)[number],
  ): string {
    const answer = Object.values(planGate.activeAnswers).find(
      (item) => item.objectiveId === objective.id,
    );
    let personnel = disrupted
      ? (OBJECTIVE_PERSONNEL[objective.id] ?? '')
          .replace('H. McCoy (FB, active)', 'H. McCoy (FB, no contact)')
          .replace('R. Kowalski (RT, active)', 'R. Kowalski (RT, ineligible)')
      : OBJECTIVE_PERSONNEL[objective.id];
    if (disruptionGate.starterName !== null) {
      personnel = personnel?.replace(
        'R. Kowalski (RT, ineligible)',
        `${disruptionGate.starterName} (RT, active)`,
      );
    }
    if (summary.availability === 'accepted-risk') {
      return `Knowingly uncovered · 0 periods · 0 reps, by choice. Personnel — ${personnel}. Constraint — ${objective.contact ? 'Contact objective; only Tuesday can produce a live rep.' : 'No live contact required; Monday, Wednesday, and Thursday remain non-live.'}`;
    }
    if (summary.availability === 'off-board') {
      return 'Candidate concern. Prioritize it in the Film Room to make it practiceable.';
    }
    if (answer === undefined && objective.hypothesisId !== null) {
      return 'No answer chosen yet — the Game Plan decides what these reps are for.';
    }
    const answerLead =
      answer === undefined
        ? ''
        : `Answer — “${answer.name}” · target ${answer.targetReps} reps · ${answer.owner}. `;
    const fix = RT_FIXES.find((item) => item.id === week.rtFix);
    const disruptionReason =
      disrupted && objective.id === 'o5'
        ? !disruptionGate.rtLegal
          ? ' Kowalski is ineligible — there is no starting body yet.'
          : fix === undefined
            ? ` ${disruptionGate.starterName} is in the slot, but the package answer is still open.`
            : ` ${fix.name} — ${fix.effect}, with ${disruptionGate.starterName} at right tackle.`
        : '';
    return `${answerLead}${summary.blocks.length} block${summary.blocks.length === 1 ? '' : 's'} · ${summary.expectedReps} expected reps · target ${summary.targetReps}. Personnel — ${personnel}. Constraint — ${objective.contact ? 'Contact objective; only Tuesday can produce a live rep.' : 'No live contact required; Monday, Wednesday, and Thursday remain non-live.'}${disruptionReason}`;
  }

  const openObjective = (objective: PracticeObjective) => {
    if (objective.hypothesisId !== null) navigate('scouting', 'Film Room');
    else if (objective.id === 'o5')
      navigate('game-plan', undefined, 'Depth Chart');
    else navigate('practice');
  };

  return (
    <div data-screen-label="Week">
      <div className="mb-4 flex flex-wrap items-end gap-3.5">
        <div className="min-w-0">
          <h1 className="m-0 text-base font-semibold tracking-[-0.32px]">
            Coaching Week · Central Catholic
          </h1>
          <p className="text-ink-subtle mt-1 mb-0 text-[12.5px] text-pretty">
            Westfield 6–1 (#2) vs Central Catholic 7–0 (#1) · Friday Oct 16,
            7:30 PM · Wildcat Stadium
          </p>
        </div>
        <span className="min-w-3 flex-1" />
        <span className="edge text-ink-muted inline-flex items-center gap-2 rounded-full bg-white px-3 py-[5px] text-[11.5px] font-medium whitespace-nowrap">
          <StatusDot tone="risk" />
          Winner takes the district title and the home seed
        </span>
      </div>

      <nav aria-label="Week stages" className="mb-[18px] overflow-x-auto pb-1">
        <ol className="m-0 flex list-none gap-2 p-0">
          {scenario.stages.map((stage) => {
            const progress = stageProgress(stage.id, week.stage);
            const enabled =
              stage.id === 'evidence' ||
              (stage.id === 'plan' && gate.ready) ||
              (stage.id === 'practice' && planGate.ready) ||
              (stage.id === 'disruption' && practiceGate.locked) ||
              (stage.id === 'friday' && disruptionGate.confirmed) ||
              (stage.id === 'review' && review.empty === false);
            return (
              <li key={stage.id} className="min-w-[130px] flex-1">
                <button
                  type="button"
                  aria-current={progress === 'current' ? 'step' : undefined}
                  disabled={!enabled}
                  title={
                    !enabled ? 'Complete the prior gate first.' : undefined
                  }
                  onClick={() => {
                    if (stage.id === 'evidence')
                      navigate('scouting', 'Film Room');
                    if (stage.id === 'plan') navigate('game-plan');
                    if (stage.id === 'practice') navigate('practice');
                    if (stage.id === 'disruption')
                      navigate('game-plan', undefined, 'Depth Chart');
                    if (stage.id === 'friday') navigate('match');
                    if (stage.id === 'review') navigate('review');
                  }}
                  className={`text-ink focus-visible:ring-accent w-full rounded-[10px] border-0 px-3 py-2.5 text-left font-sans outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${
                    progress === 'current'
                      ? 'cursor-pointer bg-white shadow-[0_0_0_1.5px_#171717,0_2px_2px_rgba(0,0,0,0.04)]'
                      : 'edge bg-surface-sunken'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <StatusDot tone={PROGRESS[progress].tone} />
                    <span className="text-ink-subtle font-mono text-[10.5px] font-medium tracking-[0.5px]">
                      {stage.day}
                    </span>
                  </span>
                  <span
                    className={`mt-1 block truncate text-[12.5px] ${progress === 'current' ? 'font-semibold' : 'font-normal'}`}
                  >
                    {stage.title}
                  </span>
                  <span className="text-ink-subtle mt-0.5 block text-[11px]">
                    {PROGRESS[progress].label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          <Section
            labelledBy="next-decision-heading"
            className="p-[18px_20px_16px]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot tone="accent" />
              <span className="text-accent font-mono text-[10.5px] font-medium tracking-[0.6px] uppercase">
                {week.reviewClosed ? 'Week 8 complete' : 'Next decision · '}
                {!week.reviewClosed &&
                  (week.stage === 'evidence'
                    ? 'Monday'
                    : week.stage === 'plan'
                      ? 'Tuesday'
                      : week.stage === 'practice'
                        ? 'Wednesday'
                        : week.stage === 'disruption'
                          ? 'Thursday'
                          : week.stage === 'friday'
                            ? 'Friday'
                            : 'Saturday')}
              </span>
              <span className="min-w-2 flex-1" />
              <span className="text-ink-subtle font-mono text-[11.5px]">
                {decision.due}
              </span>
            </div>
            <h2
              id="next-decision-heading"
              className="mt-2.5 mb-0 text-[19px] font-semibold tracking-[-0.42px] text-pretty"
            >
              {decision.title}
            </h2>
            <p className="text-ink-muted mt-[7px] mb-0 max-w-[64ch] text-[13px] leading-[1.62] text-pretty">
              {decision.body}
            </p>
            <div className="mt-[15px] flex flex-wrap gap-2">
              <button
                type="button"
                disabled={decision.screen === undefined}
                title={
                  decision.screen === undefined
                    ? decision.unsupported
                    : undefined
                }
                onClick={() => {
                  if (decision.screen !== undefined)
                    navigate(
                      decision.screen,
                      decision.scoutingTab,
                      decision.tacticsTab,
                    );
                }}
                className="bg-ink disabled:bg-surface-raised disabled:text-ink-faint h-[34px] cursor-pointer rounded-md border-0 px-[15px] font-sans text-[13px] font-medium text-white hover:bg-[#383838] disabled:cursor-not-allowed"
              >
                {decision.cta}
              </button>
              {decision.alt !== '' && (
                <button
                  type="button"
                  disabled={decision.altScreen === undefined}
                  title={
                    decision.altScreen === undefined
                      ? decision.unsupported
                      : undefined
                  }
                  onClick={() => {
                    if (decision.altScreen !== undefined)
                      navigate(
                        decision.altScreen,
                        decision.altScreen === 'scouting'
                          ? 'Film Room'
                          : undefined,
                      );
                  }}
                  className="edge text-ink-muted hover:bg-surface-raised hover:text-ink disabled:text-ink-faint h-[34px] cursor-pointer rounded-md border-0 bg-white px-[15px] font-sans text-[13px] font-medium disabled:cursor-not-allowed"
                >
                  {decision.alt}
                </button>
              )}
              {decision.unsupported !== undefined && (
                <span className="text-ink-subtle self-center text-[11px]">
                  {decision.unsupported}
                </span>
              )}
            </div>
            <div className="text-ink-subtle mt-[15px] pt-3 text-xs leading-[1.55] text-pretty shadow-[inset_0_1px_0_rgba(0,0,0,0.07)]">
              <span className="text-ink-muted font-medium">Why now — </span>
              {decision.why}
            </div>
          </Section>

          {week.reviewClosed && review.savedLessons.length > 0 && (
            <Section
              labelledBy="hub-lessons-heading"
              data-cohort-note={cohortCarryOver.note}
            >
              <div className="edge flex items-center gap-2 px-4 py-[13px]">
                <StatusDot tone="accent" />
                <h2
                  id="hub-lessons-heading"
                  className="m-0 text-[13px] font-medium"
                >
                  Lessons pinned for Riverside
                </h2>
                <span className="flex-1" />
                <span className="text-ink-subtle font-mono text-[11px]">
                  {review.savedLessons.length} of 3 saved
                </span>
              </div>
              <div className="flex flex-col gap-2 px-4 py-3.5">
                {review.savedLessons.map((lesson) => (
                  <p
                    key={lesson.id}
                    className="text-ink-muted m-0 flex items-start gap-[9px] text-[11.5px] leading-[1.55] text-pretty"
                  >
                    <span className="mt-[5px]">
                      <StatusDot tone="good" />
                    </span>
                    {lesson.text}
                  </p>
                ))}
              </div>
            </Section>
          )}

          <Section labelledBy="objectives-heading">
            <div className="flex items-center gap-2.5 px-4 py-[13px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.07)]">
              <h2
                id="objectives-heading"
                className="m-0 text-[13px] font-medium"
              >
                Preparation objectives
              </h2>
              <span className="flex-1" />
              <span className="text-ink-subtle font-mono text-[11.5px]">
                {practiceGate.placedCount} of 8 practice blocks placed
              </span>
            </div>
            {practiceSummaries.map((summary) => {
              const { objective } = summary;
              const acceptedRisk = summary.availability === 'accepted-risk';
              const offBoard = summary.availability === 'off-board';
              const readiness = acceptedRisk
                ? 'Accepted risk'
                : offBoard
                  ? gate.priorityIds.length > 0
                    ? 'Off the board'
                    : 'Not prioritized'
                  : summary.availability === 'invalid-answer'
                    ? 'Invalid answer'
                    : summary.readiness;
              const tone: StatusTone = acceptedRisk
                ? 'risk'
                : summary.availability === 'invalid-answer'
                  ? 'danger'
                  : summary.readiness === 'Rehearsed'
                    ? 'good'
                    : summary.readiness === 'Repped'
                      ? 'accent'
                      : summary.readiness === 'Introduced'
                        ? 'risk'
                        : 'neutral';
              return (
                <article
                  key={objective.id}
                  className={`flex items-start gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] ${acceptedRisk ? 'bg-surface-sunken' : 'bg-white'}`}
                >
                  <span className="mt-[5px]">
                    <StatusDot tone={tone} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="m-0 text-[13px] font-medium">
                        {objective.name}
                      </h3>
                      <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px font-mono text-[10.5px] font-medium">
                        {UNIT_LABEL[objective.unit]}
                      </span>
                    </div>
                    <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-normal text-pretty">
                      {objectiveTrace(objective)}
                    </p>
                    <p className="text-ink-subtle mt-[3px] mb-0 text-[11.5px] leading-normal text-pretty">
                      {objectiveReason(objective, summary)}
                    </p>
                  </div>
                  <div className="mt-0.5 flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap ${acceptedRisk ? 'text-risk' : summary.availability === 'invalid-answer' ? 'text-danger' : 'text-ink-subtle'}`}
                    >
                      {readiness}
                    </span>
                    <TextButton
                      disabled={objective.id === 'o6' && !planGate.ready}
                      title={
                        objective.id === 'o6' && !planGate.ready
                          ? 'Set one valid answer for every priority first.'
                          : undefined
                      }
                      onClick={() => openObjective(objective)}
                    >
                      {objective.hypothesisId === null
                        ? objective.id === 'o5'
                          ? 'Open Depth Chart'
                          : 'Open Practice Plan'
                        : 'View evidence'}
                    </TextButton>
                  </div>
                </article>
              );
            })}
          </Section>

          <Section labelledBy="changes-heading" className="p-4">
            <h2
              id="changes-heading"
              className="mt-0 mb-2.5 text-[13px] font-medium"
            >
              What changed since yesterday
            </h2>
            {disrupted && (
              <>
                <div className="mb-[9px] flex items-start gap-2.5">
                  <span className="mt-[5px]">
                    <StatusDot tone="hold" />
                  </span>
                  <p className="text-ink-muted m-0 min-w-0 flex-1 text-[12.5px] leading-[1.55] text-pretty">
                    <span className="text-ink font-medium">
                      Guidance Office
                    </span>{' '}
                    posted an eligibility alert — Kowalski is out for Friday.
                  </p>
                  <TextButton onClick={() => navigate('academics')}>
                    Academics
                  </TextButton>
                </div>
                <div className="mb-[9px] flex items-start gap-2.5">
                  <span className="mt-[5px]">
                    <StatusDot tone="danger" />
                  </span>
                  <p className="text-ink-muted m-0 min-w-0 flex-1 text-[12.5px] leading-[1.55] text-pretty">
                    <span className="text-ink font-medium">D. Ferris, ATC</span>{' '}
                    cleared McCoy for conditioning only. No contact through
                    Friday.
                  </p>
                  <TextButton onClick={() => navigate('squad')}>
                    Squad
                  </TextButton>
                </div>
              </>
            )}
            <div className="flex items-start gap-2.5">
              <span className="mt-[5px]">
                <StatusDot tone="accent" />
              </span>
              <p className="text-ink-muted m-0 min-w-0 flex-1 text-[12.5px] leading-[1.55] text-pretty">
                <span className="text-ink font-medium">District Office</span>{' '}
                reseeded Central Catholic to #1. Friday decides the district
                title.
              </p>
              <TextButton onClick={() => navigate('schedule')}>
                Schedule
              </TextButton>
            </div>
          </Section>
        </div>

        <div className="flex max-w-[420px] min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <Section labelledBy="constraints-heading">
            <div className="flex items-center gap-2 px-4 py-[13px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.07)]">
              <h2
                id="constraints-heading"
                className="m-0 text-[13px] font-medium"
              >
                Constraints
              </h2>
              <span className="flex-1" />
              <span
                className={`font-mono text-[11px] font-medium ${disrupted ? 'text-danger' : 'text-good'}`}
              >
                {disrupted
                  ? disruptionGate.confirmed
                    ? 'Resolved'
                    : `${disruptionGate.unresolved} to resolve`
                  : 'All accounted for'}
              </span>
            </div>
            {disrupted && (
              <>
                <div className="px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <StatusDot
                      tone={disruptionGate.rtResolved ? 'good' : 'danger'}
                    />
                    <h3 className="m-0 min-w-0 flex-1 text-[12.5px] font-medium">
                      Ryan Kowalski · RT
                    </h3>
                    <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px text-[10.5px] font-medium">
                      {disruptionGate.rtResolved ? 'Resolved' : 'Ineligible'}
                    </span>
                  </div>
                  <p className="text-ink-subtle mt-[5px] mb-0 text-[11.5px] leading-normal text-pretty">
                    GPA 1.9. Out for Friday. The next eligibility checkpoint is
                    Oct 26 — nothing you do this week changes that.
                  </p>
                  <div className="mt-[7px] flex items-center gap-2">
                    <span className="text-ink-subtle text-[11px]">
                      Authority · Guidance Office
                    </span>
                    <span className="flex-1" />
                    <TextButton onClick={() => navigate('academics')}>
                      Open Academics
                    </TextButton>
                  </div>
                </div>
                <div className="px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <StatusDot tone="risk" />
                    <h3 className="m-0 min-w-0 flex-1 text-[12.5px] font-medium">
                      Hunter McCoy · FB
                    </h3>
                    <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px text-[10.5px] font-medium">
                      No contact
                    </span>
                  </div>
                  <p className="text-ink-subtle mt-[5px] mb-0 text-[11.5px] leading-normal text-pretty">
                    Bruised ribs. Conditioning only through Friday. The trainer
                    re-evaluates him Monday.
                  </p>
                  <div className="mt-[7px] flex items-center gap-2">
                    <span className="text-ink-subtle text-[11px]">
                      Authority · Athletic Trainer
                    </span>
                    <span className="flex-1" />
                    <TextButton onClick={() => navigate('squad')}>
                      Open Squad
                    </TextButton>
                  </div>
                </div>
              </>
            )}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <StatusDot tone="accent" />
                <h3 className="m-0 min-w-0 flex-1 text-[12.5px] font-medium">
                  One full-pads day left
                </h3>
                <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px text-[10.5px] font-medium">
                  Tuesday
                </span>
              </div>
              <p className="text-ink-subtle mt-[5px] mb-0 text-[11.5px] leading-normal text-pretty">
                The Week 8 schedule leaves Tuesday as the only heavy-contact
                window. Anything that needs live reps has to live there.
              </p>
              <div className="mt-[7px] flex items-center gap-2">
                <span className="text-ink-subtle text-[11px]">
                  Authority · Week 8 scenario
                </span>
                <span className="flex-1" />
                <TextButton
                  disabled={!planGate.ready}
                  title={
                    planGate.ready
                      ? undefined
                      : 'Set one valid answer for every priority first.'
                  }
                  onClick={() => navigate('practice')}
                >
                  Open Practice Plan
                </TextButton>
              </div>
            </div>
            <div className="px-4 py-3 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]">
              <p className="text-ink-muted m-0 text-[11.5px] font-medium">
                Rules · {scenario.jurisdictionRuleSet.jurisdiction} ·{' '}
                {scenario.jurisdictionRuleSet.issuer} ·{' '}
                {scenario.jurisdictionRuleSet.season}
              </p>
              <p className="text-ink-subtle mt-1 mb-0 font-mono text-[10.5px]">
                Rule-set snapshot effective ·{' '}
                {scenario.jurisdictionRuleSet.effectiveDate}
              </p>
              <div
                aria-label="Official rule sources"
                className="mt-2 flex flex-col items-start gap-1"
              >
                {scenario.jurisdictionRuleSet.sources.map((source) => (
                  <div key={source.id} className="flex flex-col items-start">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent text-[10.5px] leading-normal hover:text-[#005fcc]"
                    >
                      Source · {source.title}
                    </a>
                    <span className="text-ink-subtle font-mono text-[9.5px]">
                      Publication · {source.publishedDate ?? 'Not stated'} ·{' '}
                      Source effective · {source.effectiveDate ?? 'Not stated'}{' '}
                      · Retrieved · {source.retrievedDate ?? 'Not recorded'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section labelledBy="risk-heading" className="p-4">
            <div className="flex items-center gap-2">
              <h2 id="risk-heading" className="m-0 text-[13px] font-medium">
                Accepted risk
              </h2>
              <span className="flex-1" />
              <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px font-mono text-[10.5px] font-medium">
                {risk === null ? 'Not chosen' : 'Chosen'}
              </span>
            </div>
            <p
              className={`mt-[9px] mb-0 text-[12.5px] leading-[1.55] ${risk === null ? 'text-ink-muted' : 'text-ink font-medium'}`}
            >
              {risk === null
                ? 'No risk accepted yet.'
                : `${risk.short} — ${risk.unit}`}
            </p>
            <p className="text-ink-subtle mt-[5px] mb-0 text-[11.5px] leading-normal text-pretty">
              {risk === null
                ? 'Three concerns get practice time. The fourth is a risk you take on purpose — you name it in the Film Room.'
                : `${risk.statement} It gets no practice time, and it stays on this page all week.`}
            </p>
            <button
              type="button"
              onClick={() => navigate('scouting', 'Film Room')}
              className="edge text-ink-muted hover:bg-surface-raised hover:text-ink mt-[11px] h-[30px] cursor-pointer rounded-md border-0 bg-white px-3 font-sans text-xs font-medium"
            >
              {risk === null ? 'Open Film Room' : 'Review the evidence'}
            </button>
          </Section>

          <Section labelledBy="staff-heading" className="p-4">
            <h2
              id="staff-heading"
              className="mt-0 mb-[11px] text-[13px] font-medium"
            >
              From the staff
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
                  “Thirty-two clips are cut and tagged. Two of them argue
                  against the power read — I left them in.”
                </p>
                <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
                  M. Soto · Graduate Assistant · Film
                </p>
              </div>
              {cutAssigned && (
                <div>
                  <p className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
                    “{staffFilmDelegateEvent.consequence}”
                  </p>
                  <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
                    M. Soto · Graduate Assistant · Film
                  </p>
                </div>
              )}
              <div>
                <p className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
                  “If we spend Tuesday on run fits, sprint-out contain becomes a
                  Thursday walkthrough in shells. That is the trade.”
                </p>
                <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
                  B. Tillman · Defensive Coordinator
                </p>
              </div>
              {disrupted && (
                <div>
                  <p className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
                    “McCoy can condition. He does not take contact this week.
                    That one is not a coaching decision.”
                  </p>
                  <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
                    D. Ferris · Athletic Trainer
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      {!gate.ready && <span className="sr-only">Nothing prioritized yet.</span>}
      <footer className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[11px] text-[#c9c9c9]">
          v1.5.0 — Coaching Week
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => dispatch({ type: 'reset-week' })}
          className="edge text-ink-subtle hover:text-ink h-7 cursor-pointer rounded-md border-0 bg-white px-[11px] font-sans text-[11.5px] font-medium"
        >
          Reset week
        </button>
      </footer>
      <span className="sr-only">Current date: {currentStage?.date}, 2026.</span>
    </div>
  );
}
