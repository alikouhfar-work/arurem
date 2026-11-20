import { VIEW_OPTIONS } from '@/constants/toolbar';
import { cn } from '@/shared/lib/utils';
import type { ViewSwitchProps } from '@/types/components';

/**
 * Two-state segmented switch in a track.
 *
 * The track is exactly `--control-height` and `rounded-control`, so it matches
 * the search field and the select triggers beside it. Its segments are sized by
 * `--control-segment` and rounded by `--control-radius-inner` — both derived in
 * tokens.css, so changing the control height in one place keeps the whole
 * switch concentric with its neighbours.
 *
 * The active segment is a card surface rather than an inverted fill: at 36px an
 * inverted fill reads as a pressed button, and it would need its own verified
 * contrast pair in both themes.
 *
 * Focus uses an explicit shadow rather than Tailwind's `ring-*` utilities. Both
 * the active surface's elevation and a ring write to `box-shadow`, so a segment
 * carrying `shadow-sm` silently lost its focus ring — the one control in the
 * toolbar that gave no visible focus feedback. An explicit
 * `focus-visible:shadow-[…]` replaces the elevation while focused and matches
 * the 3px weight the fields beside it use.
 */
export const ViewSwitch = ({ viewMode, onViewModeChange, className }: ViewSwitchProps) => (
  <div
    role="group"
    aria-label="Layout"
    className={cn(
      'border-border bg-muted flex h-(--control-height) shrink-0 items-center gap-0.5',
      'rounded-control border p-(--control-track-padding)',
      className,
    )}
  >
    {VIEW_OPTIONS.map(({ value, label, Icon }) => {
      const active = viewMode === value;
      return (
        <button
          key={value}
          type="button"
          onClick={() => onViewModeChange(value)}
          aria-pressed={active}
          className={cn(
            'flex items-center justify-center',
            'h-(--control-segment) w-(--control-segment) rounded-control-inner',
            'transition-[background-color,color,box-shadow]',
            // 3px to match the fields, and outline-none because the shadow is
            // the indicator — two simultaneous focus treatments look broken.
            'focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_35%,transparent)] focus-visible:outline-none',
            active
              ? 'bg-card text-ink-900 shadow-sm dark:text-ink-50'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </button>
      );
    })}
  </div>
);
