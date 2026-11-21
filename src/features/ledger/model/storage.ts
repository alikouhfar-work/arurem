import { readLatestSnapshot } from './snapshots';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';
import type { BackupSnapshot } from '@/types/persistence';
import type { LoadResult, StorageEnvelope } from '@/types/storage';

const STORAGE_KEY = 'arurem.ledger.v2';
const LEGACY_KEY = 'aureum_gold_tracker_data';
const SCHEMA_VERSION = 3;

/**
 * Storage boundary. Deliberately the only module that knows about
 * localStorage, so swapping in an HTTP/IndexedDB adapter later is a one-file
 * change. Every read is defensive: corrupt or partial data must never take
 * the whole app down.
 *
 * Wallets live inside the same envelope as the entries, not in a key of their
 * own. They are one dataset — an entry's `walletId` is meaningless without the
 * wallet it points at — so a single write keeps them consistent, and an import
 * or snapshot cannot restore one without the other.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asIso = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return fallback;
};

const asOptionalIso = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

/**
 * Normalises one row from any historical shape into the current model.
 * Legacy rows stored `createdAt` as a Date (serialised to a string) and had no
 * `acquiredAt`, so `createdAt` backfills it.
 */
const migrateRow = (raw: unknown): Purchase | null => {
  if (!isRecord(raw)) return null;

  const sellerName = typeof raw.sellerName === 'string' ? raw.sellerName.trim() : '';
  const weight = typeof raw.weight === 'number' ? raw.weight : Number(raw.weight);
  if (!sellerName || !Number.isFinite(weight) || weight <= 0) return null;

  const purity =
    raw.purity === '24K' || raw.purity === '22K' || raw.purity === '18K' || raw.purity === 'Bullion'
      ? raw.purity
      : '18K';
  const createdAt = asIso(raw.createdAt, new Date().toISOString());
  const acquiredAt = asIso(raw.acquiredAt, createdAt);
  const updatedAt = raw.updatedAt ? asIso(raw.updatedAt, createdAt) : undefined;
  const walletId = typeof raw.walletId === 'string' && raw.walletId.trim() ? raw.walletId : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    sellerName,
    weight,
    purity,
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
    acquiredAt,
    createdAt,
    ...(walletId ? { walletId } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
};

const migrateWallet = (raw: unknown): Wallet | null => {
  if (!isRecord(raw)) return null;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const createdAt = asIso(raw.createdAt, new Date().toISOString());
  const updatedAt = asOptionalIso(raw.updatedAt);
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    name,
    ...(note ? { note } : {}),
    createdAt,
    ...(updatedAt ? { updatedAt } : {}),
  };
};

const rawRows = (raw: unknown): unknown[] =>
  Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.purchases)
      ? raw.purchases
      : [];

const rawWallets = (raw: unknown): unknown[] =>
  isRecord(raw) && Array.isArray(raw.wallets) ? raw.wallets : [];

const parseRows = (raw: unknown): Purchase[] =>
  rawRows(raw).map(migrateRow).filter((row): row is Purchase => row !== null);

const parseWallets = (raw: unknown): Wallet[] =>
  rawWallets(raw).map(migrateWallet).filter((row): row is Wallet => row !== null);

/**
 * An entry may only point at a wallet that exists. A link to a deleted or
 * never-restored wallet cannot be honoured — the entry would be visible in a
 * wallet that is not there — so the stale link is dropped and the entry shows
 * as unassigned. The entry itself is never touched.
 */
const dropDanglingLinks = (purchases: Purchase[], wallets: Wallet[]): Purchase[] => {
  const known = new Set(wallets.map((wallet) => wallet.id));
  return purchases.map((purchase) =>
    purchase.walletId && !known.has(purchase.walletId)
      ? { ...purchase, walletId: undefined }
      : purchase,
  );
};

/**
 * A payload that had rows but yielded none is as unreadable as broken JSON —
 * the user does not care which. Both paths offer the newest snapshot.
 */
const offerRecovery = (): BackupSnapshot | null => readLatestSnapshot();

export const loadLedger = (): LoadResult => {
  if (typeof window === 'undefined') {
    return {
      purchases: [],
      wallets: [],
      migrated: false,
      recoveredFromCorruption: false,
      recovery: null,
    };
  }

  let recoveredFromCorruption = false;

  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed: unknown = JSON.parse(current);
      const envelope = isRecord(parsed) ? (parsed as Partial<StorageEnvelope>) : {};
      const wallets = parseWallets(envelope);
      const purchases = dropDanglingLinks(parseRows(envelope.purchases), wallets);
      const lostEverything = purchases.length === 0 && rawRows(envelope.purchases).length > 0;

      return {
        purchases,
        wallets,
        migrated: false,
        recoveredFromCorruption: lostEverything,
        recovery: lostEverything ? offerRecovery() : null,
      };
    }
  } catch {
    recoveredFromCorruption = true;
  }

  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) {
      return {
        purchases: [],
        wallets: [],
        migrated: false,
        recoveredFromCorruption,
        recovery: recoveredFromCorruption ? offerRecovery() : null,
      };
    }

    const parsed: unknown = JSON.parse(legacy);
    const wallets = parseWallets(parsed);
    const purchases = dropDanglingLinks(parseRows(parsed), wallets);
    if (purchases.length > 0) persistLedger(purchases, wallets);
    return {
      purchases,
      wallets,
      migrated: purchases.length > 0,
      recoveredFromCorruption,
      recovery: recoveredFromCorruption ? offerRecovery() : null,
    };
  } catch {
    return {
      purchases: [],
      wallets: [],
      migrated: false,
      recoveredFromCorruption: true,
      recovery: offerRecovery(),
    };
  }
};

export const persistLedger = (purchases: Purchase[], wallets: Wallet[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const envelope: StorageEnvelope = { version: SCHEMA_VERSION, purchases, wallets };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    // Quota failures must surface to the caller — silently losing writes in a
    // *ledger* is the worst possible failure mode.
    throw new Error('Could not save to local storage. Your browser may be out of space.', {
      cause: error,
    });
  }
};

export { STORAGE_KEY, LEGACY_KEY, SCHEMA_VERSION };
