/**
 * Clone @arc-sim/core into vendor/ when the sibling checkout is missing.
 *
 * Local and GitHub Actions use ../arc-sim. Vercel only sees this repo, so the
 * production build clones the pinned engine source before `vite build`.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pinned to the sibling checkout used when Week 9 Friday was wired. */
export const ARC_SIM_REF = 'f787a5e676125300356e5772d76cbfb1cde84d7d';
export const ARC_SIM_REPO = 'https://github.com/andysolomon/arc-sim.git';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siblingEntry = path.join(root, '..', 'arc-sim', 'src', 'index.ts');
const vendorDir = path.join(root, 'vendor', 'arc-sim');
const vendorEntry = path.join(vendorDir, 'src', 'index.ts');

if (existsSync(siblingEntry) || existsSync(vendorEntry)) {
  process.exit(0);
}

const clone = spawnSync(
  'git',
  ['clone', '--depth', '1', ARC_SIM_REPO, vendorDir],
  { stdio: 'inherit' },
);
if (clone.status !== 0) {
  process.exit(clone.status ?? 1);
}

const head = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: vendorDir,
  encoding: 'utf8',
});
if (head.status !== 0) {
  process.exit(head.status ?? 1);
}

if (head.stdout.trim() !== ARC_SIM_REF) {
  const fetch = spawnSync(
    'git',
    ['fetch', '--depth', '1', 'origin', ARC_SIM_REF],
    { cwd: vendorDir, stdio: 'inherit' },
  );
  if (fetch.status !== 0) {
    process.exit(fetch.status ?? 1);
  }
  const checkout = spawnSync('git', ['checkout', '--detach', ARC_SIM_REF], {
    cwd: vendorDir,
    stdio: 'inherit',
  });
  if (checkout.status !== 0) {
    process.exit(checkout.status ?? 1);
  }
}

if (!existsSync(vendorEntry)) {
  console.error('arc-sim clone did not contain src/index.ts');
  process.exit(1);
}
