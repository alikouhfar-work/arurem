import { trendBetween } from '@/shared/lib/valuation';
import { useEffect, useRef, useState } from 'react';
import type { PriceTrend, ValueFlash } from '@/types/market';

/**
 * Direction + animation nonce for a flashing value.
 *
 * The flash is driven from a ref-held previous value, not from state: the
 * comparison must happen on the render that sees the new number, and storing
 * the previous value in state would schedule an extra render for a purely
 * visual concern.
 *
 * `nonce` exists because CSS animations only restart when the class or node
 * changes. A price that ticks up twice in a row keeps the same `up` class, so
 * the class alone would animate once and then sit still — the nonce is used as
 * a React key on the animated span, which remounts it and replays the
 * animation. That is cheaper and less error-prone than toggling a class off and
 * back on across two frames.
 */
export const useValueFlash = (value: number | null): ValueFlash => {
  const previous = useRef<number | null>(null);
  const [flash, setFlash] = useState<ValueFlash>({ trend: 'flat', nonce: 0 });

  useEffect(() => {
    const prior = previous.current;
    previous.current = value;

    // First observation is not a change.
    if (prior === null || value === null) return;

    const trend: PriceTrend = trendBetween(prior, value);
    if (trend === 'flat') return;

    setFlash((current) => ({ trend, nonce: current.nonce + 1 }));
  }, [value]);

  return flash;
};
