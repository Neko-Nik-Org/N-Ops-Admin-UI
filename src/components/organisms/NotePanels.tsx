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
/** Secure note panels: read, edit, history and sharing (people in the org, or public links). */

import { History, Link2, Lock, Pencil, Share2, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { CopyButton } from '@/components/molecules/CopyButton'
import { Dialog } from '@/components/molecules/Dialog'
import { DiffView } from '@/components/molecules/DiffView'
import { FormField } from '@/components/molecules/FormField'
import { useAdminUsers } from '@/features/admin/hooks/useAdmin'
import {
  useCreateNote,
  useCreateNoteLink,
  useDeleteNoteLink,
  useNoteContent,
  useNoteVersions,
  useSetNoteShares,
  useUpdateNote,
} from '@/features/vault/hooks/useVault'
import type { NoteAccess, NoteInput, NoteVersion, SecureNote } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { formatDate, formatDateTime, formatRelative } from '@/utils/format'

// ── Edit / create ────────────────────────────────────────

/** Title and content. Creates a (private) note in `projectId`, or saves a new version of `note`. */
export const NoteForm = ({
  projectId,
  note,
  current,
  onDone,
  onSaved,
}: {
  projectId: number
  note?: SecureNote
  current?: NoteVersion
  onDone: () => void
  /** Called with the new note's id after a create. */
  onSaved: (result: { noteId?: number }) => void
}) => {
  const [title, setTitle] = useState(current?.title ?? '')
  const [content, setContent] = useState(current?.content ?? '')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ title?: string }>({})
  const { mutateAsync: create } = useCreateNote()
  const { mutateAsync: update } = useUpdateNote()

  const [state, save] = useAsyncAction(
    async (input: NoteInput): Promise<{ noteId?: number }> => {
      if (note) {
        await update({ noteId: note.noteId, input })
        return {}
      }
      return { noteId: (await create({ projectId, input })).noteId }
    },
    { successMs: 400 },
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrors({ title: 'Give the note a title.' })
      return
    }
    setErrors({})
    save({ title: title.trim(), content, note: reason })
      .then((result) => {
        toast.success(note ? 'Note saved.' : 'Note created. Only you can see it until you share it.')
        onSaved(result)
        setTimeout(onDone, 400)
      })
      .catch((err: Error) => toast.error(err.message))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField id="noteTitle" label="Title" error={errors.title}>
        <Input
          id="noteTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          autoComplete="off"
          autoFocus={!note}
          hasError={!!errors.title}
        />
      </FormField>
      <FormField id="noteContent" label="Note">
        <Textarea
          id="noteContent"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-sm"
        />
      </FormField>
      {!note && (
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Lock size={13} aria-hidden="true" />
          Private: only you can see it until you share it with people or by link.
        </p>
      )}
      {note && (
        <FormField id="noteReason" label="What changed?">
          <Input
            id="noteReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional"
            autoComplete="off"
          />
        </FormField>
      )}
      <div className="flex justify-end gap-2">
        <LoadingButton variant="ghost" onClick={onDone}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Saving" successText="Saved">
          {note ? `Save as v${note.latestVersion + 1}` : 'Create note'}
        </LoadingButton>
      </div>
    </form>
  )
}

// ── History ──────────────────────────────────────────────

