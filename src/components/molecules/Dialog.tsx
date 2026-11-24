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
/**
 * Modal dialog molecule.
 *
 * Deliberately not a native `<dialog>` opened with showModal(): that puts the dialog in the browser's
 * top layer, above everything a z-index can reach — including the inline menus and "save login"
 * prompts that password managers (Bitwarden, 1Password…) draw over the page. They fight back and
 * then switch themselves off ("This page is interfering…"). So the dialog is a normal fixed layer
 * with a high z-index, and the rest of the page is made `inert` while it's open, which keeps focus
 * and clicks inside it like a real modal.
 */

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Props for Dialog. The dialog is fully controlled: the parent owns `open`. */
interface DialogProps {
  open: boolean
  title: string
  description?: string
  /** Called on Escape, backdrop click or the close button; the parent should set `open` to false. */
  onClose: () => void
  children: ReactNode
  /** 'lg' for forms with many fields, 'xl' for wide ones (e.g. the role editor). Default 'md'. */
  size?: 'md' | 'lg' | 'xl'
}

/** Open dialogs, oldest first. Only the newest one is interactive. */
const stack: HTMLElement[] = []

/** Makes the app, and every dialog under the newest one, inert (no focus, clicks or screen reader). */
const syncInert = () => {
  const app = document.getElementById('root')
  if (app) app.inert = stack.length > 0
  stack.forEach((layer, i) => {
    layer.inert = i < stack.length - 1
  })
}

export const Dialog = ({ open, title, description, onClose, children, size = 'md' }: DialogProps) => {
  // unique per dialog, so stacked dialogs each get their own accessible name
  const titleId = useId()
  const layerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const layer = layerRef.current
    if (!open || !layer) return
    const opener = document.activeElement as HTMLElement | null
    stack.push(layer)
    syncInert()
    // keep a field the form focused itself (autoFocus); otherwise focus the panel, so Tab starts inside
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      stack.splice(stack.indexOf(layer), 1)
      syncInert()
      // back to whatever opened it, if that's still on the page and usable
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus()
    }
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    e.stopPropagation()
    onCloseRef.current()
  }

  if (!open) return null

  return createPortal(
    <div
      ref={layerRef}
      className="fixed inset-0 z-[60] flex overflow-y-auto overscroll-contain bg-ink/70 p-4"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current() // backdrop click
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`m-auto w-full ${{ md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' }[size]} rounded-xl border border-border bg-surface text-text shadow-2xl outline-none`}
      >
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
              {description && <p className="text-sm text-text-muted">{description}</p>}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onCloseRef.current()}
              className="text-text-muted hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
