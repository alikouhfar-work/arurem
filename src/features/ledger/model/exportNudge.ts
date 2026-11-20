import { BACKUP_INTERVAL_DAYS, FIRST_BACKUP_THRESHOLD } from '@/constants/safety';
import type { ExportNudge, SafetyMeta } from '@/types/persistence';

/**
 * When to ask for a backup, and when to stay quiet.
 *
 * Two triggers, both stated in the copy so the prompt is never a mystery:
 *
 *   never-exported  the ledger has grown past the threshold and has never left
 *                   this browser. The first backup is the only one that has to
 *                   be talked into happening.
 *   overdue         it has been longer than the interval since the last export.
 *
 * A dismissal silences the prompt for one interval. That is the whole cadence:
 * accurate, not nagging, and it never fires on an empty ledger.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const ageInDays = (from: string, now: string): number =>
  Math.floor((Date.parse(now) - Date.parse(from)) / DAY_MS);

const isDue = (stamp: string, now: string, intervalDays: number): boolean => {
  const parsed = Date.parse(stamp);
  // An unparseable stamp must not silence the prompt forever.
  if (Number.isNaN(parsed)) return true;
  return ageInDays(stamp, now) >= intervalDays;
};

export const getExportNudge = (
  entryCount: number,
  meta: SafetyMeta,
  now: string = new Date().toISOString(),
): ExportNudge | null => {
  if (entryCount === 0) return null;

  if (meta.nudgeDismissedAt && !isDue(meta.nudgeDismissedAt, now, BACKUP_INTERVAL_DAYS)) {
    return null;
  }

  if (!meta.lastExportedAt) {
    return entryCount >= FIRST_BACKUP_THRESHOLD
      ? { reason: 'never-exported', entryCount, lastExportedAt: null }
      : null;
  }

  if (!isDue(meta.lastExportedAt, now, BACKUP_INTERVAL_DAYS)) return null;

  return { reason: 'overdue', entryCount, lastExportedAt: meta.lastExportedAt };
};

export const daysSince = (stamp: string, now: string = new Date().toISOString()): number =>
  Math.max(0, ageInDays(stamp, now));
