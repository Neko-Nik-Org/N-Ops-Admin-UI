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

/** Modal dialog molecule. */

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Props for Dialog. The dialog is fully controlled: the parent owns `open`. */
interface DialogProps {
  open: boolean
  title: string
  description?: string
  /** Called on Escape, backdrop click or the close button; the parent should set `open` to false. */
  onClose: () => void
  children: ReactNode
  /** 'lg' for forms with many fields (e.g. the role editor). Default 'md'. */
  size?: 'md' | 'lg'
}

/** Modal built on the native <dialog>: focus trap, Escape-to-close and the top layer come for free. */
export const Dialog = ({ open, title, description, onClose, children, size = 'md' }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  /** Mirror the `open` prop onto the native dialog element. */
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // backdrop click
      }}
      aria-labelledby="dialog-title"
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-2xl' : 'max-w-md'} max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-0 text-text backdrop:bg-ink/70`}
    >
      {/* Only render the content while open, so forms inside reset each time the dialog opens */}
      {open && (
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="dialog-title" className="text-lg font-semibold text-text">
                {title}
              </h2>
              {description && <p className="text-sm text-text-muted">{description}</p>}
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="text-text-muted hover:text-text">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
