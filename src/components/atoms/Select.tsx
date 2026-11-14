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
/** Native select atom, styled like Input. */

import { ChevronDown } from 'lucide-react'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/** Native <select> props plus an error flag. */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

/** Themed native select (keyboard, screen readers and mobile pickers for free); forwards its ref for react-hook-form. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ hasError, className, children, ...props }, ref) => (
  <div className={cn('relative', className)}>
    <select
      ref={ref}
      className={cn(
        'w-full cursor-pointer appearance-none rounded-md border border-border bg-surface-raised py-2.5 pr-9 pl-3 text-sm text-text',
        'transition-colors duration-150 focus-visible:border-signal disabled:cursor-default disabled:opacity-60',
        hasError && 'border-danger',
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted" />
  </div>
))

Select.displayName = 'Select'
