import { useMemo, useState } from 'react';

import {
  Button,
  Card,
  PillButton,
  ScreenHeading,
  StatusChip,
  StatusDot,
} from '../components/ui.tsx';
import type {
  ClipRelation,
  FilmAngle,
  FilmClip,
  HypothesisId,
  ScoutingTab,
  StaffAssignmentTaskId,
} from '../domain/types.ts';
import {
  staffTaskDelegates,
  type StaffDelegationEvent,
} from '../domain/staffDelegation.ts';
import { useWeek } from '../state/weekContext.ts';
import { Hypotheses } from './Hypotheses.tsx';

const TABS: readonly ScoutingTab[] = [
  'Overview',
  'Film Room',
  'Hypotheses',
  'Assignments',
];

type FilterKey =
  | 'side'
  | 'situation'
  | 'personnel'
  | 'formation'
  | 'motion'
  | 'concept'
  | 'result'
  | 'tendency';

type Filters = Readonly<Record<FilterKey, string>>;
type RelationEdits = Readonly<
  Record<string, Readonly<Record<HypothesisId, ClipRelation>>>
>;

const ALL_FILTERS: Filters = {
  side: 'All',
  situation: 'All',
  personnel: 'All',
  formation: 'All',
  motion: 'All',
  concept: 'All',
  result: 'All',
  tendency: 'All',
};

const RELATION_LABEL: Record<ClipRelation, string> = {
  sup: 'Supports',
  con: 'Contradicts',
  neu: 'Untagged',
};

const RELATION_TONE: Record<ClipRelation, 'good' | 'danger' | 'neutral'> = {
  sup: 'good',
  con: 'danger',
  neu: 'neutral',
};

function situationTag(clip: FilmClip): string {
  if (/^(Kickoff|Punt)/.test(clip.situation)) return 'Kicking';
  if (/^2nd & 1[0-9]/.test(clip.situation)) return 'Behind schedule';
  if (/^3rd & [4-7]/.test(clip.situation)) return '3rd & medium';
  if (/^(1st|2nd) & /.test(clip.situation)) return 'Early down';
  return 'Other';
}

function unique(clips: readonly FilmClip[], field: keyof FilmClip): string[] {
  return [...new Set(clips.map((clip) => String(clip[field])))];
}

function optionPairs(values: readonly string[]): [string, string][] {
  return values.map((value) => [value, value]);
}

