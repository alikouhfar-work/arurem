import type { Purchase } from './purchase';

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
};
