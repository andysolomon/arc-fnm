export type CareerStartTier = 'phone' | 'compact' | 'tablet' | 'wide';

export interface CareerStartResponsiveFields {
  readonly barPadding: string;
  readonly shellPadding: string;
  readonly newsPadding: string;
  readonly newsInnerX: string;
  readonly heroSize: number;
  readonly pageTitleSize: number;
  readonly menuColumns: string;
  readonly journeyColumns: string;
  readonly profileColumns: string;
  readonly wizardColumns: string;
  readonly teamColumns: string;
  readonly setupColumns: string;
  readonly schoolColumns: number;
  readonly presetColumns: number;
  readonly fieldColumns: number;
  readonly stickySummary: boolean;
  readonly showChrome: boolean;
}

/** Exact responsive values from the canonical 390 / 768 / 1024 / 1440 prototype tiers. */
export function careerStartResponsiveFields(
  viewportWidth: number,
): CareerStartResponsiveFields & { readonly tier: CareerStartTier } {
  const tier: CareerStartTier =
    viewportWidth < 768
      ? 'phone'
      : viewportWidth < 1024
        ? 'compact'
        : viewportWidth < 1440
          ? 'tablet'
          : 'wide';
  const phone = tier === 'phone';
  const compact = tier === 'compact';
  const narrow = phone || compact;
  return {
    tier,
    barPadding: phone ? '0 12px' : '0 24px',
    shellPadding: phone
      ? '28px 14px 48px 14px'
      : compact
        ? '36px 18px 56px 18px'
        : '48px 24px 64px 24px',
    newsPadding: phone
      ? '20px 14px 48px 14px'
      : compact
        ? '26px 18px 56px 18px'
        : '32px 24px 64px 24px',
    newsInnerX: phone ? '18px' : '28px',
    heroSize: phone ? 32 : compact ? 40 : 48,
    pageTitleSize: phone ? 24 : compact ? 28 : 32,
    menuColumns: narrow ? '1fr' : '1.4fr 1fr',
    journeyColumns: phone ? '1fr' : compact ? '1fr 1fr' : '1fr 1fr 1fr',
    profileColumns: narrow ? '1fr' : '1fr 1.1fr',
    wizardColumns: narrow
      ? '1fr'
      : tier === 'tablet'
        ? '1fr 280px'
        : '1fr 320px',
    teamColumns: narrow ? '1fr' : tier === 'tablet' ? '300px 1fr' : '340px 1fr',
    setupColumns: narrow ? '1fr' : '1.5fr 1fr',
    schoolColumns: phone ? 2 : compact ? 3 : 4,
    presetColumns: phone ? 2 : 3,
    fieldColumns: phone ? 1 : 2,
    stickySummary: !narrow,
    showChrome: !phone,
  };
}
