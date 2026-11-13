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

/** Checkbox atom. */

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/**
 * Native checkbox styled with the app's theme colors. Accepts every <input> prop
 * and forwards its ref, so it works with react-hook-form's `register`.
 */
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'size-4 rounded border-border bg-surface-raised accent-signal',
        'focus-visible:border-signal',
        className,
      )}
      {...props}
    />
  ),
)

Checkbox.displayName = 'Checkbox'
