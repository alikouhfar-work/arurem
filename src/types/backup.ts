import type { Purchase } from './purchase';

/** Backup export/import contracts. */

export type ExportPayload = {
  format: 'arurem.backup';
  version: 2;
  exportedAt: string;
  purchases: Purchase[];
};

export type ImportSuccess = {
  ok: true;
  purchases: Purchase[];
  skipped: number;
};

export type ImportFailure = {
  ok: false;
  reason: string;
};

export type ImportResult = ImportSuccess | ImportFailure;
