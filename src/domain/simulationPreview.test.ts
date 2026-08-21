import { describe, expect, it } from 'vitest';

import readme from '../../README.md?raw';
import { PREVIEW_NOTICE, PRODUCTION_PREVIEW_URL } from './simulationPreview.ts';

describe('preview ship notice', () => {
  it('names the production host and preview bar in the root README', () => {
    expect(readme).toContain(PREVIEW_NOTICE);
    expect(readme).toContain(PRODUCTION_PREVIEW_URL);
  });
});
