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
 * Searchable multi-select (combobox + listbox): picked values show as removable chips; typing
 * filters the list. Only listed options can be picked. Keyboard: ↑/↓ move, Enter toggles,
 * Escape closes, Backspace in an empty search removes the last chip.
 */

import { Check, ChevronDown, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  /** id of the search input, so a FormField label points at it. */
  id?: string
  options: readonly MultiSelectOption[]
  value: readonly string[]
  onChange: (next: string[]) => void
  placeholder?: string
  hasError?: boolean
  disabled?: boolean
  /** How a picked option's chip reads; defaults to its label. */
  chipLabel?: (option: MultiSelectOption) => string
  /** Shown when the search matches nothing. */
  emptyText?: string
  onBlur?: () => void
}

export const MultiSelect = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Search',
  hasError,
  disabled,
  chipLabel = (o) => o.label,
  emptyText = 'No matches',
  onBlur,
}: MultiSelectProps) => {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    // every option is listed (the country list is ~250); typing narrows it
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase() === q) : options
  }, [options, query])

  // close when focus or a click lands outside
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        onBlur?.()
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, onBlur])

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
    setQuery('')
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter') {
      // never submits the surrounding form
      e.preventDefault()
      const option = open ? matches[active] : undefined
      if (option) toggle(option.value)
      else setOpen(true)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation() // keeps a surrounding dialog open
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  const activeOption = open ? matches[active] : undefined

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'flex min-h-[2.625rem] w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm transition-colors duration-150',
          'focus-within:border-signal',
          hasError && 'border-danger',
          disabled && 'opacity-60',
        )}
        onClick={() => {
          if (disabled) return
          inputRef.current?.focus()
          setOpen(true)
        }}
      >
        {value.map((v) => {
          const option = byValue.get(v) ?? { value: v, label: v }
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-accent-secondary/40 bg-accent-secondary/15 py-0.5 pr-1 pl-2.5 text-xs text-accent-secondary"
            >
              {chipLabel(option)}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${option.label}`}
                className="rounded-full p-0.5 hover:bg-accent-secondary/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(value.filter((x) => x !== v))
                }}
              >
                <X size={12} />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${listId}-${activeOption.value}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-text outline-none placeholder:text-text-muted"
        />
        <ChevronDown size={14} aria-hidden="true" className="mr-1 shrink-0 text-text-muted" />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          {matches.length ? (
            matches.map((option, i) => {
              const selected = value.includes(option.value)
              return (
                <li
                  key={option.value}
                  id={`${listId}-${option.value}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm text-text',
                    i === active && 'bg-ink',
                  )}
                  // keep focus in the search box
                  onPointerDown={(e) => e.preventDefault()}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => toggle(option.value)}
                >
                  <span>
                    {option.label} <span className="font-mono text-xs text-text-muted">{option.value}</span>
                  </span>
                  {selected && <Check size={14} className="text-signal" aria-hidden="true" />}
                </li>
              )
            })
          ) : (
            <li className="px-3 py-2 text-sm text-text-muted">{emptyText}</li>
          )}
        </ul>
      )}
    </div>
  )
}
