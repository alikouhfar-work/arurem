import type { Purchase } from '@/types/purchase';
import type { LoadResult, StorageEnvelope } from '@/types/storage';

const STORAGE_KEY = 'arurem.ledger.v2';
const LEGACY_KEY = 'aureum_gold_tracker_data';
const SCHEMA_VERSION = 2;

/**
 * Storage boundary. Deliberately the only module that knows about
 * localStorage, so swapping in an HTTP/IndexedDB adapter later is a one-file
 * change. Every read is defensive: corrupt or partial data must never take
 * the whole app down.
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

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    sellerName,
    weight,
    purity,
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
    acquiredAt,
    createdAt,
    ...(updatedAt ? { updatedAt } : {}),
  };
};

const parseRows = (raw: unknown): Purchase[] => {
  const rows = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.purchases)
      ? raw.purchases
      : [];
  return rows.map(migrateRow).filter((row): row is Purchase => row !== null);
};

export const loadPurchases = (): LoadResult => {
  if (typeof window === 'undefined') {
    return { purchases: [], migrated: false, recoveredFromCorruption: false };
  }

  let recoveredFromCorruption = false;

  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed: unknown = JSON.parse(current);
      const envelope = isRecord(parsed) ? (parsed as Partial<StorageEnvelope>) : {};
      return {
        purchases: parseRows(envelope.purchases),
        migrated: false,
        recoveredFromCorruption: false,
      };
    }
  } catch {
    recoveredFromCorruption = true;
  }

  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return { purchases: [], migrated: false, recoveredFromCorruption };

    const parsed: unknown = JSON.parse(legacy);
    const purchases = parseRows(parsed);
    if (purchases.length > 0) persistPurchases(purchases);
    return { purchases, migrated: purchases.length > 0, recoveredFromCorruption };
  } catch {
    return { purchases: [], migrated: false, recoveredFromCorruption: true };
  }
};

export const persistPurchases = (purchases: Purchase[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const envelope: StorageEnvelope = { version: SCHEMA_VERSION, purchases };
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