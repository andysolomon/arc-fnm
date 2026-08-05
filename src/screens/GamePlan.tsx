import { useState } from 'react';

import {
  KOWALSKI_AUTHORITY,
  RT_FIXES,
  RT_STARTERS,
} from '../domain/disruption.ts';
import type { GamePlanAnswer, ScoutingHypothesis } from '../domain/types.ts';
import { answerValidity, evidenceCounts } from '../domain/week.ts';
import { useWeek } from '../state/weekContext.ts';
import {
  Button,
  Card,
  Kicker,
  PillButton,
  ScreenHeading,
  StatusChip,
  StatusDot,
} from '../components/ui.tsx';
import {
  DEPTH_UNITS,
  SITUATIONAL_POLICIES,
  type DepthPhase,
  type TacticsTab,
} from './gamePlanData.ts';

const TACTICS_TABS: readonly TacticsTab[] = [
  'Game Plan',
  'Depth Chart',
  'Situational Policies',
];

/** Canonical UI-3 Tactics surface for the deterministic Week 8 scenario. */
export function GamePlan() {
  const { scenario, state, gate, planGate, dispatch } = useWeek();
  const tab = state.nav.tacticsTab;
  const setTab = (tacticsTab: TacticsTab) =>
    dispatch({ type: 'navigate', screen: 'game-plan', tacticsTab });
  const [depthPhase, setDepthPhase] = useState<DepthPhase>('Offense');
  const risk = scenario.hypotheses.find(
    (hypothesis) => hypothesis.id === gate.acceptedRisk,
  );
  const priorities = gate.validSelection.flatMap((id) => {
    const hypothesis = scenario.hypotheses.find(
      (candidate) => candidate.id === id,
    );
    return hypothesis === undefined ? [] : [hypothesis];
  });
  const subtitle =
    tab === 'Game Plan'
      ? `One answer for each concern you prioritized · ${scenario.opponent.name}, Friday`
      : tab === 'Depth Chart'
        ? DEPTH_UNITS[depthPhase].subtitle
        : 'Standing calls your staff may act on before they can reach you';

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-wrap items-end gap-3">
        <ScreenHeading title={`Tactics · ${tab}`} subtitle={subtitle} />
        <span className="flex-1" />
        <p role="status" aria-live="polite" aria-atomic="true" className="m-0">
          <StatusChip
            tone={planGate.ready ? 'good' : gate.ready ? 'risk' : 'neutral'}
          >
            {gate.ready
              ? planGate.ready
                ? 'Plan complete'
                : `${planGate.answeredCount} of ${planGate.requiredCount} answers set`
              : 'Board not set'}
          </StatusChip>
          <span className="sr-only">{planGate.status}</span>
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Tactics sections"
        className="my-3.5 flex flex-wrap gap-1.5"
      >
        {TACTICS_TABS.map((item) => {
          const count =
            item === 'Game Plan'
              ? priorities.length > 0
                ? `${planGate.answeredCount}/${priorities.length}`
                : ''
              : item === 'Situational Policies'
                ? '4'
                : '';
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              aria-controls={`tactics-${item.toLowerCase().replaceAll(' ', '-')}`}
              onClick={() => setTab(item)}
              className={`focus-visible:ring-accent inline-flex h-[30px] cursor-pointer items-center gap-2 rounded-full border-0 px-3.5 text-[12.5px] font-medium outline-none focus-visible:ring-2 ${
                tab === item
                  ? 'bg-ink text-white'
                  : 'edge bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              <span>{item}</span>
              {count !== '' && (
                <span
                  className={`font-mono text-[11px] ${tab === item ? 'text-white/60' : 'text-ink-subtle'}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section
        aria-label="Accepted risk"
        className="edge bg-surface mb-3.5 flex flex-wrap items-center gap-2.5 rounded-[10px] px-3.5 py-[9px]"
      >
        <StatusDot tone={risk === undefined ? 'neutral' : 'risk'} />
        <Kicker tone="neutral">Accepted risk</Kicker>
        <span
          className={`text-[12.5px] font-medium ${risk === undefined ? 'text-ink-subtle' : 'text-ink'}`}
        >
          {risk === undefined
            ? 'None accepted yet'
            : `${risk.short} — ${risk.unit}`}
        </span>
        <span className="min-w-2 flex-1" />
        <span className="text-ink-subtle text-[11.5px] text-pretty">
          {risk === undefined
            ? 'Name it in the Film Room before the plan is locked.'
            : 'No practice time goes here, and it comes back up in Saturday’s review.'}
        </span>
        <Button
          variant="quiet"
          className="h-auto px-0 text-[12px] text-[#0072f5]"
          onClick={() =>
            dispatch({
              type: 'navigate',
              screen: 'scouting',
              scoutingTab: 'Hypotheses',
            })
          }
        >
          Evidence
        </Button>
      </section>

      {tab === 'Game Plan' ? (
        <GamePlanTab
          priorities={priorities}
          onOpenDepth={() => setTab('Depth Chart')}
        />
      ) : tab === 'Depth Chart' ? (
        <DepthChartTab phase={depthPhase} onPhaseChange={setDepthPhase} />
      ) : (
        <PoliciesTab />
      )}
    </div>
  );
}

function GamePlanTab({
  priorities,
  onOpenDepth,
}: {
  priorities: readonly ScoutingHypothesis[];
  onOpenDepth: () => void;
}) {
  const { scenario, planGate, dispatch } = useWeek();
  const answeredAll =
    priorities.length > 0 && planGate.answeredCount >= priorities.length;

  if (priorities.length === 0) {
    return (
      <Card className="max-w-[660px]">
        <h2 className="text-[13.5px] font-medium">
          There is nothing to answer yet
        </h2>
        <p className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-[1.62] text-pretty">
          A game plan answers concerns you have already prioritized. Pick three
          in the Film Room and name the one you are accepting — Coach Soto’s
          approaches for each of them show up here with what they buy and what
          they cost.
        </p>
        <Button
          variant="primary"
          className="mt-3.5"
          onClick={() =>
            dispatch({
              type: 'navigate',
              screen: 'scouting',
              scoutingTab: 'Hypotheses',
            })
          }
        >
          Open the Film Room
        </Button>
      </Card>
    );
  }

  const standing = scenario.objectives.filter(
    (objective) => objective.hypothesisId === null,
  );
  const firstIssue =
    planGate.blocker?.kind === 'invalid-answer' ? planGate.blocker.reason : '';

  return (
    <div
      id="tactics-game-plan"
      role="tabpanel"
      className="flex flex-wrap items-start gap-3.5"
    >
      <div className="flex min-w-0 flex-[1_1_580px] flex-col gap-3.5">
        {answeredAll && (
          <section
            aria-label="Game plan completion"
            className={`flex items-start gap-3 rounded-[12px] p-4 ${
              planGate.ready
                ? 'bg-[#f1f8f3] ring-1 ring-[rgba(69,165,87,0.35)]'
                : 'bg-[#fff7f7] ring-1 ring-[rgba(229,72,77,0.3)]'
            }`}
          >
            <StatusDot tone={planGate.ready ? 'good' : 'danger'} />
            <div className="min-w-0 flex-1">
              <h2
                className={`m-0 text-[13.5px] font-semibold tracking-[-0.2px] ${planGate.ready ? 'text-[#398e4a]' : 'text-danger'}`}
              >
                {planGate.ready
                  ? 'Every concern has a valid answer'
                  : 'The board is full, but the plan is not valid'}
              </h2>
              <p className="text-ink-muted mt-1 mb-0 text-[12.5px] leading-[1.6] text-pretty">
                {planGate.ready
                  ? 'Three answers, three practice objectives, and the staff has been told who owns each one. Right tackle is still open, and one answer depends on it.'
                  : `${firstIssue} Fix the dependency or switch answers before the practice plan is locked.`}
              </p>
            </div>
            <Button
              variant={planGate.ready ? 'primary' : 'secondary'}
              disabled={!planGate.ready}
              aria-label={
                planGate.ready ? 'Build Practice Plan' : 'Review the conflict'
              }
              onClick={() => dispatch({ type: 'navigate', screen: 'practice' })}
            >
              {planGate.ready
                ? 'Lock the plan · go to Practice'
                : 'Review the conflict'}
            </Button>
          </section>
        )}

        {priorities.map((hypothesis) => (
          <ConcernAnswers key={hypothesis.id} hypothesis={hypothesis} />
        ))}

        <Card
          aria-labelledby="plan-gate-heading"
          className="flex flex-wrap items-center gap-2.5 p-4"
        >
          <div className="min-w-0 flex-[1_1_320px]">
            <h2 id="plan-gate-heading" className="m-0 text-[13px] font-medium">
              {planGate.title}
            </h2>
            <p className="text-ink-muted mt-1 mb-0 text-[12px] leading-[1.55] text-pretty">
              {planGate.body}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!planGate.ready}
            aria-label={
              planGate.ready
                ? 'Lock the plan · go to Practice'
                : 'Set every answer'
            }
            onClick={() => dispatch({ type: 'navigate', screen: 'practice' })}
          >
            {planGate.ready
              ? 'Lock the plan · go to Practice'
              : 'Set every answer'}
          </Button>
        </Card>
      </div>

      <aside className="flex max-w-[430px] min-w-0 flex-[1_1_290px] flex-col gap-3.5">
        <Card className="overflow-hidden p-0">
          <h2 className="edge m-0 px-4 py-3 text-[13px] font-medium">
            Personnel this plan depends on
          </h2>
          <div className="edge px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot tone="danger" />
              <span className="text-[12.5px] font-medium">
                Ryan Kowalski · RT
              </span>
              <span className="flex-1" />
              <span className="text-ink-muted text-[11px] font-medium">
                Ineligible Friday
              </span>
            </div>
            <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
              Every five-step answer on offense runs through this slot. Guidance
              Office status cannot be overridden.
            </p>
            <button
              type="button"
              className="text-accent mt-2.5 cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium"
              onClick={onOpenDepth}
            >
              Open Depth Chart
            </button>
          </div>
          <div className="edge px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot tone="risk" />
              <span className="text-[12.5px] font-medium">
                Hunter McCoy · FB
              </span>
              <span className="flex-1" />
              <span className="text-ink-muted text-[11px] font-medium">
                No contact
              </span>
            </div>
            <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
              He is the only scout back who runs Central’s counter correctly,
              and he cannot take a live rep before Friday.
            </p>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="edge px-4 py-3">
            <h2 className="m-0 text-[13px] font-medium">Standing objectives</h2>
            <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-[1.5] text-pretty">
              These exist every week. They compete for the same eight blocks as
              your opponent answers.
            </p>
          </div>
          {standing.map((objective) => (
            <div key={objective.id} className="edge px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[12.5px] font-medium">
                  {objective.name}
                </span>
                <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px font-mono text-[10.5px] font-medium">
                  {objective.unit}
                </span>
              </div>
              <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-[1.55] text-pretty">
                {objective.note}
              </p>
            </div>
          ))}
        </Card>
      </aside>
    </div>
  );
}

function ConcernAnswers({ hypothesis }: { hypothesis: ScoutingHypothesis }) {
  const { scenario, state, dispatch } = useWeek();
  const answers = scenario.answers.filter(
    (answer) => answer.hypothesisId === hypothesis.id,
  );
  const activeId = state.week.answers[hypothesis.id];
  const active = answers.find((answer) => answer.id === activeId);
  const activeValid =
    active === undefined ? false : answerValidity(state.week, active).ok;
  const counts = evidenceCounts(hypothesis.id, scenario);
  const headingId = `plan-${hypothesis.id}`;

  return (
    <Card
      as="article"
      aria-labelledby={headingId}
      className="overflow-hidden p-0"
    >
      <div className="edge px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot
            tone={
              active === undefined ? 'risk' : activeValid ? 'good' : 'danger'
            }
          />
          <h2
            id={headingId}
            className="m-0 text-[13.5px] font-semibold tracking-[-0.2px]"
          >
            {hypothesis.short}
          </h2>
          <span className="bg-surface-raised text-ink-muted rounded px-1.5 py-px font-mono text-[10.5px] font-medium">
            {hypothesis.unit}
          </span>
          <span className="flex-1" />
          <span
            className={`text-[11px] font-medium ${active === undefined ? 'text-risk' : activeValid ? 'text-[#398e4a]' : 'text-danger'}`}
          >
            {active === undefined
              ? 'No answer yet'
              : activeValid
                ? 'Answer set · valid'
                : 'Answer set · invalid'}
          </span>
        </div>
        <p className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-[1.6] text-pretty">
          {hypothesis.statement}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="edge bg-surface-sunken text-ink-muted rounded-full px-2.5 py-[3px] font-mono text-[11px] font-medium">
            {counts.supporting} supporting / {counts.contradicting} against ·{' '}
            {hypothesis.snaps} snaps · {hypothesis.games} games
          </span>
          <Button
            variant="quiet"
            className="h-auto px-0 text-[12px] text-[#0072f5]"
            onClick={() =>
              dispatch({
                type: 'navigate',
                screen: 'scouting',
                scoutingTab: 'Film Room',
              })
            }
          >
            Show the evidence
          </Button>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col p-0">
        {answers.map((answer) => (
          <AnswerOption
            key={answer.id}
            answer={answer}
            unit={hypothesis.unit}
            active={activeId === answer.id}
            onChoose={() =>
              dispatch({
                type: 'choose-answer',
                hypothesisId: hypothesis.id,
                answerId: answer.id,
              })
            }
          />
        ))}
      </ul>
    </Card>
  );
}

function AnswerOption({
  answer,
  unit,
  active,
  onChoose,
}: {
  answer: GamePlanAnswer;
  unit: ScoutingHypothesis['unit'];
  active: boolean;
  onChoose: () => void;
}) {
  const { scenario, state, planGate, dispatch } = useWeek();
  const objective = scenario.objectives.find(
    (candidate) => candidate.id === answer.objectiveId,
  );
  const validity = answerValidity(state.week, answer);
  const dependency = [
    answer.packageName,
    ...answer.personnelDependencies.map(
      (item) => `${item.role}: ${item.player} · ${item.requires}`,
    ),
  ].join(' · ');

  return (
    <li className="edge px-3 py-2.5">
      <button
        type="button"
        aria-pressed={active}
        onClick={onChoose}
        className={`text-ink focus-visible:ring-accent block w-full cursor-pointer rounded-[8px] border-0 p-3 text-left outline-none focus-visible:ring-2 ${
          active
            ? 'bg-surface edge-strong shadow-[0_2px_2px_rgba(0,0,0,0.04)]'
            : 'bg-surface-sunken edge hover:bg-surface'
        }`}
      >
        <span className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={`mt-0.5 size-[13px] shrink-0 rounded-full ${
              active ? 'bg-ink ring-ink ring-1' : 'ring-hairline ring-[1.5px]'
            }`}
          />
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[13px] leading-[1.45] text-pretty ${active ? 'font-semibold' : 'font-medium'}`}
            >
              {answer.name}
            </span>
            <span className="text-ink-subtle mt-1 block text-[12px] leading-[1.55] text-pretty">
              {answer.gist}
            </span>
          </span>
          {answer.schemeRequirement !== undefined && (
            <span className="edge bg-surface text-ink-muted shrink-0 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium">
              {answer.schemeRequirement.label}
            </span>
          )}
        </span>

        {active && (
          <span className="edge mt-3 block pt-3">
            <span className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Primary unit" value={unit} />
              <Detail label="How it works" value={answer.how} />
              <Detail label="Personnel" value={answer.personnel} />
              <Detail label="Package dependency" value={dependency} />
              <Detail
                label="Owns it"
                value={`${answer.owner} · ${answer.ownerRole}`}
              />
              <Detail label="Success cue" value={answer.successCue} />
              <Detail label="What it buys" value={answer.buys} tone="good" />
              <Detail
                label="What it exposes"
                value={answer.exposes}
                tone="risk"
              />
              <Detail
                label="Counter-risk"
                value={answer.counterRisk}
                tone="hold"
              />
              <Detail
                label={validity.ok ? 'Valid now' : 'Invalid now'}
                value={validity.explanation}
                tone={validity.ok ? 'good' : 'danger'}
              />
            </span>
          </span>
        )}
      </button>

      {active && (
        <div className="mx-0.5 mt-2.5 flex flex-wrap items-center gap-2">
          <Kicker tone="neutral">Creates</Kicker>
          <span className="text-ink text-[12.5px] font-medium">
            {objective?.name}
          </span>
          <span className="edge bg-surface-sunken text-ink-muted rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium">
            {answer.targetReps} target reps
          </span>
          <span className="edge bg-surface-sunken text-ink-muted rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            {answer.contact
              ? 'Live contact — Tuesday only'
              : 'No contact needed'}
          </span>
          <Button
            variant="quiet"
            className="h-auto px-0 text-[12px] text-[#0072f5]"
            aria-disabled={!planGate.ready}
            title={
              planGate.ready
                ? 'Open the Practice Plan'
                : 'Set every valid answer first'
            }
            onClick={() => dispatch({ type: 'navigate', screen: 'practice' })}
          >
            Practice plan
          </Button>
        </div>
      )}

      {active && !validity.ok && answer.schemeRequirement !== undefined && (
        <div className="edge bg-surface-sunken mt-2.5 flex flex-wrap items-center gap-2.5 rounded-[8px] px-3 py-2.5">
          <StatusDot tone="danger" />
          <span className="text-ink-muted min-w-0 flex-[1_1_260px] text-[12px] leading-[1.55] text-pretty">
            This answer is built on the {answer.schemeRequirement.label}. You
            are running {state.week[answer.schemeRequirement.decision]} — the
            fits do not carry over, and the practice objective it created is not
            repping what you will play.
          </span>
          <Button
            variant="primary"
            className="h-[30px] text-[12px]"
            onClick={() =>
              dispatch({ type: 'adopt-answer-scheme', answerId: answer.id })
            }
          >
            Switch to {answer.schemeRequirement.value}
          </Button>
        </div>
      )}
    </li>
  );
}

function Detail({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'risk' | 'hold' | 'danger';
}) {
  return (
    <span className="block">
      <span className="flex items-center gap-1.5">
        {tone !== undefined && <StatusDot tone={tone} />}
        <span
          className={`font-mono text-[10px] font-medium tracking-[0.05em] uppercase ${tone === 'danger' ? 'text-danger' : 'text-ink-subtle'}`}
        >
          {label}
        </span>
      </span>
      <span className="text-ink-muted mt-1 block text-[12px] leading-[1.55] text-pretty">
        {value}
      </span>
    </span>
  );
}

function PoliciesTab() {
  const { state, dispatch } = useWeek();
  const policies = state.week.policies;
  const frozen = state.week.matchStarted;
  return (
    <div
      id="tactics-situational-policies"
      role="tabpanel"
      className="flex flex-wrap items-start gap-3.5"
    >
      <Card className="min-w-0 flex-[1_1_560px] overflow-hidden p-0">
        {SITUATIONAL_POLICIES.map((policy) => {
          const current = policies[policy.id] ?? policy.defaultValue;
          const selected =
            policy.options.find((option) => option.value === current) ??
            policy.options[0];
          const changed = current !== policy.defaultValue;
          return (
            <section
              key={policy.id}
              aria-labelledby={`policy-${policy.id}`}
              className="edge px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <h2
                  id={`policy-${policy.id}`}
                  className="m-0 text-[13px] font-medium"
                >
                  {policy.title}
                </h2>
                <span className="text-ink-subtle text-[11px]">
                  {policy.when}
                </span>
                <span className="flex-1" />
                <span className="text-ink-subtle font-mono text-[11px]">
                  Executed by {policy.owner}
                </span>
              </div>
              <div
                role="group"
                aria-label={`${policy.title} policy`}
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {policy.options.map((option) => (
                  <PillButton
                    key={option.value}
                    pressed={current === option.value}
                    disabled={frozen}
                    title={
                      frozen
                        ? 'Policies are frozen once you take the field.'
                        : undefined
                    }
                    onClick={() =>
                      dispatch({
                        type: 'set-policy',
                        id: policy.id,
                        value: option.value,
                      })
                    }
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
              <p className="text-ink-muted mt-2.5 mb-0 max-w-[70ch] text-[12px] leading-[1.6] text-pretty">
                <span className="text-ink-subtle">What it costs — </span>
                {selected?.cost}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusDot tone={changed ? 'accent' : 'neutral'} />
                <span
                  className={`text-[11.5px] ${changed ? 'text-ink' : 'text-ink-subtle'}`}
                >
                  {changed
                    ? `Changed from the staff default — ${policy.defaultLabel}. ${policy.owner} has been told.`
                    : 'Staff default. You have not changed it.'}
                </span>
              </div>
            </section>
          );
        })}
      </Card>
      <Card className="max-w-[430px] min-w-0 flex-[1_1_280px] p-4">
        <h2 className="m-0 text-[13px] font-medium">
          Why these are set on Tuesday
        </h2>
        <p className="text-ink-muted mt-2 mb-0 text-[12px] leading-[1.62] text-pretty">
          Every policy here is confirmed again in the Decision Room at 7:15
          Friday. Your coordinators plan around them starting Wednesday.
        </p>
        <p className="text-ink-muted mt-2.5 mb-0 text-[12px] leading-[1.62] text-pretty">
          A policy is not a prediction. It decides what happens in the eleven
          seconds when nobody has time to find you on the sideline.
        </p>
        <p className="edge text-ink-subtle mt-3 mb-0 pt-3 text-[11.5px] leading-[1.55] text-pretty">
          They also feed the third-down and red-zone practice objective, which
          is why changing one shows up on the Week page.
        </p>
      </Card>
    </div>
  );
}

function DepthChartTab({
  phase,
  onPhaseChange,
}: {
  phase: DepthPhase;
  onPhaseChange: (phase: DepthPhase) => void;
}) {
  const { state, disruptionGate, dispatch } = useWeek();
  const unit = DEPTH_UNITS[phase];
  const activeScheme =
    phase === 'Offense'
      ? state.week.offenseScheme
      : phase === 'Defense'
        ? state.week.defenseScheme
        : 'Safe Hands';
  const disrupted = state.week.practicePlanLocked;
  const selectedStarter = RT_STARTERS.find(
    (starter) => starter.id === state.week.rtStarter,
  );
  const selectedFix = RT_FIXES.find((fix) => fix.id === state.week.rtFix);

  return (
    <div id="tactics-depth-chart" role="tabpanel">
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <div>
          <h2 className="m-0 text-[13px] font-medium">
            Starters, bench, and scheme
          </h2>
          <p className="text-ink-subtle mt-0.5 mb-0 text-[11.5px]">
            {unit.subtitle}
          </p>
        </div>
        <div
          role="group"
          aria-label="Depth chart unit"
          className="flex gap-1.5"
        >
          {(['Offense', 'Defense', 'Special Teams'] as const).map((item) => (
            <PillButton
              key={item}
              pressed={phase === item}
              onClick={() => onPhaseChange(item)}
            >
              {item}
            </PillButton>
          ))}
        </div>
        <span className="flex-1" />
        {phase === 'Offense' && (
          <StatusChip tone={disruptionGate.rtResolved ? 'good' : 'danger'}>
            {disrupted
              ? disruptionGate.rtResolved
                ? 'Personnel legal'
                : `${disruptionGate.unresolved} to resolve`
              : '1 academic risk'}
          </StatusChip>
        )}
      </div>

      {disrupted && phase === 'Offense' && (
        <Card
          as="section"
          aria-labelledby="rt-resolution-heading"
          className="mb-4 overflow-hidden p-0"
        >
          <div className="edge bg-[#fff7f7] px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot tone={disruptionGate.rtResolved ? 'good' : 'danger'} />
              <h2
                id="rt-resolution-heading"
                className="m-0 text-[14px] font-semibold"
              >
                {disruptionGate.title}
              </h2>
              <span className="flex-1" />
              <span className="text-ink-muted text-[11.5px] font-medium">
                {disruptionGate.status}
              </span>
            </div>
            <p className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-relaxed">
              {disruptionGate.body}
            </p>
            <p className="text-danger mt-2 mb-0 text-[11.5px] font-medium">
              Eligibility is the {KOWALSKI_AUTHORITY.authority}’s call. The next
              checkpoint is {KOWALSKI_AUTHORITY.checkpoint} — nothing you do
              this week moves it.
            </p>
          </div>

          <div className="grid gap-0 lg:grid-cols-2">
            <fieldset className="edge m-0 border-0 p-4">
              <legend className="m-0 p-0 text-[13px] font-semibold">
                Step 1 · Assign an eligible right tackle
              </legend>
              <p className="text-ink-subtle mt-1 mb-3 text-[11.5px]">
                Kowalski cannot be selected or overridden.
              </p>
              <div className="grid gap-2">
                {RT_STARTERS.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    aria-pressed={state.week.rtStarter === starter.id}
                    disabled={state.week.disruptionConfirmed}
                    onClick={() =>
                      dispatch({
                        type: 'select-rt-starter',
                        starter: starter.id,
                      })
                    }
                    className={`focus-visible:ring-accent rounded-[8px] border-0 p-3 text-left outline-none focus-visible:ring-2 ${
                      state.week.rtStarter === starter.id
                        ? 'bg-accent-soft ring-accent ring-1'
                        : 'edge bg-surface-sunken'
                    }`}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-[12.5px] font-medium">
                        {starter.name}
                      </span>
                      <span className="text-ink-subtle font-mono text-[10.5px]">
                        {starter.position} · {starter.overall} OVR
                      </span>
                    </span>
                    <span className="text-ink-subtle mt-1 block text-[11.5px] leading-relaxed">
                      {starter.cost}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="edge m-0 border-0 p-4">
              <legend className="m-0 p-0 text-[13px] font-semibold">
                Step 2 · Decide the protection package
              </legend>
              <p className="text-ink-subtle mt-1 mb-3 text-[11.5px]">
                One explicit response is required; each changes readiness.
              </p>
              <div className="grid gap-2">
                {RT_FIXES.map((fix) => (
                  <button
                    key={fix.id}
                    type="button"
                    aria-pressed={state.week.rtFix === fix.id}
                    disabled={state.week.disruptionConfirmed}
                    onClick={() =>
                      dispatch({ type: 'select-rt-fix', fix: fix.id })
                    }
                    className={`focus-visible:ring-accent rounded-[8px] border-0 p-3 text-left outline-none focus-visible:ring-2 ${
                      state.week.rtFix === fix.id
                        ? 'bg-accent-soft ring-accent ring-1'
                        : 'edge bg-surface-sunken'
                    }`}
                  >
                    <span className="text-[12.5px] font-medium">
                      {fix.name}
                    </span>
                    <span className="text-ink-subtle mt-1 block text-[11.5px] leading-relaxed">
                      {fix.gist}
                    </span>
                    <span className="text-ink-muted mt-1 block text-[10.5px] font-medium">
                      {fix.effect}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="edge bg-surface-sunken flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="text-ink-muted min-w-0 flex-1 text-[11.5px]">
              {selectedStarter === undefined
                ? 'No legal right tackle assigned.'
                : `${disruptionGate.starterName} is assigned at RT.`}{' '}
              {selectedFix === undefined
                ? 'The package response is still open.'
                : `${selectedFix.name} — ${selectedFix.cost}`}
            </div>
            <Button
              variant="primary"
              disabled={!disruptionGate.ready || state.week.disruptionConfirmed}
              onClick={() => dispatch({ type: 'confirm-disruption' })}
            >
              {state.week.disruptionConfirmed
                ? 'Thursday resolution confirmed'
                : 'Confirm Friday personnel'}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-stretch gap-4">
        <Card className="min-w-0 flex-[1_1_520px] overflow-hidden p-0">
          <div className="edge bg-surface-sunken flex items-center px-4 py-2.5">
            <Kicker tone="neutral">Starting {phase}</Kicker>
            <span className="flex-1" />
            <span className="text-ink-subtle font-mono text-[10.5px]">
              WST 43 · line of scrimmage
            </span>
          </div>
          <ul className="grid list-none grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {unit.starters.map((player) => {
              const resolvedRt =
                disrupted &&
                phase === 'Offense' &&
                player.position === 'RT' &&
                disruptionGate.starterName !== null;
              const name = resolvedRt
                ? disruptionGate.starterName
                : player.name;
              return (
                <li
                  key={`${player.position}-${player.name}`}
                  className={`rounded-md p-2 text-center ${
                    player.unavailable !== undefined && !resolvedRt
                      ? 'ring-danger bg-[#fff7f7] ring-1'
                      : 'edge bg-surface'
                  }`}
                >
                  <span className="text-ink-subtle block font-mono text-[9px] font-medium">
                    {player.position}
                  </span>
                  <span
                    className="mt-px block truncate text-[11.5px] font-medium"
                    title={player.name}
                  >
                    {name}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] font-medium tabular-nums">
                    <StatusDot
                      tone={
                        player.overall >= 80
                          ? 'good'
                          : player.overall >= 65
                            ? 'risk'
                            : 'danger'
                      }
                    />
                    {player.overall}
                  </span>
                  {player.unavailable !== undefined && !resolvedRt && (
                    <span className="text-danger mt-1 block text-[8px] font-medium uppercase">
                      {player.unavailable}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="max-w-[380px] min-w-[230px] flex-[1_1_230px] p-4">
          <div className="mb-2.5 flex items-baseline">
            <Kicker tone="neutral">Bench · {phase}</Kicker>
            <span className="flex-1" />
            <span className="text-ink-subtle text-[10.5px]">depth order</span>
          </div>
          {unit.bench.length === 0 ? (
            <p className="text-ink-subtle text-[12px]">
              Special-teams units share the varsity roster.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {unit.bench.map((player) => (
                <li
                  key={`${player.position}-${player.name}`}
                  className="edge bg-surface-sunken flex items-center gap-2 rounded-md px-2.5 py-2"
                >
                  <span className="bg-surface-raised text-ink-muted min-w-8 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-medium">
                    {player.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">
                    {player.name}
                  </span>
                  {player.unavailable !== undefined && (
                    <StatusDot tone="danger" />
                  )}
                  <span className="text-[11.5px] font-medium tabular-nums">
                    {player.overall}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {unit.schemes.map((scheme) => {
          const active = activeScheme === scheme.name;
          return (
            <button
              key={scheme.name}
              type="button"
              aria-pressed={active}
              disabled
              title="Scheme changes are made through a selected Game Plan answer in this production slice."
              className={`bg-surface disabled:text-ink cursor-not-allowed rounded-[12px] border-0 p-4 text-left disabled:opacity-100 ${active ? 'edge-strong' : 'edge-raised'}`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-[-0.3px]">
                  {scheme.name}
                </span>
                {active && (
                  <span className="bg-ink rounded-full px-2 py-0.5 text-[10px] font-medium text-white">
                    Active
                  </span>
                )}
              </span>
              <span className="text-ink-subtle mt-1 block text-[12px] leading-[1.55] text-pretty">
                {scheme.description}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-ink-subtle mt-2.5 mb-0 text-[11.5px] leading-[1.5] text-pretty">
        Coordinator dials are set by the active scheme. Scheme conflicts are
        repaired through the Game Plan; Thursday personnel is resolved above.
      </p>
    </div>
  );
}
