import { applyDraft, createPurchase } from '../model/purchase';
import { loadPurchases, persistPurchases } from '../model/storage';
import { computeStats, filterPurchases, sortPurchases } from '../model/selectors';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Purchase, PurchaseDraft } from '@/types/purchase';
import type { LedgerAction, LedgerState, UseLedgerViewOptions } from '@/types/ledger';

/**
 * Ledger store.
 *
 * State transitions live in a reducer (pure, unit-testable) and the hook is the
 * only thing that talks to persistence. Components never see `setState` — they
 * dispatch named intents, which is what makes the mutations auditable later.
 */

const initialState = (): LedgerState => {
  const { purchases } = loadPurchases();
  return { purchases, status: 'idle', error: null };
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

    case 'replace-all':
      return { ...state, purchases: action.purchases, status: 'idle', error: null };

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
    const serialised = JSON.stringify(state.purchases);

    if (lastSaved.current === null) {
      lastSaved.current = serialised;
      return;
    }
    if (serialised === lastSaved.current) return;
    lastSaved.current = serialised;

    try {
      persistPurchases(state.purchases);
      dispatch({ type: 'persist-ok' });
    } catch (error) {
      dispatch({
        type: 'persist-failed',
        message: error instanceof Error ? error.message : 'Could not save your ledger.',
      });
    }
  }, [state.purchases]);

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

  const replaceAll = useCallback(
    (purchases: Purchase[]) => dispatch({ type: 'replace-all', purchases }),
    [],
  );

  const stats = useMemo(() => computeStats(state.purchases), [state.purchases]);

  return {
    purchases: state.purchases,
    stats,
    error: state.error,
    create,
    update,
    remove,
    restore,
    replaceAll,
    dismissError: () => dispatch({ type: 'persist-ok' }),
  };
};

export const useLedgerView = (
  purchases: readonly Purchase[],
  { searchQuery, sortKey, purityFilter }: UseLedgerViewOptions,
) => {
  return useMemo(() => {
    const byPurity =
      purityFilter === 'all'
        ? (purchases as Purchase[])
        : purchases.filter((purchase) => purchase.purity === purityFilter);

    const filtered = filterPurchases(byPurity, searchQuery);
    return sortPurchases(filtered, sortKey);
  }, [purchases, searchQuery, sortKey, purityFilter]);
};
