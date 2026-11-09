import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Surface primitive. One radius scale, one border colour, one shadow token —
 * the previous UI mixed rounded-2xl/3xl/[2rem]/[2.5rem]/[3rem] on adjacent
 * elements, which is what made the layout feel unpolished at any zoom level.
 */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground shadow-card rounded-2xl border',
        className,
      )}
      {...props}
    />
  );
}

export { Card };
