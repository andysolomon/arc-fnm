import { MCCOY_AUTHORITY } from '../domain/disruption.ts';
import { WEEK_8_ROSTER } from '../domain/roster.ts';
import { useWeek } from '../state/weekContext.ts';
import {
  Button,
  Card,
  ScreenHeading,
  StatusChip,
  StatusDot,
} from '../components/ui.tsx';

export function Squad() {
  const { state, dispatch } = useWeek();
  const disrupted = state.week.practicePlanLocked;
  return (
    <div data-screen-label="Squad">
      <div className="flex flex-wrap items-end gap-3">
        <ScreenHeading
          title="Squad · Varsity Roster"
          subtitle={`${WEEK_8_ROSTER.length} players shown · sorted by overall`}
        />
        <span className="flex-1" />
        <StatusChip tone={disrupted ? 'risk' : 'good'}>
          {disrupted ? '2 restrictions' : 'Roster active'}
        </StatusChip>
      </div>
      {disrupted && (
        <Card
          as="section"
          aria-labelledby="trainer-update"
          className="border-l-danger mt-4 border-l-4"
        >
          <p className="text-ink-subtle m-0 font-mono text-[10.5px] uppercase">
            Athletic Trainer · 6:55 AM
          </p>
          <h2
            id="trainer-update"
            className="mt-1.5 mb-0 text-[14px] font-semibold"
          >
            Injury update: Hunter McCoy (FB)
          </h2>
          <p className="text-ink-muted mt-2 mb-0 text-[12.5px]">
            {MCCOY_AUTHORITY.detail} The trainer re-evaluates him Monday.
          </p>
          <p className="text-risk mt-2 mb-0 text-[12px] font-medium">
            No contact through Friday · Decided by Athletic Trainer
          </p>
        </Card>
      )}
      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12.5px]">
          <caption className="sr-only">
            Week 8 varsity roster and availability
          </caption>
          <thead className="bg-surface-sunken text-ink-subtle font-mono text-[10px] uppercase">
            <tr>
              {[
                '#',
                'Player',
                'Grade',
                'Pos',
                'OVR',
                'GPA',
                'Availability',
                'Depth',
              ].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="edge px-3 py-3 font-medium"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...WEEK_8_ROSTER]
              .sort((a, b) => b.overall - a.overall)
              .map((player) => {
                const availability =
                  disrupted && player.name === 'Ryan Kowalski'
                    ? 'Ineligible'
                    : disrupted && player.name === 'Hunter McCoy'
                      ? 'No contact'
                      : 'Active';
                return (
                  <tr key={player.name}>
                    <td className="edge px-3 py-3 font-mono">
                      {player.number}
                    </td>
                    <th scope="row" className="edge px-3 py-3 font-medium">
                      {player.name}
                    </th>
                    <td className="edge px-3 py-3">{player.grade}</td>
                    <td className="edge px-3 py-3">{player.position}</td>
                    <td className="edge px-3 py-3 font-medium">
                      {player.overall}
                    </td>
                    <td className="edge px-3 py-3">{player.gpa.toFixed(1)}</td>
                    <td
                      className={`edge px-3 py-3 font-medium ${availability === 'Ineligible' ? 'text-danger' : availability === 'No contact' ? 'text-risk' : 'text-ink-muted'}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <StatusDot
                          tone={
                            availability === 'Ineligible'
                              ? 'danger'
                              : availability === 'No contact'
                                ? 'risk'
                                : 'good'
                          }
                        />
                        {availability}
                      </span>
                    </td>
                    <td className="edge px-3 py-3">
                      <Button
                        variant="quiet"
                        className="text-accent h-auto px-0"
                        onClick={() =>
                          dispatch({
                            type: 'navigate',
                            screen: 'game-plan',
                            tacticsTab: 'Depth Chart',
                          })
                        }
                      >
                        Depth Chart
                      </Button>
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
