import { useMemo, useState } from 'react';

import { Button, StatusDot, type StatusTone } from '../components/ui.tsx';
import { useWeek } from '../state/weekContext.ts';
import {
  INBOX_MESSAGES,
  inboxUnreadCount,
  visibleInboxMessages,
  visibleStaffNotes,
  type InboxAction,
  type InboxMessageKind,
} from './inboxData.ts';

const KIND_TONE: Readonly<Record<InboxMessageKind, StatusTone>> = {
  Academics: 'hold',
  Injury: 'danger',
  Scouting: 'good',
  Press: 'risk',
  Boosters: 'good',
  District: 'neutral',
};

const ACKNOWLEDGED_LABELS: Readonly<Record<string, string>> = {
  'Assign Tutor': 'Tutor assigned',
  'Schedule Study Hall': 'Study hall scheduled',
  'Rest 2 Weeks': 'Rest plan confirmed',
  'Prep Highlight Tape': 'Tape queued with Soto',
  Reply: 'Replied',
  'Pin to Bulletin': 'Pinned to the bulletin',
  'Approve Halftime Check': 'Halftime check approved',
  'Send Thanks': 'Thanks sent',
};

export function Inbox() {
  const { state, dispatch } = useWeek();
  const disrupted = state.week.practicePlanLocked;
  const messages = visibleInboxMessages(disrupted);
  const staffNotes = visibleStaffNotes(disrupted);
  const [selectedId, setSelectedId] = useState('state-u-scout');
  const [detailOpen, setDetailOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState<readonly string[]>([]);
  const selected =
    messages.find((message) => message.id === selectedId) ?? INBOX_MESSAGES[2]!;
  const unreadCount = inboxUnreadCount(
    disrupted,
    state.nav.inboxReadMessageIds ?? [],
  );

  const dateLabel = useMemo(() => 'Oct 14, 2026', []);

  function openMessage(messageId: string) {
    setSelectedId(messageId);
    setDetailOpen(true);
    dispatch({ type: 'mark-inbox-read', messageId });
  }

  function runAction(action: InboxAction) {
    if (action.screen !== undefined) {
      dispatch({
        type: 'navigate',
        screen: action.screen,
        ...(action.tacticsTab === undefined
          ? {}
          : { tacticsTab: action.tacticsTab }),
      });
      return;
    }
    setAcknowledged((current) =>
      current.includes(action.label) ? current : [...current, action.label],
    );
  }

  return (
    <div
      data-screen-label="Inbox"
      data-responsive-layout="list-detail-stack"
      className="-m-[12px_14px_24px] flex h-[calc(100%+36px)] min-h-[520px] overflow-hidden min-[768px]:-m-[16px_18px_28px] min-[1024px]:-m-[18px_22px_30px] min-[1440px]:-m-[20px_24px_32px]"
    >
      <section
        aria-labelledby="inbox-list-heading"
        className={`${detailOpen ? 'hidden min-[768px]:block' : 'block'} bg-surface-sunken w-full shrink-0 overflow-auto shadow-[inset_-1px_0_0_rgba(0,0,0,0.08)] min-[768px]:w-[380px]`}
      >
        <header className="bg-surface-sunken sticky top-0 z-10 flex items-baseline gap-2.5 px-4 pt-[18px] pb-3 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
          <h1
            id="inbox-list-heading"
            className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
          >
            Inbox
          </h1>
          <span className="text-ink-subtle text-[12px]">
            {unreadCount} unread
          </span>
        </header>
        <nav aria-label="Messages">
          <ol className="m-0 list-none p-0">
            {messages.map((message) => {
              const selectedMessage = selected.id === message.id;
              const unread =
                message.initiallyUnread &&
                !(state.nav.inboxReadMessageIds ?? []).includes(message.id);
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    aria-current={selectedMessage ? 'true' : undefined}
                    aria-label={`${unread ? 'Unread: ' : ''}${message.subject}`}
                    onClick={() => openMessage(message.id)}
                    className={`focus-visible:ring-accent block w-full cursor-pointer border-0 border-l-2 px-3.5 py-3 text-left font-sans outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                      selectedMessage
                        ? 'border-l-accent bg-surface-raised'
                        : 'hover:bg-surface-raised border-l-transparent bg-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <StatusDot tone={KIND_TONE[message.kind]} />
                      <span className="text-ink-muted min-w-0 flex-1 truncate text-[12px] font-medium">
                        {message.sender}
                      </span>
                      <time className="text-ink-subtle font-mono text-[11px]">
                        {message.time}
                      </time>
                      {unread && (
                        <span
                          aria-label="Unread"
                          className="bg-accent size-1.5 shrink-0 rounded-full"
                        />
                      )}
                    </span>
                    <span
                      className={`mt-1 block truncate text-[13px] ${unread ? 'text-ink font-medium' : 'text-ink-muted font-normal'}`}
                    >
                      {message.subject}
                    </span>
                    <span className="text-ink-subtle mt-0.5 block truncate text-[12px]">
                      {message.preview}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </section>

      <article
        aria-labelledby="message-subject"
        className={`${detailOpen ? 'block' : 'hidden min-[768px]:block'} min-w-0 flex-1 overflow-auto p-4 min-[768px]:p-[clamp(20px,4vw,40px)]`}
      >
        <div className="max-w-[720px]">
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="text-ink-subtle hover:text-ink mb-3.5 cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-medium min-[768px]:hidden"
          >
            ← All messages
          </button>
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <span className="edge bg-surface text-ink-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12px]">
              <StatusDot tone={KIND_TONE[selected.kind]} />
              {selected.kind}
            </span>
            <span className="text-ink-subtle text-[12px]">
              {selected.time} · {dateLabel}
            </span>
          </div>
          <h2
            id="message-subject"
            className="m-0 text-[clamp(22px,5vw,28px)] leading-[1.15] font-semibold tracking-[-0.9px] text-pretty"
          >
            {selected.subject}
          </h2>
          <p className="text-ink-subtle mt-2.5 mb-[22px] border-0 pb-[18px] text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            From{' '}
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: 'navigate',
                  screen: selected.sourceScreen,
                })
              }
              className="text-ink-muted hover:text-accent cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-medium underline-offset-2 hover:underline"
            >
              {selected.sender}
            </button>
          </p>
          {selected.body.map((paragraph) => (
            <p
              key={paragraph}
              className="text-ink-muted mt-0 mb-3.5 text-[14px] leading-[1.7] text-pretty"
            >
              {paragraph}
            </p>
          ))}
          <div className="mt-7 flex flex-wrap gap-2.5">
            {selected.actions.map((action) => {
              const isAcknowledged = acknowledged.includes(action.label);
              const acknowledgedLabel = ACKNOWLEDGED_LABELS[action.label];
              return (
                <Button
                  key={action.label}
                  variant={action.primary ? 'primary' : 'secondary'}
                  disabled={isAcknowledged}
                  onClick={() => runAction(action)}
                >
                  {isAcknowledged && acknowledgedLabel !== undefined
                    ? acknowledgedLabel
                    : action.label}
                </Button>
              );
            })}
          </div>

          <section
            aria-labelledby="staff-notes-heading"
            className="edge bg-surface mt-8 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <h3
                id="staff-notes-heading"
                className="m-0 text-[13px] font-medium"
              >
                From the staff
              </h3>
              <span className="flex-1" />
              <Button
                variant="quiet"
                className="text-accent h-auto px-0 text-[12px]"
                onClick={() => dispatch({ type: 'navigate', screen: 'week' })}
              >
                Open Week
              </Button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {staffNotes.map((note) => (
                <blockquote key={note.person} className="m-0">
                  <p className="text-ink-muted m-0 text-[12.5px] leading-[1.6] text-pretty">
                    “{note.note}”
                  </p>
                  <footer className="text-ink-subtle mt-1 text-[11px]">
                    {note.person} · {note.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
