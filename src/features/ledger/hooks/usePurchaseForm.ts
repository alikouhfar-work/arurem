import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { emptyDraft, toDraft } from '../model/purchase';
import { purchaseDraftSchema } from '../model/purchase.schema';
import type { Purchase, PurchaseDraft, PurchaseFormValues } from '@/types/purchase';

const toFormValues = (draft: PurchaseDraft): PurchaseFormValues => ({
  sellerName: draft.sellerName,
  // RHF needs `undefined` for "empty" on a numeric input; NaN is not renderable.
  weight: Number.isFinite(draft.weight) ? draft.weight : (undefined as unknown as number),
  purity: draft.purity,
  note: draft.note ?? '',
  acquiredAt: draft.acquiredAt,
});

/**
 * Form state for the create/edit sheet.
 *
 * `mode: 'onTouched'` is deliberate: validating on every keystroke shows errors
 * while the user is still typing a valid value (typing "1" and "2" for "12"
 * flashes "out of range"), but never validating until submit leaves them
 * clicking a dead button. Blur-first, then live once dirty.
 */
export const usePurchaseForm = (
  purchase: Purchase | null,
  onSubmit: (draft: PurchaseDraft) => void,
) => {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseDraftSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: toFormValues(purchase ? toDraft(purchase) : emptyDraft()),
  });

  const { reset, formState } = form;

  // Re-seed whenever the record being edited changes.
  useEffect(() => {
    reset(toFormValues(purchase ? toDraft(purchase) : emptyDraft()));
  }, [purchase?.id, purchase, reset]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      sellerName: values.sellerName,
      weight: Number(values.weight),
      purity: values.purity,
      note: values.note ?? '',
      acquiredAt: values.acquiredAt,
    });
  });

  return {
    form,
    submit,
    isDirty: formState.isDirty,
    errors: formState.errors,
  };
};