export function Scouting() {
  const { scenario, state, dispatch, gate } = useWeek();
  const active = state.nav.scoutingTab;
  const [filters, setFilters] = useState<Filters>({
    ...ALL_FILTERS,
    tendency: state.nav.scoutingHypothesis ?? 'All',
  });
  const [selectedClipId, setSelectedClipId] = useState('c04');
  const [angle, setAngle] = useState<FilmAngle>('Tight');
  const [clipNotes, setClipNotes] = useState<Readonly<Record<string, string>>>(
    {},
  );
  const [relationEdits, setRelationEdits] = useState<RelationEdits>({});

  const relationFor = (
    clip: FilmClip,
    hypothesisId: HypothesisId,
  ): ClipRelation =>
    relationEdits[clip.id]?.[hypothesisId] ??
    (clip.hypothesisId === hypothesisId ? clip.relation : 'neu');

  const metadataClips = useMemo(
    () =>
      scenario.clips.filter(
        (clip) =>
          (filters.side === 'All' || clip.side === filters.side) &&
          (filters.situation === 'All' ||
            situationTag(clip) === filters.situation) &&
          (filters.personnel === 'All' ||
            clip.personnel === filters.personnel) &&
          (filters.formation === 'All' ||
            clip.formation === filters.formation) &&
          (filters.motion === 'All' || clip.motion === filters.motion) &&
          (filters.concept === 'All' || clip.concept === filters.concept) &&
          (filters.result === 'All' || clip.result === filters.result),
      ),
    [filters, scenario.clips],
  );

  const clips = metadataClips.filter((clip) => {
    if (filters.tendency === 'All') return true;
    if (filters.tendency === 'none') {
      return scenario.hypotheses.every(
        (hypothesis) => relationFor(clip, hypothesis.id) === 'neu',
      );
    }
    return relationFor(clip, filters.tendency) !== 'neu';
  });

  const selectedClip =
    clips.find((clip) => clip.id === selectedClipId) ?? clips[0] ?? null;

  const goToTab = (tab: ScoutingTab) =>
    dispatch({ type: 'navigate', screen: 'scouting', scoutingTab: tab });

  const showHypothesisClips = (id: HypothesisId) => {
    setFilters((current) => ({ ...current, tendency: id }));
    goToTab('Film Room');
  };

  const count = (tab: ScoutingTab): string => {
    if (tab === 'Film Room') return String(scenario.clips.length);
    if (tab === 'Hypotheses') {
      return `${gate.priorityIds.length}/${scenario.priorityCapacity}`;
    }
    return '';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ScreenHeading
          title={`Scouting · ${scenario.opponent.name}`}
          subtitle="32 clips cut from the last three games · film exchange complete"
        />
        <span className="flex-1" />
        <StatusChip tone={gate.ready ? 'good' : 'neutral'}>
          {gate.ready
            ? '3 prioritized · risk accepted'
            : `${gate.priorityIds.length} of ${scenario.priorityCapacity} prioritized`}
        </StatusChip>
      </div>

      <div
        role="tablist"
        aria-label="Scouting sections"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((tab) => (
          <PillButton
            key={tab}
            role="tab"
            id={`scouting-tab-${tab.replace(/\s/g, '-')}`}
            aria-selected={active === tab}
            aria-controls="scouting-panel"
            pressed={active === tab}
            onClick={() => goToTab(tab)}
          >
            {tab}
            {count(tab) !== '' && (
              <span className="font-mono text-[11px] opacity-70">
                {count(tab)}
              </span>
            )}
          </PillButton>
        ))}
      </div>

      <div
        role="tabpanel"
        id="scouting-panel"
        aria-labelledby={`scouting-tab-${active.replace(/\s/g, '-')}`}
        tabIndex={-1}
      >
        {active === 'Overview' && <Overview onOpen={goToTab} />}
        {active === 'Film Room' && (
          <FilmRoom
            filters={filters}
            setFilters={setFilters}
            clips={clips}
            selectedClip={selectedClip}
            setSelectedClipId={setSelectedClipId}
            angle={angle}
            setAngle={setAngle}
            clipNotes={clipNotes}
            setClipNotes={setClipNotes}
            relationEdits={relationEdits}
            setRelationEdits={setRelationEdits}
            relationFor={relationFor}
          />
        )}
        {active === 'Hypotheses' && (
          <Hypotheses
            evidenceClips={metadataClips}
            relationFor={relationFor}
            onShowClips={showHypothesisClips}
          />
        )}
        {active === 'Assignments' && (
          <Assignments onOpenFilm={() => goToTab('Film Room')} />
        )}
      </div>
    </div>
  );
}

