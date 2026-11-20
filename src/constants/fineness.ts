import type { Purity } from '@/types/purchase';

/**
 * Fine-gold fraction per karat, defined once.
 *
 * Shared by the ledger model (fine-gold totals) and the market valuation (where
 * a karat without its own published quote is derived from 24K). One copy, so a
 * purity change cannot move the two apart.
 */
export const FINENESS: Record<Purity, number> = {
  '24K': 0.9999,
  '22K': 0.9167,
  '18K': 0.75,
  Bullion: 0.9999,
};
