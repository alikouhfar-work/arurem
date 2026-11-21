import { Button } from '@/shared/ui/Button';
import { Calendar } from '@/shared/ui/Calendar';
import { Field, FieldControl, FieldError, FieldHint, FieldLabel } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { formatDate, toDate } from '@/shared/lib/format';
import { CalendarDays, Check, Loader2 } from 'lucide-react';
import { PURITY_LABELS, PURITY_VALUES, purityFineness } from '../model/purchase';
import { NO_WALLET } from '@/constants/wallets';
import { usePurchaseForm } from '../hooks/usePurchaseForm';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import type { EntryFormProps } from '@/types/components';
import type { PurchaseDraft } from '@/types/purchase';

/**
 * Create/edit form.
 *
 * Notes on the rewrite:
 *  - Labels are wired to inputs (the old ones were bare <label> elements, so
 *    every field was nameless to assistive tech).
 *  - The submit button is never disabled for invalid state. A disabled button
 *    with no explanation is a dead end; instead submission reveals per-field
 *    errors and focuses the first invalid input.
 *  - Two columns only from `sm` up; the old `grid-cols-2` at 320px squeezed
 *    "Net weight" and "Purity" into ~120px each.
 */
export function EntryForm({ purchase, wallets, submitLabel, onSubmit, onCancel }: EntryFormProps) {
  const { form, submit, errors } = usePurchaseForm(purchase, onSubmit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    setValue,
    watch,
    setFocus,
    formState: { isDirty },
  } = form;

  const purity = watch('purity');
  const weight = watch('weight');
  const acquiredAt = watch('acquiredAt');
  const note = watch('note') ?? '';
  const walletId = watch('walletId');

  const finePreview =
    typeof weight === 'number' && Number.isFinite(weight) && weight > 0
      ? weight * purityFineness(purity)
      : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    await submit(event);
    setIsSubmitting(false);
    // `submit` surfaces errors through formState; move focus so keyboard and
    // screen-reader users land on the problem instead of hunting for it.
    const firstError = Object.keys(errors)[0];
    if (firstError) setFocus(firstError as keyof PurchaseDraft);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-region flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        <Field invalid={Boolean(errors.sellerName)}>
          <FieldLabel required>Vendor</FieldLabel>
          <FieldControl>
            <Input
              {...register('sellerName')}
              autoComplete="off"
              placeholder="e.g. Royal Treasury, Bazaar exchange"
              aria-required="true"
            />
          </FieldControl>
          <FieldError>{errors.sellerName?.message}</FieldError>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field invalid={Boolean(errors.weight)}>
            <FieldLabel required hint="grams">
              Gross weight
            </FieldLabel>
            <FieldControl>
              <Input
                {...register('weight', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                placeholder="0.000"
                aria-required="true"
                className="numeric"
              />
            </FieldControl>
            {errors.weight ? (
              <FieldError>{errors.weight.message}</FieldError>
            ) : (
              <FieldHint>
                {finePreview !== null
                  ? `≈ ${finePreview.toFixed(3)} g fine gold at ${(purityFineness(purity) * 100).toFixed(1)}%`
                  : 'Weigh the item as-is, including any setting.'}
              </FieldHint>
            )}
          </Field>

          <Field invalid={Boolean(errors.purity)}>
            <FieldLabel htmlFor="entry-purity" required>
              Purity
            </FieldLabel>
            <FieldControl>
              <Select
                value={purity}
                onValueChange={(value) =>
                  setValue('purity', value as PurchaseDraft['purity'], {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="entry-purity" className="w-full" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURITY_VALUES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PURITY_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldControl>
            <FieldError>{errors.purity?.message}</FieldError>
          </Field>
        </div>

        <Field invalid={Boolean(errors.acquiredAt)}>
          <FieldLabel required>Date acquired</FieldLabel>
          <FieldControl>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    // Same control tokens as the Input and Select beside it, so
                    // the date field is not a shorter box in the same column.
                    'h-(--control-height) w-full justify-start gap-2 rounded-control px-(--control-gutter) font-normal',
                    'text-ink-900 dark:text-ink-50',
                  )}
                >
                  <CalendarDays className="text-muted-foreground size-4" aria-hidden="true" />
                  {formatDate(acquiredAt)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate(acquiredAt)}
                  defaultMonth={toDate(acquiredAt)}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    if (!date) return;
                    // Keep the original time-of-day; only the calendar date is
                    // being edited. Persist as a full ISO instant.
                    const next = toDate(acquiredAt);
                    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setValue('acquiredAt', next.toISOString(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </FieldControl>
          <FieldError>{errors.acquiredAt?.message}</FieldError>
        </Field>

        <Field invalid={Boolean(errors.walletId)}>
          {/* A Radix Select renders no element for its Root, so the Field
              context's generated id has nothing to attach to. The label points
              at the trigger directly instead, which keeps the name real. */}
          <FieldLabel htmlFor="entry-wallet" hint={wallets.length === 0 ? 'none yet' : undefined}>
            Wallet
          </FieldLabel>
          <FieldControl>
            <Select
              value={walletId && walletId.length > 0 ? walletId : NO_WALLET}
              onValueChange={(value) =>
                setValue('walletId', value === NO_WALLET ? undefined : value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="entry-wallet" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_WALLET}>No wallet</SelectItem>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldControl>
          {errors.walletId ? (
            <FieldError>{errors.walletId.message}</FieldError>
          ) : (
            <FieldHint>One place per entry. Change it any time.</FieldHint>
          )}
        </Field>

        <Field invalid={Boolean(errors.note)}>
          <FieldLabel hint={`${note.length}/2000`}>Memo</FieldLabel>
          <FieldControl>
            <Textarea
              {...register('note')}
              rows={3}
              placeholder="Serial numbers, hallmark, storage location…"
              className="field-sizing-fixed resize-y"
            />
          </FieldControl>
          <FieldError>{errors.note?.message}</FieldError>
        </Field>
      </div>

      {/* Sticky action bar: on a 3-field sheet this keeps the primary action
          reachable without scrolling on small phones. */}
      <div className="bg-card/95 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] supports-backdrop-filter:backdrop-blur sm:px-6 sm:pb-3">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-11 sm:h-10">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (purchase !== null && !isDirty)}
            className="h-11 gap-2 sm:h-10 sm:min-w-36"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {purchase !== null && !isDirty ? 'No changes' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
