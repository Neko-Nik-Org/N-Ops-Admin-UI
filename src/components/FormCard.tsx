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
/** Building blocks for the full-page create / edit forms: titled field cards and the sticky save bar. */

import type { ReactNode } from 'react'
import { REQUIRED_MARK } from '@/components/FormField'
import { LoadingButton, type ButtonState } from '@/components/LoadingButton'
import { cn } from '@/utils/cn'

/** A titled card holding one group of fields. `aside` sits at the right of the title (e.g. a count). */
export const FormCard = ({
  title,
  hint,
  aside,
  required,
  children,
}: {
  title: string
  hint?: string
  aside?: ReactNode
  /** The group needs an answer (e.g. at least one pick): a red "*" after the title. */
  required?: boolean
  children: ReactNode
}) => (
  <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5">
    <legend className="contents">
      <span className="flex items-baseline justify-between gap-2">
        <span className={cn('text-sm font-semibold text-text', required && REQUIRED_MARK)}>{title}</span>
        {aside}
      </span>
    </legend>
    {hint && <p className="-mt-3 text-xs text-text-muted">{hint}</p>}
    {children}
  </fieldset>
)

/**
 * Cancel and submit, with an "Unsaved changes" note. Floats at the bottom of the window while the
 * form scrolls, and sits under the cards when it fits.
 */
export const FormFooter = ({
  state,
  dirty,
  editing,
  idleNote,
  submitLabel,
  loadingText,
  successText,
  onCancel,
}: {
  state: ButtonState
  dirty: boolean
  /** Editing something that exists (vs creating it): changes the idle note to "No changes yet". */
  editing: boolean
  /** Shown while creating and nothing is typed yet. */
  idleNote?: string
  submitLabel: string
  loadingText: string
  successText: string
  onCancel: () => void
}) => (
  <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-5 py-3 shadow-lg">
    <p className="text-sm text-text-muted" aria-live="polite">
      {dirty ? (
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
          Unsaved changes
        </span>
      ) : editing ? (
        'No changes yet'
      ) : (
        idleNote
      )}
    </p>
    <div className="flex items-center gap-2">
      <LoadingButton variant="ghost" onClick={onCancel}>
        Cancel
      </LoadingButton>
      <LoadingButton type="submit" state={state} loadingText={loadingText} successText={successText}>
        {submitLabel}
      </LoadingButton>
    </div>
  </div>
)
