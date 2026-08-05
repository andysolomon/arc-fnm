import { describe, expect, it } from 'vitest';

import {
  resolveJurisdictionSource,
  validateAcademicEligibility,
  validateGameDayVideoDataSurface,
  validateWeeklyFullContactMinutes,
} from './jurisdiction.ts';
import { TEXAS_UIL_2026_27_RULE_SET, WEEK_8_SCENARIO } from './scenario.ts';

const RULE_SET = TEXAS_UIL_2026_27_RULE_SET;

describe('Texas jurisdiction rule set', () => {
  it('treats an official nonexempt sub-70 period grade as contest-ineligible but practice-allowed', () => {
    expect(
      validateAcademicEligibility(RULE_SET, {
        periodGrade: '69',
        courseStatus: 'nonexempt',
        reportKind: 'official-grading-period',
        seasonPhase: 'after-first-six-weeks',
        periodEndDate: '2026-10-09',
        contestDate: '2026-10-16',
      }),
    ).toMatchObject({
      contest: 'contest-ineligible',
      practice: 'practice-allowed',
    });
  });

  it('applies the seven-calendar-day boundary exactly without a clock', () => {
    const input = {
      periodGrade: '69',
      courseStatus: 'nonexempt' as const,
      reportKind: 'official-grading-period' as const,
      seasonPhase: 'after-first-six-weeks' as const,
      periodEndDate: '2026-10-09',
    };

    expect(
      validateAcademicEligibility(RULE_SET, {
        ...input,
        contestDate: '2026-10-15',
      }).contest,
    ).toBe('insufficient-context');
    expect(
      validateAcademicEligibility(RULE_SET, {
        ...input,
        contestDate: '2026-10-16',
      }).contest,
    ).toBe('contest-ineligible');
  });

  it('keeps pre-rule and invalid-date contexts unknown instead of guessing', () => {
    const timing = {
      periodGrade: '69',
      courseStatus: 'nonexempt' as const,
      periodEndDate: '2026-10-09',
      contestDate: '2026-10-16',
    };

    expect(
      validateAcademicEligibility(RULE_SET, {
        ...timing,
        reportKind: 'progress-report',
        seasonPhase: 'after-first-six-weeks',
      }).contest,
    ).toBe('insufficient-context');
    expect(
      validateAcademicEligibility(RULE_SET, {
        ...timing,
        reportKind: 'official-grading-period',
        seasonPhase: 'after-first-six-weeks',
        periodEndDate: '2026-02-29',
      }).contest,
    ).toBe('insufficient-context');
    expect(
      validateAcademicEligibility(RULE_SET, {
        ...timing,
        reportKind: 'official-grading-period',
        seasonPhase: 'after-first-six-weeks',
        contestDate: '2026-10-08',
      }).contest,
    ).toBe('insufficient-context');
  });

  it('does not infer official eligibility from GPA without period and timing context', () => {
    expect(
      validateAcademicEligibility(RULE_SET, { overallGpa: '1.9' }),
    ).toMatchObject({
      contest: 'insufficient-context',
      practice: 'practice-allowed',
    });
  });

  it('accepts 90 weekly full-contact minutes and rejects more than 90', () => {
    expect(validateWeeklyFullContactMinutes(RULE_SET, 90).status).toBe(
      'within-limit',
    );
    expect(validateWeeklyFullContactMinutes(RULE_SET, 91).status).toBe(
      'over-limit',
    );
  });

  it('enforces the game-day video/data surface boundary', () => {
    for (const surface of ['sideline', 'team-area'] as const) {
      expect(validateGameDayVideoDataSurface(RULE_SET, surface).status).toBe(
        'rejected',
      );
    }
    for (const surface of [
      'coaching-booth',
      'locker-room',
      'printable',
      'rehearsal',
    ] as const) {
      expect(validateGameDayVideoDataSurface(RULE_SET, surface).status).toBe(
        'allowed',
      );
    }
  });

  it('resolves source provenance without assigning unstated source dates', () => {
    for (const source of RULE_SET.sources) {
      expect(resolveJurisdictionSource(RULE_SET, source.id)).toEqual(
        expect.objectContaining({
          issuer: expect.any(String),
          title: expect.any(String),
          url: expect.stringMatching(/^https:\/\//),
          publishedDate: null,
          retrievedDate: null,
        }),
      );
    }
    expect(
      resolveJurisdictionSource(RULE_SET, RULE_SET.effectiveDateSourceId),
    ).toMatchObject({ effectiveDate: RULE_SET.effectiveDate });
    expect(
      RULE_SET.sources.filter((source) => source.effectiveDate !== null),
    ).toHaveLength(1);
  });

  it('attaches the selected Texas UIL 2026-27 snapshot and labels local facts', () => {
    expect(WEEK_8_SCENARIO.jurisdictionRuleSet).toMatchObject({
      jurisdiction: 'Texas',
      issuer: 'UIL',
      season: '2026-27',
      effectiveDate: '2026-08-01',
    });
    expect(RULE_SET.scenarioAuthorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'kowalski-academic-restriction',
          classification: 'fictional-local-policy',
          issuer: 'Guidance Office',
        }),
        expect.objectContaining({
          id: 'mccoy-medical-restriction',
          classification: 'scenario-authority',
          issuer: 'Athletic Trainer',
        }),
        expect.objectContaining({
          id: 'tuesday-contact-window',
          classification: 'scenario-authority',
        }),
      ]),
    );
  });
});
