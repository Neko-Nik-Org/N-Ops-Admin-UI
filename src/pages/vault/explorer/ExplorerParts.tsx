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
 * Building blocks of the Vault explorer, made from the app's usual parts: a page header whose title
 * is the open folder (with its path above), a card with the folder's list, and the details pane on
 * the right that shows whatever is selected.
 */

import { useAtom } from 'jotai'
import { ChevronRight, CloudOff, LayoutGrid, List, X } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { cn } from '@/utils/cn'
import { explorerViewAtom } from './explorerView'

/** One step of the folder path above the title. */
export interface Crumb {
  label: string
  to: string
}

/**
 * The page header for a folder: its path as links ("Vault / payments-api"), the folder as the
 * title, what it holds as the description, and its actions on the right.
 */
export const FolderHeader = ({
  path,
  title,
  description,
  actions,
  badge,
}: {
  /** Ancestors of the open folder, outermost first. */
  path: readonly Crumb[]
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Shown beside the title. */
  badge?: ReactNode
}) => (
  <div className="flex flex-col gap-1">
    {path.length > 0 && (
      <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-text-muted">
        {path.map((c) => (
          <span key={c.to} className="flex min-w-0 items-center gap-1">
            <Link to={c.to} className="truncate hover:text-text">
              {c.label}
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        ))}
        <span aria-current="page" className="truncate text-text">
          {title}
        </span>
      </nav>
    )}
    <PageHeader title={title} description={description} actions={actions} badge={badge} />
  </div>
)

/** One column of the details list. The first column always shows the item's icon and name. */
export interface DetailsColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  className?: string
}

interface DetailsListProps<T> {
  /** Accessible name of the list, e.g. "Contents of Env". */
  label: string
  rows: readonly T[]
  rowId: (row: T) => number
  name: (row: T) => ReactNode
  /** A short muted line under the name (e.g. a project's description). */
  subtitle?: (row: T) => ReactNode
  icon: (row: T) => ReactNode
  columns: ReadonlyArray<DetailsColumn<T>>
  selectedId: number | null
  onSelect: (id: number) => void
  /** Double-click or Enter: open a folder, or an item's main view. */
  onOpen?: (row: T) => void
  /** Delete key on the selected row. */
  onDelete?: (row: T) => void
  /** Backspace: go up a level. */
  onUp?: () => void
  empty: ReactNode
}

/**
 * Explorer's "Details" view: the folder's contents as a table (icon, name and columns). Click to
 * select and see it in the details pane, double-click or Enter to open, arrow keys to move,
 * Backspace to go up, Delete to delete.
 */
