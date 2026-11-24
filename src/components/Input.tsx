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

/** Text input atom. */

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/** Native <input> props plus an error flag. */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Shows a red border when the field fails validation. */
  hasError?: boolean
}

/** Themed text input; forwards its ref for react-hook-form. */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ hasError, className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text',
      'placeholder:text-text-muted transition-colors duration-150',
      'focus-visible:border-signal',
      hasError && 'border-danger',
      className,
    )}
    {...props}
  />
))

Input.displayName = 'Input'
