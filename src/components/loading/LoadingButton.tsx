import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { NSpinner } from './NSpinner';
import { cx } from './NLogo';

export type ButtonState = 'idle' | 'loading' | 'success';

export interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Shorthand for state="loading". */
  loading?: boolean;
  /** Full control: idle → loading → success. `useAsyncAction` drives this for you. */
  state?: ButtonState;
  /** Shown next to the spinner, e.g. "Approving". Leave empty to show the spinner alone. */
  loadingText?: ReactNode;
  /** Shown next to the check mark after success, e.g. "Approved". */
  successText?: ReactNode;
  /** Optional icon before the label. */
  icon?: ReactNode;
}

/**
 * A button that keeps its width while it works.
 * While busy it stays focusable (aria-disabled, not disabled), so keyboard users don't lose their place,
 * and repeat clicks are ignored.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(function LoadingButton(
  {
    variant = 'primary',
    size = 'md',
    loading,
    state,
    loadingText,
    successText,
    icon,
    children,
    className,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const s: ButtonState = state ?? (loading ? 'loading' : 'idle');
  const busy = s !== 'idle';
  const announce =
    s === 'loading' ? (typeof loadingText === 'string' ? loadingText : 'Working') : s === 'success' ? (typeof successText === 'string' ? successText : 'Done') : '';

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cx('n-btn', `n-btn--${variant}`, `n-btn--${size}`, className)}
      data-state={s}
      aria-busy={s === 'loading' || undefined}
      aria-disabled={busy || undefined}
      onClick={handleClick}
      {...rest}
    >
      <span className="n-btn__label" aria-hidden={busy || undefined}>
        {icon}
        {children}
      </span>
      <span className="n-btn__loading" aria-hidden="true">
        <NSpinner size="1.15em" />
        {loadingText}
      </span>
      <span className="n-btn__done" aria-hidden="true">
        <svg className="n-btn__check" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12.5l4.2 4.2L19 7" />
        </svg>
        {successText}
      </span>
      <span className="n-sr-only" aria-live="polite">
        {announce}
      </span>
    </button>
  );
});
