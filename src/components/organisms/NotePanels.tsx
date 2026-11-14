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
/** Secure note panels: unlock, read, edit (with lock settings), history and sharing. */

import { History, Link2, Lock, Pencil, Share2, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, SkeletonText, useAsyncAction } from '@/components/loading'
import { CopyButton } from '@/components/molecules/CopyButton'
import { Dialog } from '@/components/molecules/Dialog'
import { DiffView } from '@/components/molecules/DiffView'
import { FormField } from '@/components/molecules/FormField'
import { useAdminUsers } from '@/features/admin/hooks/useAdmin'
import { NoteLockedError } from '@/features/vault/api/notes'
import {
  useCreateNote,
  useCreateNoteLink,
  useDeleteNoteLink,
  useNoteContent,
  useNoteVersions,
  useSetNoteShares,
  useUpdateNote,
} from '@/features/vault/hooks/useVault'
import type { NoteInput, NoteVersion, SecureNote } from '@/features/vault/types'
import { cn } from '@/utils/cn'
import { formatDate, formatDateTime, formatRelative } from '@/utils/format'

// ── Edit / create ────────────────────────────────────────

/** Title, content and lock settings. Creates a note in `projectId`, or saves a new version of `note`. */
export const NoteForm = ({
  projectId,
  note,
  current,
  password,
  onDone,
  onSaved,
}: {
  projectId: number
  note?: SecureNote
  current?: NoteVersion
  /** The password the note was unlocked with. */
  password?: string
  onDone: () => void
  /** Called with the new note's id, or the password now in effect after an edit. */
  onSaved: (result: { noteId?: number; password?: string }) => void
}) => {
  const [title, setTitle] = useState(current?.title ?? '')
  const [content, setContent] = useState(current?.content ?? '')
  const [locked, setLocked] = useState(note?.isProtected ?? false)
  const [changePassword, setChangePassword] = useState(!note?.isProtected)
  const [newPassword, setNewPassword] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ title?: string; password?: string }>({})
  const { mutateAsync: create } = useCreateNote()
  const { mutateAsync: update } = useUpdateNote()

  /** undefined = keep the lock as is, '' = remove it, otherwise the new password. */
  const passwordChange = (): string | undefined => {
    if (!locked) return note?.isProtected ? '' : undefined
    return changePassword ? newPassword : undefined
  }

  const [state, save] = useAsyncAction(
    async (input: NoteInput) => {
      if (note) {
        await update({ noteId: note.noteId, input, password })
        return { password: input.password === undefined ? password : input.password || undefined }
      }
      return { noteId: (await create({ projectId, input })).noteId, password: input.password || undefined }
    },
    { successMs: 400 },
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!title.trim()) next.title = 'Give the note a title.'
    if (locked && changePassword && newPassword.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    if (Object.keys(next).length) return
    save({ title: title.trim(), content, password: passwordChange(), note: reason })
      .then((result) => {
        toast.success(note ? 'Note saved.' : 'Note created.')
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
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <Switch
          label="Lock with a password"
          description="The note is encrypted with this password. Nobody can read it without it, and it can't be recovered."
          checked={locked}
          onChange={(e) => setLocked(e.target.checked)}
        />
        {locked && note?.isProtected && !changePassword && (
          <button
            type="button"
            className="w-fit text-sm text-signal hover:text-signal-strong"
            onClick={() => setChangePassword(true)}
          >
            Change password
          </button>
        )}
        {locked && changePassword && (
          <FormField id="notePassword" label={note?.isProtected ? 'New password' : 'Password'} error={errors.password}>
            <Input
              id="notePassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              hasError={!!errors.password}
            />
          </FormField>
        )}
      </div>
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

// ── Unlock ───────────────────────────────────────────────

/** Asks for a locked note's password. `error` comes from the last failed attempt. */
const UnlockForm = ({ note, error, onUnlock }: { note: SecureNote; error?: string; onUnlock: (password: string) => void }) => {
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (password) onUnlock(password)
      }}
      className="mx-auto flex max-w-sm flex-col items-center gap-4 py-10 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-xl border border-signal/40 bg-signal/10 text-signal">
        <Lock size={22} aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-semibold text-text">{note.title}</h2>
        <p className="text-sm text-text-muted">This note is locked. Enter its password to read it.</p>
      </div>
      <FormField id="unlockPassword" label="Password" error={error}>
        <Input
          id="unlockPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          autoFocus
          hasError={!!error}
          className="w-72"
        />
      </FormField>
      <LoadingButton type="submit" disabled={!password}>
        Unlock
      </LoadingButton>
    </form>
  )
}

