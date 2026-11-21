import { purchaseSchema, PURITY_VALUES } from './purchase.schema';
import { walletSchema } from './wallet.schema';
import { NO_WALLET } from '@/constants/wallets';
import type { Purchase } from '@/types/purchase';
import type { Wallet } from '@/types/wallet';
import type { ExportPayload, ImportResult } from '@/types/backup';

/**
 * Backup import/export.
 *
 * The old importer accepted any JSON array and wrote it straight into state,
 * so one bad file could poison the ledger with rows missing ids and dates.
 * Import now validates every row, reports what it skipped, and returns a
 * normalised list.
 *
 * Wallets are exported beside the entries and restored together with them. An
 * import that carried entries but no wallets is legal — a v2 file — and those
 * entries simply arrive unassigned.
 */

export const buildExport = (
  purchases: readonly Purchase[],
  wallets: readonly Wallet[] = [],
): ExportPayload => ({
  format: 'arurem.backup',
  version: 3,
  exportedAt: new Date().toISOString(),
  purchases: [...purchases],
  wallets: [...wallets],
});

export const downloadExport = (
  purchases: readonly Purchase[],
  wallets: readonly Wallet[] = [],
  filename?: string,
): void => {
  const payload = buildExport(purchases, wallets);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename ?? `arurem-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const coerceRow = (raw: unknown): Purchase | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  const candidate = {
    id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
    sellerName: typeof record.sellerName === 'string' ? record.sellerName.trim() : '',
    weight: typeof record.weight === 'number' ? record.weight : Number(record.weight),
    purity: PURITY_VALUES.includes(record.purity as never) ? record.purity : '18K',
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : undefined,
    acquiredAt: typeof record.acquiredAt === 'string' ? record.acquiredAt : now,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    walletId:
      typeof record.walletId === 'string' && record.walletId.trim() && record.walletId !== NO_WALLET
        ? record.walletId
        : undefined,
  };

  const parsed = purchaseSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

const coerceWallet = (raw: unknown): Wallet | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  const candidate = {
    id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
    name: typeof record.name === 'string' ? record.name.trim() : '',
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };

  const parsed = walletSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

export const parseImport = (text: string): ImportResult => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'That file is not valid JSON.' };
  }

  let rows: unknown[] | null = null;
  let walletRows: unknown[] = [];

  if (Array.isArray(json)) {
    rows = json;
  } else if (typeof json === 'object' && json !== null) {
    const record = json as Record<string, unknown>;
    if (Array.isArray(record.purchases)) rows = record.purchases;
    if (Array.isArray(record.wallets)) walletRows = record.wallets;
  }

  if (!rows) {
    return { ok: false, reason: 'Expected an Arurem backup file with a "purchases" list.' };
  }

  const wallets = walletRows.map(coerceWallet).filter((row): row is Wallet => row !== null);
  const known = new Set(wallets.map((wallet) => wallet.id));

  // A restored entry may only point at a wallet that came back with it.
  const purchases = rows
    .map(coerceRow)
    .filter((row): row is Purchase => row !== null)
    .map((purchase) =>
      purchase.walletId && !known.has(purchase.walletId)
        ? { ...purchase, walletId: undefined }
        : purchase,
    );
  const skipped = rows.length - purchases.length;

  if (purchases.length === 0) {
    return { ok: false, reason: 'No valid entries were found in that file.' };
  }

  return { ok: true, purchases, wallets, skipped };
};

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsText(file);
  });
