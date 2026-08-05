/**
 * Saturday Decision Review, ported from the canonical UI-3 `procOf`,
 * `revRows`, `revRisk`, lesson-candidate, and close-week contracts.
 *
 * Match output is read through `deriveMatch`; this module never edits the
 * final score, play feed, take-the-field snapshot, or decision log.
 */

import {
  deriveMatch,
  deriveTakeFieldContext,
  READINESS_WORDS,
  type MatchLogDecision,
  type MatchLogNote,
  type TakeFieldContext,
} from './matchDay.ts';
import type {
  DecisionProcessRating,
  HypothesisId,
  WeekScenario,
  WeekState,
} from './types.ts';

export const REVIEW_RATINGS = [
  'Sound',
  'Debatable',
  'Poor process',
] as const satisfies readonly DecisionProcessRating[];

const REVIEW_OBJECTIVES: Readonly<Record<string, readonly string[]>> = {
  s_power: ['o1'],
  s_fourth: ['o6'],
  s_clock: ['o1', 'o2'],
  s_flood: ['o3'],
  s_pat: ['o6'],
  s_close_def: ['o1', 'o2'],
  s_close_off: ['o3'],
};

const REVIEW_HYPOTHESES: Readonly<Record<string, HypothesisId | undefined>> = {
  s_power: 'h1',
  s_flood: 'h3',
  s_close_off: 'h3',
};

const RT_LESSONS: Readonly<Record<string, string>> = {
  promote:
    'Thursday catch-up reps made the backup playable. Budget backup reps before you need them.',
  simplify:
    'The smaller sheet, better repped, beat the bigger one on paper. Shrink early when depth breaks.',
  switch:
    'Reps don’t transfer between answers — a Thursday switch starts at zero. Decide sooner.',
  accept:
    'The unprotected five-step showed up where the film said it would. Next disruption, buy the fix.',
};

export interface StaffProcessRead {
  readonly rating: DecisionProcessRating;
  readonly why: string;
}

export interface ReviewPreparationTrace {
  readonly objectiveId: string;
  readonly objective: string;
  readonly readiness: (typeof READINESS_WORDS)[number];
  readonly allocation: string;
}

export interface ReviewTimelineRow {
  readonly decisionId: string;
  readonly when: string;
  readonly title: string;
  readonly chips: readonly string[];
  readonly evidence: string;
  readonly evidenceHypothesisId: HypothesisId | null;
  readonly evidenceCta: 'Open tagged evidence' | 'Open all evidence';
  readonly staff: string;
  readonly staffMember: string;
  readonly choice: string;
  readonly preparation: readonly ReviewPreparationTrace[];
  readonly outcomes: MatchLogDecision['out'];
  readonly execution: string;
  readonly result: string;
  readonly resultTone: 'good' | 'danger' | 'neutral';
  readonly staffProcess: StaffProcessRead;
  readonly coachRating: DecisionProcessRating | null;
  readonly ratingAgreement: string;
}

export interface ReviewRisk {
  readonly hasRisk: boolean;
  readonly name: string;
  readonly statement: string;
  readonly verdict: string;
  readonly events: readonly { readonly when: string; readonly text: string }[];
}

export interface LessonCandidate {
  readonly id: string;
  readonly text: string;
  readonly saved: boolean;
}

export interface ReviewStory {
  readonly headline: string;
  readonly body: string;
}

export interface DecisionReviewModel {
  readonly empty: boolean;
  readonly score: string;
  readonly result: 'WIN' | 'LOSS';
  readonly rows: readonly ReviewTimelineRow[];
  readonly risk: ReviewRisk;
  readonly lessonCandidates: readonly LessonCandidate[];
  readonly savedLessons: readonly LessonCandidate[];
  readonly lessonMessage: boolean;
  readonly canClose: boolean;
  readonly closed: boolean;
  readonly story: ReviewStory;
}

function level(context: TakeFieldContext, objectiveId: string): number {
  return context.lvl[objectiveId] ?? 0;
}

