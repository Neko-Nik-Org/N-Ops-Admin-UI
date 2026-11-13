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

/** Tags page (/tags): list, create, edit and delete tags. */

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { LoadingButton, TableSkeleton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { TagFormDialog } from '@/components/organisms/TagFormDialog'
import { useHasPermissions, useHasTagAccess } from '@/features/auth/permissions'
import { useDeleteTag, useTags } from '@/features/tags/hooks/useTags'
import type { Tag } from '@/features/tags/types'

/** Which dialog is open, and for which tag. */
type DialogState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; tag: Tag } | { kind: 'delete'; tag: Tag }

/** Confirmation dialog for deleting a tag. Open while `tag` is set. */
const DeleteTagDialog = ({ tag, onClose }: { tag: Tag | null; onClose: () => void }) => {
  const { mutateAsync: remove } = useDeleteTag()
  const [state, run] = useAsyncAction((tagId: number) => remove(tagId), { successMs: 500 })

  const confirm = () => {
    if (!tag) return
    run(tag.tagId)
      .then(() => {
        toast.success(`Deleted "${tag.tagName}".`)
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))
  }

  return (
    <Dialog open={!!tag} onClose={onClose} title="Delete tag">
      <p className="text-sm text-text-muted">
        Delete <span className="font-medium text-text">{tag?.tagName}</span>? Roles scoped to this tag lose it, and anything
        that references it (such as API keys) is removed with it. This can't be undone.
      </p>
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton variant="danger" state={state} loadingText="Deleting" successText="Deleted" onClick={confirm}>
          Delete tag
        </LoadingButton>
      </div>
    </Dialog>
  )
}

/**
 * Tag management page. Buttons are shown only when the user has the matching
 * `tag:*` permission and access to that tag.
 */
export const TagsPage = () => {
  const { data: tags, isLoading, error } = useTags()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const canCreate = useHasPermissions('tag:view', 'tag:create')
  const canEdit = useHasPermissions('tag:view', 'tag:edit')
  const canDelete = useHasPermissions('tag:view', 'tag:delete')
  const hasTagAccess = useHasTagAccess()
  const close = () => setDialog({ kind: 'closed' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Tags</h1>
          <p className="text-sm text-text-muted">Group resources and scope role access. Keep it to around 25 tags or fewer.</p>
        </div>
        {canCreate && (
          <LoadingButton icon={<Plus size={15} />} onClick={() => setDialog({ kind: 'create' })}>
            New tag
          </LoadingButton>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : error ? (
        <div className="rounded-xl border border-border bg-surface-raised p-10 text-center">
          <h2 className="font-semibold text-text">Couldn't load tags</h2>
          <p className="mt-1 text-sm text-text-muted">{error.message}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="mb-4 font-semibold text-text">
            All tags <span className="ml-1 text-sm font-normal text-text-muted">{tags?.length ?? 0}</span>
          </h2>

          {!tags?.length ? (
            <p className="py-8 text-center text-sm text-text-muted">No tags yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="text-xs tracking-wide text-text-muted uppercase">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => {
                    const accessible = hasTagAccess(tag.tagId)
                    return (
                      <tr key={tag.tagId} className="border-t border-border">
                        <td className="py-3">
                          <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-xs text-accent-secondary">{tag.tagName}</span>
                        </td>
                        <td className="max-w-md py-3 text-sm text-text-muted">{tag.tagDescription || '—'}</td>
                        <td className="py-3 font-mono text-xs text-text-muted">{tag.tagId}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            {canEdit && accessible && (
                              <LoadingButton
                                variant="ghost"
                                size="sm"
                                icon={<Pencil size={14} />}
                                aria-label={`Edit ${tag.tagName}`}
                                onClick={() => setDialog({ kind: 'edit', tag })}
                              />
                            )}
                            {canDelete && accessible && (
                              <LoadingButton
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={14} />}
                                aria-label={`Delete ${tag.tagName}`}
                                onClick={() => setDialog({ kind: 'delete', tag })}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <TagFormDialog
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        tag={dialog.kind === 'edit' ? dialog.tag : undefined}
        onClose={close}
      />
      <DeleteTagDialog tag={dialog.kind === 'delete' ? dialog.tag : null} onClose={close} />
    </div>
  )
}
