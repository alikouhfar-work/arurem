import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Enforces the file-naming convention as part of the normal test run, so a
 * `ledger-row.tsx` or `AppShell-helpers.ts` cannot land.
 *
 * The check itself lives in scripts/checkFileNaming.ts and prints the specific
 * violations; this wrapper just surfaces them as a failing test.
 */
describe('file naming convention', () => {
  it('uses PascalCase for components and camelCase for everything else', () => {
    const root = resolve(import.meta.dirname, '../..');

    try {
      const output = execFileSync('bun', ['scripts/checkFileNaming.ts'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(output).toContain('file naming');
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; message?: string };
      const details = `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`;
      expect.fail(`File-naming violations:\n${details}`);
    }
  });
});