/** Canonical staff rubric. Result points never select the process rating. */
export function staffProcessFor(
  decision: MatchLogDecision,
  context: TakeFieldContext,
): StaffProcessRead {
  const oi = decision.oi;
  const preparedH1 = context.ansBy.h1 !== undefined;
  const preparedH3 = context.ansBy.h3 !== undefined;
  const scoreDifference = decision.scW - decision.scC;
  const sound = (why: string): StaffProcessRead => ({ rating: 'Sound', why });
  const debatable = (why: string): StaffProcessRead => ({
    rating: 'Debatable',
    why,
  });
  const poor = (why: string): StaffProcessRead => ({
    rating: 'Poor process',
    why,
  });

  if (decision.id === 's_power') {
    if (oi === 0) {
      if (preparedH1) {
        return level(context, 'o1') >= 2
          ? sound(
              'Evidence, an installed answer, and real reps pointed the same way. Playing your preparation is the process working, whatever the down produced.',
            )
          : debatable(
              `Right plan to trust, but you knew the fits were only ${READINESS_WORDS[level(context, 'o1')]}. Trusting thin reps is a bet, and it should be priced like one.`,
            );
      }
      return debatable(
        'Base-and-rally was the honest ceiling of this call sheet. The real decision was made Monday, when the tendency stayed off the board.',
      );
    }
    if (oi === 1) {
      return debatable(
        'Selling out kills the pull — and leaves one safety alone against the play-action the film showed. A big swing either way, chosen on feel.',
      );
    }
    return debatable(
      'Conceding four a carry trades points for clock at an honest price — but it hands Malone the game you spent the week trying to take away.',
    );
  }

  if (decision.id === 's_fourth') {
    if (oi === 0) {
      if (context.pol.fourth === 'Kick') {
        return debatable(
          'This overrode your own standing call in the situation it was written for. A policy abandoned under normal conditions was never a policy.',
        );
      }
      return level(context, 'o6') >= 1
        ? sound(
            'The chart said go, 55 was out of Ramsey’s range, and the surge package had reps. Policy, evidence, and readiness agreed.',
          )
        : debatable(
            'The chart said go — but the chart does not know the surge package never took a rep this week.',
          );
    }
    if (oi === 1) {
      if (context.pol.fourth === 'Kick') {
        return sound(
          'Exactly your policy: take field position when three points are not on the table. Boring and correct are often the same call.',
        );
      }
      return level(context, 'o6') === 0
        ? sound(
            'You overrode the chart with a reason — the go-call runs through a package that never got a rep. Field position was the honest read.',
          )
        : debatable(
            'The chart and your policy both said go, and the package had reps. The cautious call, not the prepared one.',
          );
    }
    return poor(
      'No film showed them jumping counts, and the five-yard downside was certain. Hoping is not a process.',
    );
  }

  if (decision.id === 's_clock') {
    if (context.pol.auto === 'Front') {
      return oi === 0
        ? sound(
            'The policy you set Tuesday worked exactly as designed — the front was fixed before anyone could find you. Riding it is the point of having it.',
          )
        : debatable(
            'A timeout spent on certainty the policy had already bought. Comfort, at the price of a fourth-quarter timeout.',
          );
    }
    if (oi === 0) {
      return context.pol.clock === 'Fix'
        ? sound(
            'This is the exact timeout your policy set aside — unseen look, fix available, coordinator asking. The system worked.',
          )
        : debatable(
            'It fixed a real problem — against your own stated timeout policy. If the policy was wrong, change it on Tuesday, not at 0:55.',
          );
    }
    if (oi === 1) {
      return level(context, 'o1') >= 2
        ? sound(
            'The rules were repped and you trusted them, banking a timeout the fourth quarter might need. Preparation exists for exactly this call.',
          )
        : poor(
            'An unseen look, thin reps behind it, a fix on the table — declined. That is hoping, not trusting.',
          );
    }
    return level(context, 'o1') >= 1
      ? debatable(
          'A free steal if they jump, but a bluff backed by a thin plan leaks points the moment they take the shot anyway.',
        )
      : poor(
          'A bluff with nothing behind it. If they throw at it, nobody on the field has an answer — and you knew that.',
        );
  }

  if (decision.id === 's_flood') {
    if (oi === 0) {
      if (!preparedH3) {
        return poor(
          'A play sketched on a wristband is not a play. The window was real — and the decision to leave it unpracticed was made Monday, not here.',
        );
      }
      if (context.rtFix === 'switch') {
        return sound(
          'You lived with Thursday’s trade instead of un-making it at midfield. Consistency with your own resolution is process, even when it scores in threes.',
        );
      }
      if (context.rtFix === 'accept') {
        return debatable(
          'The best throw on the sheet needs time you chose not to buy on Thursday. Calling it anyway asks execution to cover for a decision.',
        );
      }
      return level(context, 'o3') >= 2
        ? sound(
            'The evidence said the window was open, the answer was installed, and the reps were real. The throw the week was built to take.',
          )
        : debatable(
            `Right read, thin reps — ${READINESS_WORDS[level(context, 'o3')]} work asked to deliver a rehearsed throw.`,
          );
    }
    if (oi === 1) {
      return sound(
        'Protects the tackle and takes what the shell concedes without asking for a hero throw. Low ceiling, honest floor.',
      );
    }
    return debatable(
      'The box count made it tempting — but it leaves the one window you spent the week on unthrown.',
    );
  }

  if (decision.id === 's_pat') {
    if (oi === 0) {
      return sound(
        'A near-certain point from a 21-of-22 kicker. The math rarely punishes the kick, and the operation earned the trust.',
      );
    }
    return level(context, 'o6') >= 2 && context.rtFix !== 'accept'
      ? sound(
          'Two points behind a package that got real reps this week — an aggressive call with preparation underneath it.',
        )
      : poor(
          'Two points through a package that lost its blocker and its reps on Thursday. Hope, wearing a play call.',
        );
  }

  if (decision.id === 's_close_def') {
    if (oi === 0) {
      return sound(
        'The last drive is what the week was for. Playing the rules you repped is defensible whether they hold or not.',
      );
    }
    if (oi === 1) {
      return scoreDifference > 3
        ? sound(
            'Up more than a field goal, grass-for-clock is just math. The shell concedes nothing that beats you.',
          )
        : poor(
            `A shell that concedes exactly the yards a field goal needs, when a field goal ${scoreDifference === 3 ? 'ties' : 'beats'} you.`,
          );
    }
    return debatable(
      'A free runner ends drives; a missed assignment ends seasons. A coin flip chosen while holding the lead.',
    );
  }

  if (decision.id === 's_close_off') {
    if (oi === 0) {
      if (preparedH3) {
        return level(context, 'o3') >= 2
          ? sound(
              'Down to one play, you called the one you practiced against the shell you scouted. Nothing on the sheet had better odds.',
            )
          : debatable(
              `The right call from a thin week — the flood was the best of what existed, at ${READINESS_WORDS[level(context, 'o3')]}.`,
            );
      }
      return debatable(
        'Four verticals was the last resort by construction. The call sheet got thin here on Monday, not at 0:31.',
      );
    }
    if (oi === 1) {
      return poor(
        'Buck jumped every screen on film and jumped them all night. The one throw the evidence had already closed.',
      );
    }
    return debatable(
      'Off script — a real bet on Reed’s legs, but one nothing this week priced.',
    );
  }

  return debatable('A judgment call the film neither endorsed nor closed.');
}