function Overview({ onOpen }: { readonly onOpen: (tab: ScoutingTab) => void }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-[1_1_480px] space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-surface-raised text-ink-muted flex size-10 items-center justify-center rounded-full text-[13px] font-semibold">
              CC
            </div>
            <div className="flex-1">
              <h2 className="m-0 text-[15px] font-semibold">
                Central Catholic Crusaders
              </h2>
              <p className="text-ink-subtle mt-1 mb-0 text-[12px]">
                7–0 · #1 in District 7-5A · Region II
              </p>
            </div>
            <span className="text-ink-muted inline-flex items-center gap-2 text-[11.5px]">
              <StatusDot tone="good" />
              Statewide prestige
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-black/5 pt-4">
            {[
              ['Points for / game', '34.6'],
              ['Points allowed', '11.2'],
              ['3rd down conv.', '48%'],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="m-0 text-[20px] font-semibold tracking-[-0.8px]">
                  {value}
                </dd>
                <dt className="text-ink-subtle mt-1 text-[10.5px]">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-3">
            <TendencyBar
              label="Run / pass split"
              width="62%"
              value="Run 62 · Pass 38"
            />
            <TendencyBar label="Blitz rate" width="28%" value="28%" />
            <TendencyBar label="Play-action rate" width="31%" value="31%" />
          </div>
          <p className="text-ink-muted mt-4 mb-0 border-t border-black/5 pt-3 text-[12.5px] leading-relaxed">
            Offense: I-formation power, pulls both guards, leans on the
            sprint-out pass when behind. Defense: Cover 3 shell, walks the
            eighth man down on early downs.
          </p>
        </Card>
        <Card>
          <SectionLabel>Key players</SectionLabel>
          {[
            ['RB #3', 'J. Malone', '1,240 yds · 14 TD · 6.8 per carry'],
            ['QB #12', 'T. Herrera', '58% comp · runs the sprint-out well'],
            ['LB #44', 'M. Buck', '92 tackles · 4 sacks · calls the front'],
          ].map(([position, name, stat]) => (
            <div
              key={name}
              className="flex flex-wrap items-center gap-3 border-b border-black/5 py-2 last:border-0"
            >
              <span className="bg-surface-raised text-ink-muted min-w-[58px] rounded px-2 py-1 text-center font-mono text-[10.5px]">
                {position}
              </span>
              <span className="min-w-[110px] text-[13px] font-medium">
                {name}
              </span>
              <span className="text-ink-subtle flex-1 text-[12.5px]">
                {stat}
              </span>
              <StatusDot tone={name === 'T. Herrera' ? 'risk' : 'good'} />
            </div>
          ))}
        </Card>
      </div>
      <div className="max-w-[440px] min-w-0 flex-[1_1_280px] space-y-4">
        <Card>
          <SectionLabel>Film exchange</SectionLabel>
          <ExchangeRow
            text="CC Week 7 film (vs Millbrook)"
            status="Received Mon"
          />
          <ExchangeRow text="Our Week 7 film" status="Sent Sat" />
          <Button
            className="mt-3 w-full justify-center"
            onClick={() => onOpen('Film Room')}
          >
            Open film room
          </Button>
        </Card>
        <Card>
          <SectionLabel>Scout assignment</SectionLabel>
          <p className="text-ink-muted m-0 text-[12.5px] leading-relaxed">
            Coach Tillman attends Central Catholic&apos;s JV game Thursday —
            fronts and personnel packages.
          </p>
          <Button className="mt-3" onClick={() => onOpen('Assignments')}>
            Reassign
          </Button>
        </Card>
        <Card>
          <SectionLabel>College scouts</SectionLabel>
          <InfoRow
            tone="info"
            text="State U — attending Fri"
            status="Watching M. Reed"
          />
          <InfoRow tone="neutral" text="Western Tech" status="Requested film" />
        </Card>
      </div>
    </div>
  );
}

function TendencyBar({
  label,
  width,
  value,
}: {
  readonly label: string;
  readonly width: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-muted w-[120px] text-[12px]">{label}</span>
      <span className="bg-surface-raised h-1 flex-1 overflow-hidden rounded">
        <span className="bg-ink block h-full" style={{ width }} />
      </span>
      <span className="text-ink-muted w-[110px] text-right font-mono text-[11.5px]">
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { readonly children: React.ReactNode }) {
  return (
    <h2 className="text-ink-subtle mt-0 mb-3 font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
      {children}
    </h2>
  );
}

function ExchangeRow({
  text,
  status,
}: {
  readonly text: string;
  readonly status: string;
}) {
  return <InfoRow tone="good" text={text} status={status} />;
}

function InfoRow({
  tone,
  text,
  status,
}: {
  readonly tone: 'good' | 'info' | 'neutral';
  readonly text: string;
  readonly status: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[13px]">
      <StatusDot tone={tone === 'info' ? 'accent' : tone} />
      <span className="text-ink-muted flex-1">{text}</span>
      <span className="font-medium">{status}</span>
    </div>
  );
}

interface FilmRoomProps {
  readonly filters: Filters;
  readonly setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  readonly clips: readonly FilmClip[];
  readonly selectedClip: FilmClip | null;
  readonly setSelectedClipId: (id: string) => void;
  readonly angle: FilmAngle;
  readonly setAngle: (angle: FilmAngle) => void;
  readonly clipNotes: Readonly<Record<string, string>>;
  readonly setClipNotes: React.Dispatch<
    React.SetStateAction<Readonly<Record<string, string>>>
  >;
  readonly relationEdits: RelationEdits;
  readonly setRelationEdits: React.Dispatch<
    React.SetStateAction<RelationEdits>
  >;
  readonly relationFor: (
    clip: FilmClip,
    hypothesisId: HypothesisId,
  ) => ClipRelation;
}

function FilmRoom(props: FilmRoomProps) {
  const { scenario } = useWeek();
  const {
    filters,
    setFilters,
    clips,
    selectedClip,
    setSelectedClipId,
    angle,
    setAngle,
    clipNotes,
    setClipNotes,
    relationEdits,
    setRelationEdits,
    relationFor,
  } = props;

  const groups: readonly [FilterKey, string, readonly [string, string][]][] = [
    [
      'side',
      'Side',
      [
        ['All', 'All'],
        ['Offense', 'OFF'],
        ['Defense', 'DEF'],
        ['Special teams', 'ST'],
      ],
    ],
    [
      'situation',
      'Situation',
      optionPairs([
        'All',
        'Early down',
        '3rd & medium',
        'Behind schedule',
        'Kicking',
        'Other',
      ]),
    ],
    [
      'personnel',
      'Personnel',
      [['All', 'All'], ...optionPairs(unique(scenario.clips, 'personnel'))],
    ],
    [
      'formation',
      'Formation',
      [['All', 'All'], ...optionPairs(unique(scenario.clips, 'formation'))],
    ],
    [
      'motion',
      'Motion',
      [['All', 'All'], ...optionPairs(unique(scenario.clips, 'motion'))],
    ],
    [
      'concept',
      'Concept',
      [['All', 'All'], ...optionPairs(unique(scenario.clips, 'concept'))],
    ],
    [
      'result',
      'Result',
      [['All', 'All'], ...optionPairs(unique(scenario.clips, 'result'))],
    ],
    [
      'tendency',
      'Tendency',
      [
        ['All', 'All'],
        ['Power', 'h1'],
        ['Sprint-out', 'h2'],
        ['Cover 3', 'h3'],
        ['Return', 'h4'],
        ['Untagged', 'none'],
      ],
    ],
  ];
  const activeFilters = Object.values(filters).some((value) => value !== 'All');
  const games = new Set(clips.map((clip) => clip.game)).size;
  let sampleLine = `Showing ${clips.length} of ${scenario.clips.length} clips · ${games} game${games === 1 ? '' : 's'}`;
  let sampleExplain =
    'Counts and game coverage reflect every active metadata filter; relationship edits update the evidence immediately.';
  const hypothesis = scenario.hypotheses.find(
    (item) => item.id === filters.tendency,
  );
  if (hypothesis !== undefined) {
    const supporting = clips.filter(
      (clip) => relationFor(clip, hypothesis.id) === 'sup',
    ).length;
    const contradicting = clips.filter(
      (clip) => relationFor(clip, hypothesis.id) === 'con',
    ).length;
    sampleLine += ` · ${supporting} supporting / ${contradicting} against`;
    sampleExplain = `${hypothesis.short} · ${evidenceConfidence(supporting, contradicting, games)}. ${supporting + contradicting} relevant clips across ${games} game${games === 1 ? '' : 's'} in the current metadata sample: ${supporting} support, ${contradicting} contradict.`;
  } else if (filters.tendency === 'none') {
    sampleExplain =
      'Untagged means Neutral against all four hypotheses after your relationship edits.';
  }

  const resolvedAngle = selectedClip?.angles.includes(angle)
    ? angle
    : selectedClip?.angles[0];

  const setFilter = (key: FilterKey, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        {groups.map(([key, label, options]) => (
          <fieldset
            key={key}
            aria-label={`${label} filter`}
            className="edge bg-surface-sunken m-0 flex min-w-0 flex-wrap gap-1.5 rounded-lg p-2"
          >
            <legend className="text-ink-subtle w-full px-0 font-mono text-[10px] font-medium tracking-[0.06em] uppercase">
              {label}
            </legend>
            {options.map(([optionLabel, value]) => (
              <PillButton
                key={value}
                pressed={filters[key] === value}
                title={optionLabel}
                aria-label={
                  key === 'tendency'
                    ? (scenario.hypotheses.find((item) => item.id === value)
                        ?.short ?? optionLabel)
                    : optionLabel
                }
                className="h-auto min-h-[26px] px-3 py-1 text-left text-[11.5px]"
                onClick={() => setFilter(key, value)}
              >
                {optionLabel}
              </PillButton>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-[1_1_420px]" aria-live="polite">
          <p className="text-ink-muted m-0 font-mono text-[11.5px]">
            {sampleLine}
          </p>
          <p className="text-ink-subtle mt-1 mb-0 text-[11px] leading-relaxed">
            {sampleExplain}
          </p>
        </div>
        <Button
          disabled={!activeFilters}
          className="h-7 px-3 text-[11.5px]"
          onClick={() => setFilters(ALL_FILTERS)}
        >
          Clear all filters
        </Button>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="edge-raised bg-surface max-w-[440px] min-w-0 flex-[1_1_320px] overflow-hidden rounded-xl"
          aria-label="Film clips"
        >
          {clips.map((clip) => {
            const relation =
              clip.hypothesisId === null
                ? 'neu'
                : relationFor(clip, clip.hypothesisId);
            const selected = selectedClip?.id === clip.id;
            return (
              <button
                key={clip.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedClipId(clip.id)}
                className={`flex w-full cursor-pointer items-start gap-2.5 border-0 border-b border-black/5 p-3 text-left font-sans last:border-b-0 ${selected ? 'bg-surface-raised' : 'bg-surface hover:bg-surface-sunken'}`}
              >
                <span
                  className={`${selected ? 'bg-[#e0e0e0]' : 'bg-[#ebebeb]'} text-ink-subtle flex h-[31px] w-[46px] shrink-0 items-center justify-center rounded font-mono text-[9.5px]`}
                >
                  {clip.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">
                    {clip.concept} · {clip.result}
                  </span>
                  <span className="text-ink-subtle mt-1 block truncate text-[11px]">
                    {clip.situation}
                  </span>
                </span>
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-medium">
                  <StatusDot tone={RELATION_TONE[relation]} />
                  {RELATION_LABEL[relation]}
                </span>
              </button>
            );
          })}
          {clips.length === 0 && (
            <div className="text-ink-subtle px-4 py-7 text-center text-[12.5px] leading-relaxed">
              No clips match these filters.
              <br />
              <Button
                className="mt-2 h-7 px-3 text-[12px]"
                onClick={() => setFilters(ALL_FILTERS)}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-[2_1_400px] space-y-4">
          {selectedClip === null ? (
            <div className="edge bg-surface-sunken text-ink-subtle rounded-xl px-5 py-8 text-center text-[12.5px] leading-relaxed">
              The viewer, coach-note editor, and relationship editor are hidden
              because no clip is in the filtered sample.
            </div>
          ) : (
            <>
              <Card className="overflow-hidden p-0">
                <div className="flex aspect-video flex-col items-center justify-center gap-1.5 bg-[#ebebeb]">
                  <span className="text-ink-subtle font-mono text-[13px] font-medium">
                    {selectedClip.id} · {resolvedAngle} angle
                  </span>
                  <span className="text-ink-faint text-[11.5px]">
                    Film placeholder — no video in this prototype
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-3">
                  {selectedClip.angles.map((item) => (
                    <Button
                      key={item}
                      variant={resolvedAngle === item ? 'primary' : 'secondary'}
                      aria-pressed={resolvedAngle === item}
                      title={
                        item === 'Tight'
                          ? 'Tight sideline copy'
                          : 'Wide end-zone copy'
                      }
                      className="h-7 px-3 text-[12px]"
                      onClick={() => setAngle(item)}
                    >
                      {item}
                    </Button>
                  ))}
                  <span className="flex-1" />
                  <span className="text-ink-subtle text-[11.5px]">
                    {selectedClip.game}
                  </span>
                </div>
                <div className="p-4">
                  <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ['Game', selectedClip.game],
                      ['Situation', selectedClip.situation],
                      ['Personnel', selectedClip.personnel],
                      ['Formation', selectedClip.formation],
                      ['Motion', selectedClip.motion],
                      ['Concept', selectedClip.concept],
                      ['Result', selectedClip.result],
                      [
                        'Angles',
                        `${selectedClip.angles.join(' + ')}${selectedClip.angles.length < 2 ? ' only' : ''}`,
                      ],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-ink-subtle font-mono text-[10px] font-medium tracking-[0.05em] uppercase">
                          {key}
                        </dt>
                        <dd className="mt-1 ml-0 text-[12.5px]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-ink-muted mt-4 mb-0 border-t border-black/5 pt-3 text-[12.5px] leading-relaxed">
                    “{selectedClip.staffNote}”{' '}
                    <span className="text-ink-subtle">— M. Soto, film</span>
                  </p>
                  <label className="mt-3 block">
                    <span className="text-ink-subtle mb-1 block font-mono text-[10px] font-medium tracking-[0.05em] uppercase">
                      Your note on this clip
                    </span>
                    <input
                      value={clipNotes[selectedClip.id] ?? ''}
                      onChange={(event) =>
                        setClipNotes((current) => ({
                          ...current,
                          [selectedClip.id]: event.target.value,
                        }))
                      }
                      placeholder="Type what you see…"
                      className="edge bg-surface-sunken text-ink h-8 w-full rounded-md px-3 text-[12.5px] outline-none"
                    />
                  </label>
                </div>
              </Card>
              <Card>
                <h3 className="m-0 text-[12.5px] font-medium">
                  How this clip reads against each tendency
                </h3>
                <p className="text-ink-subtle mt-1 mb-3 text-[11.5px]">
                  Staff tags are Soto&apos;s. Change one and it counts as yours
                  in the sample.
                </p>
                <div className="space-y-3">
                  {scenario.hypotheses.map((item) => {
                    const edited =
                      relationEdits[selectedClip.id]?.[item.id] !== undefined;
                    return (
                      <div
                        key={item.id}
                        role="group"
                        aria-label={`${item.short} relationship`}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="min-w-0 flex-[1_1_150px] text-[12.5px]">
                          {item.short}
                        </span>
                        {(
                          [
                            ['sup', 'Supports'],
                            ['con', 'Contradicts'],
                            ['neu', 'Neutral'],
                          ] as const
                        ).map(([value, label]) => (
                          <Button
                            key={value}
                            variant={
                              relationFor(selectedClip, item.id) === value
                                ? 'primary'
                                : 'secondary'
                            }
                            aria-pressed={
                              relationFor(selectedClip, item.id) === value
                            }
                            className="h-[26px] px-2.5 text-[11.5px]"
                            onClick={() =>
                              setRelationEdits((current) => ({
                                ...current,
                                [selectedClip.id]: {
                                  ...current[selectedClip.id],
                                  [item.id]: value,
                                },
                              }))
                            }
                          >
                            {label}
                          </Button>
                        ))}
                        {edited && (
                          <span className="text-accent text-[10.5px] font-medium">
                            edited
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function evidenceConfidence(
  supporting: number,
  contradicting: number,
  games: number,
): string {
  const total = supporting + contradicting;
  if (total === 0) return 'No matching evidence';
  if (total < 4 || games < 2) return 'Low sample';
  return supporting >= Math.max(3, contradicting * 2) ? 'Strong' : 'Moderate';
}

const ASSIGNMENTS = [
  {
    id: 'jv',
    task: 'Central Catholic JV game — fronts and personnel',
    when: 'THU 5:30 PM',
    detail:
      'An in-person look at what the varsity staff is teaching. Whoever goes is not at Thursday practice.',
    options: ['B. Tillman', 'K. Ames', 'M. Soto'],
    costs: {
      'B. Tillman':
        'Tillman misses Thursday special-teams walkthrough. Ames covers the defense script.',
      'K. Ames':
        'Ames misses Thursday special teams entirely. Units run by script only.',
      'M. Soto':
        'Soto goes, but he is the one cutting Friday-morning film. The tape lands late.',
    },
  },
  {
    id: 'cut',
    task: 'Cut and tag the Friday-morning walkthrough reel',
    when: 'THU 9:00 PM',
    detail:
      'Ten clips of whatever you prioritized, ready for the pregame meeting.',
    options: ['M. Soto', 'D. Pruitt'],
    costs: {
      'M. Soto': 'Standard. Soto has done it every week this season.',
      'D. Pruitt':
        'Pruitt cuts it himself and shortens his own install review.',
    },
  },
  {
    id: 'st',
    task: 'Central Catholic return-unit breakdown',
    when: 'WED 4:00 PM',
    detail:
      'Six returns is a small sample. Somebody has to decide whether it is real.',
    options: ['K. Ames', 'M. Soto', 'Nobody'],
    costs: {
      'K. Ames':
        'Ames builds a lane-by-lane report. Costs him a coverage period.',
      'M. Soto': 'Soto adds it to his plate. Clip tagging slips to Thursday.',
      Nobody: 'You go into Friday with six returns and no breakdown.',
    },
  },
] as const;

/**
 * UI-3 keeps the staff's own pick visually selected until the coach puts a
 * decision on file; persistence starts null for both delegated tasks.
 */
const DELEGATED_DEFAULT_LABEL: Readonly<Record<StaffAssignmentTaskId, string>> =
  {
    cut: 'M. Soto',
    st: 'K. Ames',
  };

function delegatedLabel(
  task: StaffAssignmentTaskId,
  event: StaffDelegationEvent,
): string {
  return (
    staffTaskDelegates(task).find((option) => option.id === event.response)
      ?.label ?? DELEGATED_DEFAULT_LABEL[task]
  );
}

function Assignments({ onOpenFilm }: { readonly onOpenFilm: () => void }) {
  const { dispatch, staffFilmDelegateEvent, returnScoutDelegateEvent } =
    useWeek();
  const [assigned, setAssigned] = useState<Readonly<Record<string, string>>>({
    jv: 'B. Tillman',
  });
  const delegated: Readonly<Record<StaffAssignmentTaskId, string>> = {
    cut: delegatedLabel('cut', staffFilmDelegateEvent),
    st: delegatedLabel('st', returnScoutDelegateEvent),
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Card className="min-w-0 flex-[1_1_420px] overflow-hidden p-0">
        <h2 className="m-0 border-b border-black/5 px-4 py-3 text-[13px] font-medium">
          Scout assignments · this week
        </h2>
        {ASSIGNMENTS.map((assignment) => {
          const selected =
            assignment.id === 'jv'
              ? assigned[assignment.id]
              : delegated[assignment.id];
          return (
            <section
              key={assignment.id}
              aria-label={assignment.task}
              className="border-b border-black/5 p-4 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 min-w-0 flex-[1_1_200px] text-[12.5px] font-medium">
                  {assignment.task}
                </h3>
                <span className="text-ink-subtle font-mono text-[11px]">
                  {assignment.when}
                </span>
              </div>
              <p className="text-ink-subtle mt-1.5 mb-0 text-[11.5px] leading-relaxed">
                {assignment.detail}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-ink-subtle mr-1 font-mono text-[10px] font-medium tracking-[0.05em] uppercase">
                  Assigned to
                </span>
                {assignment.options.map((option) => (
                  <PillButton
                    key={option}
                    pressed={selected === option}
                    className="h-[26px] px-3 text-[11.5px]"
                    onClick={() => {
                      if (assignment.id === 'jv') {
                        setAssigned((current) => ({
                          ...current,
                          [assignment.id]: option,
                        }));
                        return;
                      }
                      const delegate = staffTaskDelegates(assignment.id).find(
                        (item) => item.label === option,
                      );
                      if (delegate === undefined) return;
                      dispatch({
                        type: 'choose-staff-delegate',
                        task: assignment.id,
                        delegate: delegate.id,
                      });
                    }}
                  >
                    {option}
                  </PillButton>
                ))}
              </div>
              <p className="text-ink-muted mt-2 mb-0 text-[11.5px] leading-relaxed">
                {assignment.costs[selected as keyof typeof assignment.costs]}
              </p>
            </section>
          );
        })}
      </Card>
      <div className="max-w-[420px] min-w-0 flex-[1_1_280px] space-y-4">
        <Card>
          <SectionLabel>Film exchange</SectionLabel>
          <ExchangeRow
            text="CC Week 7 film (vs Millbrook)"
            status="Received Mon"
          />
          <ExchangeRow text="CC Weeks 5–6 film" status="Received Sun" />
          <ExchangeRow text="Our Week 7 film" status="Sent Sat" />
          <Button className="mt-3 w-full justify-center" onClick={onOpenFilm}>
            Open the Film Room
          </Button>
        </Card>
        <Card>
          <SectionLabel>College scouts</SectionLabel>
          <InfoRow
            tone="info"
            text="State U — attending Fri"
            status="Watching M. Reed"
          />
          <InfoRow tone="neutral" text="Western Tech" status="Requested film" />
        </Card>
      </div>
    </div>
  );
}
