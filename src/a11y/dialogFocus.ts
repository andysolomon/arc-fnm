/**
 * Focusable controls inside a modal dialog (A11Y-3).
 *
 * The nav drawer is buttons-only today. The trap still has to see links,
 * fields, and tabindex nodes so a later control cannot Tab out silently.
 * `aria-disabled` buttons stay in the set (A11Y-2).
 */
export const DIALOG_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function queryDialogFocusable(container: ParentNode): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR),
  );
}

export function trapTabInside(event: {
  readonly key: string;
  readonly shiftKey: boolean;
  preventDefault: () => void;
  currentTarget: EventTarget | null;
}): void {
  if (event.key !== 'Tab') return;
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const focusable = queryDialogFocusable(root);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
