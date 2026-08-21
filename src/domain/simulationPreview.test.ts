import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PREVIEW_NOTICE, PRODUCTION_PREVIEW_URL } from './simulationPreview.ts';

describe('preview ship notice', () => {
  it('names the production host and preview bar in the root README', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain(PREVIEW_NOTICE);
    expect(readme).toContain(PRODUCTION_PREVIEW_URL);
  });
});
