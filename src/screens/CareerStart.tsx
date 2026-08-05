import { useEffect, useState, type ReactNode } from 'react';

import { useWeek } from '../state/weekContext.ts';
import { careerStartResponsiveFields } from './careerStartResponsive.ts';

type CareerScreen =
  'menu' | 'journey' | 'profiles' | 'wizard' | 'team' | 'setup' | 'news';
type PlayingId = 'none' | 'hs' | 'walkon' | 'starter' | 'pro';
type RoleId = 'position' | 'coordinator' | 'teacher' | 'film' | 'norole';
type RenownId = 'local' | 'district' | 'regional' | 'state';
type StartDateId = 'twoadays' | 'week1';
type RosterId = 'real' | 'random';

const PORTRAIT_TONES = [
  '#EBEBEB',
  '#E3E3E3',
  '#EFEFEF',
  '#DBDBDB',
  '#E7E7E7',
  '#DFDFDF',
] as const;

const PLAYING = [
  [
    'none',
    'Didn’t play',
    'You came up through the classroom and the film room.',
  ],
  ['hs', 'High school letterman', 'Four years of varsity ball in West Texas.'],
  [
    'walkon',
    'College walk-on',
    'Made a D-II roster on grit; mostly special teams.',
  ],
  [
    'starter',
    'College starter',
    'Three-year starter; honorable mention All-Conference.',
  ],
  ['pro', 'Arena-league pro', 'Two seasons of indoor ball after college.'],
] as const satisfies readonly (readonly [PlayingId, string, string])[];

const ROLES = [
  [
    'position',
    'Position coach',
    'You’ve run a room — receivers, then linebackers — at two schools.',
  ],
  [
    'coordinator',
    'Coordinator',
    'You called a side of the ball on Friday nights for four seasons.',
  ],
  [
    'teacher',
    'Teacher & assistant',
    'Algebra II by day, quality control and JV duties after seventh period.',
  ],
  [
    'film',
    'Film & analytics',
    'You cut opponent film and built the scouting sheets everyone used.',
  ],
  ['norole', 'None', 'First job on a sideline. The interview better go well.'],
] as const satisfies readonly (readonly [RoleId, string, string])[];

const RENOWN = [
  ['local', 'Locally'],
  ['district', 'In the district'],
  ['regional', 'Regionally'],
  ['state', 'Statewide'],
] as const satisfies readonly (readonly [RenownId, string])[];

const SCHOOLS = [
  ['central', 'Central Catholic', 'CC', '1st'],
  ['westfield', 'Westfield', 'W', '2nd'],
  ['riverside', 'Riverside', 'R', '3rd'],
  ['eastridge', 'East Ridge', 'ER', '4th'],
  ['jefferson', 'Jefferson', 'J', '5th'],
  ['northgate', 'North Gate', 'NG', '6th'],
  ['lakeview', 'Lakeview', 'L', '7th'],
  ['millbrook', 'Millbrook', 'M', '8th'],
] as const;

const WIZARD_STEPS = [
  'Appearance',
  'Background',
  'Playing Career',
  'Coaching Role',
  'Summary',
] as const;

const edge = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)]';
const edgeRaised =
  'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_2px_rgba(0,0,0,0.04)]';
const card = `rounded-[12px] bg-white ${edgeRaised}`;
const secondaryButton = `h-[38px] rounded-[6px] bg-white px-[18px] text-[13px] font-medium text-ink-muted ${edge} hover:bg-surface-raised`;
const primaryButton =
  'h-[38px] rounded-[6px] bg-ink px-5 text-[13px] font-medium text-white hover:bg-[#383838]';
const labelClass =
  'text-[11px] font-medium uppercase tracking-[0.04em] text-ink-subtle';

