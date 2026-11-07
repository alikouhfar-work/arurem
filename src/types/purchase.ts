import type { z } from 'zod';
import type {
  PURITY_VALUES,
  purchaseDraftSchema,
  purchaseSchema,
} from '@/features/ledger/model/purchase.schema';

/**
 * Purchase domain types.
 *
 * Derived from the zod schemas so the runtime contract and the compile-time
 * contract cannot drift. Type-only imports: this file adds no runtime edge.
 */

export type Purity = (typeof PURITY_VALUES)[number];

export type Purchase = z.infer<typeof purchaseSchema>;

/** The subset of a purchase the user edits. */
export type PurchaseDraft = z.infer<typeof purchaseDraftSchema>;

/**
 * What react-hook-form holds while editing. `z.input` (not `z.output`) because
 * the numeric field starts as `undefined` before the user types anything.
 */
export type PurchaseFormValues = z.input<typeof purchaseDraftSchema>;