function lessonCandidatesFor(
  state: WeekState,
  scenario: WeekScenario,
  decisions: readonly MatchLogDecision[],
  riskCash: readonly MatchLogNote[],
  context: TakeFieldContext,
): readonly { readonly id: string; readonly text: string }[] {
  const candidates: { id: string; text: string }[] = [];
  const risk = scenario.hypotheses.find((item) => item.id === context.risk);
  if (risk !== undefined) {
    candidates.push({
      id: 'l_risk',
      text:
        riskCash.length > 0
          ? `The ${risk.short.toLowerCase()} bet cashed ${riskCash.length} ${riskCash.length > 1 ? 'times' : 'time'}. Price accepted risks in points, not comfort — and ask whether this one stays cheap.`
          : `The ${risk.short.toLowerCase()} risk never cashed. Log the luck; don’t bank on it twice.`,
    });
  }
  for (const decision of decisions) {
    const process = staffProcessFor(decision, context);
    if (
      process.rating === 'Sound' &&
      decision.pts.c > decision.pts.w &&
      !candidates.some((item) => item.id === 'l_gp')
    ) {
      candidates.push({
        id: 'l_gp',
        text: `“${decision.choice}” was a sound call that lost the sequence. Keep making it — process grades a season; one night grades nothing.`,
      });
    }
    if (
      process.rating !== 'Sound' &&
      decision.pts.w > decision.pts.c &&
      !candidates.some((item) => item.id === 'l_bp')
    ) {
      candidates.push({
        id: 'l_bp',
        text: `“${decision.choice}” worked anyway. Don’t let the points launder the process.`,
      });
    }
  }
  const rtLesson =
    context.rtFix === null ? undefined : RT_LESSONS[context.rtFix];
  if (rtLesson !== undefined) {
    candidates.push({ id: 'l_rt', text: rtLesson });
  }
  if (level(context, 'o1') >= 3 || level(context, 'o2') >= 3) {
    candidates.push({
      id: 'l_ex',
      text: 'Rehearsed shifts odds; it doesn’t tackle. Pair every rule with the open-field work that finishes it.',
    });
  }
  if (context.pol.auto === 'Front') {
    candidates.push({
      id: 'l_pol',
      text: 'The delegated front-check got made in seconds nobody had. Keep giving coordinators the calls that can’t wait for you.',
    });
  }
  if (candidates.length < 4) {
    candidates.push({
      id: 'l_sample',
      text: 'The hypotheses that held up all had 30+ snaps behind them. Ask Soto for a fourth game on anything under 15.',
    });
  }
  void state;
  return candidates.slice(0, 6);
}

