import type { SafetyMeta } from '@/types/persistence';

/**
 * Export bookkeeping.
 *
 * Kept out of the ledger envelope on purpose: these are facts about the user's
 * backup habits, not about their gold. A corrupt or absent meta record must
 * never affect whether the ledger loads, so every read is defensive and every
 * write failure is swallowed — losing the bookkeeping is survivable, blocking an
 * export because of it is not.
 */

const META_KEY = 'arurem.safety.v1';

const emptyMeta = (): SafetyMeta => ({ lastExportedAt: null, nudgeDismissedAt: null });

const asIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const loadSafetyMeta = (): SafetyMeta => {
  if (typeof window === 'undefined') return emptyMeta();

  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return emptyMeta();

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyMeta();

    return {
      lastExportedAt: asIsoOrNull(parsed.lastExportedAt),
      nudgeDismissedAt: asIsoOrNull(parsed.nudgeDismissedAt),
    };
  } catch {
    return emptyMeta();
  }
};

export const persistSafetyMeta = (meta: SafetyMeta): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // See above: never let bookkeeping block the action it describes.
  }
};

export { META_KEY };
