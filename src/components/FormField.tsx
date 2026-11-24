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

/** Props for FormField. `id` must match the input's id so the label is linked to it. */
interface FormFieldProps {
  id: string
  label: string
  /** Rendered on the same row, right-aligned — e.g. a "Forgot password?" link. */
  labelExtra?: ReactNode
  error?: string
  children: ReactNode
}

/** Wraps an input (passed as children) with a label and an accessible error message. */
export const FormField = ({ id, label, labelExtra, error, children }: FormFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm text-text-muted">
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
