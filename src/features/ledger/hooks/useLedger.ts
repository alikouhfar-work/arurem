import { applyDraft, createPurchase } from '../model/purchase';
import { loadLedger, persistLedger } from '../model/storage';
import { applyWalletDraft, createWallet as buildWallet } from '../model/wallet';
import { computeStats, filterPurchases, sortPurchases } from '../model/selectors';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Purchase, PurchaseDraft } from '@/types/purchase';
import type { Wallet, WalletDraft } from '@/types/wallet';
import type { LedgerAction, LedgerState, UseLedgerViewOptions } from '@/types/ledger';

/**
 * Ledger store.
 *
 * State transitions live in a reducer (pure, unit-testable) and the hook is the
 * only thing that talks to persistence. Components never see `setState` — they
 * dispatch named intents, which is what makes the mutations auditable later.
 */

const initialState = (): LedgerState => {
  const { purchases, wallets, recovery } = loadLedger();
  return { purchases, wallets, status: 'idle', error: null, recovery };
};

export const ledgerReducer = (state: LedgerState, action: LedgerAction): LedgerState => {
  switch (action.type) {
    case 'add':
      return { ...state, purchases: [action.purchase, ...state.purchases] };

    case 'update':
      return {
        ...state,
        purchases: state.purchases.map((purchase) =>
          purchase.id === action.id ? applyDraft(purchase, action.draft) : purchase,
        ),
      };

    case 'delete':
      return {
        ...state,
        purchases: state.purchases.filter((purchase) => purchase.id !== action.id),
      };

    case 'restore': {
      if (state.purchases.some((purchase) => purchase.id === action.purchase.id)) return state;
      const next = [...state.purchases];
      next.splice(Math.min(action.index, next.length), 0, action.purchase);
      return { ...state, purchases: next };
    }

    /**
     * Deleting a wallet removes the label only. Entries keep every field they
     * were saved with — they just lose the link, because the wallet is gone.
     * `entryIds` is carried on the restore action so Undo can put the links
     * back exactly as they were.
     */
    case 'delete-wallet':
      return {
        ...state,
        wallets: state.wallets.filter((wallet) => wallet.id !== action.id),
        purchases: state.purchases.map((purchase) =>
          purchase.walletId === action.id ? { ...purchase, walletId: undefined } : purchase,
        ),
      };

    case 'add-wallet':
      return { ...state, wallets: [...state.wallets, action.wallet] };

    case 'update-wallet':
      return {
        ...state,
        wallets: state.wallets.map((wallet) =>
          wallet.id === action.id ? applyWalletDraft(wallet, action.draft) : wallet,
        ),
      };

    case 'restore-wallet': {
      if (state.wallets.some((wallet) => wallet.id === action.wallet.id)) return state;
      const next = [...state.wallets];
      next.splice(Math.min(action.index, next.length), 0, action.wallet);

      const relinked = new Set(action.entryIds);
      return {
        ...state,
        wallets: next,
        purchases: state.purchases.map((purchase) =>
          relinked.has(purchase.id) && !purchase.walletId
            ? { ...purchase, walletId: action.wallet.id }
            : purchase,
        ),
      };
    }

    case 'replace-all':
      return {
        ...state,
        purchases: action.purchases,
        wallets: action.wallets,
        status: 'idle',
        error: null,
        recovery: null,
      };

    case 'dismiss-recovery':
      return state.recovery === null ? state : { ...state, recovery: null };

    case 'persist-failed':
      return { ...state, status: 'error', error: action.message };

    case 'persist-ok':
      return state.status === 'error' ? { ...state, status: 'idle', error: null } : state;

    default:
      return state;
  }
};

export const useLedger = () => {
  const [state, dispatch] = useReducer(ledgerReducer, undefined, initialState);
  const lastSaved = useRef<string | null>(null);

  // Persist on every committed change, but never re-write an identical payload
  // (localStorage writes are synchronous and show up as long tasks). The first
  // effect run records the just-loaded payload instead of writing it back.
  useEffect(() => {
    const serialised = JSON.stringify([state.purchases, state.wallets]);

    if (lastSaved.current === null) {
      lastSaved.current = serialised;
      return;
    }
    if (serialised === lastSaved.current) return;
    lastSaved.current = serialised;

    try {
      persistLedger(state.purchases, state.wallets);
      dispatch({ type: 'persist-ok' });
    } catch (error) {
      dispatch({
        type: 'persist-failed',
        message: error instanceof Error ? error.message : 'Could not save your ledger.',
      });
    }
  }, [state.purchases, state.wallets]);

  const create = useCallback((draft: PurchaseDraft): Purchase => {
    const purchase = createPurchase(draft);
    dispatch({ type: 'add', purchase });
    return purchase;
  }, []);

  const update = useCallback(
    (id: string, draft: PurchaseDraft) => dispatch({ type: 'update', id, draft }),
    [],
  );

  const remove = useCallback((id: string) => dispatch({ type: 'delete', id }), []);

  const restore = useCallback(
    (purchase: Purchase, index: number) => dispatch({ type: 'restore', purchase, index }),
    [],
  );

  const createWallet = useCallback((draft: WalletDraft): Wallet => {
    const wallet = buildWallet(draft);
    dispatch({ type: 'add-wallet', wallet });
    return wallet;
  }, []);

  const updateWallet = useCallback(
    (id: string, draft: WalletDraft) => dispatch({ type: 'update-wallet', id, draft }),
    [],
  );

  const removeWallet = useCallback((id: string) => dispatch({ type: 'delete-wallet', id }), []);

  const restoreWallet = useCallback(
    (wallet: Wallet, index: number, entryIds: string[]) =>
      dispatch({ type: 'restore-wallet', wallet, index, entryIds }),
    [],
  );

  const replaceAll = useCallback(
    (purchases: Purchase[], wallets: Wallet[]) =>
      dispatch({ type: 'replace-all', purchases, wallets }),
    [],
  );

  const stats = useMemo(() => computeStats(state.purchases), [state.purchases]);

  const dismissRecovery = useCallback(() => dispatch({ type: 'dismiss-recovery' }), []);

  return {
    purchases: state.purchases,
    wallets: state.wallets,
    stats,
    error: state.error,
    recovery: state.recovery,
    create,
    update,
    remove,
    restore,
    createWallet,
    updateWallet,
    removeWallet,
    restoreWallet,
    replaceAll,
    dismissRecovery,
    dismissError: () => dispatch({ type: 'persist-ok' }),
  };
};

export const useLedgerView = (
  purchases: readonly Purchase[],
  { searchQuery, sortKey, purityFilter, walletFilter, wallets }: UseLedgerViewOptions,
) => {
  return useMemo(() => {
    const byPurity =
      purityFilter === 'all'
        ? (purchases as Purchase[])
        : purchases.filter((purchase) => purchase.purity === purityFilter);

    const known = new Set(wallets.map((wallet) => wallet.id));
    const byWallet =
      walletFilter === 'all'
        ? byPurity
        : walletFilter === 'none'
          ? byPurity.filter((purchase) => !purchase.walletId || !known.has(purchase.walletId))
          : byPurity.filter((purchase) => purchase.walletId === walletFilter);

    const filtered = filterPurchases(byWallet, searchQuery);
    return sortPurchases(filtered, sortKey);
  }, [purchases, wallets, searchQuery, sortKey, purityFilter, walletFilter]);
};
