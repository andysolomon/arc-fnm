import { Card, ScreenHeading, StatusDot } from '../components/ui.tsx';
import {
  ADMINISTRATION,
  FACILITIES,
  PROGRAM_HISTORY,
  STAFF,
} from './schoolData.ts';

export function School() {
  return (
    <div
      data-screen-label="School"
      data-responsive-layout="wrapping-detail-cards"
    >
      <ScreenHeading
        title="Westfield High School"
        subtitle="Enrollment 2,140 · UIL 5A Division I · Est. 1948"
      />

      <div className="mt-4 flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[1_1_480px]">
          <Card aria-labelledby="facilities-heading" className="p-[18px]">
            <h2
              id="facilities-heading"
              className="text-ink-subtle mt-0 mb-2 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Facilities
            </h2>
            <ul className="m-0 list-none p-0">
              {FACILITIES.map((facility) => (
                <li
                  key={facility.name}
                  className="flex flex-wrap items-center gap-3 py-[9px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                >
                  <div className="min-w-[190px] flex-1">
                    <h3 className="m-0 text-[13px] font-medium">
                      {facility.name}
                    </h3>
                    <p className="text-ink-subtle mt-px mb-0 text-[12px]">
                      {facility.detail}
                    </p>
                  </div>
                  <span className="text-ink-muted inline-flex items-center gap-1.5 text-[12px] font-medium">
                    <StatusDot
                      tone={facility.condition === 'Good' ? 'good' : 'risk'}
                    />
                    {facility.condition}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="staff-heading" className="mt-3.5 p-[18px]">
            <h2
              id="staff-heading"
              className="text-ink-subtle mt-0 mb-2 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Staff
            </h2>
            <ul className="m-0 list-none p-0">
              {STAFF.map((member) => (
                <li
                  key={member.role}
                  className="flex flex-wrap items-center gap-3 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                >
                  <span className="bg-surface-raised text-ink-muted min-w-[62px] rounded px-[7px] py-0.5 text-center font-mono text-[10.5px] font-medium">
                    {member.role}
                  </span>
                  <span className="min-w-[110px] text-[13px] font-medium">
                    {member.name}
                  </span>
                  <span className="text-ink-subtle min-w-[190px] flex-1 text-[12.5px]">
                    {member.note}
                  </span>
                  <span
                    className={`text-ink-muted inline-flex items-center gap-1.5 text-xs ${member.ability === 'Very Good' ? 'font-medium' : 'font-normal'}`}
                  >
                    <StatusDot tone="good" /> {member.ability}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex max-w-[440px] min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <Card aria-labelledby="administration-heading" className="p-[18px]">
            <h2
              id="administration-heading"
              className="text-ink-subtle mt-0 mb-3 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Administration
            </h2>
            <dl className="m-0">
              {ADMINISTRATION.map((administrator, index) => (
                <div
                  key={administrator.name}
                  className={index === 0 ? '' : 'mt-4'}
                >
                  <div className="flex justify-between gap-3 text-[13px]">
                    <dt className="font-medium">{administrator.name}</dt>
                    <dd className="text-ink-subtle m-0">
                      {administrator.role}
                    </dd>
                  </div>
                  <div className="mt-[7px] flex items-center gap-2.5">
                    <progress
                      aria-label={`${administrator.name} influence`}
                      value={administrator.influence}
                      max="100"
                      className="h-1 min-w-0 flex-1 accent-[#171717]"
                    />
                    <span className="text-ink-muted w-[34px] text-right font-mono text-[11.5px] tabular-nums">
                      {administrator.influence}
                    </span>
                  </div>
                </div>
              ))}
            </dl>
            <p className="text-ink-subtle mt-3.5 mb-0 text-[12px] leading-[1.55]">
              Wins help. Grades help more — Vaughn reads the eligibility report
              before the box score.
            </p>
          </Card>

          <Card aria-labelledby="program-history-heading" className="p-[18px]">
            <h2
              id="program-history-heading"
              className="text-ink-subtle mt-0 mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Program History
            </h2>
            <dl className="m-0">
              {PROGRAM_HISTORY.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center gap-2 py-1.5 text-[13px]"
                >
                  <StatusDot tone={fact.tone} />
                  <dt className="text-ink-muted flex-1">{fact.label}</dt>
                  <dd className="m-0 font-medium tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