export function deriveDecisionReview(
  state: WeekState,
  scenario: WeekScenario,
): DecisionReviewModel {
  const match = deriveMatch(state, scenario);
  const empty = match.phase !== 'final';
  const context = deriveTakeFieldContext(state, scenario);
  const decisions = match.log.filter(
    (entry): entry is MatchLogDecision => entry.kind === 'decision',
  );
  const riskCash = match.log.filter(
    (entry): entry is MatchLogNote =>
      entry.kind === 'note' && /^Accepted risk/.test(entry.title),
  );
  const riskHypothesis = scenario.hypotheses.find(
    (item) => item.id === context.risk,
  );
  const rows = decisions.map((decision): ReviewTimelineRow => {
    const staffProcess = staffProcessFor(decision, context);
    const coachRating = state.reviewRatings[decision.id] ?? null;
    const preparation = (REVIEW_OBJECTIVES[decision.id] ?? []).map(
      (objectiveId): ReviewPreparationTrace => {
        const objective = scenario.objectives.find(
          (item) => item.id === objectiveId,
        );
        const objectiveLevel = level(context, objectiveId);
        const blocks = state.practiceBlocks.filter(
          (block) => block.objectiveId === objectiveId,
        );
        return {
          objectiveId,
          objective: objective?.name ?? objectiveId,
          readiness: READINESS_WORDS[objectiveLevel] ?? 'Unseen',
          allocation:
            blocks.length > 0
              ? `${blocks.length} block${blocks.length > 1 ? 's' : ''} (${blocks.map((block) => `${block.day}${block.live ? '' : ' off-air'}`).join(', ')})`
              : '0 blocks · 0 periods',
        };
      },
    );
    const tagged = decision.out.filter((outcome) => outcome.tag !== '');
    const points = decision.pts;
    return {
      decisionId: decision.id,
      when: decision.when,
      title: decision.title,
      chips: decision.chips,
      evidence: decision.evid,
      evidenceHypothesisId: REVIEW_HYPOTHESES[decision.id] ?? null,
      evidenceCta:
        REVIEW_HYPOTHESES[decision.id] === undefined
          ? 'Open all evidence'
          : 'Open tagged evidence',
      staff: decision.staff,
      staffMember: decision.who,
      choice: decision.choice,
      preparation,
      outcomes: decision.out,
      execution:
        tagged[0]?.tag ?? 'Ran as called — nothing for the booth to flag.',
      result:
        points.w !== 0 || points.c !== 0
          ? `${scenario.program.school} +${points.w} · Central +${points.c} across the sequence`
          : 'No points changed hands on the sequence.',
      resultTone:
        points.w > points.c
          ? 'good'
          : points.c > points.w
            ? 'danger'
            : 'neutral',
      staffProcess,
      coachRating,
      ratingAgreement:
        coachRating === null
          ? ''
          : coachRating === staffProcess.rating
            ? 'You and the staff read it the same way.'
            : 'You and the staff split on this one — worth two minutes in Monday’s staff meeting.',
    };
  });
  const rawCandidates = lessonCandidatesFor(
    state,
    scenario,
    decisions,
    riskCash,
    context,
  );
  const lessonCandidates = rawCandidates.map((candidate) => ({
    ...candidate,
    saved: state.lessons.includes(candidate.id),
  }));
  const savedLessons = lessonCandidates.filter((candidate) => candidate.saved);
  const won = match.wScore > match.cScore;
  const starter = context.rtName;
  return {
    empty,
    score: `${scenario.program.school} ${match.wScore} — ${match.cScore} ${scenario.opponent.name}`,
    result: won ? 'WIN' : 'LOSS',
    rows,
    risk: {
      hasRisk: riskHypothesis !== undefined,
      name: riskHypothesis?.short ?? '',
      statement: riskHypothesis?.statement ?? '',
      verdict:
        riskCash.length >= 2
          ? `It cashed ${riskCash.length} times. The bet was real, and Central collected on it.`
          : riskCash.length === 1
            ? 'It cashed once — about the price you accepted Monday.'
            : 'It never cashed. A quiet night on the bet is luck, not proof it was free.',
      events: riskCash.map((entry) => ({
        when: entry.when,
        text: entry.note,
      })),
    },
    lessonCandidates,
    savedLessons,
    lessonMessage: state.reviewLessonMessage,
    canClose: savedLessons.length > 0,
    closed: state.reviewClosed,
    story: {
      headline: won
        ? `Wildcats seize the district’s front seat, ${match.wScore}–${match.cScore}`
        : `Central holds the top seed as Westfield falls, ${match.cScore}–${match.wScore}`,
      body: won
        ? `A sold-out Wildcat Stadium watched ${scenario.program.school} hand previously unbeaten Central Catholic its first loss, ${match.wScore}–${match.cScore}. With Ryan Kowalski sidelined by grades, Thursday’s call handing right tackle to ${starter} quietly held the evening together. ${scenario.program.school} (7-1) travels to Riverside next Friday with the tiebreaker in its pocket.`
        : `Central Catholic left Wildcat Stadium with the district lead Friday night, ${match.cScore}–${match.wScore}. Playing without Ryan Kowalski, ineligible since Thursday, ${scenario.program.school} got steady work from ${starter} at right tackle but couldn’t close. Riverside is next, Friday on the road.`,
    },
  };
}

