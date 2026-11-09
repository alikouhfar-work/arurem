import { useCallback, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY, isTheme, resolveTheme } from '@/shared/lib/theme';
import type { ResolvedTheme, Theme } from '@/types/ui';

/**
 * Theme engine. Kept separate from the toggle component so the component file
 * exports only components (React Fast Refresh) and the logic stays testable.
 *
 * Three states: system / light / dark. `setTheme('system')` remains available
 * for a settings screen.
 *
 * First paint is handled by the blocking script in index.html, not by this
 * hook — an effect runs after the browser has already painted, so applying the
 * class here alone causes a light flash on every refresh. This hook only
 * reconciles React state with what that script already did. The storage key
 * and the dark-mode rule live in `shared/lib/theme.ts`, which the boot test
 * asserts against the inline script.
 */

const readStored = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  // An unrecognised value resolves identically to 'system' in both this hook
  // and the boot script, so returning it here keeps the two in agreement.
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : 'system';
};

const systemPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track the OS preference unconditionally. Subscribing only while
  // `theme === 'system'` leaves the toggle showing a stale icon after the user
  // flips their OS setting and switches back to system.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme = resolveTheme(theme, systemDark);

  const apply = useCallback((value: ResolvedTheme) => {
    const root = document.documentElement;
    root.classList.toggle('dark', value === 'dark');
    root.style.colorScheme = value;
  }, []);

  // Reconcile the DOM with state. On first mount this is a no-op because the
  // boot script already set the same class.
  useEffect(() => {
    apply(resolved);
  }, [apply, resolved]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(resolved === 'dark' ? 'light' : 'dark');

  return { theme, resolved, setTheme, toggle };
};
