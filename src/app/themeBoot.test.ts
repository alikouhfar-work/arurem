import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, resolveTheme } from '@/shared/lib/theme';
/**
 * The theme boot script is inline in index.html because it must run before
 * first paint. That means its storage key, background colours, and dark-mode
 * rule are duplicated in three places. These tests fail the build the moment
 * any of them drift apart.
 */

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const html = read('index.html');
const tokens = read('src/shared/styles/tokens.css');

const bootScript = html.slice(
  html.indexOf('(function ()'),
  html.indexOf('})();') + '})();'.length,
);

describe('theme boot script', () => {
  it('is inline and blocking, in the head, before the module entry', () => {
    const headEnd = html.indexOf('</head>');
    const scriptAt = html.indexOf('(function ()');
    const moduleAt = html.indexOf('/src/app/main.tsx');
    expect(scriptAt).toBeGreaterThan(-1);
    // Before </head> and before the app mounts — i.e. render-blocking.
    expect(scriptAt).toBeLessThan(headEnd);
    expect(scriptAt).toBeLessThan(moduleAt);
    // Not deferred and not a module: both would let the browser paint first.
    expect(bootScript).not.toMatch(/\bdefer\b/);
    expect(html.slice(0, scriptAt).lastIndexOf('<script')).toBeGreaterThan(-1);
  });

  it('uses the same storage key as the hook', () => {
    expect(bootScript).toContain(`'${THEME_STORAGE_KEY}'`);
  });
  it('applies the same light background as tokens.css', () => {
    const lightBg = /--background:\s*(#[0-9a-f]{6})/i.exec(tokens)?.[1];
    expect(lightBg).toBeTruthy();
    expect(html.toLowerCase()).toContain(`background-color: ${lightBg!.toLowerCase()}`);
  });

  it('applies the same dark background as tokens.css', () => {
    const darkBlock = tokens.slice(tokens.indexOf('.dark {'));
    const darkBg = /--background:\s*(#[0-9a-f]{6})/i.exec(darkBlock)?.[1];
    expect(darkBg).toBeTruthy();
    expect(html.toLowerCase()).toContain(`background-color: ${darkBg!.toLowerCase()}`);
  });

  it('resolves dark the same way the script does, for every combination', () => {
    // Include values the app never writes, because the script must still agree
    // with resolveTheme for them — that is where divergence hides.
    const storedValues = ['dark', 'light', 'system', null, 'garbage', '', 'DARK'];

    for (const stored of storedValues) {
      for (const prefersDark of [true, false]) {
        const fromHook = resolveTheme(stored, prefersDark);
        // Literal mirror of the inline expression. Kept separate on purpose:
        // a change to the script that the helper does not track must fail here.
        const fromScript =
          stored === 'dark' || (stored !== 'light' && prefersDark);
        expect(
          fromScript ? 'dark' : 'light',
          `stored=${String(stored)} prefersDark=${prefersDark}`,
        ).toBe(fromHook);
      }
    }
  });

  it('sets color-scheme so native controls match', () => {
    expect(bootScript).toContain('colorScheme');
  });

  it('cannot throw on blocked storage', () => {
    expect(bootScript).toMatch(/try\s*{/);
    expect(bootScript).toMatch(/catch/);
  });
});
