import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import type {
  ScoutingTab,
  ScreenId,
  StageId,
  TacticsTab,
} from '../domain/types.ts';
import { useWeek } from '../state/weekContext.ts';
import { inboxUnreadCount } from '../screens/inboxData.ts';

type IconId =
  | 'week'
  | 'inbox'
  | 'squad'
  | 'tactics'
  | 'match'
  | 'schedule'
  | 'training'
  | 'academics'
  | 'scouting'
  | 'boosters'
  | 'school';

interface NavItem {
  readonly icon: IconId;
  readonly label: string;
  readonly screen: ScreenId;
  readonly scoutingTab?: ScoutingTab;
  readonly tacticsTab?: TacticsTab;
}

const NAV_ITEMS: readonly NavItem[] = [
  { icon: 'week', label: 'Week', screen: 'week' },
  {
    icon: 'inbox',
    label: 'Inbox',
    screen: 'inbox',
  },
  {
    icon: 'squad',
    label: 'Squad',
    screen: 'squad',
  },
  {
    icon: 'tactics',
    label: 'Tactics',
    screen: 'game-plan',
    tacticsTab: 'Game Plan',
  },
  {
    icon: 'match',
    label: 'Match Day',
    screen: 'match',
  },
  {
    icon: 'schedule',
    label: 'Schedule',
    screen: 'schedule',
  },
  { icon: 'training', label: 'Training', screen: 'practice' },
  {
    icon: 'academics',
    label: 'Academics',
    screen: 'academics',
  },
  {
    icon: 'scouting',
    label: 'Scouting',
    screen: 'scouting',
    scoutingTab: 'Overview',
  },
  {
    icon: 'boosters',
    label: 'Boosters',
    screen: 'boosters',
  },
  {
    icon: 'school',
    label: 'School',
    screen: 'school',
  },
];

const STAGE_DAY: Record<StageId, string> = {
  evidence: 'Monday',
  plan: 'Tuesday',
  practice: 'Wednesday',
  disruption: 'Thursday',
  friday: 'Friday',
  review: 'Saturday',
};

