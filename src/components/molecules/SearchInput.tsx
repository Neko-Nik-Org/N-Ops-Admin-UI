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
/** Search box molecule for filtering tables. */

import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Text input with a search icon. Controlled: the parent owns `value`. */
export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search',
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible name; defaults to the placeholder. */
  label?: string
  className?: string
}) => (
  <div className={cn('relative', className)}>
    <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      className="w-full rounded-md border border-border bg-surface-raised py-2 pr-3 pl-9 text-sm text-text placeholder:text-text-muted focus-visible:border-signal"
    />
  </div>
)
