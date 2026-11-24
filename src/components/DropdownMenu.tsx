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

/** Small popover menu anchored to a trigger button: the Topbar theme and profile menus and the table row Edit menus. */

import { ChevronDown } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

interface DropdownMenuProps {
  /** Accessible name of the trigger button. */
  label: string
  /** Accessible name of the opened menu. */
  menuLabel: string
  /** Visible content of the trigger (icons, text); a chevron is appended unless `chevron` is false. */
  trigger: ReactNode
  /** Show the chevron after the trigger content. Default true. */
  chevron?: boolean
  /** Extra classes for the trigger button. */
  triggerClassName?: string
  /** Menu width class, default w-40. */
  widthClassName?: string
  /**
   * Positions the menu against the window instead of its parent, so a scrolling container (like a
   * wide table) can't clip it. It closes when the page scrolls or resizes.
   */
  floating?: boolean
  /** Items, headers and separators span the menu's full width (edge to edge) instead of sitting inside its padding. */
  flush?: boolean
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

/** Gap between the trigger and the menu, and the least room kept from the window edge, in px. */
const GAP = 6
const EDGE = 8

/**
 * Opens below the trigger, right-aligned; above it instead when there isn't room below but there is
 * more above, so a menu near the bottom of the window isn't cut off. Closes on outside click, Escape, Tab or an item click;
 * arrow keys move between items. On open, focus goes to the checked item (if any) or the first one.
 */
export const DropdownMenu = ({
  label,
  menuLabel,
  trigger,
  triggerClassName,
  widthClassName = 'w-40',
  floating = false,
  flush = false,
  chevron = true,
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
      const target = e.target as Node
      // a floating menu lives in <body>, outside rootRef
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    // a floating menu would drift away from its trigger, so it closes instead
    const onMove = (e: Event) => {
      if (!(e.target instanceof Node && menu?.contains(e.target))) setOpen(false) // scrolling the menu itself is fine
    }
    if (floating) {
      window.addEventListener('scroll', onMove, true)
      window.addEventListener('resize', onMove)
    }
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, floating])

  // place the menu before it's painted: below or above the trigger, whichever has room
  useLayoutEffect(() => {
    const menu = menuRef.current
    const button = buttonRef.current
    if (!open || !menu || !button) return
    const r = button.getBoundingClientRect()
    const height = menu.offsetHeight
    const below = window.innerHeight - r.bottom
    const up = height + GAP + EDGE > below && r.top > below
    const style = menu.style
    if (floating) {
      style.position = 'fixed'
      style.right = `${Math.max(EDGE, window.innerWidth - r.right)}px`
      style.top = up ? '' : `${r.bottom + GAP}px`
      style.bottom = up ? `${window.innerHeight - r.top + GAP}px` : ''
      // a very tall menu still fits: it scrolls inside the room it has
      style.maxHeight = `${Math.max(120, (up ? r.top : below) - GAP - EDGE)}px`
    } else {
      style.top = up ? '' : '100%'
      style.bottom = up ? '100%' : ''
      style.marginTop = up ? '' : `${GAP}px`
      style.marginBottom = up ? `${GAP}px` : ''
    }
  }, [open, floating])

  const toggle = () => setOpen((o) => !o)

  /**
   * A floating menu is drawn in <body>: inside the page, an ancestor with a transform or filter (e.g. a
   * page's enter animation) would make "fixed" relative to that ancestor instead of the window.
   */
  const floatIn = (menu: ReactNode) => (floating ? createPortal(menu, document.body) : menu)

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
        onClick={toggle}
        className={cn(
          'flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-text-muted hover:border-border-strong hover:text-text',
          triggerClassName,
        )}
      >
        {trigger}
        {chevron && (
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={cn('shrink-0 transition-transform duration-150', open && 'rotate-180')}
          />
        )}
      </button>

      {open &&
        floatIn(
          <div
            ref={menuRef}
            role="menu"
            aria-label={menuLabel}
            onClick={onMenuClick}
            onKeyDown={onMenuKeyDown}
            className={cn(
              'z-50 overflow-y-auto rounded-md border border-border bg-surface shadow-lg',
              flush ? 'py-1 [&_[role^=menuitem]]:rounded-none [&_[role^=menuitem]]:px-3' : 'p-1',
              !floating && 'absolute right-0',
              widthClassName,
            )}
          >
            {children}
          </div>,
        )}
    </div>
  )
}
