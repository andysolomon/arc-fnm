import { Button, StatusDot, type StatusTone } from '../components/ui.tsx';
import { useWeek } from '../state/weekContext.ts';
import { scheduleView, type ScheduleResultKind } from './scheduleData.ts';

const RESULT_TONE: Readonly<Record<ScheduleResultKind, StatusTone>> = {
  win: 'good',
  loss: 'danger',
  current: 'accent',
  future: 'neutral',
};

export function Schedule() {
  const { state, scenario, dispatch } = useWeek();
  const view = scheduleView(state.week, scenario);

  return (
    <div
      data-screen-label="Schedule"
      data-responsive-layout="wrapping-cards-scroll-table"
    >
      <h1 className="m-0 text-[16px] font-semibold tracking-[-0.32px]">
        Schedule · 2026 Season
      </h1>
      <p className="text-ink-subtle mt-1 mb-0 text-[12px]">{view.record}</p>

      <div className="mt-[18px] flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[1_1_480px]">
          <article
            aria-labelledby="week-8-card-title"
            aria-current={view.currentWeek === 8 ? 'step' : undefined}
            className="edge-raised bg-surface flex flex-wrap items-center gap-3.5 rounded-xl px-[18px] py-4"
          >
            <div
              aria-hidden="true"
              className="bg-surface-raised text-ink-muted flex size-10 items-center justify-center rounded-full text-[13px] font-semibold"
            >
              CC
            </div>
            <div className="min-w-[200px] flex-1">
              <h2
                id="week-8-card-title"
                className="m-0 text-[14px] font-semibold tracking-[-0.28px]"
              >
                {view.heroTitle}
              </h2>
              <p className="text-ink-subtle mt-1 mb-0 text-[12px]">
                {view.heroSubtitle}
              </p>
            </div>
            <span className="edge bg-surface text-ink-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-medium">
              <StatusDot
                tone={
                  view.heroWon === null
                    ? 'accent'
                    : view.heroWon
                      ? 'good'
                      : 'danger'
                }
              />
              {view.heroStatus}
            </span>
            <Button
              variant="primary"
              onClick={() =>
                dispatch(
                  view.heroStatus === 'Final'
                    ? { type: 'navigate', screen: 'review' }
                    : {
                        type: 'navigate',
                        screen: 'game-plan',
                        tacticsTab: 'Game Plan',
                      },
                )
              }
            >
              {view.heroAction}
            </Button>
            <Button
              variant="quiet"
              className="text-accent"
              onClick={() => dispatch({ type: 'navigate', screen: 'week' })}
            >
              Open Week
            </Button>
          </article>

          <article
            aria-labelledby="week-9-card-title"
            aria-current={view.currentWeek === 9 ? 'step' : undefined}
            className="edge-raised bg-surface mt-3.5 rounded-xl px-[18px] py-4"
          >
            <div className="flex items-center gap-2">
              <StatusDot tone="accent" />
              <h2
                id="week-9-card-title"
                className="m-0 text-[12.5px] font-semibold"
              >
                Next — Week 9 · at Riverside
              </h2>
            </div>
            <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.55] text-pretty">
              Fri Oct 23 · away · 5-2 and winners of three straight. Soto’s
              first cut of film arrives Sunday night with your saved lessons
              pinned to the board.
            </p>
            {state.week.lessons.length > 0 && (
              <div className="mt-2.5 pt-2.5 shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
                <span className="text-ink-subtle font-mono text-[10px] font-medium tracking-[0.05em] uppercase">
                  Pinned to Riverside
                </span>
                <p className="text-ink-muted mt-1.5 mb-0 text-[11px]">
                  {state.week.lessons.length} saved lesson
                  {state.week.lessons.length === 1 ? '' : 's'} ride to the Week
                  9 opponent board.
                </p>
              </div>
            )}
          </article>

          <section
            aria-labelledby="season-timeline-heading"
            className="edge-raised bg-surface mt-3.5 overflow-hidden rounded-xl"
          >
            <h2 id="season-timeline-heading" className="sr-only">
              2026 season timeline
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[470px] border-collapse text-left">
                <caption className="sr-only">
                  Westfield 2026 opponents, sites, and results
                </caption>
                <thead className="bg-surface-sunken text-ink-subtle text-[11px] font-medium">
                  <tr>
                    <th scope="col" className="edge px-4 py-2.5 font-medium">
                      Wk
                    </th>
                    <th scope="col" className="edge px-4 py-2.5 font-medium">
                      Date
                    </th>
                    <th scope="col" className="edge px-4 py-2.5 font-medium">
                      Opponent
                    </th>
                    <th scope="col" className="edge px-4 py-2.5 font-medium">
                      Site
                    </th>
                    <th scope="col" className="edge px-4 py-2.5 font-medium">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.games.map((game) => (
                    <tr
                      key={game.week}
                      aria-current={
                        game.week === view.currentWeek ? 'step' : undefined
                      }
                      className={
                        game.week === view.currentWeek
                          ? 'bg-surface-sunken'
                          : 'bg-surface'
                      }
                    >
                      <th
                        scope="row"
                        className="edge text-ink-subtle px-4 py-2.5 font-mono text-[12px] font-normal"
                      >
                        {game.week}
                      </th>
                      <td className="edge text-ink-muted px-4 py-2.5 text-[12.5px] whitespace-nowrap">
                        {game.date}
                      </td>
                      <td className="edge px-4 py-2.5 text-[13px]">
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              game.week === view.currentWeek
                                ? 'font-semibold'
                                : 'font-normal'
                            }
                          >
                            {game.opponent}
                          </span>
                          {game.district && (
                            <span className="bg-surface-raised text-ink-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
                              District
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="edge text-ink-subtle px-4 py-2.5 text-[12.5px]">
                        {game.site}
                      </td>
                      <td className="edge px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap tabular-nums">
                        <span className="flex items-center gap-2">
                          <StatusDot tone={RESULT_TONE[game.kind]} />
                          {game.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="standings-heading"
          className="edge-raised bg-surface max-w-[440px] min-w-0 flex-[1_1_280px] rounded-xl p-[18px]"
        >
          <div className="mb-2.5 flex justify-between gap-4">
            <h2
              id="standings-heading"
              className="text-ink-subtle m-0 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              District 7-5A Standings
            </h2>
            <span className="text-ink-subtle text-[11px]">Ovr · Dist</span>
          </div>
          <ol className="m-0 list-none p-0">
            {view.standings.map((standing) => (
              <li
                key={standing.team}
                aria-current={
                  standing.team === 'Westfield' ? 'true' : undefined
                }
                className={`flex items-center gap-2.5 rounded-md px-2 py-[7px] ${standing.team === 'Westfield' ? 'bg-surface-raised font-semibold' : ''}`}
              >
                <span className="text-ink-subtle w-4 font-mono text-[11.5px]">
                  {standing.rank}
                </span>
                <span className="min-w-0 flex-1 text-[13px]">
                  {standing.team}
                </span>
                <span className="text-ink-muted text-[12.5px] tabular-nums">
                  {standing.overall}
                </span>
                <span className="text-ink-subtle w-[34px] text-right text-[12.5px] tabular-nums">
                  {standing.district}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-ink-subtle mt-3 mb-0 pt-2.5 text-[11.5px] leading-[1.5] shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
            Top four qualify for the Region II bracket. Head-to-head breaks ties
            — Friday decides the title.
          </p>
        </section>
      </div>
    </div>
  );
}
