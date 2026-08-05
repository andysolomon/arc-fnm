import type {
  ClipRelation,
  FilmClip,
  HypothesisId,
  HypothesisBoardState,
  HypothesisView,
} from '../domain/types.ts';
import { useWeek } from '../state/weekContext.ts';
import { Button, Card, StatusDot, type StatusTone } from '../components/ui.tsx';

const BOARD_TONE: Record<HypothesisBoardState, StatusTone> = {
  Priority: 'accent',
  'Accepted risk': 'risk',
  Candidate: 'neutral',
  'Left off the board': 'neutral',
  'On hold': 'hold',
  Rejected: 'danger',
};

/**
 * The evidence gate surface: prioritize exactly three concerns, then accept the
 * fourth as risk. Every disabled control keeps its reason visible.
 */
interface HypothesesProps {
  readonly evidenceClips?: readonly FilmClip[];
  readonly relationFor?: (
    clip: FilmClip,
    hypothesisId: HypothesisId,
  ) => ClipRelation;
  readonly onShowClips?: (hypothesisId: HypothesisId) => void;
}

export function Hypotheses({
  evidenceClips,
  relationFor,
  onShowClips,
}: HypothesesProps = {}) {
  const { scenario, views, gate, dispatch } = useWeek();

  const clips = evidenceClips ?? scenario.clips;
  const relation =
    relationFor ??
    ((clip: FilmClip, hypothesisId: HypothesisId) =>
      clip.hypothesisId === hypothesisId ? clip.relation : 'neu');

  const riskCandidates = views.filter(
    (view) =>
      gate.priorityIds.length === scenario.priorityCapacity &&
      gate.acceptedRisk === null &&
      !view.isPriority &&
      !view.isHeld &&
      !view.isRejected,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="gate-heading">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot tone={gate.ready ? 'good' : 'risk'} />
          <h2
            id="gate-heading"
            className="text-ink m-0 text-[15px] font-semibold tracking-[-0.3px] text-pretty"
          >
            {gate.title}
          </h2>
          <span className="flex-1" />
          <span
            className="text-ink-subtle font-mono text-[11.5px]"
            aria-live="polite"
          >
            {gate.ready
              ? `${scenario.priorityCapacity} prioritized · risk accepted`
              : `${gate.priorityIds.length} of ${scenario.priorityCapacity} prioritized`}
          </span>
          {gate.ready && (
            <Button
              variant="primary"
              onClick={() =>
                dispatch({ type: 'navigate', screen: 'game-plan' })
              }
            >
              Lock the board · go to Game Plan
            </Button>
          )}
        </div>
        <p className="text-ink-muted mt-2 mb-0 max-w-[70ch] text-[13px] leading-relaxed text-pretty">
          {gate.body}
        </p>
        {riskCandidates.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
            <span className="text-ink-subtle font-mono text-[10.5px] font-medium tracking-[0.04em] uppercase">
              Accept as this week’s risk
            </span>
            {riskCandidates.map((view) => (
              <Button
                key={view.hypothesis.id}
                onClick={() =>
                  dispatch({
                    type: 'accept-risk',
                    id: view.hypothesis.id,
                  })
                }
              >
                <StatusDot tone="risk" />
                {view.hypothesis.short} · {view.hypothesis.unit}
              </Button>
            ))}
          </div>
        )}
      </Card>

      <ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
        {views.map((view) => (
          <li key={view.hypothesis.id}>
            <HypothesisCard
              view={view}
              evidence={evidenceFor(view.hypothesis.id, clips, relation)}
              {...(onShowClips === undefined
                ? {}
                : { onShowClips: () => onShowClips(view.hypothesis.id) })}
              onTogglePriority={() =>
                dispatch({ type: 'toggle-priority', id: view.hypothesis.id })
              }
              onAcceptRisk={() =>
                dispatch({ type: 'accept-risk', id: view.hypothesis.id })
              }
              onHold={() =>
                dispatch({
                  type: 'set-disposition',
                  id: view.hypothesis.id,
                  value: 'hold',
                })
              }
              onReject={() =>
                dispatch({
                  type: 'set-disposition',
                  id: view.hypothesis.id,
                  value: 'reject',
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface HypothesisCardProps {
  readonly view: HypothesisView;
  readonly evidence: EvidencePresentation;
  readonly onShowClips?: () => void;
  readonly onTogglePriority: () => void;
  readonly onAcceptRisk: () => void;
  readonly onHold: () => void;
  readonly onReject: () => void;
}

function HypothesisCard({
  view,
  evidence,
  onShowClips,
  onTogglePriority,
  onAcceptRisk,
  onHold,
  onReject,
}: HypothesisCardProps) {
  const { hypothesis } = view;
  const headingId = `hyp-${hypothesis.id}`;

  const ring = view.isPriority
    ? 'ring-[1.5px] ring-ink'
    : view.isAcceptedRisk
      ? 'ring-[1.5px] ring-risk'
      : '';

  return (
    <Card as="article" aria-labelledby={headingId} className={ring}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3
          id={headingId}
          className="text-ink m-0 text-[15px] font-semibold tracking-[-0.3px]"
        >
          {hypothesis.short}
        </h3>
        <span className="text-ink-subtle text-[12px]">{hypothesis.unit}</span>
        <span className="flex-1" />
        <span className="text-ink-muted inline-flex items-center gap-2 text-[11.5px] font-medium">
          <StatusDot tone={BOARD_TONE[view.boardState]} />
          {view.boardState}
        </span>
      </div>

      <p className="text-ink mt-2 mb-0 max-w-[70ch] text-[13px] leading-relaxed text-pretty">
        {hypothesis.statement}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <EvidencePill>{hypothesis.snaps} full-seed snaps</EvidencePill>
        <EvidencePill>{evidence.games} matching games</EvidencePill>
        <EvidencePill tone="good">{evidence.supporting} support</EvidencePill>
        <EvidencePill tone="danger">
          {evidence.contradicting} against
        </EvidencePill>
      </div>

      <dl className="mt-4 mb-0 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-ink-subtle font-mono text-[10.5px] tracking-[0.06em] uppercase">
            Confidence
          </dt>
          <dd className="text-ink mt-1 ml-0 inline-flex items-center gap-2 text-[13px]">
            <StatusDot tone={evidence.confidenceTone} />
            {evidence.confidence}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle font-mono text-[10.5px] tracking-[0.06em] uppercase">
            Sample
          </dt>
          <dd className="text-ink mt-1 ml-0 text-[13px]">
            {hypothesis.snaps} snaps · {evidence.games} games
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle font-mono text-[10.5px] tracking-[0.06em] uppercase">
            Supporting
          </dt>
          <dd className="text-ink mt-1 ml-0 text-[13px]">
            {evidence.supporting} clips
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle font-mono text-[10.5px] tracking-[0.06em] uppercase">
            Contradicting
          </dt>
          <dd className="text-ink mt-1 ml-0 text-[13px]">
            {evidence.contradicting} clips
          </dd>
        </div>
      </dl>

      <p className="text-ink-subtle mt-4 mb-0 text-[12px] leading-relaxed text-pretty">
        <span className="text-ink-muted font-medium">Why this label — </span>
        {evidence.why} Full-seed context: {hypothesis.snaps} qualifying snaps
        across {hypothesis.games} games; baseline assessment was{' '}
        {hypothesis.confidence.toLowerCase()}.
      </p>
      <p className="text-ink-subtle mt-2 mb-0 text-[12px] leading-relaxed text-pretty">
        <span className="text-ink-muted font-medium">What is missing — </span>
        {hypothesis.missing}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant={view.isPriority ? 'secondary' : 'primary'}
          disabled={!view.canPrioritize}
          onClick={onTogglePriority}
          {...(view.blockedReason !== null && !view.canPrioritize
            ? { title: view.blockedReason }
            : {})}
        >
          {view.isPriority ? 'Remove priority' : 'Prioritize'}
        </Button>
        {(view.isAcceptedRisk || view.canAcceptRisk) && (
          <Button onClick={onAcceptRisk}>
            {view.isAcceptedRisk
              ? 'Remove accepted risk'
              : 'Accept as this week’s risk'}
          </Button>
        )}
        <Button variant="quiet" onClick={onHold}>
          {view.isHeld ? 'Remove hold' : 'Hold'}
        </Button>
        <Button variant="quiet" onClick={onReject}>
          {view.isRejected ? 'Undo reject' : 'Reject'}
        </Button>
        {onShowClips !== undefined && (
          <Button variant="quiet" className="text-accent" onClick={onShowClips}>
            Show the {evidence.total} clips
          </Button>
        )}
      </div>

      {view.blockedReason !== null && (
        <p className="text-ink-subtle mt-3 mb-0 text-[12px] leading-relaxed text-pretty">
          {view.blockedReason}
        </p>
      )}
    </Card>
  );
}

interface EvidencePresentation {
  readonly supporting: number;
  readonly contradicting: number;
  readonly total: number;
  readonly games: number;
  readonly confidence: string;
  readonly confidenceTone: StatusTone;
  readonly why: string;
}

function evidenceFor(
  hypothesisId: HypothesisId,
  clips: readonly FilmClip[],
  relationFor: (clip: FilmClip, hypothesisId: HypothesisId) => ClipRelation,
): EvidencePresentation {
  let supporting = 0;
  let contradicting = 0;
  const games = new Set<string>();
  for (const clip of clips) {
    const relation = relationFor(clip, hypothesisId);
    if (relation === 'sup') {
      supporting += 1;
      games.add(clip.game);
    } else if (relation === 'con') {
      contradicting += 1;
      games.add(clip.game);
    }
  }
  const total = supporting + contradicting;
  const confidence =
    total === 0
      ? 'No matching evidence'
      : total < 4 || games.size < 2
        ? 'Low sample'
        : supporting >= Math.max(3, contradicting * 2)
          ? 'Strong'
          : 'Moderate';
  const confidenceTone: StatusTone =
    confidence === 'Strong'
      ? 'good'
      : confidence === 'Moderate'
        ? 'risk'
        : confidence === 'Low sample'
          ? 'danger'
          : 'neutral';
  const why =
    total === 0
      ? 'Current metadata filters exclude every clip tagged to this hypothesis.'
      : `${total} relevant clip${total === 1 ? '' : 's'} across ${games.size} game${games.size === 1 ? '' : 's'} in the current metadata sample: ${supporting} support, ${contradicting} contradict.`;
  return {
    supporting,
    contradicting,
    total,
    games: games.size,
    confidence,
    confidenceTone,
    why,
  };
}

function EvidencePill({
  children,
  tone,
}: {
  readonly children: React.ReactNode;
  readonly tone?: 'good' | 'danger';
}) {
  return (
    <span className="edge bg-surface-sunken text-ink-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium">
      {tone !== undefined && <StatusDot tone={tone} />}
      {children}
    </span>
  );
}