export const DetailsList = <T,>({
  label,
  rows,
  rowId,
  name,
  subtitle,
  icon,
  columns,
  selectedId,
  onSelect,
  onOpen,
  onDelete,
  onUp,
  empty,
}: DetailsListProps<T>) => {
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>())
  if (!rows.length) return <div className="py-10 text-center text-sm text-text-muted">{empty}</div>

  const focusIndex = (index: number) => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))]
    if (!row) return
    onSelect(rowId(row))
    rowRefs.current.get(rowId(row))?.focus()
  }

  const onKeyDown = (e: KeyboardEvent, row: T, index: number) => {
    if (e.key === 'ArrowDown') focusIndex(index + 1)
    else if (e.key === 'ArrowUp') focusIndex(index - 1)
    else if (e.key === 'Home') focusIndex(0)
    else if (e.key === 'End') focusIndex(rows.length - 1)
    else if (e.key === 'Enter') onOpen?.(row)
    else if (e.key === 'Delete') onDelete?.(row)
    else if (e.key === 'Backspace') onUp?.()
    else return
    e.preventDefault()
  }

  // the selected row (or the first) is the one Tab lands on
  const tabStop = rows.some((r) => rowId(r) === selectedId) ? selectedId : rowId(rows[0]!)

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table role="grid" aria-label={label} className="w-full min-w-[26rem] border-collapse text-left">
        <thead>
          <tr className="text-xs tracking-wide text-text-muted uppercase">
            <th className="w-[40%] min-w-44 pb-2 font-medium">Name</th>
            {columns.map((c) => (
              <th key={c.key} className={cn('pb-2 font-medium', c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = rowId(row)
            const selected = id === selectedId
            return (
              <tr
                key={id}
                ref={(el) => {
                  if (el) rowRefs.current.set(id, el)
                  else rowRefs.current.delete(id)
                }}
                tabIndex={id === tabStop ? 0 : -1}
                aria-selected={selected}
                onClick={() => onSelect(id)}
                onDoubleClick={() => onOpen?.(row)}
                onKeyDown={(e) => onKeyDown(e, row, index)}
                className={cn(
                  'cursor-default border-t border-border outline-none select-none',
                  selected ? 'bg-signal/10' : 'hover:bg-ink/50',
                  'focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset',
                )}
              >
                <td role="gridcell" className="py-2.5 pr-3 pl-2">
                  <span className="flex max-w-[22rem] min-w-0 items-center gap-2.5">
                    <span className="shrink-0" aria-hidden="true">
                      {icon(row)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className={cn('truncate text-sm', selected ? 'font-medium text-signal' : 'text-text')}>
                        {name(row)}
                      </span>
                      {subtitle && <span className="truncate text-xs text-text-muted">{subtitle(row)}</span>}
                    </span>
                  </span>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    role="gridcell"
                    className={cn('py-2.5 pr-3 text-sm whitespace-nowrap text-text-muted', c.className)}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The list card: a heading with the item count, a search box, and the list itself. `note` sits
 * under the heading (e.g. which tag the list is filtered to).
 */
export const ListCard = ({
  title,
  count,
  search,
  onSearch,
  note,
  children,
}: {
  title: string
  count: number
  search: string
  onSearch: (text: string) => void
  note?: ReactNode
  children: ReactNode
}) => (
  <section aria-label={title} className="min-w-0 rounded-xl border border-border bg-surface-raised p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-semibold text-text">
          {title} <span className="ml-1 text-sm font-normal text-text-muted">{count}</span>
        </h2>
        {note && <p className="mt-0.5 text-xs text-text-muted">{note}</p>}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder={`Search ${title.toLowerCase()}`}
          className="flex-1 sm:w-56"
        />
        <ViewToggle />
      </div>
    </div>
    {children}
  </section>
)

/**
 * The details pane on the right of the list: shows the selected item. `onClose` adds a close
 * button (shown when something is selected).
 */
export const PreviewCard = ({ children, onClose }: { children: ReactNode; onClose?: () => void }) => (
  <aside
    aria-label="Preview"
    className="min-w-0 rounded-xl border border-border bg-surface-raised p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto"
  >
    {onClose && (
      <div className="-mt-2 mb-3 flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-medium tracking-wide text-text-muted uppercase">Details</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          title="Close details"
          className="-mr-2 flex size-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-ink hover:text-text"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    )}
    {children}
  </aside>
)

/** Shown in the preview card when nothing is selected. */
export const PreviewHint = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-40 flex-col items-center justify-center gap-1 text-center text-sm text-text-muted">{children}</div>
)

/**
 * The list on the left and the details pane on the right (stacked on narrow screens). `wide` gives
 * editors (Conf files, Notes) more room.
 */
export const FolderLayout = ({ list, preview, wide = false }: { list: ReactNode; preview: ReactNode; wide?: boolean }) => (
  <div
    className={cn(
      'grid grid-cols-1 items-start gap-4',
      wide ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]' : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]',
    )}
  >
    {list}
    {preview}
  </div>
)

/** A folder's whole page: header, then list and preview. */
export const FolderPage = ({ header, children }: { header: ReactNode; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-6">
    {header}
    {children}
  </div>
)

/**
 * Beside Env, Conf and Notes: the API has no endpoints for them yet, so what you add is kept in this
 * browser tab only and is gone after a reload.
 */
export const LocalOnlyBadge = () => (
  <span
    className="inline-flex items-center gap-1 rounded-full border border-border bg-ink/40 px-2 py-0.5 text-xs font-medium text-text-muted"
    title="The API can't store these yet. What you add here is kept in this tab until you reload."
  >
    <CloudOff size={12} aria-hidden="true" />
    Not saved to the server yet
  </span>
)

// ── Large icons ──────────────────────────────────────────

/** Switches between "Large icons" and "Details", like Explorer's View menu. */
export const ViewToggle = () => {
  const [view, setView] = useAtom(explorerViewAtom)
  const option = (value: typeof view, label: string, Icon: typeof List) => (
    <button
      type="button"
      onClick={() => setView(value)}
      aria-pressed={view === value}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-md transition-colors',
        view === value ? 'bg-signal/15 text-signal' : 'text-text-muted hover:bg-ink hover:text-text',
      )}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  )
  return (
    <div role="group" aria-label="View" className="flex shrink-0 gap-0.5 rounded-lg border border-border p-0.5">
      {option('icons', 'Large icons', LayoutGrid)}
      {option('details', 'Details', List)}
    </div>
  )
}

interface IconGridProps<T> {
  label: string
  rows: readonly T[]
  rowId: (row: T) => number
  name: (row: T) => string
  /** A short second line under the name (e.g. the tag). */
  subtitle?: (row: T) => ReactNode
  bigIcon: (row: T) => ReactNode
  selectedId: number | null
  onSelect: (id: number) => void
  onOpen?: (row: T) => void
  onDelete?: (row: T) => void
  onUp?: () => void
  empty: ReactNode
}

/**
 * Explorer's "Large icons" view: a grid of tiles, each a big icon with the name underneath. Same
 * behaviour as the details list; the arrow keys move in all four directions.
 */
export const IconGrid = <T,>({
  label,
  rows,
  rowId,
  name,
  subtitle,
  bigIcon,
  selectedId,
  onSelect,
  onOpen,
  onDelete,
  onUp,
  empty,
}: IconGridProps<T>) => {
  const tiles = useRef(new Map<number, HTMLDivElement>())
  if (!rows.length) return <div className="py-10 text-center text-sm text-text-muted">{empty}</div>

  /** Tiles per row, read from the layout (all tiles of the first row share its top edge). */
  const columns = () => {
    const tops = rows.map((r) => tiles.current.get(rowId(r))?.offsetTop ?? 0)
    const perRow = tops.filter((t) => t === tops[0]).length
    return perRow > 0 && perRow < rows.length ? perRow : rows.length
  }

  const focusIndex = (index: number) => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))]
    if (!row) return
    onSelect(rowId(row))
    tiles.current.get(rowId(row))?.focus()
  }

  const onKeyDown = (e: KeyboardEvent, row: T, index: number) => {
    if (e.key === 'ArrowRight') focusIndex(index + 1)
    else if (e.key === 'ArrowLeft') focusIndex(index - 1)
    else if (e.key === 'ArrowDown') focusIndex(index + columns())
    else if (e.key === 'ArrowUp') focusIndex(index - columns())
    else if (e.key === 'Home') focusIndex(0)
    else if (e.key === 'End') focusIndex(rows.length - 1)
    else if (e.key === 'Enter') onOpen?.(row)
    else if (e.key === 'Delete') onDelete?.(row)
    else if (e.key === 'Backspace') onUp?.()
    else return
    e.preventDefault()
  }

  const tabStop = rows.some((r) => rowId(r) === selectedId) ? selectedId : rowId(rows[0]!)

  return (
    <div role="listbox" aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-1">
      {rows.map((row, index) => {
        const id = rowId(row)
        const selected = id === selectedId
        return (
          <div
            key={id}
            ref={(el) => {
              if (el) tiles.current.set(id, el)
              else tiles.current.delete(id)
            }}
            role="option"
            aria-selected={selected}
            tabIndex={id === tabStop ? 0 : -1}
            title={name(row)}
            onClick={() => onSelect(id)}
            onDoubleClick={() => onOpen?.(row)}
            onKeyDown={(e) => onKeyDown(e, row, index)}
            className={cn(
              'flex cursor-default flex-col items-center gap-1.5 rounded-lg border px-1.5 pt-3 pb-2 text-center outline-none select-none',
              selected ? 'border-signal/40 bg-signal/15' : 'border-transparent hover:bg-ink/60',
              'focus-visible:ring-1 focus-visible:ring-signal',
            )}
          >
            <span className="flex h-16 items-end justify-center">{bigIcon(row)}</span>
            <span
              className={cn('line-clamp-2 text-xs leading-snug break-all', selected ? 'font-medium text-signal' : 'text-text')}
            >
              {name(row)}
            </span>
            {subtitle && <span className="-mt-0.5 max-w-full truncate text-[0.6875rem] text-text-muted">{subtitle(row)}</span>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * A folder's contents in the chosen view: Large icons (tiles) or Details (table). Both share the
 * selection and keyboard behaviour.
 */
export const FolderContents = <T,>(
  props: DetailsListProps<T> & {
    /** Plain-text name, used for tiles and tooltips. */
    text: (row: T) => string
    bigIcon: (row: T) => ReactNode
    /** The line under the name in Details view (tiles show `subtitle`; Details has columns for it). */
    detailsSubtitle?: (row: T) => ReactNode
  },
) => {
  const [view] = useAtom(explorerViewAtom)
  if (view === 'details') return <DetailsList {...props} subtitle={props.detailsSubtitle} />
  return (
    <IconGrid
      label={props.label}
      rows={props.rows}
      rowId={props.rowId}
      name={props.text}
      subtitle={props.subtitle}
      bigIcon={props.bigIcon}
      selectedId={props.selectedId}
      onSelect={props.onSelect}
      onOpen={props.onOpen}
      onDelete={props.onDelete}
      onUp={props.onUp}
      empty={props.empty}
    />
  )
}
