import { KOWALSKI_AUTHORITY } from '../domain/disruption.ts';
import { useWeek } from '../state/weekContext.ts';
import { Button, Card, ScreenHeading, StatusChip } from '../components/ui.tsx';

const ACADEMICS = [
  ['Ryan Kowalski', 'RT', '1.9', 'Algebra II', 'Ineligible'],
  ['Wyatt Turner', 'LG', '2.2', 'English III', 'Acad Risk'],
  ['Mike Sosa', 'LT', '2.4', 'Chemistry', 'Acad Risk'],
  ['Hunter McCoy', 'FB', '2.6', 'US History', 'Monitor'],
  ['Isaiah Brooks', 'TE', '2.7', 'Geometry', 'Monitor'],
] as const;

export function Academics() {
  const { state, dispatch } = useWeek();
  const disrupted = state.week.practicePlanLocked;
  return (
    <div data-screen-label="Academics">
      <div className="flex flex-wrap items-end gap-3">
        <ScreenHeading
          title="Academics · Eligibility"
          subtitle="Week 8 progress reports · district threshold 2.0"
        />
        <span className="flex-1" />
        <StatusChip tone={disrupted ? 'danger' : 'risk'}>
          {disrupted ? '1 ineligible' : '3 academic risks'}
        </StatusChip>
      </div>

      {disrupted && (
        <Card
          as="section"
          aria-labelledby="eligibility-alert"
          className="mt-4 border-l-4 border-l-[#7820bc]"
        >
          <p className="text-ink-subtle m-0 font-mono text-[10.5px] uppercase">
            Guidance Office · 7:42 AM
          </p>
          <h2
            id="eligibility-alert"
            className="mt-1.5 mb-0 text-[14px] font-semibold"
          >
            Eligibility alert: Ryan Kowalski
          </h2>
          <p className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-relaxed">
            {KOWALSKI_AUTHORITY.alert}
          </p>
          <p className="text-danger mt-2 mb-0 text-[12px] font-medium">
            Eligibility is the Guidance Office’s call. The next checkpoint is
            Oct 26 — nothing you do this week moves it.
          </p>
          <Button
            className="mt-3"
            variant="primary"
            onClick={() =>
              dispatch({
                type: 'navigate',
                screen: 'game-plan',
                tacticsTab: 'Depth Chart',
              })
            }
          >
            Open Depth Chart
          </Button>
        </Card>
      )}

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[660px] border-collapse text-left text-[12.5px]">
          <caption className="sr-only">
            Academic status for monitored varsity players
          </caption>
          <thead className="bg-surface-sunken text-ink-subtle font-mono text-[10px] uppercase">
            <tr>
              {['Player', 'Pos', 'GPA', 'Course', 'Status'].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="edge px-4 py-3 font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACADEMICS.map(([name, position, gpa, course, seededStatus]) => {
              const status =
                name === 'Ryan Kowalski' && disrupted
                  ? 'Ineligible'
                  : name === 'Ryan Kowalski'
                    ? 'Acad Risk'
                    : seededStatus;
              return (
                <tr key={name}>
                  <th scope="row" className="edge px-4 py-3 font-medium">
                    {name}
                  </th>
                  <td className="edge px-4 py-3">{position}</td>
                  <td className="edge px-4 py-3 tabular-nums">{gpa}</td>
                  <td className="edge px-4 py-3">{course}</td>
                  <td
                    className={`edge px-4 py-3 font-medium ${status === 'Ineligible' ? 'text-danger' : 'text-ink-muted'}`}
                  >
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
