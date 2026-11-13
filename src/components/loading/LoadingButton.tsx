/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

/** Button that shows a spinner while working and a check mark when done. */

import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { NSpinner } from './NSpinner';
import { cn } from '@/utils/cn';

/** Visual state of a LoadingButton. */
export type ButtonState = 'idle' | 'loading' | 'success';

/** Props for LoadingButton; every native <button> prop is passed through. */
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
      className={cn('n-btn', `n-btn--${variant}`, `n-btn--${size}`, className)}
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
