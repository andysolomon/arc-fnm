/**
 * Match Day / Decision Room, transcribed from the canonical UI-3 prototype.
 *
 * Three surfaces: the locked-out card (before Friday), the pregame Decision
 * Room (four standing policies + the take-the-field snapshot), and the live
 * game (scoreboard, field, key-situation decisions, Quick Adjust, execution
 * feed, playback controls, final state).
 *
 * All game state is derived in `src/domain/matchDay.ts`. The only timer here
 * paces playback of already-deterministic advances — it mirrors the
 * prototype's `loop()` delays and never feeds a value back into state.
 */

import { useEffect } from 'react';

import {
  MATCH_SPEED_DELAY_MS,
  QUICK_ADJUST_CALLS,
  deriveFieldSnapshot,
  deriveMatch,
  type FeedPlay,
  type MatchView,
  type SnapshotItem,
} from '../domain/matchDay.ts';
import type { MatchSpeed } from '../domain/types.ts';
import { useWeek } from '../state/weekContext.ts';
import {
  Button,
  Card,
  Kicker,
  PillButton,
  StatusDot,
  type StatusTone,
} from '../components/ui.tsx';
import { SITUATIONAL_POLICIES } from './gamePlanData.ts';

const SPEED_CONTROLS: readonly { id: MatchSpeed; label: string }[] = [
  { id: 'pause', label: '⏸ Pause' },
  { id: '1x', label: '▶ 1×' },
  { id: 'fast', label: '≫ Fast' },
];

const PLAY_TONE: Record<FeedPlay['k'], StatusTone> = {
  n: 'neutral',
  f: 'good',
  td: 'risk',
  to: 'danger',
  end: 'hold',
};

export function MatchDay() {
  const { state, scenario, dispatch } = useWeek();
  const week = state.week;
  const view = deriveMatch(week, scenario);
  const lockedOut = week.stage !== 'friday' && week.stage !== 'review';

  // Presentation-only pacing, mirroring the canonical loop() delays. State
  // transitions stay deterministic: each tick dispatches the same advance.
  const running =
    !lockedOut &&
    view.phase === 'live' &&
    view.pending === null &&
    week.matchSpeed !== 'pause';
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'match-advance', plays: 1 });
    }, MATCH_SPEED_DELAY_MS[week.matchSpeed]);
    return () => clearTimeout(timer);
  }, [running, week.matchSpeed, week.matchEvents, dispatch]);

  if (lockedOut) return <LockedOut />;
  if (view.phase === 'pregame') return <Pregame />;
  return <LiveGame view={view} />;
}

function LockedOut() {
  const { next, dispatch } = useWeek();
  return (
    <div className="flex min-h-[60%] items-center justify-center p-6">
      <Card className="max-w-[520px]">
        <div className="flex items-center gap-2">
          <StatusDot />
          <Kicker tone="neutral">
            Friday · Oct 16 · 7:30 PM · Wildcat Stadium
          </Kicker>
        </div>
        <h1 className="m-0 mt-2.5 text-[16px] font-semibold tracking-[-0.32px]">
          Kickoff is Friday night
        </h1>
        <p className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-[1.62] text-pretty">
          The Decision Room opens when the week&rsquo;s work is done — evidence
          read, answers set, practice locked, and a legal depth chart. The game
          you get is the one you prepared.
        </p>
        <Button
          variant="primary"
          className="mt-3.5"
          onClick={() =>
            dispatch({
              type: 'navigate',
              screen: next.screen,
              ...(next.scoutingTab === undefined
                ? {}
                : { scoutingTab: next.scoutingTab }),
              ...(next.tacticsTab === undefined
                ? {}
                : { tacticsTab: next.tacticsTab }),
            })
          }
        >
          {next.label}
        </Button>
      </Card>
    </div>
  );
}

