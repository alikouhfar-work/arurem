import type { Purchase } from './purchase';
import type { Wallet } from './wallet';

/** Backup export/import contracts. */

export type ExportPayload = {
  format: 'arurem.backup';
  version: 3;
  exportedAt: string;
  purchases: Purchase[];
  wallets: Wallet[];
};

export type ImportSuccess = {
  ok: true;
  purchases: Purchase[];
  wallets: Wallet[];
  /** Rows that failed validation. Duplicate/colliding ids are kept. */
  skipped: number;
};

export type ImportFailure = {
  ok: false;
  reason: string;
};

export type ImportResult = ImportSuccess | ImportFailure;
