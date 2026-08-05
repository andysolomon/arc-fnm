import {
  REVIEW_RATINGS,
  deriveDecisionReview,
  type ReviewTimelineRow,
} from '../domain/decisionReview.ts';
import type { DecisionProcessRating } from '../domain/types.ts';
import { useWeek } from '../state/weekContext.ts';
import {
  Button,
  Card,
  Kicker,
  PillButton,
  StatusChip,
  StatusDot,
  type StatusTone,
} from '../components/ui.tsx';

const RATING_TONE: Readonly<Record<DecisionProcessRating, StatusTone>> = {
  Sound: 'good',
  Debatable: 'risk',
  'Poor process': 'danger',
};

export function DecisionReview() {
  const { state, scenario, dispatch, next } = useWeek();
  const review = deriveDecisionReview(state.week, scenario);

  if (review.empty) {
    return (
      <div
        data-screen-label="Decision Review"
        className="flex min-h-[60%] items-center justify-center p-6"
      >
        <Card className="max-w-[520px]">
          <div className="flex items-center gap-2">
            <StatusDot />
            <Kicker tone="neutral">Decision Review · Saturday</Kicker>
          </div>
          <h1 className="m-0 mt-2.5 text-[16px] font-semibold tracking-[-0.32px]">
            No game on film yet
          </h1>
          <p className="text-ink-muted mt-[7px] mb-0 text-[12.5px] leading-[1.62] text-pretty">
            The review opens after the final horn. There is nothing to grade
            until Friday night has been played.
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

  return (
    <div data-screen-label="Decision Review">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot tone="accent" />
            <Kicker>Decision Review · Saturday · Oct 17</Kicker>
          </div>
          <h1 className="m-0 mt-2 text-[16px] font-semibold tracking-[-0.32px]">
            {review.score}
          </h1>
          <p className="text-ink-subtle mt-1 mb-0 max-w-[72ch] text-[12.5px] leading-[1.55] text-pretty">
            The scoreboard is one output of many. The review walks the chain —
            what you knew, what you chose, what you practiced, and what actually
            happened.
          </p>
        </div>
        <span className="min-w-3 flex-1" />
        <StatusChip tone={review.result === 'WIN' ? 'good' : 'danger'}>
          {review.result} · District 7-5A
        </StatusChip>
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        <main
          aria-label="Decision review timeline"
          className="flex min-w-0 flex-[1_1_560px] flex-col gap-3.5"
        >
          {review.rows.map((row) => (
            <DecisionRow key={row.decisionId} row={row} />
          ))}
        </main>

        <aside className="flex max-w-[430px] min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <RiskCard />
          <LessonsCard />
          <Card aria-labelledby="courier-heading" className="p-[15px_16px]">
            <div className="flex items-baseline gap-2">
              <h2
                id="courier-heading"
                className="m-0 font-mono text-[11px] font-semibold tracking-[0.14em]"
              >
                THE WESTFIELD COURIER
              </h2>
              <span className="flex-1" />
              <span className="text-ink-subtle font-mono text-[10.5px]">
                Sat · Oct 17
              </span>
            </div>
            <h3 className="mt-2.5 mb-0 text-[14.5px] leading-[1.35] font-semibold tracking-[-0.29px] text-pretty">
              {review.story.headline}
            </h3>
            <p className="text-ink-muted mt-2 mb-0 text-xs leading-[1.65] text-pretty">
              {review.story.body}
            </p>
            <p className="text-ink-subtle mt-2.5 mb-0 pt-[9px] text-[11px] leading-[1.5] text-pretty shadow-[0_-1px_0_0_rgba(0,0,0,0.06)]">
              The Courier grades results. This room grades decisions.
            </p>
          </Card>
          <NextOpponentCard />
        </aside>
      </div>
    </div>
  );
}

function DecisionRow({ row }: { readonly row: ReviewTimelineRow }) {
  const { dispatch } = useWeek();
  return (
    <article
      aria-labelledby={`review-${row.decisionId}-heading`}
      className="edge-raised overflow-hidden rounded-xl bg-white"
    >
      <header className="edge px-4 py-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot tone="accent" />
          <Kicker tone="neutral">Key situation</Kicker>
          <span className="min-w-2 flex-1" />
          <span className="text-ink-subtle font-mono text-[11px]">
            {row.when}
          </span>
        </div>
        <h2
          id={`review-${row.decisionId}-heading`}
          className="mt-[7px] mb-0 text-sm leading-[1.35] font-semibold tracking-[-0.28px] text-pretty"
        >
          {row.title}
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.chips.map((chip) => (
            <span
              key={chip}
              className="edge bg-surface-sunken text-ink-muted rounded-full px-2.5 py-[3px] font-mono text-[11px] font-medium"
            >
              {chip}
            </span>
          ))}
        </div>
      </header>

      <section aria-label="Evidence and choice" className="edge px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <p className="text-ink-muted m-0 min-w-0 flex-[1_1_280px] text-[11.5px] leading-[1.55] text-pretty">
            <span className="text-ink-subtle font-medium">
              What you knew then —{' '}
            </span>
            {row.evidence}
          </p>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'navigate',
                screen: 'scouting',
                scoutingTab: 'Film Room',
                scoutingHypothesis: row.evidenceHypothesisId,
              })
            }
            className="text-accent hover:text-accent-strong shrink-0 cursor-pointer border-0 bg-transparent px-0.5 font-sans text-xs font-medium"
          >
            {row.evidenceCta}
          </button>
        </div>
        <blockquote className="bg-surface-sunken text-ink-muted mt-[9px] mb-0 rounded-lg p-[9px_11px] text-xs leading-[1.6] text-pretty shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          “{row.staff}”{' '}
          <span className="text-ink-subtle">
            — {row.staffMember}, at the time
          </span>
        </blockquote>
        <p className="mt-2.5 mb-0 text-[12.5px] leading-[1.5] text-pretty">
          <span className="text-ink-subtle">You chose — </span>
          <strong>{row.choice}</strong>
        </p>
      </section>

      <section
        aria-label="Practice at kickoff"
        className="edge bg-[#f7faff] px-4 py-[11px]"
      >
        <h3 className="text-ink-subtle m-0 font-mono text-[10px] font-medium tracking-[0.5px] uppercase">
          Practice at kickoff
        </h3>
        {row.preparation.map((trace) => (
          <p
            key={trace.objectiveId}
            className="text-ink-muted mt-[7px] mb-0 text-[11.5px] leading-[1.55] text-pretty"
          >
            <strong className="text-ink">{trace.objective}</strong>
            <span className="text-ink-subtle"> — </span>
            <span className="font-medium">{trace.readiness}</span>
            <span className="text-ink-subtle"> · {trace.allocation}</span>
          </p>
        ))}
      </section>

      <section
        aria-label="What happened"
        className="edge bg-surface-sunken px-4 py-[11px]"
      >
        <h3 className="text-ink-subtle m-0 font-mono text-[10px] font-medium tracking-[0.5px] uppercase">
          What happened
        </h3>
        <div className="mt-2 flex flex-col gap-[7px]">
          {row.outcomes.map((outcome, index) => (
            <div
              key={`${outcome.t}-${index}`}
              className="flex flex-col items-start gap-1"
            >
              <p className="text-ink-muted m-0 text-xs leading-[1.5] text-pretty">
                {outcome.t}
              </p>
              {outcome.tag !== '' && (
                <span className="edge text-ink-muted inline-flex items-start gap-1.5 rounded-lg bg-white px-[9px] py-[3px] text-[10.5px] leading-[1.5] font-medium text-pretty">
                  <span
                    aria-hidden="true"
                    className="mt-[3.5px] size-1.5 shrink-0 rounded-full"
                    style={{ background: outcome.tagC }}
                  />
                  {outcome.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Decision, execution, and result"
        className="flex flex-col gap-[9px] px-4 py-3"
      >
        <ReviewRead
          tone={RATING_TONE[row.staffProcess.rating]}
          label={`Decision · ${row.staffProcess.rating}`}
          suffix=" — staff read"
          body={row.staffProcess.why}
        />
        <ReviewRead tone="accent" label="Execution" body={row.execution} />
        <ReviewRead tone={row.resultTone} label="Result" body={row.result} />
        <div className="flex flex-wrap items-center gap-2 pt-[9px] shadow-[0_-1px_0_0_rgba(0,0,0,0.06)]">
          <span className="text-ink-subtle text-[11.5px] font-medium">
            Your read —
          </span>
          {REVIEW_RATINGS.map((rating) => (
            <PillButton
              key={rating}
              pressed={row.coachRating === rating}
              className="h-[26px] px-[11px] text-[11.5px]"
              onClick={() =>
                dispatch({
                  type: 'review-rate',
                  decisionId: row.decisionId,
                  rating,
                })
              }
            >
              {rating}
            </PillButton>
          ))}
          {row.ratingAgreement !== '' && (
            <span className="text-ink-subtle text-[11px] leading-[1.5] text-pretty">
              {row.ratingAgreement}
            </span>
          )}
        </div>
      </section>
    </article>
  );
}

function ReviewRead({
  tone,
  label,
  suffix,
  body,
}: {
  readonly tone: StatusTone;
  readonly label: string;
  readonly suffix?: string;
  readonly body: string;
}) {
  return (
    <div className="flex items-start gap-[9px]">
      <span className="mt-1">
        <StatusDot tone={tone} />
      </span>
      <div className="min-w-0">
        <span className="text-xs font-semibold">{label}</span>
        {suffix !== undefined && (
          <span className="text-ink-subtle text-[11.5px]">{suffix}</span>
        )}
        <p className="text-ink-muted mt-0.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
          {body}
        </p>
      </div>
    </div>
  );
}

function RiskCard() {
  const { state, scenario } = useWeek();
  const risk = deriveDecisionReview(state.week, scenario).risk;
  if (!risk.hasRisk) {
    return (
      <Card aria-labelledby="review-risk-heading" className="p-4">
        <div className="flex items-center gap-2">
          <StatusDot tone="good" />
          <h2
            id="review-risk-heading"
            className="m-0 text-[12.5px] font-semibold"
          >
            Accepted risk
          </h2>
        </div>
        <p className="mt-[9px] mb-0 text-xs leading-[1.55] font-medium">
          No named risk on file
        </p>
        <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
          Every concern on your board got practice time or an installed answer.
          There was nothing you deliberately left uncovered this week.
        </p>
      </Card>
    );
  }
  return (
    <Card aria-labelledby="review-risk-heading" className="p-4">
      <div className="flex items-center gap-2">
        <StatusDot tone="risk" />
        <h2
          id="review-risk-heading"
          className="m-0 text-[12.5px] font-semibold"
        >
          The risk you accepted — {risk.name}
        </h2>
      </div>
      <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
        {risk.statement}
      </p>
      <p className="mt-[9px] mb-0 text-xs leading-[1.55] font-medium text-pretty">
        {risk.verdict}
      </p>
      {risk.events.length > 0 && (
        <ul className="mt-[9px] flex list-none flex-col gap-[7px] p-0">
          {risk.events.map((event, index) => (
            <li
              key={`${event.when}-${index}`}
              className="flex gap-[9px] text-[11.5px] leading-[1.5]"
            >
              <span className="text-ink-subtle shrink-0 pt-px font-mono text-[10.5px]">
                {event.when}
              </span>
              <span className="text-ink-muted text-pretty">{event.text}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-subtle mt-2.5 mb-0 pt-[9px] text-[11px] leading-[1.5] text-pretty shadow-[0_-1px_0_0_rgba(0,0,0,0.06)]">
        Reviewed as a decision, not as luck — you named it Monday, before anyone
        knew how Friday would go.
      </p>
    </Card>
  );
}

function LessonsCard() {
  const { state, scenario, dispatch } = useWeek();
  const review = deriveDecisionReview(state.week, scenario);
  return (
    <Card aria-labelledby="lessons-heading" className="overflow-hidden p-0">
      <div className="edge flex items-baseline gap-2 px-4 py-[13px]">
        <h2 id="lessons-heading" className="m-0 text-[13px] font-semibold">
          Lessons for Riverside
        </h2>
        <span className="flex-1" />
        <span className="text-ink-subtle font-mono text-[11px]">
          {review.savedLessons.length} of 3 saved
        </span>
      </div>
      <p className="text-ink-subtle mt-0 mb-1 px-4 pt-2.5 text-[11.5px] leading-[1.55] text-pretty">
        Save up to three. They ride to next week’s hub and the Riverside
        opponent board.
      </p>
      {review.lessonMessage && (
        <div
          role="alert"
          className="mx-4 mt-2 flex items-start gap-2 rounded-lg bg-[#fff8ee] p-[8px_11px] shadow-[0_0_0_1px_rgba(255,153,10,0.35)]"
        >
          <span className="mt-[5px]">
            <StatusDot tone="risk" />
          </span>
          <span className="text-ink-muted text-[11.5px] leading-[1.5] text-pretty">
            Three lessons travel. More than that is a binder nobody opens — swap
            one out instead.
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2 p-[10px_16px_14px]">
        {review.lessonCandidates.map((lesson) => (
          <button
            key={lesson.id}
            type="button"
            aria-pressed={lesson.saved}
            aria-label={`${lesson.saved ? 'Remove' : 'Save'} lesson: ${lesson.text}`}
            onClick={() =>
              dispatch({ type: 'review-toggle-lesson', lessonId: lesson.id })
            }
            className={`edge focus-visible:ring-accent flex cursor-pointer items-start gap-[9px] rounded-lg border-0 p-[9px_11px] text-left font-sans outline-none focus-visible:ring-2 ${lesson.saved ? 'bg-[#f0f6ff]' : 'bg-white'}`}
          >
            <span className="mt-1">
              <StatusDot tone={lesson.saved ? 'accent' : 'neutral'} />
            </span>
            <span
              className={`min-w-0 flex-1 text-[11.5px] leading-[1.55] text-pretty ${lesson.saved ? 'font-medium' : 'font-normal'}`}
            >
              {lesson.text}
            </span>
            <span className="text-ink-subtle shrink-0 pt-px font-mono text-[10.5px]">
              {lesson.saved ? 'Saved' : 'Save'}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function NextOpponentCard() {
  const { state, scenario, dispatch } = useWeek();
  const review = deriveDecisionReview(state.week, scenario);
  return (
    <Card aria-labelledby="next-opponent-heading" className="p-[15px_16px]">
      <div className="flex items-center gap-2">
        <StatusDot tone="accent" />
        <h2
          id="next-opponent-heading"
          className="m-0 text-[12.5px] font-semibold"
        >
          Next — Week 9 · at Riverside
        </h2>
      </div>
      <p className="text-ink-subtle mt-[5px] mb-0 text-[11.5px] leading-[1.55] text-pretty">
        Fri Oct 23 · away · 5-2 and winners of three straight. Soto’s first cut
        of film arrives Sunday night with your saved lessons pinned to the
        board.
      </p>
      {review.savedLessons.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5 pt-[9px] shadow-[0_-1px_0_0_rgba(0,0,0,0.06)]">
          <h3 className="text-ink-subtle m-0 font-mono text-[10px] font-medium tracking-[0.5px] uppercase">
            Pinned to Riverside
          </h3>
          {review.savedLessons.map((lesson) => (
            <p
              key={lesson.id}
              className="text-ink-muted m-0 flex gap-2 text-[11px] leading-[1.5] text-pretty"
            >
              <span className="mt-1">
                <StatusDot tone="accent" />
              </span>
              {lesson.text}
            </p>
          ))}
        </div>
      )}
      <Button
        variant="primary"
        className="mt-3 w-full justify-center"
        disabled={!review.canClose}
        aria-describedby="close-review-note"
        onClick={() => dispatch({ type: 'review-close' })}
      >
        Close out the week
      </Button>
      <p
        id="close-review-note"
        className="text-ink-subtle mt-[7px] mb-0 text-[11px] leading-[1.5] text-pretty"
      >
        {review.canClose
          ? 'Returns you to the Week hub with the result filed and your lessons pinned.'
          : 'Save at least one lesson first — that is the point of the film session.'}
      </p>
    </Card>
  );
}
