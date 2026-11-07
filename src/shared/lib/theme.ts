import type { ResolvedTheme, Theme } from '@/types/ui';

/**
 * Theme resolution, shared by the hook and the boot-script test.
 *
 * The inline script in index.html reimplements this in ES5 (it must run before
 * any module loads). Keeping the rule here — and asserting the two agree for
 * every stored/preference combination — is what stops them drifting.
 */

export const THEME_STORAGE_KEY = 'arurem.theme';

export const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

export const resolveTheme = (stored: string | null, prefersDark: boolean): ResolvedTheme => {
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  // Unset and 'system' both defer to the OS. An unrecognised value is treated
  // as unset rather than as a hard error.
  return prefersDark ? 'dark' : 'light';
};
