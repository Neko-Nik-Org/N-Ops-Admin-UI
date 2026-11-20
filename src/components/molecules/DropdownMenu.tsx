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

/** Small popover menu anchored to a trigger button: shared by the Topbar theme and profile menus. */

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DropdownMenuProps {
  /** Accessible name of the trigger button. */
  label: string
  /** Accessible name of the opened menu. */
  menuLabel: string
  /** Visible content of the trigger (icons, text); a chevron is appended. */
  trigger: ReactNode
  /** Extra classes for the trigger button. */
  triggerClassName?: string
  /** Menu width class, default w-40. */
  widthClassName?: string
  /**
   * Menu items (elements with a `menuitem*` role). Clicking one closes the menu and returns focus to
   * the trigger, unless the item has `data-keep-open`.
   */
  children: ReactNode
}

/** Shared look for an item inside a DropdownMenu. */
export const menuItemClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-raised hover:text-text focus-visible:bg-surface-raised focus-visible:text-text'

/** Selector for the focusable items inside the menu. */
const ITEMS = '[role^="menuitem"]:not([aria-disabled="true"])'

/**
 * Opens below the trigger, right-aligned. Closes on outside click, Escape, Tab or an item click;
 * arrow keys move between items. On open, focus goes to the checked item (if any) or the first one.
 */
export const DropdownMenu = ({
  label,
  menuLabel,
  trigger,
  triggerClassName,
  widthClassName = 'w-40',
  children,
}: DropdownMenuProps) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const initial = menu?.querySelector<HTMLElement>('[aria-checked="true"]') ?? menu?.querySelector<HTMLElement>(ITEMS)
    initial?.focus()
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onMenuClick = (e: MouseEvent<HTMLDivElement>) => {
    const item = (e.target as HTMLElement).closest('[role^="menuitem"]')
    if (item && !item.hasAttribute('data-keep-open')) close()
  }

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])
      const index = items.indexOf(document.activeElement as HTMLElement)
      const step = e.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-text-muted hover:border-border-strong hover:text-text',
          triggerClassName,
        )}
      >
        {trigger}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={cn('shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuLabel}
          onClick={onMenuClick}
          onKeyDown={onMenuKeyDown}
          className={cn('absolute right-0 z-50 mt-1.5 rounded-md border border-border bg-surface p-1 shadow-lg', widthClassName)}
        >
          {children}
        </div>
      )}
    </div>
  )
}