// ── History ──────────────────────────────────────────────

const NoteHistory = ({ note, password, latest }: { note: SecureNote; password?: string; latest: NoteVersion }) => {
  const { data: versions, isLoading } = useNoteVersions(note.noteId, password, true)
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

/**
 * One note: asks for the password if it's locked, then shows it with Edit, History, Share and Delete.
 * `password` / `onPassword` keep the unlock for this session (memory only).
 */
export const NotePanel = ({
  note,
  password,
  onPassword,
  onShare,
  onDelete,
}: {
  note: SecureNote
  password?: string
  onPassword: (password: string | undefined) => void
  onShare: () => void
  onDelete: () => void
}) => {
  const [mode, setMode] = useState<'read' | 'edit' | 'history'>('read')
  // bumps on every unlock attempt, so a retried password refetches (the password itself isn't cached)
  const [attempt, setAttempt] = useState(0)
  const canRead = !note.isProtected || password !== undefined
  const { data: current, isLoading, error } = useNoteContent(note.noteId, password, canRead, `${note.latestVersion}-${attempt}`)
  const unlock = (value: string) => {
    onPassword(value)
    setAttempt((n) => n + 1)
  }

  if (!canRead || error instanceof NoteLockedError) {
    return (
      <UnlockForm
        note={note}
        error={error instanceof NoteLockedError && password !== undefined ? error.message : undefined}
        onUnlock={unlock}
      />
    )
  }
  if (isLoading || !current) return <SkeletonText lines={8} />
  if (error) return <p className="text-sm text-text-muted">Couldn't open the note: {(error as Error).message}</p>

  if (mode === 'edit') {
    return (
      <NoteForm
        projectId={note.projectId}
        note={note}
        current={current}
        password={password}
        onDone={() => setMode('read')}
        onSaved={({ password: next }) => onPassword(next)}
      />
    )
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
            {note.isProtected && <Lock size={16} className="text-signal" aria-label="Locked" />}
            {current.title}
          </h2>
          <p className="text-xs text-text-muted" title={formatDateTime(current.createdAt)}>
            v{current.version} · edited {formatRelative(current.createdAt)} by {current.createdBy} · owner {note.ownerName}
          </p>
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
          <LoadingButton variant="ghost" size="sm" icon={<Share2 size={14} />} onClick={onShare}>
            Share
          </LoadingButton>
          <LoadingButton variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setMode('edit')}>
            Edit
          </LoadingButton>
          <LoadingButton
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            aria-label={`Delete ${current.title}`}
            title="Delete"
            onClick={onDelete}
          />
        </div>
      </header>

      {(note.shares.length > 0 || note.links.length > 0) && (
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
        <NoteHistory note={note} password={password} latest={current} />
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
  const { data: users } = useAdminUsers()
  const [shares, setShares] = useState(() => new Map(note.shares.map((s) => [s.userId, s.canEdit])))
  const { mutateAsync: saveShares } = useSetNoteShares()
  const [shareState, runShares] = useAsyncAction(
    () => saveShares({ noteId: note.noteId, shares: [...shares].map(([userId, canEdit]) => ({ userId, canEdit })) }),
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
          Anyone with a link can read the latest version, without signing in. Remove a link to stop it working.
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

/** Who in the org can read or edit `note`, and its public links. */
export const NoteShareDialog = ({ note, onClose }: { note: SecureNote | null; onClose: () => void }) => (
  <Dialog open={!!note} onClose={onClose} size="lg" title={`Share "${note?.title ?? ''}"`}>
    {note && <ShareForm note={note} />}
  </Dialog>
)
