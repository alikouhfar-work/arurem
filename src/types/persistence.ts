import type { Purchase } from './purchase';

/** Data-safety contracts: persistent storage, local snapshots, backup nudging. */

export type PersistenceStatus = 'unknown' | 'granted' | 'denied' | 'unsupported';

export type BackupSnapshot = {
  id: string;
  savedAt: string;
  entryCount: number;
  purchases: Purchase[];
};

/** A snapshot without its payload — what a listing needs to show. */
export type BackupSnapshotMeta = Omit<BackupSnapshot, 'purchases'>;

/** Bookkeeping that lives beside the ledger, never inside it. */
export type SafetyMeta = {
  lastExportedAt: string | null;
  nudgeDismissedAt: string | null;
};

export type NudgeReason = 'never-exported' | 'overdue';

export type CaptureSnapshotOptions = {
  /** Skips the interval guard, e.g. for a deliberate pre-import snapshot. */
  force?: boolean;
  now?: string;
};

export type ExportNudge = {
  reason: NudgeReason;
  entryCount: number;
  lastExportedAt: string | null;
};

export type UseDataSafetyOptions = {
  purchases: readonly Purchase[];
};

export type UseDataSafetyResult = {
  persistence: PersistenceStatus;
  lastSnapshotAt: string | null;
  lastExportedAt: string | null;
  nudge: ExportNudge | null;
  markExported: () => void;
  dismissNudge: () => void;
};
