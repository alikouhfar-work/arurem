import type { Purchase } from './purchase';
import type { BackupSnapshot } from './persistence';

/** Persistence boundary contracts. */

export type StorageEnvelope = {
  version: number;
  purchases: Purchase[];
};

export type LoadResult = {
  purchases: Purchase[];
  /** True when a legacy payload was found and converted. Surfaced for tests. */
  migrated: boolean;
  /** True when the stored payload existed but was unreadable. */
  recoveredFromCorruption: boolean;
  /**
   * The newest local snapshot, offered when the live payload could not be read
   * or read back empty. Never applied automatically: silently replacing the
   * user's ledger with an older copy is its own kind of data loss.
   */
  recovery: BackupSnapshot | null;
};
