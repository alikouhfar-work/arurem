import { format } from 'date-fns';

/**
 * Number, date, and unit formatting. Kept in one module so a future locale
 * switch touches exactly one file instead of forty call sites.
 */

const GRAM = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const PERCENT = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export const formatGrams = (value: number): string => GRAM.format(value);

export const formatPercent = (fraction: number): string =>
  PERCENT.format(Math.max(0, Math.min(1, fraction)));

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'd MMM yyyy');
};

export const toDate = (iso: string): Date => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
