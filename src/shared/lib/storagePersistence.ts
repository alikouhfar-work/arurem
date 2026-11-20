import type { PersistenceStatus } from '@/types/persistence';

/**
 * Persistent-storage request.
 *
 * `navigator.storage.persist()` asks the browser to exempt this origin from
 * eviction under storage pressure. It is the cheapest protection available for
 * a ledger that exists only in this browser — and the only one that needs no
 * network, no account, and no permission prompt in Chromium.
 *
 * Outcomes differ by engine and are reported honestly rather than assumed:
 * Chromium decides from engagement heuristics, Firefox grants on user
 * interaction, Safari does not implement the API at all.
 */

const getStorage = (): StorageManager | null => {
  if (typeof navigator === 'undefined') return null;
  return navigator.storage ?? null;
};

export const requestPersistentStorage = async (): Promise<PersistenceStatus> => {
  const storage = getStorage();
  if (!storage || typeof storage.persist !== 'function') return 'unsupported';

  try {
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
};

/** Reads the current grant without prompting. */
export const readPersistentStorage = async (): Promise<PersistenceStatus> => {
  const storage = getStorage();
  if (!storage || typeof storage.persisted !== 'function') return 'unsupported';

  try {
    return (await storage.persisted()) ? 'granted' : 'unknown';
  } catch {
    return 'unknown';
  }
};
