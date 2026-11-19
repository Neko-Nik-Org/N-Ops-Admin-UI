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
 * The role editor's permissions as a matrix: one table per section, a row per module and a column
 * per action (View / Create / Edit / Delete, plus "More" for the odd ones). "—" means the module has
 * no such permission. Only modules the signed-in user can grant something in are shown.
 */

import { Check, Ellipsis, Eye, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { MATRIX_ACTIONS, PERMISSION_MATRIX, permissionLabel, rowKeys, type MatrixAction } from '@/features/admin/catalog'
import { cn } from '@/utils/cn'

const COLUMNS: Record<MatrixAction, { label: string; icon: LucideIcon }> = {
  view: { label: 'View', icon: Eye },
  create: { label: 'Create', icon: Plus },
  edit: { label: 'Edit', icon: Pencil },
  delete: { label: 'Delete', icon: Trash2 },
}

const ColumnHead = ({ label, icon: Icon }: { label: string; icon: LucideIcon }) => (
  <th scope="col" className="w-20 border-l border-border px-2 py-2.5 text-center text-xs font-medium text-text">
    <Icon size={15} className="mx-auto mb-1" aria-hidden="true" />
    {label}
  </th>
)

const Dash = () => (
  <span className="text-text-muted" title="Not available for this module">
    <span aria-hidden="true">—</span>
    <span className="sr-only">Not available</span>
  </span>
)

export const PermissionMatrix = ({
  selected,
  onChange,
  canGrant = () => true,
  readOnly = false,
}: {
  selected: readonly string[]
  onChange?: (next: string[]) => void
  /** Whether the signed-in user may hand this permission out (their own role has it). */
  canGrant?: (key: string) => boolean
  /** Shows what `selected` grants: ticks can't change, and only modules with a tick are listed. */
  readOnly?: boolean
}) => {
  const set = (keys: string[], on: boolean) => {
    const rest = selected.filter((k) => !keys.includes(k))
    onChange?.(on ? [...rest, ...keys] : rest)
  }

  const box = (key: string, label: string) => {
    const allowed = canGrant(key)
    if (readOnly)
      return (
        <input
          type="checkbox"
          aria-label={label}
          checked={selected.includes(key)}
          readOnly
          disabled
          title={key}
          className="size-4 accent-[var(--color-signal)]"
        />
      )
    return (
      <input
        type="checkbox"
        aria-label={label}
        checked={selected.includes(key)}
        disabled={!allowed}
        title={allowed ? key : "Your role doesn't have this permission"}
        onChange={(e) => set([key], e.target.checked)}
        className={cn('size-4 accent-[var(--color-signal)]', allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40')}
      />
    )
  }

  // a module is shown when the user can grant something in it (or the role already has some of it)
  const sections = PERMISSION_MATRIX.map((s) => ({
    ...s,
    rows: s.rows.filter((r) => rowKeys(r).some((k) => (!readOnly && canGrant(k)) || selected.includes(k))),
  })).filter((s) => s.rows.length)

  if (!sections.length)
    return (
      <p className="text-sm text-text-muted">
        {readOnly ? 'This role has no permissions.' : 'Your role has no permissions you could give to another role.'}
      </p>
    )

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => {
        const grantable = section.rows.flatMap(rowKeys).filter((k) => readOnly || canGrant(k))
        const count = grantable.filter((k) => selected.includes(k)).length
        const all = count === grantable.length
        const hasMore = section.rows.some((r) => r.more?.length)
        return (
          <div key={section.label} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[36rem] border-collapse text-left" aria-label={`${section.label} permissions`}>
              <thead className="bg-surface-raised">
                <tr>
                  <th scope="col" className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{section.label}</span>
                      <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[0.6875rem] font-normal text-text-muted">
                        {count}/{grantable.length}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          aria-label={`${all ? 'Clear' : 'Select'} all ${section.label} permissions`}
                          onClick={() => set(grantable, !all)}
                          className="ml-auto inline-flex items-center gap-1 rounded-md bg-signal/10 px-2.5 py-1 text-xs font-medium text-signal hover:bg-signal/20"
                        >
                          <Check size={13} aria-hidden="true" />
                          {all ? 'Clear all' : 'Select all'}
                        </button>
                      )}
                    </div>
                  </th>
                  {MATRIX_ACTIONS.map((a) => (
                    <ColumnHead key={a} {...COLUMNS[a]} />
                  ))}
                  {hasMore && <ColumnHead label="More" icon={Ellipsis} />}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="px-3 py-2.5 text-sm font-normal text-text">
                      {row.label}
                    </th>
                    {MATRIX_ACTIONS.map((a) => {
                      const key = row.actions[a]
                      return (
                        <td key={a} className="border-l border-border px-2 py-2.5 text-center">
                          {key ? box(key, permissionLabel(key)) : <Dash />}
                        </td>
                      )
                    })}
                    {hasMore && (
                      <td className="border-l border-border px-2 py-2.5">
                        {row.more?.length ? (
                          <div className="flex flex-col gap-1">
                            {row.more.map((m) => (
                              <label key={m.key} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-text-muted">
                                {box(m.key, permissionLabel(m.key))}
                                <span aria-hidden="true">{m.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Dash />
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
