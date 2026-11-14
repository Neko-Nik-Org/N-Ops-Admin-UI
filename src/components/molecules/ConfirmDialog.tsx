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
/** Confirmation dialog for destructive actions. */

import type { ReactNode } from 'react'
import { toast } from 'react-toastify'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'

/** Props for ConfirmDialog. */
interface ConfirmDialogProps {
  open: boolean
  title: string
  /** What will happen, in plain words. */
  children: ReactNode
  /** Button label, e.g. "Delete user". */
  confirmLabel: string
  /** Runs the action. A thrown Error's message is shown as a toast and the dialog stays open. */
  onConfirm: () => Promise<unknown>
  /** Toast shown after it worked. */
  successMessage: string
  onClose: () => void
}

/** "Are you sure?" dialog with a danger button that shows progress, then closes on success. */
export const ConfirmDialog = ({ open, title, children, confirmLabel, onConfirm, successMessage, onClose }: ConfirmDialogProps) => {
  const [state, run] = useAsyncAction(onConfirm, { successMs: 500 })

  const confirm = () =>
    run()
      .then(() => {
        toast.success(successMessage)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-sm text-text-muted">{children}</div>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton variant="danger" state={state} loadingText="Working" successText="Done" onClick={confirm}>
          {confirmLabel}
        </LoadingButton>
      </div>
    </Dialog>
  )
}