export function rateReviewDecision(
  state: WeekState,
  scenario: WeekScenario,
  decisionId: string,
  rating: DecisionProcessRating,
): WeekState {
  const review = deriveDecisionReview(state, scenario);
  if (review.empty || !REVIEW_RATINGS.includes(rating)) return state;
  if (!review.rows.some((row) => row.decisionId === decisionId)) return state;
  if (state.reviewRatings[decisionId] === rating) return state;
  return {
    ...state,
    reviewRatings: { ...state.reviewRatings, [decisionId]: rating },
  };
}

export function toggleReviewLesson(
  state: WeekState,
  scenario: WeekScenario,
  lessonId: string,
): WeekState {
  const review = deriveDecisionReview(state, scenario);
  if (review.empty) return state;
  if (!review.lessonCandidates.some((candidate) => candidate.id === lessonId)) {
    return state;
  }
  if (state.lessons.includes(lessonId)) {
    return {
      ...state,
      lessons: state.lessons.filter((id) => id !== lessonId),
      reviewLessonMessage: false,
    };
  }
  if (review.savedLessons.length >= 3) {
    return { ...state, reviewLessonMessage: true };
  }
  return {
    ...state,
    lessons: [...state.lessons, lessonId],
    reviewLessonMessage: false,
  };
}

export function closeReview(
  state: WeekState,
  scenario: WeekScenario,
): WeekState {
  const review = deriveDecisionReview(state, scenario);
  if (review.empty || !review.canClose || state.reviewClosed) return state;
  return { ...state, reviewClosed: true };
}
