import { Coins } from 'lucide-react';
import type { AppShellProps, BrandMarkProps } from '@/types/components';

/**
 * App chrome. Deliberately not a "card around everything": the header sits on
 * the page canvas, with one clear primary action.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <a
        href="#ledger"
        className="focus:bg-card focus:text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:ring-2"
      >
        Skip to ledger
      </a>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        {children}
      </div>
    </div>
  );
}

export function BrandMark({ version }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm sm:size-12">
        <Coins className="size-5 sm:size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="font-heading text-ink-900 dark:text-ink-50 flex items-baseline gap-1.5 text-xl leading-none font-semibold tracking-tight sm:text-2xl">
          Arurem
          <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-normal">
            v{version}
          </span>
        </span>
        <span className="text-muted-foreground mt-1 block text-xs sm:text-[13px]">
          Private gold ledger
        </span>
      </span>
    </div>
  );
}
