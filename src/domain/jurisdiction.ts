import type {
  AcademicEligibilityInput,
  AcademicEligibilityResult,
  FullContactValidationResult,
  GameDayVideoDataSurface,
  JurisdictionRuleSet,
  JurisdictionRuleSource,
  JurisdictionSourceId,
  VideoDataSurfaceValidationResult,
} from './types.ts';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_COMMON_YEAR = 365;
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Parses a date-only value into a Gregorian day ordinal without a clock or
 * JavaScript date constructor. Dates are inputs, not instants in a timezone.
 */
function parseIsoDate(value: string): number | null {
  const match = ISO_DATE.exec(value);
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return null;

  const daysInMonth =
    month === 2 && isLeapYear(year) ? 29 : (MONTH_LENGTHS[month - 1] ?? 0);
  if (day < 1 || day > daysInMonth) return null;

  let daysBeforeMonth = 0;
  for (let index = 0; index < month - 1; index += 1) {
    daysBeforeMonth += MONTH_LENGTHS[index] ?? 0;
  }
  if (month > 2 && isLeapYear(year)) daysBeforeMonth += 1;

  const previousYear = year - 1;
  const daysBeforeYear =
    previousYear * DAYS_PER_COMMON_YEAR +
    Math.floor(previousYear / 4) -
    Math.floor(previousYear / 100) +
    Math.floor(previousYear / 400);
  return daysBeforeYear + daysBeforeMonth + day;
}

function parsePeriodGrade(value: string): number | null {
  const trimmed = value.trim();
  if (!/^(?:\d{1,2}(?:\.\d+)?|100(?:\.0+)?)$/.test(trimmed)) return null;
  const grade = Number(trimmed);
  return grade >= 0 && grade <= 100 ? grade : null;
}

/** Resolves only sources present in this exact rule-set snapshot. */
export function resolveJurisdictionSource(
  ruleSet: JurisdictionRuleSet,
  sourceId: JurisdictionSourceId,
): JurisdictionRuleSource | null {
  return ruleSet.sources.find((source) => source.id === sourceId) ?? null;
}

/**
 * Evaluates the narrow post-first-six-weeks No Pass No Play context.
 * Missing official-period or timing inputs remain unknown; GPA is never inferred.
 */
export function validateAcademicEligibility(
  ruleSet: JurisdictionRuleSet,
  input: AcademicEligibilityInput,
): AcademicEligibilityResult {
  const sourceIds = ruleSet.academicEligibility.sourceIds;
  const periodEnd =
    input.periodEndDate === undefined
      ? null
      : parseIsoDate(input.periodEndDate);
  const contest =
    input.contestDate === undefined ? null : parseIsoDate(input.contestDate);
  const grade =
    input.periodGrade === undefined
      ? null
      : parsePeriodGrade(input.periodGrade);

  if (
    input.reportKind !== 'official-grading-period' ||
    input.seasonPhase !== 'after-first-six-weeks' ||
    input.courseStatus === undefined ||
    grade === null ||
    periodEnd === null ||
    contest === null ||
    contest < periodEnd
  ) {
    return {
      contest: 'insufficient-context',
      practice: 'practice-allowed',
      reason:
        'An official grading-period grade, exemption status, and valid period/contest timing are required.',
      sourceIds,
    };
  }

  if (
    input.courseStatus === 'exempt' ||
    grade >= ruleSet.academicEligibility.passingPeriodGrade
  ) {
    return {
      contest: 'eligible',
      practice: 'practice-allowed',
      reason:
        input.courseStatus === 'exempt'
          ? 'The supplied course is exempt in this official-period context.'
          : 'The supplied official period grade meets the rule-set threshold.',
      sourceIds,
    };
  }

  const eligibilityChange =
    periodEnd + ruleSet.academicEligibility.gracePeriodDays;
  if (contest < eligibilityChange) {
    return {
      contest: 'insufficient-context',
      practice: 'practice-allowed',
      reason:
        'The contest occurs before the seven-calendar-day timing boundary; authoritative eligibility timing is required.',
      sourceIds,
    };
  }

  return {
    contest: 'contest-ineligible',
    practice: 'practice-allowed',
    reason:
      'A nonexempt official period grade below 70 bars contest participation after the grace period; practice remains allowed.',
    sourceIds,
  };
}

export function validateWeeklyFullContactMinutes(
  ruleSet: JurisdictionRuleSet,
  minutes: number,
): FullContactValidationResult {
  const valid =
    Number.isFinite(minutes) && Number.isInteger(minutes) && minutes >= 0;
  return {
    status: valid
      ? minutes <= ruleSet.weeklyFullContact.maximumMinutes
        ? 'within-limit'
        : 'over-limit'
      : 'invalid-input',
    minutes,
    maximumMinutes: ruleSet.weeklyFullContact.maximumMinutes,
    sourceIds: ruleSet.weeklyFullContact.sourceIds,
  };
}

export function validateGameDayVideoDataSurface(
  ruleSet: JurisdictionRuleSet,
  surface: GameDayVideoDataSurface,
): VideoDataSurfaceValidationResult {
  return {
    status: ruleSet.gameDayVideoData.rejectedSurfaces.includes(surface)
      ? 'rejected'
      : 'allowed',
    surface,
    sourceIds: ruleSet.gameDayVideoData.sourceIds,
  };
}
