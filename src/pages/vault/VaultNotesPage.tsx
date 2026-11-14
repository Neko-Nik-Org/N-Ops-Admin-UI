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
/** Vault › Secure notes (/vault/notes): per-project notes, versioned, optionally locked, shareable. */

import { Link2, Lock, NotebookPen, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { LoadingButton, TableSkeleton } from '@/components/loading'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { PageHeader } from '@/components/molecules/PageHeader'
import { SearchInput } from '@/components/molecules/SearchInput'
import { NoteForm, NotePanel, NoteShareDialog } from '@/components/organisms/NotePanels'
import { VaultScopeBar } from '@/components/organisms/VaultScopeBar'
import { useDeleteNote, useNotes, useVaultScope } from '@/features/vault/hooks/useVault'
import type { SecureNote } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { formatRelative } from '@/utils/format'

/** Notes list on the left; the open note (or the new-note form) on the right. */
export const VaultNotesPage = () => {
  const scope = useVaultScope({ needsService: false })
  const { project } = scope
  const { data: notes, isLoading } = useNotes(project?.projectId ?? null)
  const { mutateAsync: remove } = useDeleteNote()
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [sharing, setSharing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<SecureNote | null>(null)
  // passwords of notes unlocked this session; memory only, never stored
  const [passwords, setPasswords] = useState<Record<number, string>>({})

  const q = search.trim().toLowerCase()
  const visible = (notes ?? []).filter((n) => !q || n.title.toLowerCase().includes(q))
  const open = creating ? null : (visible.find((n) => n.noteId === openId) ?? visible[0] ?? null)

  const setPassword = (noteId: number, password: string | undefined) =>
    setPasswords((prev) => {
      const next = { ...prev }
      if (password === undefined) delete next[noteId]
      else next[noteId] = password
      return next
    })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Secure notes"
        description="Runbooks, credentials and anything else your team needs to keep safe. Lock a note with a password for extra protection."
        mock
        actions={
          project && (
            <LoadingButton icon={<Plus size={15} />} onClick={() => setCreating(true)}>
              New note
            </LoadingButton>
          )
        }
      />

      {scope.isLoading ? (
        <TableSkeleton rows={1} columns={3} title={false} />
      ) : (
        <VaultScopeBar scope={scope} withServices={false} />
      )}

      {!scope.isLoading && !project ? (
        <p className="py-10 text-center text-sm text-text-muted">Create a project to get started.</p>
      ) : isLoading || scope.isLoading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search notes" />
            <nav aria-label="Notes" className="flex flex-col gap-1">
              {!visible.length && (
                <p className="px-3 py-6 text-center text-sm text-text-muted">
                  {notes?.length ? 'No notes match.' : 'No notes in this project yet.'}
                </p>
              )}
              {visible.map((n) => (
                <button
                  key={n.noteId}
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setOpenId(n.noteId)
                  }}
                  aria-current={n.noteId === open?.noteId ? 'true' : undefined}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors',
                    n.noteId === open?.noteId ? 'bg-signal/10' : 'hover:bg-ink',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {n.isProtected && <Lock size={13} className="shrink-0 text-signal" aria-label="Locked" />}
                    <span className="truncate text-sm font-medium text-text">{n.title}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {n.ownerName} · {formatRelative(n.updatedAt)}
                    {n.shares.length > 0 && <Users size={12} aria-label={`Shared with ${n.shares.length}`} />}
                    {n.links.length > 0 && <Link2 size={12} aria-label="Has a public link" />}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <section className="min-w-0 rounded-xl border border-border bg-surface-raised p-5">
            {creating && project ? (
              <>
                <h2 className="mb-4 font-semibold text-text">New note in {project.projectName}</h2>
                <NoteForm
                  projectId={project.projectId}
                  onDone={() => setCreating(false)}
                  onSaved={({ noteId, password }) => {
                    if (noteId === undefined) return
                    setOpenId(noteId)
                    setPassword(noteId, password)
                  }}
                />
              </>
            ) : open ? (
              <NotePanel
                key={open.noteId}
                note={open}
                password={passwords[open.noteId]}
                onPassword={(pw) => setPassword(open.noteId, pw)}
                onShare={() => setSharing(open.noteId)}
                onDelete={() => setDeleting(open)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <NotebookPen size={22} className="text-text-muted" aria-hidden="true" />
                <p className="text-sm text-text-muted">Pick a note, or create one.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <NoteShareDialog note={notes?.find((n) => n.noteId === sharing) ?? null} onClose={() => setSharing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete note"
        confirmLabel="Delete note"
        successMessage={`Deleted "${deleting?.title}".`}
        onConfirm={() => remove(deleting!.noteId)}
        onClose={() => setDeleting(null)}
      >
        <p>
          Delete <span className="font-medium text-text">{deleting?.title}</span> with all {deleting?.latestVersion} versions? Its
          public links stop working and people it was shared with lose access. This can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
