import { useState } from 'react';

import { Button, Card, ScreenHeading, StatusDot } from '../components/ui.tsx';
import {
  BOOSTER_EVENTS,
  FUNDING_REQUESTS,
  KEY_BOOSTERS,
  type FundingRequestOutcome,
} from './boostersData.ts';

type RequestOutcomes = Readonly<
  Partial<
    Record<(typeof FUNDING_REQUESTS)[number]['id'], FundingRequestOutcome>
  >
>;

export function Boosters() {
  const [outcomes, setOutcomes] = useState<RequestOutcomes>({});

  function decide(
    id: (typeof FUNDING_REQUESTS)[number]['id'],
    outcome: FundingRequestOutcome,
  ) {
    setOutcomes((current) => ({ ...current, [id]: outcome }));
  }

  return (
    <div
      data-screen-label="Boosters"
      data-responsive-layout="auto-fit-stats-wrapping-columns"
    >
      <ScreenHeading
        title="Boosters"
        subtitle="Westfield Gridiron Club · 214 members"
      />

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">
        <Card as="div" className="p-4">
          <dd className="m-0 text-[22px] font-semibold tracking-[-0.88px] tabular-nums">
            $12,400
          </dd>
          <dt className="text-ink-subtle mt-[3px] text-[11.5px]">
            Fund balance
          </dt>
        </Card>
        <Card as="div" className="p-4">
          <dd className="m-0 text-[22px] font-semibold tracking-[-0.88px] tabular-nums">
            $31,900
          </dd>
          <dt className="text-ink-subtle mt-[3px] text-[11.5px]">
            Raised this season
          </dt>
        </Card>
        <Card as="div" className="p-4">
          <dd className="m-0 flex items-center gap-2 text-[22px] font-semibold tracking-[-0.88px]">
            High <StatusDot tone="good" />
          </dd>
          <dt className="text-ink-subtle mt-[3px] text-[11.5px]">
            Club sentiment · 6-1 helps
          </dt>
        </Card>
      </dl>

      <div className="mt-3.5 flex flex-wrap items-start gap-3.5">
        <Card
          aria-labelledby="funding-requests-heading"
          className="min-w-0 flex-[1_1_480px] p-[18px]"
        >
          <h2
            id="funding-requests-heading"
            className="text-ink-subtle mt-0 mb-2 text-[11px] font-medium tracking-[0.04em] uppercase"
          >
            Funding Requests
          </h2>
          <ul className="m-0 list-none p-0" aria-live="polite">
            {FUNDING_REQUESTS.map((request) => {
              const outcome =
                outcomes[request.id] ??
                (request.seedState === 'approved' ? 'approved' : undefined);
              return (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 py-[11px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                >
                  <div className="min-w-0 flex-[1_1_200px]">
                    <h3 className="m-0 text-[13px] font-medium">
                      {request.name}
                    </h3>
                    <p className="text-ink-subtle mt-px mb-0 text-[12px]">
                      {request.description}
                    </p>
                  </div>
                  <span className="font-mono text-[13px] font-medium tabular-nums">
                    {request.amount}
                  </span>
                  {outcome === 'approved' ? (
                    <span className="text-good inline-flex min-w-[120px] items-center justify-end gap-1.5 text-[11.5px] font-medium">
                      <StatusDot tone="good" /> Approved
                    </span>
                  ) : outcome === 'deferred' ? (
                    <span className="text-ink-subtle inline-flex min-w-[120px] items-center justify-end gap-1.5 text-[11.5px] font-medium">
                      <StatusDot /> Deferred · Nov board
                    </span>
                  ) : (
                    <span className="inline-flex min-w-[120px] justify-end gap-1.5">
                      <Button
                        variant="primary"
                        className="h-7 px-3 text-xs"
                        aria-label={`Approve ${request.name}`}
                        onClick={() => decide(request.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        className="h-7 px-2.5 text-xs"
                        aria-label={`Decide later on ${request.name}`}
                        onClick={() => decide(request.id, 'deferred')}
                      >
                        Later
                      </Button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex max-w-[440px] min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <Card aria-labelledby="key-boosters-heading" className="p-[18px]">
            <h2
              id="key-boosters-heading"
              className="text-ink-subtle mt-0 mb-2 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Key Boosters
            </h2>
            <ul className="m-0 list-none p-0">
              {KEY_BOOSTERS.map((booster) => (
                <li
                  key={booster.name}
                  className="py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot tone={booster.sentiment} />
                    <span className="text-[13px] font-medium">
                      {booster.name}
                    </span>
                    <span className="text-ink-subtle text-[11.5px]">
                      {booster.business}
                    </span>
                  </div>
                  <p className="text-ink-subtle mt-[3px] mb-0 ml-4 text-[12px]">
                    {booster.note}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="booster-upcoming-heading" className="p-[18px]">
            <h2
              id="booster-upcoming-heading"
              className="text-ink-subtle mt-0 mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase"
            >
              Upcoming
            </h2>
            <ul className="m-0 list-none p-0">
              {BOOSTER_EVENTS.map((event) => (
                <li
                  key={event.date}
                  className="flex items-center gap-2 py-1.5 text-[13px]"
                >
                  <span className="text-ink-subtle w-14 shrink-0 font-mono text-xs">
                    {event.date}
                  </span>
                  <span className="text-ink-muted flex-1">
                    {event.description}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
