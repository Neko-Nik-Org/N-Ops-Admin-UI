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
/** Multi-line text input atom. */

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

/** Native <textarea> props plus an error flag. */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

/** Themed textarea; forwards its ref for react-hook-form. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ hasError, className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'w-full resize-y rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text',
      'placeholder:text-text-muted transition-colors duration-150 focus-visible:border-signal',
      hasError && 'border-danger',
      className,
    )}
    {...props}
  />
))

Textarea.displayName = 'Textarea'
