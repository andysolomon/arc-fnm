import { describe, expect, it } from 'vitest';

import {
  DIALOG_FOCUSABLE_SELECTOR,
  queryDialogFocusable,
  trapTabInside,
} from './dialogFocus.ts';

describe('dialog focus trap (A11Y-3)', () => {
  it('includes links, fields, and tabindex nodes, and skips disabled or hidden', () => {
    const root = document.createElement('div');
    const first = document.createElement('button');
    first.textContent = 'First';
    const link = document.createElement('a');
    link.href = '#film';
    link.textContent = 'Link';
    const field = document.createElement('input');
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    const disabled = document.createElement('button');
    disabled.disabled = true;
    disabled.textContent = 'Skip';
    const extra = document.createElement('span');
    extra.tabIndex = 0;
    extra.textContent = 'Tabindex';
    root.append(first, link, field, hidden, disabled, extra);

    expect(DIALOG_FOCUSABLE_SELECTOR).toContain('a[href]');
    expect(DIALOG_FOCUSABLE_SELECTOR).toContain('input:not([disabled])');
    expect(queryDialogFocusable(root).map((el) => el.tagName)).toEqual([
      'BUTTON',
      'A',
      'INPUT',
      'SPAN',
    ]);
  });

  it('wraps Tab from a non-button last control back to the first', () => {
    const root = document.createElement('div');
    const first = document.createElement('button');
    first.textContent = 'First';
    const last = document.createElement('a');
    last.href = '#end';
    last.textContent = 'Last';
    root.append(first, last);
    document.body.append(root);
    last.focus();

    trapTabInside({
      key: 'Tab',
      shiftKey: false,
      preventDefault() {},
      currentTarget: root,
    });
    expect(first).toHaveFocus();

    trapTabInside({
      key: 'Tab',
      shiftKey: true,
      preventDefault() {},
      currentTarget: root,
    });
    expect(last).toHaveFocus();
    root.remove();
  });
});