function useResponsiveFields() {
  const [fields, setFields] = useState(() =>
    careerStartResponsiveFields(
      typeof window === 'undefined' ? 1440 : window.innerWidth,
    ),
  );
  useEffect(() => {
    const update = () =>
      setFields(careerStartResponsiveFields(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return fields;
}

function Placeholder({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-ink-subtle flex items-center justify-center rounded-[8px] bg-[repeating-linear-gradient(45deg,#F2F2F2_0_8px,#FAFAFA_8px_16px)] font-mono text-[10.5px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function Dot({
  color = '#45A557',
  size = 7,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: color }}
    />
  );
}

function Radio({ selected, size = 16 }: { selected: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 1.5px ${selected ? '#171717' : '#C9C9C9'}`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: size / 2,
          height: size / 2,
          background: selected ? '#171717' : 'transparent',
        }}
      />
    </span>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
  className = '',
  label,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`text-ink w-full cursor-pointer border-none bg-white text-left outline-none ${selected ? 'shadow-[0_0_0_1.5px_#171717,0_2px_2px_rgba(0,0,0,0.04)]' : edge} hover:shadow-[0_0_0_1.5px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </button>
  );
}

function PageTitle({ children, size }: { children: ReactNode; size: number }) {
  return (
    <h1
      className="m-0 leading-none font-semibold tracking-[-1.28px] text-pretty"
      style={{ fontSize: size }}
    >
      {children}
    </h1>
  );
}

function Attributes({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: readonly { label: string; strong: boolean }[];
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between">
        <span className={labelClass}>{title}</span>
        <span className="text-ink-subtle text-[11px]">Ability</span>
      </div>
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center justify-between shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)] ${compact ? 'py-1.5' : 'py-[7px]'}`}
        >
          <span
            className={`${compact ? 'text-[12.5px]' : 'text-[13px]'} text-ink-muted`}
          >
            {item.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] ${item.strong ? 'font-medium text-[#398E4A]' : 'text-ink-muted font-normal'}`}
          >
            <Dot /> {item.strong ? 'Very Good' : 'Good'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CareerStart() {
  const { dispatch } = useWeek();
  const responsive = useResponsiveFields();
  const [screen, setScreen] = useState<CareerScreen>('menu');
  const [wizardStep, setWizardStep] = useState(0);
  const [preset, setPreset] = useState(0);
  const [first, setFirst] = useState('Alex');
  const [last, setLast] = useState('Rivera');
  const [age, setAge] = useState('34');
  const [home, setHome] = useState('Abilene, TX');
  const [alma, setAlma] = useState('Sam Houston State');
  const [playing, setPlaying] = useState<PlayingId>('starter');
  const [role, setRole] = useState<RoleId>('coordinator');
  const [renown, setRenown] = useState<RenownId>('regional');
  const [school, setSchool] = useState('westfield');
  const [unemployed, setUnemployed] = useState(false);
  const [startDate, setStartDate] = useState<StartDateId>('twoadays');
  const [roster, setRoster] = useState<RosterId>('real');

  const fullName = `${first} ${last}`.trim() || 'Unnamed Coach';
  const selectedSchool = SCHOOLS.find(([id]) => id === school) ?? SCHOOLS[1];
  const playingLabel =
    PLAYING.find(([id]) => id === playing)?.[1] ?? PLAYING[0][1];
  const roleLabel = ROLES.find(([id]) => id === role)?.[1] ?? ROLES[0][1];
  const renownLabel = RENOWN.find(([id]) => id === renown)?.[1] ?? RENOWN[0][1];
  const reputationScore =
    ({ none: 0, hs: 1, walkon: 2, starter: 3, pro: 4 } as const)[playing] +
    ({ norole: 0, film: 1, teacher: 1, position: 2, coordinator: 3 } as const)[
      role
    ] +
    ({ local: 0, district: 1, regional: 2, state: 3 } as const)[renown];
  const reputation =
    reputationScore <= 2
      ? (['Local', '#8F8F8F'] as const)
      : reputationScore <= 4
        ? (['District', '#52AEFF'] as const)
        : reputationScore <= 6
          ? (['Regional', '#0062D1'] as const)
          : (['Statewide', '#7820BC'] as const);
  const coachingAttributes = [
    { label: 'Offensive scheme', strong: role === 'coordinator' },
    { label: 'Defensive scheme', strong: false },
    { label: 'Special teams', strong: playing === 'walkon' },
    { label: 'Practice design', strong: role === 'film' },
    { label: 'Player development', strong: role === 'position' },
    { label: 'Working with freshmen', strong: role === 'teacher' },
  ];
  const mentalAttributes = [
    { label: 'Adaptability', strong: false },
    { label: 'Authority', strong: playing === 'pro' || playing === 'starter' },
    { label: 'Determination', strong: true },
    {
      label: 'Community standing',
      strong: renown === 'state' || renown === 'regional',
    },
  ];
  const enterWeek = () => dispatch({ type: 'navigate', screen: 'week' });
  const openWizard = () => {
    setWizardStep(0);
    setScreen('wizard');
  };

  const shellStyle = { padding: responsive.shellPadding };
  const article = unemployed
    ? [
        `The coaching carousel is already turning in District 7-5A, and one name keeps coming up in booster-club conversations: ${fullName}, the ${age}-year-old from ${home} who is reportedly waiting for the right opening.`,
        `${renownLabel.charAt(0).toUpperCase()}${renownLabel.slice(1)} known for work as a ${roleLabel.toLowerCase()}, ${last} has told colleagues the next job has to be the right fit. Athletic directors around Region II have taken notice.`,
        'For now, Friday nights will be spent in the stands with a notebook. That rarely lasts long.',
      ]
    : [
        `A new era arrives under the lights: ${fullName}, ${age}, is set to be named head football coach at ${selectedSchool[1]} High School. The ${home} native inherits a program picked to finish ${selectedSchool[3]} in District 7-5A.`,
        `${last} arrives with a background as a ${roleLabel.toLowerCase()} and a playing résumé that reads “${playingLabel.toLowerCase()}” — a profile that has the booster club cautiously optimistic and the quarterback room curious.`,
        `A ${reputation[0].toLowerCase()} reputation means expectations arrive with the moving boxes. The season opens with ${startDate === 'twoadays' ? 'two-a-days on August 3' : 'Week 1 on August 28'}. Six months from now, everyone will know if the hire was the right one.`,
      ];

  return (
    <div
      className="bg-surface-sunken text-ink min-h-dvh"
      data-career-screen={screen}
      data-responsive-tier={responsive.tier}
    >
      <header
        className="bg-surface-sunken sticky top-0 z-10 flex min-h-14 items-center gap-3 shadow-[0_1px_0_0_rgba(0,0,0,0.08)]"
        style={{ padding: responsive.barPadding }}
      >
        <div className="bg-ink flex size-[26px] shrink-0 items-center justify-center rounded-[6px] text-[13px] font-semibold text-white">
          F
        </div>
        <span className="truncate text-[14px] font-medium tracking-[-0.28px]">
          Friday Night Manager
        </span>
        <span className="text-ink-subtle font-mono text-[11px] whitespace-nowrap">
          v1.5.0 — Coaching Week
        </span>
        <span className="min-w-1 flex-1" />
        {responsive.showChrome && (
          <>
            <button
              type="button"
              disabled
              title="Release notes are not part of the coaching-week prototype."
              className={`text-ink-subtle h-8 shrink-0 cursor-default rounded-[6px] bg-white px-3.5 text-[12.5px] font-medium ${edge}`}
            >
              What&apos;s New?
            </button>
            <button
              type="button"
              disabled
              title="Preferences are set on the Game Setup screen in this prototype."
              className={`text-ink-subtle h-8 shrink-0 cursor-default rounded-[6px] bg-white px-3.5 text-[12.5px] font-medium ${edge}`}
            >
              Preferences
            </button>
          </>
        )}
      </header>

      {screen === 'menu' && (
        <main
          data-screen-label="Main Menu"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <h1
            className="m-0 leading-none font-semibold tracking-[-2.28px] text-pretty"
            style={{ fontSize: responsive.heroSize }}
          >
            Friday Night Manager
          </h1>
          <p className="text-ink-muted mt-2.5 mb-0 text-[14px] text-pretty">
            Take over a Texas high school football program. Win Fridays, keep
            them eligible, hang a banner.
          </p>
          <div
            className="mt-9 grid items-stretch gap-4"
            style={{ gridTemplateColumns: responsive.menuColumns }}
          >
            <button
              type="button"
              onClick={() => setScreen('journey')}
              className={`${card} text-ink flex w-full cursor-pointer flex-col border-none p-6 text-left outline-none hover:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_2px_rgba(0,0,0,0.04)]`}
            >
              <span className="text-[20px] font-semibold tracking-[-0.8px]">
                Start New Career
              </span>
              <span className="text-ink-muted mt-1.5 text-[13px] leading-[1.55]">
                Forge your path as a first-year head coach in a new
                single-player career.
              </span>
              <Placeholder className="mt-[18px] min-h-[200px] w-full flex-1">
                stadium photo — friday night lights
              </Placeholder>
              <span className="text-accent mt-4 flex items-center gap-2 text-[13px] font-medium">
                Begin <span>→</span>
              </span>
            </button>
            <div className="flex flex-col gap-4">
              <section
                className={`${card} p-5`}
                aria-labelledby="load-game-heading"
              >
                <h2
                  id="load-game-heading"
                  className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                >
                  Load Game
                </h2>
                <p className="text-ink-subtle mt-1 mb-0 text-[12.5px]">
                  Continue a saved career.
                </p>
                <button
                  type="button"
                  onClick={enterWeek}
                  className="bg-surface-sunken text-ink mt-3.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] border-none px-3 py-[11px] text-left shadow-[0_0_0_1px_rgba(0,0,0,0.06)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
                >
                  <Dot size={8} />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">
                      Westfield Wildcats — 2026
                    </span>
                    <span className="text-ink-subtle block text-[11.5px]">
                      Week 8 · 6-1 · District #2
                    </span>
                  </span>
                  <span className="text-accent text-[12px] font-medium">
                    Resume →
                  </span>
                </button>
                <div className="bg-surface-sunken mt-2 flex items-center gap-2.5 rounded-[6px] px-3 py-[11px] opacity-60 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                  <Dot color="#D6D6D6" size={8} />
                  <span className="flex-1">
                    <span className="block text-[13px] font-medium">
                      Millbrook Mustangs — 2024
                    </span>
                    <span className="text-ink-subtle block text-[11.5px]">
                      Season complete · 3-7
                    </span>
                  </span>
                </div>
              </section>
              <button
                type="button"
                onClick={() => setScreen('profiles')}
                className={`${card} text-ink w-full cursor-pointer border-none p-5 text-left`}
              >
                <span className="block text-[16px] font-semibold tracking-[-0.32px]">
                  Head Coach Profiles
                </span>
                <span className="text-ink-subtle mt-1 block text-[12.5px]">
                  Create and manage the coaches you start careers with.
                </span>
              </button>
              <section
                className={`${card} p-5`}
                aria-labelledby="playoff-heading"
              >
                <div className="flex items-center gap-2">
                  <h2
                    id="playoff-heading"
                    className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                  >
                    Playoff Run
                  </h2>
                  <span
                    className={`text-ink-muted inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium ${edge}`}
                  >
                    <Dot color="#FF990A" />
                    New
                  </span>
                </div>
                <p className="text-ink-subtle mt-1 mb-0 text-[12.5px]">
                  Skip the regular season — take a 10-0 team straight into the
                  state bracket.
                </p>
                <button
                  type="button"
                  disabled
                  title="Playoff Run is not playable in the coaching-week prototype."
                  className="text-ink-subtle mt-2.5 cursor-default border-none bg-transparent p-0 text-[12px] font-medium"
                >
                  Quick Start — not in this prototype
                </button>
              </section>
            </div>
          </div>
        </main>
      )}

      {screen === 'journey' && (
        <main
          data-screen-label="Start Your Journey"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <PageTitle size={responsive.pageTitleSize}>
            Start Your Journey
          </PageTitle>
          <p className="text-ink-muted mt-2 mb-0 text-[13.5px]">
            How much of the world do you want to shape before kickoff?
          </p>
          <div
            className="mt-8 grid gap-4"
            style={{ gridTemplateColumns: responsive.journeyColumns }}
          >
            {[
              [
                'Quick Start Career',
                'Choose the school you want to coach. The districts around it are built for you — you can still edit later.',
                'school crests',
                'Schools & Districts',
                'TX',
                () => setScreen('team'),
              ],
              [
                'Advanced Setup',
                'Customize your game world — active regions, roster mode, and season start — before choosing who to coach.',
                'world editor',
                'Schools & Districts',
                'TX',
                () => setScreen('setup'),
              ],
            ].map(([title, description, art, footer, code, go]) => (
              <button
                key={String(title)}
                type="button"
                onClick={go as () => void}
                className={`${card} text-ink flex w-full cursor-pointer flex-col overflow-hidden border-none p-0 text-left`}
              >
                <span className="w-full flex-1 p-5">
                  <span className="block text-[16px] font-semibold tracking-[-0.32px]">
                    {title as string}
                  </span>
                  <span className="text-ink-muted mt-1.5 block text-[12.5px] leading-[1.55]">
                    {description as string}
                  </span>
                  <Placeholder className="mt-4 h-[110px]">
                    {art as string}
                  </Placeholder>
                </span>
                <span className="bg-surface-raised text-ink-muted flex w-full justify-between px-5 py-2.5 text-[11.5px] font-medium">
                  <span>{footer as string}</span>
                  <span className="font-mono">{code as string}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              disabled
              title="Playoff Run is not playable in the coaching-week prototype."
              className={`${card} text-ink flex w-full cursor-default flex-col overflow-hidden border-none p-0 text-left`}
            >
              <span className="w-full flex-1 p-5">
                <span className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.32px]">
                  Playoff Run{' '}
                  <span
                    className={`text-ink-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${edge}`}
                  >
                    <Dot color="#FF990A" />
                    New
                  </span>
                </span>
                <span className="text-ink-muted mt-1.5 block text-[12.5px] leading-[1.55]">
                  Compete in the state bracket right away. Six wins in December
                  takes the title.
                </span>
                <Placeholder className="mt-4 h-[110px]">
                  bracket art
                </Placeholder>
              </span>
              <span className="bg-surface-raised text-ink-muted flex w-full justify-between px-5 py-2.5 text-[11.5px] font-medium">
                <span>State Bracket only</span>
                <span className="font-mono">DEC</span>
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setScreen('menu')}
            className={`${secondaryButton} mt-7`}
          >
            ← Back
          </button>
        </main>
      )}

      {screen === 'profiles' && (
        <main
          data-screen-label="Head Coach Profiles"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <PageTitle size={responsive.pageTitleSize}>
            Head Coach Profiles
          </PageTitle>
          <p className="text-ink-muted mt-2 mb-0 text-[13.5px]">
            Choose which head coach you&apos;d like to start your career with.
          </p>
          <div
            className="mt-8 grid items-start gap-7"
            style={{ gridTemplateColumns: responsive.profileColumns }}
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={openWizard}
                className={`${card} text-ink mb-3 flex w-full cursor-pointer items-center gap-3 border-none p-3.5 text-left`}
              >
                <span className="bg-surface-raised text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-[6px] text-[18px]">
                  +
                </span>
                <span className="text-[13.5px] font-medium">
                  Create new head coach profile
                </span>
              </button>
              <div className="flex items-center gap-3 rounded-[12px] bg-white p-3.5 shadow-[0_0_0_1.5px_#171717,0_2px_2px_rgba(0,0,0,0.04)]">
                <Radio selected />
                <div
                  className="text-ink-subtle flex h-12 w-10 items-center justify-center rounded-[6px] font-mono text-[8px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                  style={{ background: PORTRAIT_TONES[preset] }}
                >
                  photo
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">
                    {fullName}
                  </div>
                  <div className="text-ink-subtle truncate text-[12px]">
                    Age {age} · {home}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openWizard}
                  className={`${secondaryButton} h-[30px] px-3 text-[12px]`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled
                  title="The prototype ships with a single seeded coach profile, so it cannot be deleted."
                  className={`h-[30px] cursor-default rounded-[6px] bg-white px-3 text-[12px] font-medium text-[#C9C9C9] ${edge}`}
                >
                  Delete
                </button>
              </div>
            </div>
            <section
              className={`${card} min-w-0 px-6 py-[22px]`}
              aria-label="Selected head coach profile"
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${responsive.fieldColumns}, minmax(0, 1fr))`,
                }}
              >
                {[
                  ['Full Name', fullName],
                  ['Age', `${age} years old`],
                  ['Hometown', home],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className={labelClass}>{label}</div>
                    <div className="mt-[3px] text-[14px] font-medium">
                      {value}
                    </div>
                  </div>
                ))}
                <div>
                  <div className={labelClass}>Reputation</div>
                  <div className="mt-[5px] flex items-center gap-[7px]">
                    <Dot color={reputation[1]} size={8} />
                    <span className="text-[14px] font-medium">
                      {reputation[0]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-[22px]">
                <Attributes
                  title="Coaching Attributes"
                  items={coachingAttributes}
                />
              </div>
              <div className="mt-5">
                <Attributes
                  title="Mental Attributes"
                  items={mentalAttributes}
                />
              </div>
            </section>
          </div>
          <div className="mt-7 flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setScreen('menu')}
              className={secondaryButton}
            >
              Main Menu
            </button>
            <button
              type="button"
              onClick={() => setScreen('journey')}
              className={primaryButton}
            >
              Start New Career →
            </button>
          </div>
        </main>
      )}

      {screen === 'wizard' && (
        <main
          data-screen-label="Head Coach Creation"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <PageTitle size={responsive.pageTitleSize}>
            Head Coach Creation
          </PageTitle>
          <nav
            aria-label="Head coach creation steps"
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            {WIZARD_STEPS.map((step, index) => (
              <span key={step} className="contents">
                <button
                  type="button"
                  onClick={() => setWizardStep(index)}
                  aria-current={wizardStep === index ? 'step' : undefined}
                  className={`cursor-pointer rounded-[4px] border-none bg-transparent px-1 py-0.5 text-[13px] ${wizardStep === index ? 'text-ink font-medium' : 'text-ink-subtle font-normal'}`}
                >
                  {step}
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="text-hairline text-[12px]"
                  >
                    ›
                  </span>
                )}
              </span>
            ))}
          </nav>
          <div
            className="mt-7 grid items-start gap-7"
            style={{ gridTemplateColumns: responsive.wizardColumns }}
          >
            <div className="min-w-0">
              {wizardStep === 0 && (
                <section aria-labelledby="appearance-heading">
                  <h2
                    id="appearance-heading"
                    className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                  >
                    Appearance
                  </h2>
                  <p className="text-ink-subtle mt-1 mb-0 text-[12.5px]">
                    Pick a yearbook portrait preset. You can refine it any time.
                  </p>
                  <div
                    className="mt-4 grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${responsive.presetColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {PORTRAIT_TONES.map((tone, index) => (
                      <ChoiceButton
                        key={tone}
                        selected={preset === index}
                        onClick={() => setPreset(index)}
                        label={`Yearbook portrait preset ${String(index + 1).padStart(2, '0')}`}
                        className="relative rounded-[12px] p-3"
                      >
                        <div
                          className="text-ink-subtle flex h-[120px] items-center justify-center rounded-[8px] font-mono text-[9.5px]"
                          style={{
                            background: `repeating-linear-gradient(45deg, ${tone} 0 7px, #FAFAFA 7px 14px)`,
                          }}
                        >
                          portrait {String(index + 1).padStart(2, '0')}
                        </div>
                        <span className="absolute top-[18px] right-[18px] rounded-full bg-white">
                          <Radio selected={preset === index} />
                        </span>
                      </ChoiceButton>
                    ))}
                  </div>
                </section>
              )}
              {wizardStep === 1 && (
                <section aria-labelledby="background-heading">
                  <h2
                    id="background-heading"
                    className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                  >
                    Background
                  </h2>
                  <p className="text-ink-subtle mt-1 mb-0 text-[12.5px]">
                    Who is showing up to the interview?
                  </p>
                  <div
                    className="mt-4 grid max-w-[560px] gap-3.5"
                    style={{
                      gridTemplateColumns: `repeat(${responsive.fieldColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {[
                      ['First name', first, setFirst],
                      ['Last name', last, setLast],
                      ['Age', age, setAge],
                      ['Hometown', home, setHome],
                      ['Alma mater', alma, setAlma],
                    ].map(([label, value, setter], index) => (
                      <label
                        key={label as string}
                        className={index === 4 ? 'col-span-full' : ''}
                      >
                        <span className="text-ink-muted mb-1.5 block text-[12px] font-medium">
                          {label as string}
                        </span>
                        <input
                          value={value as string}
                          onChange={(event) =>
                            (setter as (value: string) => void)(
                              event.target.value,
                            )
                          }
                          className={`text-ink h-10 w-full rounded-[6px] border-none bg-white px-3 text-[13.5px] ${edge}`}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}
              {wizardStep === 2 && (
                <section aria-labelledby="playing-heading">
                  <h2
                    id="playing-heading"
                    className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                  >
                    Setting your credentials — step 1 of 2
                  </h2>
                  <p className="mt-2 mb-0 text-[13.5px]">
                    Did you{' '}
                    <span className="text-accent font-medium">
                      play the game
                    </span>
                    ?
                  </p>
                  <p className="text-ink-subtle mt-0.5 mb-0 text-[12.5px]">
                    Your playing career shapes how players and parents size you
                    up on day one.
                  </p>
                  <div className="mt-4 flex max-w-[640px] flex-col gap-2">
                    {PLAYING.map(([id, label, description]) => (
                      <ChoiceButton
                        key={id}
                        selected={playing === id}
                        onClick={() => setPlaying(id)}
                        className="flex items-center gap-3.5 rounded-[12px] px-4 py-3.5"
                      >
                        <Radio selected={playing === id} />
                        <span>
                          <span className="block text-[13.5px] font-medium">
                            {label}
                          </span>
                          <span className="text-ink-subtle mt-px block text-[12px]">
                            {description}
                          </span>
                        </span>
                      </ChoiceButton>
                    ))}
                  </div>
                </section>
              )}
              {wizardStep === 3 && (
                <section aria-labelledby="role-heading">
                  <h2
                    id="role-heading"
                    className="m-0 text-[16px] font-semibold tracking-[-0.32px]"
                  >
                    Setting your credentials — step 2 of 2
                  </h2>
                  <p className="mt-2 mb-0 text-[13.5px]">
                    Have you worked in football in a{' '}
                    <span className="text-accent font-medium">
                      non-playing role
                    </span>
                    ?
                  </p>
                  <p className="text-ink-subtle mt-0.5 mb-0 text-[12.5px]">
                    Which role are you most recognized for?
                  </p>
                  <div className="mt-4 flex max-w-[640px] flex-col gap-2">
                    {ROLES.map(([id, label, description]) => (
                      <ChoiceButton
                        key={id}
                        selected={role === id}
                        onClick={() => setRole(id)}
                        className="flex items-center gap-3.5 rounded-[12px] px-4 py-3.5"
                      >
                        <Radio selected={role === id} />
                        <span>
                          <span className="block text-[13.5px] font-medium">
                            {label}
                          </span>
                          <span className="text-ink-subtle mt-px block text-[12px]">
                            {description}
                          </span>
                        </span>
                      </ChoiceButton>
                    ))}
                  </div>
                  <p className="mt-[22px] mb-0 text-[13.5px] font-medium">
                    How well known are you for it?
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {RENOWN.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={renown === id}
                        onClick={() => setRenown(id)}
                        className={`h-8 cursor-pointer rounded-full border-none px-4 text-[12.5px] font-medium ${renown === id ? 'bg-ink text-white' : `text-ink-muted bg-white ${edge}`}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {wizardStep === 4 && (
                <section aria-labelledby="summary-heading">
                  <div className="flex max-w-[640px] flex-wrap items-center justify-between gap-3">
                    <h2
                      id="summary-heading"
                      className="m-0 text-[20px] font-semibold tracking-[-0.8px] text-pretty"
                    >
                      {fullName} is ready for Friday nights
                    </h2>
                    <button
                      type="button"
                      onClick={() => setWizardStep(0)}
                      className={`${secondaryButton} h-8 px-3.5 text-[12.5px]`}
                    >
                      Edit Head Coach
                    </button>
                  </div>
                  <div
                    className="mt-[18px] grid max-w-[640px] gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${responsive.fieldColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {[
                      ['Full Name', fullName],
                      ['Age', `${age} years old`],
                      ['Hometown', home],
                      ['Alma mater', alma],
                      ['Playing career', playingLabel],
                      ['Coaching background', `${roleLabel} · ${renownLabel}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className={labelClass}>{label}</div>
                        <div className="mt-[3px] text-[14px] font-medium">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-6 grid max-w-[640px] gap-6"
                    style={{
                      gridTemplateColumns: `repeat(${responsive.fieldColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    <Attributes
                      title="Coaching Attributes"
                      items={coachingAttributes}
                      compact
                    />
                    <Attributes
                      title="Mental Attributes"
                      items={mentalAttributes}
                      compact
                    />
                  </div>
                </section>
              )}
              <div className="mt-7 flex gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    wizardStep > 0
                      ? setWizardStep(wizardStep - 1)
                      : setScreen('profiles')
                  }
                  className={secondaryButton}
                >
                  ← Back
                </button>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() =>
                    wizardStep < 4
                      ? setWizardStep(wizardStep + 1)
                      : setScreen('profiles')
                  }
                  className={primaryButton}
                >
                  {wizardStep < 4 ? 'Next →' : 'Confirm ✓'}
                </button>
              </div>
            </div>
            <aside
              aria-label="Head coach preview"
              className={`${card} min-w-0 p-[18px]`}
              style={{
                position: responsive.stickySummary ? 'sticky' : 'static',
                top: 76,
              }}
            >
              <div
                className="text-ink-subtle flex h-[190px] items-center justify-center rounded-[8px] text-center font-mono text-[10px] leading-[1.6] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
                style={{
                  background: `repeating-linear-gradient(45deg, ${PORTRAIT_TONES[preset]} 0 8px, #FAFAFA 8px 16px)`,
                }}
              >
                yearbook portrait
                <br />
                preset {String(preset + 1).padStart(2, '0')}
              </div>
              <div className="mt-3.5 text-[17px] font-semibold tracking-[-0.34px]">
                {fullName}
              </div>
              <div className="text-ink-subtle mt-[3px] text-[12px]">
                Age {age} · {home}
              </div>
              <div className="bg-surface-sunken mt-3.5 rounded-[8px] p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                <div className={labelClass}>Reputation</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Dot color={reputation[1]} size={9} />
                  <span className="text-[14px] font-medium">
                    {reputation[0]}
                  </span>
                </div>
                <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-[1.5]">
                  Built from your playing career, coaching role and renown.
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  ['Playing career', playingLabel],
                  ['Coaching role', roleLabel],
                  ['Known', renownLabel],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 text-[12px]"
                  >
                    <span className="text-ink-subtle">{label}</span>
                    <span className="truncate font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      )}

      {screen === 'team' && (
        <main
          data-screen-label="Team Selection"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <PageTitle size={responsive.pageTitleSize}>Team Selection</PageTitle>
          <div
            className="mt-7 grid items-start gap-7"
            style={{ gridTemplateColumns: responsive.teamColumns }}
          >
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setUnemployed(!unemployed)}
                aria-pressed={unemployed}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] border-none bg-transparent py-1 pr-1 text-left"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[11px] text-white ${unemployed ? 'bg-ink' : 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'}`}
                >
                  {unemployed ? '✓' : ''}
                </span>
                <span className="text-ink-muted text-[13px]">
                  Start unemployed — wait for a mid-season opening
                </span>
              </button>
              <div className={`mt-[18px] ${labelClass}`}>State</div>
              <button
                type="button"
                disabled
                title="Texas · UIL is the only state modelled in this prototype."
                className={`text-ink mt-2 flex h-10 w-full cursor-default items-center gap-2.5 rounded-[6px] bg-white px-3 text-left text-[13.5px] font-medium ${edge}`}
              >
                Texas · UIL{' '}
                <span aria-hidden="true" className="ml-auto text-[#C9C9C9]">
                  ▾
                </span>
              </button>
              <div className={`mt-[18px] ${labelClass}`}>Classification</div>
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  aria-pressed="true"
                  title="The seeded district is 5A Division I; classification is fixed in this prototype."
                  className="text-ink flex w-full cursor-default items-center gap-3 rounded-[12px] bg-white px-3.5 py-[13px] text-left shadow-[0_0_0_1.5px_#171717]"
                >
                  <Radio selected />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">
                      5A Division I
                    </span>
                    <span className="text-ink-subtle block text-[11.5px]">
                      Enrollment 1,925+ · Tier 1
                    </span>
                  </span>
                  <Dot size={8} />
                </button>
                <button
                  type="button"
                  disabled
                  aria-pressed="false"
                  title="4A Division II is not modelled in this prototype."
                  className={`text-ink flex w-full cursor-default items-center gap-3 rounded-[12px] bg-white px-3.5 py-[13px] text-left opacity-75 ${edge}`}
                >
                  <Radio selected={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">
                      4A Division II
                    </span>
                    <span className="text-ink-subtle block text-[11.5px]">
                      Enrollment 880–1,299 · Tier 2
                    </span>
                  </span>
                  <Dot color="#6CDA75" size={8} />
                </button>
              </div>
              <p className="text-ink-subtle mt-[18px] mb-0 text-[11.5px]">
                Key (program prestige): <Dot /> Statewide —{' '}
                <Dot color="#D6D6D6" /> Rebuilding
              </p>
            </div>
            <div className="min-w-0">
              <section
                aria-label="District 7-5A"
                className={`${card} flex flex-wrap items-center gap-4 px-[18px] py-3.5`}
              >
                <div className="bg-surface-raised text-ink-muted flex size-[38px] shrink-0 items-center justify-center rounded-[6px] text-[13px] font-semibold">
                  7-5A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold tracking-[-0.28px]">
                    District 7-5A · Region II
                  </div>
                  <div className="text-ink-subtle text-[12px]">
                    8 schools · West Texas
                  </div>
                </div>
                <div className="text-ink-muted flex items-center gap-1.5 text-[12px] whitespace-nowrap">
                  <Dot size={8} />
                  Strong district
                </div>
              </section>
              <div
                className="mt-3.5 grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${responsive.schoolColumns}, minmax(0, 1fr))`,
                  opacity: unemployed ? 0.45 : 1,
                }}
              >
                {SCHOOLS.map(([id, name, initials, prediction]) => {
                  const selected = !unemployed && school === id;
                  return (
                    <ChoiceButton
                      key={id}
                      selected={selected}
                      onClick={() => {
                        setSchool(id);
                        setUnemployed(false);
                      }}
                      className="relative rounded-[12px] px-3.5 py-4 text-center"
                    >
                      <span className="absolute top-2.5 left-2.5">
                        <Radio selected={selected} size={15} />
                      </span>
                      <span
                        aria-hidden="true"
                        className="bg-surface-raised text-ink-muted mx-auto mt-1.5 flex size-[52px] items-center justify-center rounded-full text-[16px] font-semibold tracking-[-0.3px]"
                      >
                        {initials}
                      </span>
                      <span className="mt-2.5 block truncate text-[13px] font-medium">
                        {name}
                      </span>
                      <span className="text-ink-subtle mt-0.5 block text-[11px]">
                        Predicted finish
                      </span>
                      <span className="mt-px block text-[15px] font-semibold tracking-[-0.3px]">
                        {prediction}
                      </span>
                    </ChoiceButton>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-7 flex gap-2.5">
            <button
              type="button"
              onClick={() => setScreen('journey')}
              className={secondaryButton}
            >
              ← Back
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setScreen('setup')}
              className={primaryButton}
            >
              Next — Game Setup →
            </button>
          </div>
        </main>
      )}

      {screen === 'setup' && (
        <main
          data-screen-label="Game Setup"
          className="mx-auto max-w-[1200px]"
          style={shellStyle}
        >
          <PageTitle size={responsive.pageTitleSize}>Game Setup</PageTitle>
          <section
            aria-label="Career start selection"
            className={`${card} mt-6 flex flex-wrap items-center gap-4 px-[18px] py-4`}
          >
            <button
              type="button"
              onClick={() => setScreen('team')}
              className={`${secondaryButton} h-[34px] shrink-0 px-3.5 text-[12.5px]`}
            >
              Change
            </button>
            <div className="bg-surface-raised text-ink-muted flex size-[38px] shrink-0 items-center justify-center rounded-full text-[14px] font-semibold">
              {selectedSchool[2]}
            </div>
            <div className="min-w-0 flex-[1_1_220px]">
              <div className="text-[14px] font-semibold tracking-[-0.28px] text-pretty">
                {unemployed
                  ? 'Starting unemployed — waiting for an opening'
                  : `Starting as head coach of ${selectedSchool[1]}`}
              </div>
              <div className="text-ink-subtle text-[12px]">
                Predicted to finish {selectedSchool[3]} in District 7-5A
              </div>
            </div>
            <div>
              <div className={`${labelClass} mb-1.5 text-right`}>
                Season start
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['twoadays', 'Two-a-Days (Aug 3)'],
                    ['week1', 'Week 1 (Aug 28)'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStartDate(id)}
                    aria-pressed={startDate === id}
                    className={`h-[30px] cursor-pointer rounded-full border-none px-3.5 text-[12px] font-medium ${startDate === id ? 'bg-ink text-white' : `text-ink-muted bg-white ${edge}`}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
          <div
            className="mt-4 grid items-start gap-4"
            style={{ gridTemplateColumns: responsive.setupColumns }}
          >
            <section
              className={`${card} min-w-0 p-5`}
              aria-labelledby="regions-heading"
            >
              <h2
                id="regions-heading"
                className="m-0 text-[15px] font-semibold tracking-[-0.3px]"
              >
                Active Regions
              </h2>
              <p className="text-ink-muted mt-1 mb-0 text-[12.5px] leading-[1.55]">
                Choose which regions are fully simulated. More regions means
                richer transfers, realignment and playoff seeding — and a slower
                sim.
              </p>
              <div className="my-4 flex flex-wrap gap-8">
                <div>
                  <div className={labelClass}>Estimated sim speed</div>
                  <div className="mt-[5px] flex items-center gap-[7px]">
                    <Dot size={9} />
                    <span className="text-[16px] font-semibold tracking-[-0.32px]">
                      Quick
                    </span>
                  </div>
                </div>
                <div>
                  <div className={labelClass}>Approx. player count</div>
                  <div className="mt-1 text-[16px] font-semibold tracking-[-0.32px]">
                    1,240{' '}
                    <span className="text-ink-subtle text-[12px] font-normal">
                      medium database
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-ink-subtle grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-2 pb-2 text-[12px] font-medium shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                <span>Region</span>
                <span>Districts</span>
                <span>Mode</span>
              </div>
              {(
                [
                  [
                    'Region II — West Texas',
                    '7-5A · 8-5A',
                    'Full detail',
                    '#45A557',
                  ],
                  [
                    'Regions I, III, IV',
                    'playoff opponents',
                    'Results only',
                    '#D6D6D6',
                  ],
                ] as const
              ).map(([region, districts, mode, color], index) => (
                <div
                  key={region}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-5 gap-y-2 py-2.5 text-[13px] ${index === 0 ? 'shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]' : ''}`}
                >
                  <span className="font-medium">{region}</span>
                  <span className="text-ink-muted font-mono text-[12px]">
                    {districts}
                  </span>
                  <span className="text-ink-muted inline-flex items-center gap-1.5 text-[12px]">
                    <Dot color={color} />
                    {mode}
                  </span>
                </div>
              ))}
            </section>
            <div className="flex min-w-0 flex-col gap-4">
              <section
                className={`${card} p-5`}
                aria-labelledby="roster-heading"
              >
                <h2
                  id="roster-heading"
                  className="m-0 text-[15px] font-semibold tracking-[-0.3px]"
                >
                  Roster Mode
                </h2>
                <p className="text-ink-muted mt-1 mb-0 text-[12.5px] leading-[1.55]">
                  How rosters are generated for your first season.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {(
                    [
                      [
                        'real',
                        'Returning rosters',
                        'Last season’s underclassmen return as your new varsity core.',
                      ],
                      [
                        'random',
                        'Randomized classes',
                        'Every program gets freshly generated players. No two careers alike.',
                      ],
                    ] as const
                  ).map(([id, label, description]) => (
                    <ChoiceButton
                      key={id}
                      selected={roster === id}
                      onClick={() => setRoster(id)}
                      className="bg-surface-sunken flex items-start gap-3 rounded-[8px] px-3 py-[11px]"
                    >
                      <Radio selected={roster === id} size={15} />
                      <span>
                        <span className="block text-[13px] font-medium">
                          {label}
                        </span>
                        <span className="text-ink-subtle mt-px block text-[11.5px] leading-[1.5]">
                          {description}
                        </span>
                      </span>
                    </ChoiceButton>
                  ))}
                </div>
              </section>
              <section
                className={`${card} p-5`}
                aria-labelledby="preferences-heading"
              >
                <h2
                  id="preferences-heading"
                  className="m-0 text-[15px] font-semibold tracking-[-0.3px]"
                >
                  Preferences
                </h2>
                <p className="text-ink-subtle mt-1 mb-0 text-[12.5px]">
                  Injuries, weather, referee strictness and more.
                </p>
                <button
                  type="button"
                  disabled
                  title="Simulation preferences are fixed to the seeded coaching week in this prototype."
                  className="text-ink-subtle mt-2.5 cursor-default border-none bg-transparent p-0 text-[12px] font-medium"
                >
                  Customize — fixed for this prototype
                </button>
              </section>
            </div>
          </div>
          <div className="mt-7 flex gap-2.5">
            <button
              type="button"
              onClick={() => setScreen('team')}
              className={secondaryButton}
            >
              ← Back
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setScreen('news')}
              className={primaryButton}
            >
              Start Career →
            </button>
          </div>
        </main>
      )}

      {screen === 'news' && (
        <main
          data-screen-label="Appointment News"
          className="mx-auto max-w-[1000px]"
          style={{ padding: responsive.newsPadding }}
        >
          <div className="mb-5 flex justify-end">
            <div
              className={`${card} flex items-center gap-[9px] rounded-full px-3.5 py-[7px]`}
            >
              <span
                aria-hidden="true"
                className="career-live-pulse bg-accent size-2 rounded-full"
              />
              <span className="text-[12px] font-medium">
                Building your season — 84%
              </span>
            </div>
          </div>
          <article className={`${card} overflow-hidden`}>
            <header
              className="bg-surface-sunken flex flex-wrap items-center gap-3.5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
              style={{
                paddingLeft: responsive.newsInnerX,
                paddingRight: responsive.newsInnerX,
              }}
            >
              <div className="bg-surface-raised text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
                {selectedSchool[2]}
              </div>
              <div className="min-w-0 flex-[1_1_200px]">
                <div className="text-[13.5px] font-semibold tracking-[-0.27px]">
                  {selectedSchool[1]} High School
                </div>
                <div className="text-ink-subtle text-[11.5px]">
                  Predicted to finish {selectedSchool[3]} · District 7-5A
                </div>
              </div>
              <div className="text-right">
                <div className={labelClass}>Reputation</div>
                <div className="mt-[3px] flex items-center justify-end gap-1.5">
                  <Dot color={reputation[1]} size={8} />
                  <span className="text-[12.5px] font-medium">
                    {reputation[0]}
                  </span>
                </div>
              </div>
            </header>
            <div
              className="pt-8 pb-9"
              style={{
                paddingLeft: responsive.newsInnerX,
                paddingRight: responsive.newsInnerX,
              }}
            >
              <div className="text-ink-subtle flex flex-wrap items-center gap-2.5 text-[12px]">
                <span className="text-ink font-semibold tracking-[-0.24px]">
                  The {selectedSchool[1]} Herald
                </span>
                <span>·</span>
                <span>Sports</span>
                <span>·</span>
                <span>Just now</span>
              </div>
              <h1
                className="mt-3 mb-0 max-w-[680px] leading-[1.15] font-semibold tracking-[-1.28px] text-pretty"
                style={{ fontSize: responsive.pageTitleSize }}
              >
                {unemployed
                  ? `${fullName} waits in the wings as district jobs open`
                  : `${selectedSchool[1]} set to appoint ${fullName} as head football coach`}
              </h1>
              <div className="mt-[18px] max-w-[680px]">
                {article.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-ink-muted mt-0 mb-4 text-[14.5px] leading-[1.75] text-pretty"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-[26px] flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={enterWeek}
                  className="bg-ink h-10 cursor-pointer rounded-[6px] border-none px-[22px] text-[13.5px] font-medium text-white hover:bg-[#383838]"
                >
                  Continue to Preseason →
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('setup')}
                  className={`${secondaryButton} h-10`}
                >
                  ← Back to Setup
                </button>
              </div>
            </div>
          </article>
        </main>
      )}
    </div>
  );
}
