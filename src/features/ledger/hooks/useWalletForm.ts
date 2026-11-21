import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { emptyWalletDraft, toWalletDraft } from '../model/wallet';
import { walletDraftSchemaWith } from '../model/wallet.schema';
import type { Wallet, WalletDraft, WalletFormValues } from '@/types/wallet';

/**
 * Form state for the create/edit wallet sheet.
 *
 * The uniqueness rule is built from the current wallet list, so it re-evaluates
 * on every render — renaming a wallet to its own name has to stay valid, which
 * is why the predicate excludes the record being edited.
 */
export const useWalletForm = (
  wallet: Wallet | null,
  wallets: readonly Wallet[],
  onSubmit: (draft: WalletDraft) => void,
) => {
  const schema = useMemo(
    () =>
      walletDraftSchemaWith((name) =>
        wallets.some(
          (candidate) =>
            candidate.id !== wallet?.id && candidate.name.toLowerCase() === name.trim().toLowerCase(),
        ),
      ),
    [wallets, wallet?.id],
  );

  const form = useForm<WalletFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: wallet ? toWalletDraft(wallet) : emptyWalletDraft(),
  });

  const { reset, formState } = form;

  // Re-seed whenever the record being edited changes.
  useEffect(() => {
    reset(wallet ? toWalletDraft(wallet) : emptyWalletDraft());
  }, [wallet?.id, wallet, reset]);

  const submit = form.handleSubmit((values) => {
    onSubmit({ name: values.name, note: values.note ?? '' });
  });

  return {
    form,
    submit,
    isDirty: formState.isDirty,
    errors: formState.errors,
  };
};
