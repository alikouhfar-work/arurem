import { SNAPSHOT_MIN_INTERVAL_MS, SNAPSHOT_RETENTION } from '@/constants/safety';
import type { BackupSnapshot, BackupSnapshotMeta, CaptureSnapshotOptions } from '@/types/persistence';
import type { Purchase } from '@/types/purchase';

/**
 * Rotating local snapshots.
 *
 * The current ledger is a single localStorage key: one bad write, one quota
 * truncation, or one corrupt serialisation destroys it. Snapshots keep the last
 * N states beside it, so the worst case becomes "lose ten minutes" instead of
 * "lose everything".
 *
 * Snapshots are not backups — they share an origin with the thing they protect,
 * so clearing site data removes both. The export nudge exists precisely because
 * this ring cannot leave the device.
 */

const SNAPSHOTS_KEY = 'arurem.snapshots.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSnapshot = (value: unknown): value is BackupSnapshot => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.savedAt === 'string' &&
    !Number.isNaN(Date.parse(value.savedAt)) &&
    typeof value.entryCount === 'number' &&
    Array.isArray(value.purchases) &&
    (value.wallets === undefined || Array.isArray(value.wallets))
  );
};

/** Snapshots are best-effort: an unreadable ring yields an empty one, never a throw. */
export const readSnapshots = (): BackupSnapshot[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    const rows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.snapshots)
        ? parsed.snapshots
        : [];

    return rows.filter(isSnapshot).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
};

/** A snapshot without its payload — what a listing needs to show. */
const strip = (snapshot: BackupSnapshot): BackupSnapshotMeta => ({
  id: snapshot.id,
  savedAt: snapshot.savedAt,
  entryCount: snapshot.entryCount,
});

export const readSnapshotMeta = (): BackupSnapshotMeta[] => readSnapshots().map(strip);

export const readLatestSnapshot = (): BackupSnapshot | null => readSnapshots()[0] ?? null;

const writeSnapshots = (snapshots: readonly BackupSnapshot[]): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      SNAPSHOTS_KEY,
      JSON.stringify({ version: 1, snapshots: [...snapshots] }),
    );
  } catch {
    // A snapshot that cannot be written must not fail the ledger write that
    // triggered it. Losing a snapshot is annoying; blocking a save is not.
  }
};

/**
 * The ring is an external store, so the UI subscribes to it instead of copying
 * its state into React. `getStamp` must return a value React can compare by
 * identity — a string — and must not re-parse the ring on every render, which
 * is what the cache below exists for. It is invalidated by our own writes and
 * by a `storage` event from another tab.
 */
let cachedStamp: string | null = null;
let hasCache = false;

const invalidate = (): void => {
  hasCache = false;
};

const listeners = new Set<() => void>();

const notify = (): void => {
  invalidate();
  for (const listener of listeners) listener();
};

export const subscribeSnapshots = (listener: () => void): (() => void) => {
  listeners.add(listener);

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== SNAPSHOTS_KEY) return;
    invalidate();
    listener();
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const getSnapshotStamp = (): string | null => {
  if (!hasCache) {
    cachedStamp = readSnapshots()[0]?.savedAt ?? null;
    hasCache = true;
  }
  return cachedStamp;
};

/** Drops every snapshot. Used once a recovered snapshot has been restored. */
export const clearSnapshots = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SNAPSHOTS_KEY);
  } catch {
    // Nothing actionable: the ring is disposable by design.
  }
  notify();
};

/**
 * Records the CURRENT state, but only when it differs from the newest snapshot
 * and the minimum interval has passed. Returns the ring as written.
 *
 * Wallets are captured with the entries: restoring an entry whose wallet is not
 * in the same snapshot would leave it unassigned, which is a different ledger
 * than the one that was saved.
 */
export const captureSnapshot = (
  purchases: readonly Purchase[],
  { wallets = [], force = false, now = new Date().toISOString() }: CaptureSnapshotOptions = {},
): BackupSnapshot[] => {
  const existing = readSnapshots();
  const newest = existing[0];

  if (newest && !force) {
    const elapsed = Date.parse(now) - Date.parse(newest.savedAt);
    if (elapsed < SNAPSHOT_MIN_INTERVAL_MS) return existing;

    const unchanged =
      newest.purchases.length === purchases.length &&
      JSON.stringify(newest.purchases) === JSON.stringify(purchases) &&
      JSON.stringify(newest.wallets ?? []) === JSON.stringify(wallets);
    if (unchanged) return existing;
  }

  const snapshot: BackupSnapshot = {
    id: `snap-${Date.parse(now)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: now,
    entryCount: purchases.length,
    purchases: [...purchases],
    wallets: [...wallets],
  };

  const next = [snapshot, ...existing].slice(0, SNAPSHOT_RETENTION);
  writeSnapshots(next);
  notify();

  return next;
};

export { SNAPSHOTS_KEY };
