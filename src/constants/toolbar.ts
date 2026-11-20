import { LayoutGrid, List } from 'lucide-react';
import type { ToolbarSortOption, ToolbarViewOption } from '@/types/components';

/**
 * Toolbar option lists.
 *
 * Out of the component file on purpose: a component module holds UI and nothing
 * else, so these live here where they can be imported by tests and by any
 * future command palette without dragging JSX along.
 */

export const SORT_OPTIONS: readonly ToolbarSortOption[] = [
  { value: 'acquired-desc', label: 'Newest first' },
  { value: 'acquired-asc', label: 'Oldest first' },
  { value: 'weight-desc', label: 'Heaviest first' },
  { value: 'vendor-asc', label: 'Vendor A–Z' },
];

export const VIEW_OPTIONS: readonly ToolbarViewOption[] = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
];
