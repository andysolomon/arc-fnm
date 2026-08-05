import { AppShell } from './components/AppShell.tsx';
import { Academics } from './screens/Academics.tsx';
import { Boosters } from './screens/Boosters.tsx';
import { CareerStart } from './screens/CareerStart.tsx';
import { DecisionReview } from './screens/DecisionReview.tsx';
import { GamePlan } from './screens/GamePlan.tsx';
import { Inbox } from './screens/Inbox.tsx';
import { MatchDay } from './screens/MatchDay.tsx';
import { PracticePlan } from './screens/PracticePlan.tsx';
import { Scouting } from './screens/Scouting.tsx';
import { Schedule } from './screens/Schedule.tsx';
import { School } from './screens/School.tsx';
import { Squad } from './screens/Squad.tsx';
import { WeekHub } from './screens/WeekHub.tsx';
import { useWeek } from './state/weekContext.ts';
import { WeekProvider } from './state/WeekProvider.tsx';

/**
 * Screen switch. Career Start renders outside the week shell — it is the entry
 * surface, and the week navigation has nothing to act on yet.
 */
function Routes() {
  const { state } = useWeek();

  if (state.nav.screen === 'career') {
    return <CareerStart />;
  }

  return (
    <AppShell>
      {state.nav.screen === 'week' ? (
        <WeekHub />
      ) : state.nav.screen === 'inbox' ? (
        <Inbox />
      ) : state.nav.screen === 'schedule' ? (
        <Schedule />
      ) : state.nav.screen === 'academics' ? (
        <Academics />
      ) : state.nav.screen === 'squad' ? (
        <Squad />
      ) : state.nav.screen === 'boosters' ? (
        <Boosters />
      ) : state.nav.screen === 'school' ? (
        <School />
      ) : state.nav.screen === 'game-plan' ? (
        <GamePlan />
      ) : state.nav.screen === 'practice' ? (
        <PracticePlan />
      ) : state.nav.screen === 'match' ? (
        <MatchDay />
      ) : state.nav.screen === 'review' ? (
        <DecisionReview />
      ) : (
        <Scouting />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <WeekProvider>
      <Routes />
    </WeekProvider>
  );
}