function SnapshotGroup({
  label,
  tone,
  items,
}: {
  label: string;
  tone: StatusTone;
  items: readonly SnapshotItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="edge px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusDot tone={tone} />
        <Kicker tone={tone === 'good' ? 'accent' : 'neutral'}>{label}</Kicker>
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => (
          <li key={item.name} className="mt-1.5">
            <div className="text-[12.5px] leading-[1.4] font-medium text-pretty">
              {item.name}
            </div>
            <div className="text-ink-subtle mt-px text-[11px]">{item.note}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pregame() {
  const { state, scenario, dispatch } = useWeek();
  const week = state.week;
  const snapshot = deriveFieldSnapshot(week, scenario);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot tone="accent" />
            <Kicker>Decision Room · Friday 7:15 PM</Kicker>
          </div>
          <h1 className="m-0 mt-2 text-[16px] font-semibold tracking-[-0.32px]">
            Four calls are yours before kickoff
          </h1>
          <p className="text-ink-subtle mt-1 mb-0 text-[12.5px] text-pretty">
            vs {scenario.opponent.name} · 7:30 PM · once the game starts you
            answer situations, not scripts
          </p>
        </div>
        <span className="min-w-3 flex-1" />
        <span className="edge bg-surface text-ink-muted inline-flex items-center gap-2 rounded-full px-3 py-[5px] text-[11.5px] font-medium whitespace-nowrap">
          <StatusDot tone="risk" />
          Kickoff in 15 minutes
        </span>
      </div>
      <div className="flex flex-wrap items-start gap-3.5">
        <Card
          className="min-w-0 flex-[1_1_540px] overflow-hidden p-0"
          aria-labelledby="pregame-policies-heading"
        >
          <div className="edge px-4 py-3.5">
            <h2
              id="pregame-policies-heading"
              className="m-0 text-[13px] font-medium"
            >
              Standing policies — last look
            </h2>
            <p className="text-ink-subtle mt-1 mb-0 text-[11.5px] leading-[1.5] text-pretty">
              Set Tuesday, confirmed here. These decide what happens in the
              eleven seconds when nobody can find you.
            </p>
          </div>
          {SITUATIONAL_POLICIES.map((policy) => {
            const current = week.policies[policy.id];
            const selected =
              policy.options.find((option) => option.value === current) ??
              policy.options[0];
            return (
              <section
                key={policy.id}
                aria-labelledby={`pregame-policy-${policy.id}`}
                className="edge px-4 py-3.5"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3
                    id={`pregame-policy-${policy.id}`}
                    className="m-0 text-[13px] font-medium"
                  >
                    {policy.title}
                  </h3>
                  <span className="text-ink-subtle text-[11px]">
                    {policy.when}
                  </span>
                  <span className="min-w-1 flex-1" />
                  <span className="text-ink-subtle font-mono text-[11px]">
                    Executed by {policy.owner}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label={`${policy.title} policy`}
                  className="mt-2 flex flex-wrap gap-1.5"
                >
                  {policy.options.map((option) => (
                    <PillButton
                      key={option.value}
                      pressed={current === option.value}
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
                <p className="text-ink-subtle mt-2 mb-0 max-w-[72ch] text-[11.5px] leading-[1.55] text-pretty">
                  <span className="text-ink-muted">Costs — </span>
                  {selected?.cost}
                </p>
              </section>
            );
          })}
        </Card>
        <aside className="flex max-w-[430px] min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <Card
            className="overflow-hidden p-0"
            aria-labelledby="take-field-snapshot-heading"
          >
            <h2
              id="take-field-snapshot-heading"
              className="edge m-0 px-4 py-3.5 text-[13px] font-medium"
            >
              What you take onto the field
            </h2>
            <SnapshotGroup
              label="Prepared"
              tone="good"
              items={snapshot.prepared}
            />
            <SnapshotGroup label="Thin" tone="risk" items={snapshot.thin} />
            <SnapshotGroup
              label="Knowingly uncovered"
              tone="neutral"
              items={snapshot.uncovered}
            />
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <StatusDot tone={snapshot.riskNamed ? 'risk' : 'neutral'} />
              <span
                className={`text-[12.5px] font-medium ${snapshot.riskNamed ? 'text-ink' : 'text-ink-subtle'}`}
              >
                {snapshot.riskTitle}
              </span>
            </div>
            <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
              The risk you accepted Monday rides along tonight. If it shows up,
              it shows up as your decision — not as bad luck.
            </p>
          </Card>
          <Card className="p-4">
            <blockquote className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
              “Locker room's ready. Ten or twelve moments will decide this thing
              — the rest is the week we already had.”
            </blockquote>
            <p className="text-ink-subtle mt-1 mb-0 text-[11px]">
              D. Pruitt · Offensive Coordinator
            </p>
            <Button
              variant="primary"
              className="mt-3 w-full justify-center"
              onClick={() => dispatch({ type: 'take-field' })}
            >
              Take the field · kickoff
            </Button>
            <p className="text-ink-subtle mt-2 mb-0 text-[11px] leading-[1.5] text-pretty">
              Preparation shifts odds. It has never guaranteed a Friday.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function LiveGame({ view }: { view: MatchView }) {
  const { state, scenario, dispatch } = useWeek();
  const week = state.week;
  const isFinal = view.phase === 'final';
  const pending = view.pending;
  const running =
    view.phase === 'live' && pending === null && week.matchSpeed !== 'pause';
  const liveLabel = isFinal
    ? 'FINAL'
    : pending !== null
      ? 'YOUR CALL'
      : running
        ? 'LIVE'
        : 'PAUSED';
  const liveTone: StatusTone = isFinal
    ? 'neutral'
    : pending !== null
      ? 'risk'
      : running
        ? 'accent'
        : 'neutral';
  const driveLeft = Math.min(view.drv, view.ball);
  const driveWidth = Math.max(Math.abs(view.ball - view.drv), 0.5);
  const school = scenario.program.school;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-2 pb-4">
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[14px] font-medium tracking-[-0.28px]">
              {school}
            </div>
            <div className="text-ink-subtle flex items-center justify-end gap-1.5 text-[11px]">
              6-1 · Home <StatusDot tone="accent" />
            </div>
          </div>
          <div
            aria-label={`${school} score`}
            className="text-[40px] leading-none font-semibold tracking-[-1.8px]"
          >
            {view.wScore}
          </div>
        </div>
        <div className="px-3.5 text-center">
          <div className="text-ink-subtle font-mono text-[11px] font-medium">
            {view.quarter}
          </div>
          <div className="font-mono text-[24px] leading-[1.1] font-medium tabular-nums">
            {view.clock}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            aria-label="Central score"
            className="text-ink-subtle text-[40px] leading-none font-semibold tracking-[-1.8px]"
          >
            {view.cScore}
          </div>
          <div>
            <div className="text-ink-muted text-[14px] font-medium tracking-[-0.28px]">
              Central
            </div>
            <div className="text-ink-subtle text-[11px]">7-0 · Away</div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap gap-3.5">
        <section
          aria-label="Field"
          className="relative min-h-[320px] min-w-0 flex-[3_1_380px]"
        >
          <div className="edge-raised bg-surface relative h-full min-h-[320px] overflow-hidden rounded-[12px]">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 flex w-[8%] items-center justify-center bg-[#f2f2f2] shadow-[inset_-1px_0_0_rgba(0,0,0,0.12)]"
            >
              <span className="text-ink-subtle rotate-180 font-mono text-[12px] font-medium tracking-[0.3em] [writing-mode:vertical-rl]">
                {scenario.program.mascot.toUpperCase()}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 flex w-[8%] items-center justify-center bg-[#f2f2f2] shadow-[inset_1px_0_0_rgba(0,0,0,0.12)]"
            >
              <span className="text-ink-subtle font-mono text-[12px] font-medium tracking-[0.3em] [writing-mode:vertical-rl]">
                CENTRAL
              </span>
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-[8%] left-[8%] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.05)_0_1.5px,transparent_1.5px_10%)]"
            />
            <div
              aria-hidden="true"
              className="bg-accent absolute inset-y-0 w-[2px] opacity-80"
              style={{ left: `${view.fd}%` }}
            />
            <div
              aria-hidden="true"
              className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-[2px]"
              style={{
                left: `${driveLeft}%`,
                width: `${driveWidth}%`,
                background:
                  view.ball >= view.drv
                    ? 'linear-gradient(90deg,transparent,#8F8F8F)'
                    : 'linear-gradient(270deg,transparent,#8F8F8F)',
              }}
            />
            <div
              aria-hidden="true"
              className="bg-ink absolute top-1/2 h-[10px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#fff,0_2px_4px_rgba(0,0,0,0.2)]"
              style={{ left: `${view.ball}%` }}
            />
            <div className="edge bg-surface absolute top-3 left-3 rounded-md px-2.5 py-1 font-mono text-[12px] font-medium">
              {view.dd}
            </div>
            <div className="edge bg-surface absolute top-3 right-3 flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium">
              <StatusDot tone={liveTone} />
              <span role="status">{liveLabel}</span>
            </div>

            {pending !== null && (
              <div className="absolute inset-0 z-10 flex items-start justify-center overflow-auto bg-[rgba(250,250,250,0.95)] p-4">
                <section
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="pending-decision-title"
                  className="edge-raised bg-surface w-full max-w-[600px] rounded-[12px] p-[17px_19px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot tone="accent" />
                    <Kicker>Key situation</Kicker>
                    <span className="min-w-2 flex-1" />
                    <span className="text-ink-subtle font-mono text-[11.5px]">
                      {pending.when}
                    </span>
                  </div>
                  <h2
                    id="pending-decision-title"
                    className="m-0 mt-2 text-[16.5px] leading-[1.3] font-semibold tracking-[-0.33px] text-pretty"
                  >
                    {pending.title}
                  </h2>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[
                      ...pending.chips,
                      `${school} ${view.wScore} – ${view.cScore} Central`,
                    ].map((chip) => (
                      <span
                        key={chip}
                        className="edge bg-surface-sunken text-ink-muted rounded-full px-2.5 py-[3px] font-mono text-[11px] font-medium"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  {pending.evid !== '' && (
                    <p className="text-ink-muted mt-2.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
                      <span className="text-ink-subtle font-medium">
                        From the week —{' '}
                      </span>
                      {pending.evid}
                    </p>
                  )}
                  <p className="edge bg-surface-sunken text-ink-muted mt-2.5 mb-0 rounded-lg px-3 py-2.5 text-[12.5px] leading-[1.6] text-pretty">
                    “{pending.staff}”{' '}
                    <span className="text-ink-subtle">— {pending.who}</span>
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {pending.opts.map((option, index) => (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'match-choose',
                            decisionId: pending.id,
                            optionIndex: index,
                          })
                        }
                        className="edge bg-surface-sunken text-ink hover:bg-surface focus-visible:ring-accent w-full cursor-pointer rounded-lg border-0 px-3 py-2.5 text-left font-sans outline-none focus-visible:ring-2"
                      >
                        <span className="block text-[13px] leading-[1.45] font-medium text-pretty">
                          {option.name}
                        </span>
                        <span className="text-ink-subtle mt-0.5 block text-[11.5px] leading-[1.55] text-pretty">
                          {option.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Game feed"
          className="edge-raised bg-surface flex min-w-0 flex-[2_1_320px] flex-col overflow-hidden rounded-[12px]"
        >
          <div className="edge shrink-0 px-4 pt-3.5 pb-3">
            <div className="text-ink-subtle mb-2 flex items-center justify-between text-[11px] font-medium">
              <span>Momentum · {school}</span>
              <span className="text-accent font-mono">
                Key moments · {view.keyCount}
              </span>
              <span>Central</span>
            </div>
            <div
              role="img"
              aria-label={`Momentum ${view.mom} of 100 toward ${school}`}
              className="relative h-1.5 overflow-hidden rounded-[3px] bg-[#f2f2f2]"
            >
              <div
                className="bg-accent h-full rounded-[3px]"
                style={{ width: `${view.mom}%` }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-black/15" />
            </div>
          </div>
          <ol
            aria-label="Play-by-play"
            className="m-0 min-h-[140px] flex-1 list-none overflow-auto p-0"
          >
            {view.plays.map((play, index) => (
              <li
                key={`${view.plays.length - index}-${play.c}-${play.t}`}
                className={`edge flex items-start gap-2.5 px-4 py-2.5 ${play.k === 'end' ? 'bg-surface-sunken' : ''}`}
              >
                {play.key ? (
                  <span className="text-accent mt-0.5 shrink-0 rounded-[4px] bg-[#ebf4ff] px-[5px] py-[2px] font-mono text-[9px] font-semibold tracking-[0.04em] shadow-[0_0_0_1px_rgba(0,114,245,0.2)]">
                    KEY
                  </span>
                ) : (
                  <span className="mt-1">
                    <StatusDot tone={PLAY_TONE[play.k]} />
                  </span>
                )}
                <span className="text-ink-subtle min-w-8 pt-px font-mono text-[11px] tabular-nums">
                  {play.c}
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span
                    className={`text-[12.5px] leading-[1.5] text-pretty ${
                      play.k === 'td' || play.k === 'to' || play.k === 'end'
                        ? 'font-medium'
                        : ''
                    }`}
                  >
                    {play.t}
                  </span>
                  {play.tag !== '' && (
                    <span className="edge bg-surface-sunken text-ink-muted inline-flex items-start gap-1.5 rounded-lg px-2 py-[3px] text-[10.5px] leading-[1.5] font-medium text-pretty">
                      <span
                        aria-hidden="true"
                        className="mt-[3.5px] size-1.5 shrink-0 rounded-full"
                        style={{ background: play.tagC }}
                      />
                      {play.tag}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="edge shrink-0 px-4 pt-3 pb-3.5">
            <h2 className="text-ink-subtle m-0 mb-2 text-[11px] font-medium tracking-[0.04em] uppercase">
              Quick Adjust
            </h2>
            <div
              role="group"
              aria-label="Quick Adjust"
              className="grid grid-cols-2 gap-2"
            >
              {QUICK_ADJUST_CALLS.map((call) => (
                <PillButton
                  key={call}
                  pressed={view.qt === call}
                  className="justify-center rounded-[6px]"
                  onClick={() => dispatch({ type: 'match-quick-adjust', call })}
                >
                  {call}
                </PillButton>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div
        role="group"
        aria-label="Playback"
        className="mt-3 flex flex-wrap items-center justify-center gap-2 pb-1"
      >
        {SPEED_CONTROLS.map((control) => (
          <PillButton
            key={control.id}
            pressed={week.matchSpeed === control.id}
            className="min-w-[84px] justify-center rounded-[6px]"
            onClick={() =>
              dispatch({ type: 'match-set-speed', speed: control.id })
            }
          >
            {control.label}
          </PillButton>
        ))}
        <Button
          disabled={isFinal || pending !== null}
          onClick={() => dispatch({ type: 'match-skip' })}
          className="min-w-[84px] justify-center"
        >
          ⏭ Next call
        </Button>
        {isFinal && (
          <Button
            variant="primary"
            onClick={() => dispatch({ type: 'navigate', screen: 'review' })}
          >
            Final — Decision review →
          </Button>
        )}
      </div>
    </div>
  );
}
