import { z } from 'zod';

/**
 * Runtime schema for a wallet — a named place gold is kept.
 *
 * A wallet is a label, not a container: entries are not owned by a wallet, they
 * *point* at one through `Purchase.walletId`. Deleting a wallet therefore
 * cannot cascade into entries, and an entry can never belong to two wallets
 * because the relationship is a single field rather than a list on both sides.
 */

export const walletSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name for this wallet.')
    .max(80, 'Keep the wallet name under 80 characters.'),
  note: z.string().trim().max(500, 'Keep the note under 500 characters.').optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

/** The fields the user edits. Everything else is system-assigned. */
export const walletDraftSchema = walletSchema.pick({ name: true, note: true });

/**
 * The same rules plus a uniqueness check, because a duplicate name is a data
 * defect rather than a preference: two "Home safe" wallets are indistinguishable
 * in a select. The predicate is injected so the schema stays pure and the
 * wallet list stays in the hook.
 */
export const walletDraftSchemaWith = (isNameTaken: (name: string) => boolean) =>
  walletDraftSchema.refine((draft) => !isNameTaken(draft.name), {
    path: ['name'],
    message: 'A wallet with this name already exists.',
  });