const NoteHistory = ({ note, latest }: { note: SecureNote; latest: NoteVersion }) => {
  const { data: versions, isLoading } = useNoteVersions(note.noteId)
  const [picked, setPicked] = useState<NoteVersion | null>(null)
  if (isLoading || !versions) return <SkeletonText lines={4} />
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      <ol className="flex flex-col gap-1" aria-label="Versions">
        {versions.map((v) => (
          <li key={v.version}>
            <button
              type="button"
              onClick={() => setPicked(v)}
              aria-pressed={picked?.version === v.version}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-left',
                picked?.version === v.version ? 'border-signal bg-signal/10' : 'border-transparent hover:bg-ink',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-text">v{v.version}</span>
                {v.version === latest.version && <Badge tone="signal">Latest</Badge>}
              </span>
              <span className="block truncate text-xs text-text-muted" title={formatDateTime(v.createdAt)}>
                {v.createdBy} · {formatRelative(v.createdAt)}
              </span>
              {v.note && <span className="block truncate text-xs text-text-muted">{v.note}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="min-w-0">
        {picked ? (
          <DiffView
            before={picked.content}
            after={latest.content}
            beforeLabel={`v${picked.version}`}
            afterLabel={`v${latest.version} (latest)`}
          />
        ) : (
          <p className="py-6 text-sm text-text-muted">Pick a version to see what changed since.</p>
        )}
      </div>
    </div>
  )
}

// ── Read view ────────────────────────────────────────────

/** Who can see a note, in a few words, for the signed-in user. */
const describeAccess = (note: Pick<SecureNote, 'myAccess' | 'ownerName' | 'shares' | 'links'>): string => {
  if (note.myAccess === 'owner') {
    if (!note.shares.length && !note.links.length) return 'Private: only you'
    const parts = [
      note.shares.length && `${note.shares.length} ${note.shares.length === 1 ? 'person' : 'people'}`,
      note.links.length && `${note.links.length} public link${note.links.length === 1 ? '' : 's'}`,
    ].filter(Boolean)
    return `Shared with ${parts.join(' and ')}`
  }
  return `${note.ownerName} shared this with you · ${note.myAccess === 'edit' ? 'can edit' : 'read only'}`
}

const ACCESS_TONE: Record<NoteAccess, 'signal' | 'accent' | 'neutral'> = { owner: 'signal', edit: 'accent', read: 'neutral' }

/** One note with History, plus Edit (owner or can-edit) and Share / Delete (owner only). */
export const NotePanel = ({ note, onShare, onDelete }: { note: SecureNote; onShare: () => void; onDelete: () => void }) => {
  const [mode, setMode] = useState<'read' | 'edit' | 'history'>('read')
  const { data: current, isLoading, error } = useNoteContent(note.noteId, note.latestVersion)
  const isOwner = note.myAccess === 'owner'
  const canEdit = note.myAccess !== 'read'

  if (error) return <p className="text-sm text-text-muted">Couldn't open the note: {(error as Error).message}</p>
  if (isLoading || !current) return <SkeletonText lines={8} />

  if (mode === 'edit') {
    return (
      <NoteForm
        projectId={note.projectId}
        note={note}
        current={current}
        onDone={() => setMode('read')}
        onSaved={() => undefined}
      />
    )
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-text">{current.title}</h2>
          <p className="text-xs text-text-muted" title={formatDateTime(current.createdAt)}>
            v{current.version} · edited {formatRelative(current.createdAt)} by {current.createdBy} · owner {note.ownerName}
          </p>
          <Badge tone={ACCESS_TONE[note.myAccess]} className="mt-1.5">
            {describeAccess(note)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          <LoadingButton
            variant={mode === 'history' ? 'secondary' : 'ghost'}
            size="sm"
            icon={<History size={14} />}
            aria-pressed={mode === 'history'}
            onClick={() => setMode(mode === 'history' ? 'read' : 'history')}
          >
            History
          </LoadingButton>
          {isOwner && (
            <LoadingButton variant="ghost" size="sm" icon={<Share2 size={14} />} onClick={onShare}>
              Share
            </LoadingButton>
          )}
          {canEdit && (
            <LoadingButton variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setMode('edit')}>
              Edit
            </LoadingButton>
          )}
          {isOwner && (
            <LoadingButton
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              aria-label={`Delete ${current.title}`}
              title="Delete"
              onClick={onDelete}
            />
          )}
        </div>
      </header>

      {isOwner && (note.shares.length > 0 || note.links.length > 0) && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {note.shares.length > 0 && (
            <span className="flex items-center gap-1">
              <Users size={13} aria-hidden="true" />
              Shared with {note.shares.map((s) => s.displayName).join(', ')}
            </span>
          )}
          {note.links.length > 0 && (
            <span className="flex items-center gap-1">
              <Link2 size={13} aria-hidden="true" />
              {note.links.length} public link{note.links.length === 1 ? '' : 's'}
            </span>
          )}
        </p>
      )}

      {mode === 'history' ? (
        <NoteHistory note={note} latest={current} />
      ) : (
        <div className="rounded-lg border border-border bg-ink/40 p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-text">
          {current.content || <span className="text-text-muted">Empty note.</span>}
        </div>
      )}
    </article>
  )
}

// ── Sharing ──────────────────────────────────────────────

const EXPIRY_OPTIONS: Array<[string, number | null]> = [
  ['1 day', 1],
  ['7 days', 7],
  ['30 days', 30],
  ['Never', null],
]

const ShareForm = ({ note }: { note: SecureNote }) => {
  // fixed when the dialog opens, so expiry badges don't flicker between renders
  const [now] = useState(() => Date.now())
  const { data: users, isLoading: usersLoading } = useAdminUsers()
  const [shares, setShares] = useState(() => new Map(note.shares.map((s) => [s.userId, s.canEdit])))
  const { mutateAsync: saveShares } = useSetNoteShares()
  const [shareState, runShares] = useAsyncAction(
    () =>
      saveShares({
        noteId: note.noteId,
        shares: [...shares].map(([userId, canEdit]) => ({
          userId,
          canEdit,
          displayName:
            users?.find((u) => u.userId === userId)?.displayName ?? note.shares.find((s) => s.userId === userId)?.displayName,
        })),
      }),
    { successMs: 600 },
  )
  const [linkPassword, setLinkPassword] = useState('')
  const [expiry, setExpiry] = useState('7')
  const { mutateAsync: createLink } = useCreateNoteLink()
  const { mutateAsync: removeLink } = useDeleteNoteLink()
  const [linkState, runLink] = useAsyncAction(
    () =>
      createLink({
        noteId: note.noteId,
        input: { password: linkPassword, expiresInDays: expiry === 'never' ? null : Number(expiry) },
      }),
    { successMs: 500 },
  )

  const setShare = (userId: number, value: boolean | null) =>
    setShares((prev) => {
      const next = new Map(prev)
      if (value === null) next.delete(userId)
      else next.set(userId, value)
      return next
    })

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">People in your organization</h3>
        <p className="-mt-2 text-xs text-text-muted">
          The note is private to you until you give someone access. “Can edit” lets them save new versions; only you can share or
          delete it.
        </p>
        {usersLoading && <SkeletonText lines={4} />}
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {users
            ?.filter((u) => u.userId !== note.ownerId && u.isActive)
            .map((u) => {
              const access = shares.get(u.userId)
              return (
                <li key={u.userId} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-ink">
                  <span className="text-sm text-text">{u.displayName}</span>
                  <Select
                    aria-label={`Access for ${u.displayName}`}
                    value={access === undefined ? 'none' : access ? 'edit' : 'read'}
                    onChange={(e) => setShare(u.userId, e.target.value === 'none' ? null : e.target.value === 'edit')}
                    className="w-32"
                  >
                    <option value="none">No access</option>
                    <option value="read">Can read</option>
                    <option value="edit">Can edit</option>
                  </Select>
                </li>
              )
            })}
        </ul>
        <div className="flex justify-end">
          <LoadingButton
            size="sm"
            state={shareState}
            loadingText="Saving"
            successText="Saved"
            onClick={() =>
              runShares()
                .then(() => toast.success('Sharing updated.'))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            Save access
          </LoadingButton>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-text">Public links</h3>
        <p className="text-xs text-text-muted">
          Anyone with a link can read the latest version without signing in. Add a password and an expiry if you like; remove a
          link to stop it working.
        </p>
        {note.links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {note.links.map((l) => {
              const expired = !!l.expiresAt && new Date(l.expiresAt).getTime() < now
              return (
                <li key={l.shareId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-text">{l.url}</code>
                  {l.hasPassword && <Badge tone="accent">Password</Badge>}
                  <Badge tone={expired ? 'danger' : 'neutral'}>
                    {l.expiresAt ? (expired ? 'Expired' : `Until ${formatDate(l.expiresAt)}`) : 'No expiry'}
                  </Badge>
                  <CopyButton text={l.url} label="Copy link" />
                  <LoadingButton
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    aria-label="Remove link"
                    onClick={() =>
                      removeLink({ noteId: note.noteId, shareId: l.shareId })
                        .then(() => toast.success('Link removed.'))
                        .catch((e: Error) => toast.error(e.message))
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <FormField id="linkPassword" label="Link password (optional)">
            <Input
              id="linkPassword"
              type="password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              autoComplete="new-password"
              className="w-48"
            />
          </FormField>
          <FormField id="linkExpiry" label="Expires after">
            <Select id="linkExpiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-32">
              {EXPIRY_OPTIONS.map(([label, days]) => (
                <option key={label} value={days ?? 'never'}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <LoadingButton
            variant="secondary"
            icon={<Link2 size={14} />}
            state={linkState}
            loadingText="Creating"
            successText="Created"
            onClick={() =>
              runLink()
                .then(() => {
                  setLinkPassword('')
                  toast.success('Link created.')
                })
                .catch((e: Error) => toast.error(e.message))
            }
          >
            Create link
          </LoadingButton>
        </div>
      </section>
    </div>
  )
}

/** Who in the org can read or edit `note`, and its public links (owner only). */
export const NoteShareDialog = ({ note, onClose }: { note: SecureNote | null; onClose: () => void }) => (
  <Dialog open={!!note} onClose={onClose} size="lg" title={`Share "${note?.title ?? ''}"`}>
    {note && <ShareForm note={note} />}
  </Dialog>
)
