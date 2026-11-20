/**
 * Data-safety thresholds, defined once.
 *
 * The nudge decision (model/exportNudge.ts) and the copy that explains it read
 * the same numbers, so the UI cannot promise a cadence the logic does not keep.
 */

/** Entries that may exist before the first backup is asked for. */
export const FIRST_BACKUP_THRESHOLD = 5;

/** How long an export, or a dismissal, is considered current. */
export const BACKUP_INTERVAL_DAYS = 30;

/** How many local snapshots are kept. Five covers a corrupt write plus history. */
export const SNAPSHOT_RETENTION = 5;

/**
 * Minimum gap between snapshots. Without it every keystroke-level commit would
 * overwrite the retention ring and the "previous state" would be minutes old at
 * best — the ring is meant to outlive a bad write, not mirror the last save.
 */
export const SNAPSHOT_MIN_INTERVAL_MS = 10 * 60 * 1000;
