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

/** Form field molecule: label, input and validation message. */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** The red "*" after a required field's label. A CSS ::after, so it isn't part of the label's text. */
export const REQUIRED_MARK = "after:ml-0.5 after:text-danger after:content-['*']"

/** Props for FormField. `id` must match the input's id so the label is linked to it. */
interface FormFieldProps {
  id: string
  label: string
  /** Rendered on the same row, right-aligned — e.g. a "Forgot password?" link. */
  labelExtra?: ReactNode
  error?: string
  /** Marks the field as required with a red "*" after the label (drawn by CSS, so the label's text stays the same). */
  required?: boolean
  children: ReactNode
}

/** Wraps an input (passed as children) with a label and an accessible error message. */
export const FormField = ({ id, label, labelExtra, error, required, children }: FormFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className={cn('text-sm text-text-muted', required && REQUIRED_MARK)}>
        {label}
      </label>
      {labelExtra}
    </div>
    {children}
    {error && (
      <p className="text-sm text-danger" role="alert">
        {error}
      </p>
    )}
  </div>
)
