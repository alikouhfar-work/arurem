import { z } from 'zod';

/**
 * Runtime schemas for the gold ledger.
 *
 * Schemas live here (values, not types) so `purchase.types.ts` can derive every
 * type from a single source of truth without a circular import:
 *
 *   purchase.schema.ts  →  purchase.types.ts  →  purchase.ts (behaviour)
 *
 * Dates are persisted as ISO-8601 strings, not `Date` objects. The previous
 * version stored `Date` instances and round-tripped them through
 * `JSON.parse`, which silently produced strings; `zodResolver` then rejected
 * the form on every subsequent edit, disabling the save button with no
 * visible error. Strings in, strings out — the boundary converts once.
 */

export const PURITY_VALUES = ['24K', '22K', '18K', 'Bullion'] as const;

export const PURITY_LABELS = {
  '24K': '24 Karat',
  '22K': '22 Karat',
  '18K': '18 Karat',
  Bullion: 'Pure Bullion',
} as const;

export const purchaseSchema = z.object({
  id: z.string().min(1),
  sellerName: z
    .string()
    .trim()
    .min(1, 'Enter who you bought from.')
    .max(120, 'Keep the vendor name under 120 characters.'),
  weight: z
    .number({ invalid_type_error: 'Enter a weight in grams.' })
    .positive('Weight must be greater than zero.')
    .max(1_000_000, 'That weight is out of range.')
    .refine((value) => Number.isFinite(value), 'Enter a valid number.'),
  purity: z.enum(PURITY_VALUES, { errorMap: () => ({ message: 'Choose a purity level.' }) }),
  note: z.string().trim().max(2000, 'Keep the memo under 2000 characters.').optional(),
  acquiredAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

/** Fields the user actually edits. Everything else is system-assigned. */
export const purchaseDraftSchema = purchaseSchema.pick({
  sellerName: true,
  weight: true,
  purity: true,
  note: true,
  acquiredAt: true,
});