function NavIcon({ icon }: { icon: IconId }) {
  const path =
    icon === 'week' ? (
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
    ) : icon === 'inbox' ? (
      <path d="M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    ) : icon === 'squad' ? (
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />
    ) : icon === 'tactics' ? (
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 12h6 M9 16h4" />
    ) : icon === 'match' ? (
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" />
    ) : icon === 'schedule' ? (
      <path d="M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    ) : icon === 'training' ? (
      <path d="M2 9v6 M6 7v10 M18 7v10 M22 9v6 M6 12h12" />
    ) : icon === 'academics' ? (
      <path d="M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    ) : icon === 'scouting' ? (
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35" />
    ) : icon === 'boosters' ? (
      <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    ) : (
      <path d="M3 21h18 M5 21V7l7-4 7 4v14 M9 21v-6h6v6" />
    );
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      {path}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="fill-none stroke-current stroke-[1.8] [stroke-linecap:round]"
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch, gate, planGate, practiceGate, next, scenario } =
    useWeek();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const { screen } = state.nav;
  const currentStage = scenario.stages.find(
    (stage) => stage.id === state.week.stage,
  );

  const closeDrawer = (restoreFocus = true) => {
    setDrawerOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButton.current?.focus());
  };

  useEffect(() => {
    if (!drawerOpen) return;
    drawer.current
      ?.querySelector<HTMLElement>('button:not([disabled])')
      ?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  function navigate(item: NavItem) {
    dispatch({
      type: 'navigate',
      screen: item.screen,
      ...(item.scoutingTab === undefined
        ? {}
        : { scoutingTab: item.scoutingTab }),
      ...(item.tacticsTab === undefined ? {} : { tacticsTab: item.tacticsTab }),
    });
    setDrawerOpen(false);
  }

  function navBadge(item: NavItem): string | null {
    if (item.icon === 'inbox') {
      const count = inboxUnreadCount(
        state.week.practicePlanLocked,
        state.nav.inboxReadMessageIds ?? [],
      );
      return count === 0 ? null : String(count);
    }
    if (item.icon === 'week' && !gate.ready) {
      return String(scenario.priorityCapacity - gate.priorityIds.length);
    }
    if (item.icon === 'tactics' && gate.ready && !planGate.ready) {
      return String(planGate.requiredCount - planGate.answeredCount);
    }
    if (item.icon === 'training' && planGate.ready && !practiceGate.locked) {
      return String(practiceGate.remaining);
    }
    if (item.icon === 'match' && state.week.stage === 'friday') {
      return state.week.matchStarted ? 'LIVE' : '1';
    }
    return null;
  }

  function isLocked(item: NavItem): boolean {
    return (
      (item.screen === 'game-plan' && !gate.ready) ||
      (item.screen === 'practice' && !planGate.ready)
    );
  }

  function lockReason(item: NavItem): string | undefined {
    if (item.screen === 'game-plan' && !gate.ready) {
      return 'Set exactly three priorities and one accepted risk first.';
    }
    if (item.screen === 'practice' && !planGate.ready) {
      return 'Set one valid answer for every priority first.';
    }
    return undefined;
  }

  const renderNav = (inDrawer: boolean) => (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {NAV_ITEMS.map((item) => {
        const selected = screen === item.screen;
        const disabled = isLocked(item);
        const reason = lockReason(item);
        const badge = navBadge(item);
        const reasonId = `nav-reason-${inDrawer ? 'drawer' : 'rail'}-${item.icon}`;
        return (
          <li key={item.icon}>
            <button
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-describedby={disabled ? reasonId : undefined}
              disabled={disabled}
              title={reason}
              onClick={() => navigate(item)}
              className={`focus-visible:ring-accent flex w-full items-center gap-2.5 rounded-md border-0 px-2.5 text-left font-sans font-normal outline-none focus-visible:ring-2 ${
                inDrawer ? 'min-h-9 text-[13.5px]' : 'min-h-8 text-[13px]'
              } ${
                selected
                  ? 'text-ink bg-[#ebebeb]'
                  : disabled
                    ? 'text-ink-faint cursor-not-allowed'
                    : 'text-ink-muted hover:text-ink cursor-pointer bg-transparent hover:bg-[#ebebeb]'
              }`}
            >
              <NavIcon icon={item.icon} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badge !== null && !disabled && (
                <span className="bg-ink rounded-full px-2 py-px text-[11px] font-medium text-white">
                  {badge}
                </span>
              )}
              {disabled && (
                <span
                  id={reasonId}
                  className="max-w-14 truncate font-mono text-[8px] tracking-[0.03em] uppercase"
                >
                  Locked
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  const trapDrawerFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      data-shell-tiers="1440 1024 768 390"
      className="bg-surface-sunken text-ink flex h-dvh flex-col overflow-hidden"
    >
      <header className="bg-surface-sunken z-20 flex min-h-16 shrink-0 items-center gap-3.5 px-3 py-2 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] min-[768px]:px-4 min-[768px]:py-2.5 min-[1024px]:px-[18px] min-[1440px]:px-5">
        <button
          ref={menuButton}
          type="button"
          aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={drawerOpen}
          aria-controls="primary-nav-drawer"
          onClick={() => setDrawerOpen((open) => !open)}
          className="edge text-ink hover:bg-surface-raised flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-white min-[1024px]:hidden"
        >
          <MenuIcon />
        </button>

        <div className="bg-ink flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white">
          W
        </div>
        <div className="min-w-0 leading-[1.2]">
          <div className="truncate text-sm font-medium tracking-[-0.28px]">
            {scenario.program.school} {scenario.program.mascot}
          </div>
          <div className="text-ink-subtle text-xs whitespace-nowrap">
            Head Coach · Varsity Football
          </div>
        </div>

        <div className="text-ink-muted min-w-2 flex-1 truncate text-center text-[13px]">
          <span className="text-ink font-medium">
            {currentStage?.date}, 2026
          </span>
          <span className="text-ink-subtle"> · Week 8 · </span>
          <span>
            {STAGE_DAY[state.week.stage]} · {currentStage?.title}
          </span>
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'reset-week' })}
          title="Restore the seeded Week 8 baseline"
          className="edge text-ink-subtle hover:text-ink h-8 shrink-0 cursor-pointer rounded-md border-0 bg-white px-[11px] font-sans text-[11.5px] font-medium"
        >
          Reset week
        </button>
        <button
          type="button"
          title={next.title}
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
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border-0 px-4 font-sans text-[13.5px] font-medium text-white ${next.blocker ? 'bg-danger' : 'bg-ink hover:bg-[#383838]'}`}
        >
          <span className="max-[767px]:hidden">{next.label}</span>
          <span className="min-[768px]:hidden">
            {next.blocker ? 'Blocker' : 'Continue'}
          </span>
          <span aria-hidden="true" className="opacity-60">
            ▸
          </span>
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <nav
          aria-label="Primary"
          className="bg-surface-sunken hidden w-[200px] shrink-0 overflow-auto px-2.5 py-3 shadow-[inset_-1px_0_0_rgba(0,0,0,0.08)] min-[1024px]:block min-[1440px]:w-[220px]"
        >
          {renderNav(false)}
        </nav>

        {drawerOpen && (
          <div
            className="absolute inset-0 z-30 flex min-[1024px]:hidden"
            role="presentation"
          >
            <nav
              ref={drawer}
              id="primary-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              onKeyDown={trapDrawerFocus}
              className="bg-surface-sunken w-60 shrink-0 overflow-auto px-2.5 py-3 shadow-[1px_0_12px_rgba(0,0,0,0.14)]"
            >
              {renderNav(true)}
            </nav>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => closeDrawer()}
              className="flex-1 cursor-pointer border-0 bg-black/28"
            />
          </div>
        )}

        <main
          aria-label="Main content"
          aria-hidden={drawerOpen || undefined}
          className="min-w-0 flex-1 overflow-auto p-[12px_14px_24px] min-[768px]:p-[16px_18px_28px] min-[1024px]:p-[18px_22px_30px] min-[1440px]:p-[20px_24px_32px]"
        >
          {children}
        </main>
      </div>
      <footer
        aria-label="Program context"
        className="bg-surface-sunken text-ink-subtle flex min-h-8 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 py-1 text-xs shadow-[0_-1px_0_0_rgba(0,0,0,0.08)]"
      >
        <span>
          Next:{' '}
          <span className="text-ink font-medium">
            vs. Central Catholic (Fri)
          </span>
        </span>
        <span aria-hidden="true" className="text-hairline">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          Record <span className="text-ink font-medium">6-1</span>
          <span
            aria-hidden="true"
            className="bg-good inline-block size-[7px] rounded-full"
          />
        </span>
        <span aria-hidden="true" className="text-hairline">
          ·
        </span>
        <span>
          District Rank <span className="text-ink font-medium">#2</span>
        </span>
        <span className="min-w-0 flex-1" />
        <span className="inline-flex items-center gap-1.5">
          Team Morale <span className="text-ink font-medium">High</span>
          <span
            aria-hidden="true"
            className="bg-good inline-block size-[7px] rounded-full"
          />
        </span>
        <span aria-hidden="true" className="text-hairline">
          ·
        </span>
        <span>
          Booster Fund <span className="text-ink font-medium">$12,400</span>
        </span>
      </footer>
    </div>
  );
}
