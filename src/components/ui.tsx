/**
 * Reusable semantic primitives, transcribed from the prototype's Design System
 * patterns. Real buttons, real headings, real lists — status color is always
 * paired with a text label so it never carries meaning alone.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type StatusTone =
  'neutral' | 'accent' | 'risk' | 'good' | 'danger' | 'hold';

const DOT_TONE: Record<StatusTone, string> = {
  neutral: 'bg-hairline',
  accent: 'bg-accent',
  risk: 'bg-risk',
  good: 'bg-good',
  danger: 'bg-danger',
  hold: 'bg-hold',
};

/**
 * A status dot. Decorative by design — the adjacent text carries the meaning,
 * so this is hidden from assistive technology.
 */
export function StatusDot({ tone = 'neutral' }: { tone?: StatusTone }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-[7px] shrink-0 rounded-full ${DOT_TONE[tone]}`}
    />
  );
}

export function Card({
  children,
  className = '',
  as: Element = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
} & { 'aria-labelledby'?: string }) {
  return (
    <Element
      className={`edge-raised bg-surface rounded-[12px] p-5 ${className}`}
      {...rest}
    >
      {children}
    </Element>
  );
}

export function Kicker({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  const color = tone === 'accent' ? 'text-accent' : 'text-ink-subtle';
  return (
    <span
      className={`font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase ${color}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'blocker';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-[#383838]',
  secondary: 'edge bg-surface text-ink-muted hover:bg-surface-raised',
  quiet: 'bg-transparent text-ink-subtle hover:text-ink',
  blocker: 'bg-danger text-white hover:brightness-95',
};

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: { variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`disabled:bg-surface-raised disabled:text-ink-faint inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-[15px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:shadow-none ${BUTTON_VARIANT[variant]} ${className}`}
      {...rest}
    />
  );
}

/** A pill used for tabs and filters. `pressed` maps to aria-pressed. */
export function PillButton({
  pressed,
  className = '',
  ...rest
}: { pressed: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-full px-3 text-[12.5px] font-medium transition-colors ${
        pressed
          ? 'bg-ink text-white'
          : 'edge bg-surface text-ink-muted hover:text-ink'
      } ${className}`}
      {...rest}
    />
  );
}

/** A labelled status chip. The label is the meaning; the dot is reinforcement. */
export function StatusChip({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span className="edge bg-surface text-ink-muted inline-flex items-center gap-2 rounded-full px-3 py-[5px] text-[11.5px] font-medium">
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

export function ScreenHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="min-w-0">
      <h1
        id={id}
        className="text-ink m-0 text-[16px] font-semibold tracking-[-0.32px]"
      >
        {title}
      </h1>
      {subtitle !== undefined && (
        <p className="text-ink-subtle mt-1 mb-0 text-[12.5px] text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Metadata pair used across evidence and scenario summaries. */
export function DataPoint({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-subtle font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className="text-ink mt-1 ml-0 text-[13px]">{value}</dd>
    </div>
  );
}
