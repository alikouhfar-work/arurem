import { purchaseSchema } from './purchase.schema';
import { PURITY_VALUES } from './purchase.schema';
import type { Purchase } from '@/types/purchase';
import type { ExportPayload, ImportResult } from '@/types/backup';

/**
 * Backup import/export.
 *
 * The old importer accepted any JSON array and wrote it straight into state,
 * so one bad file could poison the ledger with rows missing ids and dates.
 * Import now validates every row, reports what it skipped, and returns a
 * normalised list.
 */

export const buildExport = (purchases: readonly Purchase[]): ExportPayload => ({
  format: 'arurem.backup',
  version: 2,
  exportedAt: new Date().toISOString(),
  purchases: [...purchases],
});

export const downloadExport = (purchases: readonly Purchase[], filename?: string): void => {
  const payload = buildExport(purchases);
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
  };

  const parsed = purchaseSchema.safeParse(candidate);
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
  if (Array.isArray(json)) {
    rows = json;
  } else if (typeof json === 'object' && json !== null) {
    const record = json as Record<string, unknown>;
    if (Array.isArray(record.purchases)) rows = record.purchases;
  }

  if (!rows) {
    return { ok: false, reason: 'Expected an Arurem backup file with a "purchases" list.' };
  }

  const purchases = rows.map(coerceRow).filter((row): row is Purchase => row !== null);
  const skipped = rows.length - purchases.length;

  if (purchases.length === 0) {
    return { ok: false, reason: 'No valid entries were found in that file.' };
  }

  return { ok: true, purchases, skipped };
};

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsText(file);
  });
