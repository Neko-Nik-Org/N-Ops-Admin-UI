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
/** Dropdown in the Topbar that scopes the dashboard to one tag. */

import { ChevronDown, Tag as TagIcon } from 'lucide-react'
import { useSelectedTag } from '@/features/tags/hooks/useTags'
import { cn } from '@/utils/cn'

/** Value of the "All tags" option (a select's values are strings). */
const ALL = 'all'

/**
 * Native select styled as a pill, so keyboard, screen readers and mobile pickers work for free.
 * Hidden until the user's tags have loaded; with no tags it shows a disabled "No tags".
 */
export const TagSelect = ({ className }: { className?: string }) => {
  const { tags, selectedTagId, setSelectedTagId } = useSelectedTag()
  if (!tags) return null
  const empty = tags.length === 0

  return (
    <div className={cn('relative flex shrink-0 items-center', className)}>
      <TagIcon size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 text-accent-secondary" />
      <select
        aria-label="Tag"
        disabled={empty}
        value={selectedTagId === null ? ALL : String(selectedTagId)}
        onChange={(e) => setSelectedTagId(e.target.value === ALL ? null : Number(e.target.value))}
        className="max-w-44 cursor-pointer appearance-none truncate rounded-md border border-border bg-surface-raised py-1.5 pr-8 pl-8 text-sm font-medium text-text hover:border-border-strong focus-visible:border-signal disabled:cursor-default disabled:text-text-muted"
      >
        {empty ? (
          <option value={ALL}>No tags</option>
        ) : (
          <>
            <option value={ALL}>All tags</option>
            {tags.map((tag) => (
              <option key={tag.tagId} value={tag.tagId}>
                {tag.tagName}
              </option>
            ))}
          </>
        )}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-text-muted" />
    </div>
  )
}
