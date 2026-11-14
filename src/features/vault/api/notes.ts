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
 * Secure notes per project: versioned, optionally locked with a password, shared with people in
 * the org or by public link. Mock until `/vault/note/*` is live.
 */

import { db as adminDb, clone, mockDelay, notFound, recordAudit } from '@/features/admin/mock/db'
import moment from 'moment'
import { me, vaultDb, type StoredNote } from '../mock/db'
import type { NoteInput, NoteLink, NoteLinkInput, NoteShare, NoteVersion, SecureNote } from '../types'

/** Thrown when a locked note is opened without the right password. */
export class NoteLockedError extends Error {
  constructor(wrong: boolean) {
    super(wrong ? "That password isn't right." : 'This note is locked. Enter its password to open it.')
    this.name = 'NoteLockedError'
  }
}

const findNote = (noteId: number) => vaultDb.notes.find((n) => n.noteId === noteId) ?? notFound('note')
const latest = (note: StoredNote) => note.versions.at(-1)!
const projectName = (projectId: number) => vaultDb.projects.find((p) => p.projectId === projectId)?.projectName ?? '?'

/** Where public links point. The public page itself isn't built yet. */
const linkUrl = (shareId: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/s/${shareId}`

const summary = (note: StoredNote): SecureNote => ({
  noteId: note.noteId,
  projectId: note.projectId,
  title: latest(note).title,
  ownerId: note.ownerId,
  ownerName: adminDb.users.find((u) => u.userId === note.ownerId)?.displayName ?? 'Removed user',
  isProtected: note.password !== null,
  latestVersion: latest(note).version,
  createdAt: note.createdAt,
  updatedAt: latest(note).createdAt,
  shares: clone(note.shares),
  links: note.links.map((l) => ({ ...l, url: linkUrl(l.shareId) })),
})

/** Rejects a missing or wrong password on a locked note. */
const unlock = (note: StoredNote, password?: string) => {
  if (note.password !== null && password !== note.password) throw new NoteLockedError(password !== undefined)
}

/** Note titles are unique per owner and project. */
const checkTitle = (projectId: number, title: string, exceptId?: number) => {
  const clean = title.trim()
  if (!clean) throw new Error('Give the note a title.')
  if (clean.length > 100) throw new Error('Keep the title to 100 characters or fewer.')
  if (
    vaultDb.notes.some(
      (n) => n.noteId !== exceptId && n.projectId === projectId && n.ownerId === me().userId && latest(n).title === clean,
    )
  ) {
    throw new Error(`You already have a note called "${clean}" in this project.`)
  }
  return clean
}

/** Future: `GET /vault/note/list?project_id` — notes you own or that are shared with you. */
export const listNotes = async (projectId: number): Promise<SecureNote[]> => {
  await mockDelay()
  return vaultDb.notes
    .filter((n) => n.projectId === projectId)
    .map(summary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Future: `POST /vault/note/open/{id}` — the latest version. Locked notes need their password. Audited. */
export const openNote = async (noteId: number, password?: string): Promise<NoteVersion> => {
  await mockDelay()
  const note = findNote(noteId)
  unlock(note, password)
  recordAudit('vault.note_read', 'vault', `${projectName(note.projectId)} / ${latest(note).title}`)
  return clone(latest(note))
}

/** Future: `POST /vault/note/versions/{id}` — every version, newest first. */
export const listNoteVersions = async (noteId: number, password?: string): Promise<NoteVersion[]> => {
  await mockDelay()
  const note = findNote(noteId)
  unlock(note, password)
  return clone(note.versions).reverse()
}

/** Future: `POST /vault/note/create`. */
export const createNote = async (projectId: number, input: NoteInput): Promise<SecureNote> => {
  await mockDelay()
  const title = checkTitle(projectId, input.title)
  const limit = adminDb.organization.limits.vaultNotesPerProject
  if (vaultDb.notes.filter((n) => n.projectId === projectId).length >= limit)
    throw new Error(`Your plan allows ${limit} notes per project.`)
  const now = new Date().toISOString()
  const note: StoredNote = {
    noteId: vaultDb.nextId.note++,
    projectId,
    ownerId: me().userId,
    password: input.password || null,
    createdAt: now,
    shares: [],
    links: [],
    versions: [{ version: 1, title, content: input.content, createdAt: now, createdBy: me().displayName, note: '' }],
  }
  vaultDb.notes.push(note)
  recordAudit('vault.note_create', 'vault', `${projectName(projectId)} / ${title}`, note.password ? 'Locked with a password' : '')
  return summary(note)
}

/**
 * Future: `PUT /vault/note/update` — saves a new version. `currentPassword` unlocks a locked note;
 * `input.password` sets a new password ('' removes it, undefined keeps it).
 */
export const updateNote = async (noteId: number, input: NoteInput, currentPassword?: string): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  unlock(note, currentPassword)
  const title = checkTitle(note.projectId, input.title, noteId)
  const prev = latest(note)
  const passwordChanged = input.password !== undefined && (input.password || null) !== note.password
  if (prev.title === title && prev.content === input.content && !passwordChanged) throw new Error('Nothing changed.')
  if (input.password !== undefined) note.password = input.password || null
  if (prev.title !== title || prev.content !== input.content) {
    note.versions.push({
      version: prev.version + 1,
      title,
      content: input.content,
      createdAt: new Date().toISOString(),
      createdBy: me().displayName,
      note: input.note ?? '',
    })
  }
  recordAudit(
    'vault.note_update',
    'vault',
    `${projectName(note.projectId)} / ${title}`,
    passwordChanged ? (note.password ? 'Password set' : 'Password removed') : `v${latest(note).version}`,
  )
}

/** Future: `DELETE /vault/note/delete/{id}` — the note, its history, shares and links. */
export const deleteNote = async (noteId: number): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  vaultDb.notes = vaultDb.notes.filter((n) => n.noteId !== noteId)
  recordAudit('vault.note_delete', 'vault', `${projectName(note.projectId)} / ${latest(note).title}`)
}

/** Future: `PUT /vault/note/shares` — replaces who in the org can read (or edit) the note. */
export const setNoteShares = async (noteId: number, shares: Array<Pick<NoteShare, 'userId' | 'canEdit'>>): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  note.shares = shares
    .filter((s) => s.userId !== note.ownerId)
    .map((s) => ({ ...s, displayName: adminDb.users.find((u) => u.userId === s.userId)?.displayName ?? notFound('user') }))
  recordAudit(
    'vault.note_share',
    'vault',
    `${projectName(note.projectId)} / ${latest(note).title}`,
    `${note.shares.length} people`,
  )
}

/** Random link id, like the schema's VARCHAR(50) public_share_id. */
const shareId = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (b) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56],
  ).join('')

/** Future: `POST /vault/note/link` — a public, read-only link, optionally with a password and expiry. */
export const createNoteLink = async (noteId: number, input: NoteLinkInput): Promise<NoteLink> => {
  await mockDelay()
  const note = findNote(noteId)
  const link = {
    shareId: shareId(),
    url: '',
    hasPassword: !!input.password,
    expiresAt: input.expiresInDays === null ? null : moment().add(input.expiresInDays, 'days').toISOString(),
    createdAt: new Date().toISOString(),
  }
  note.links.push(link)
  recordAudit('vault.note_share', 'vault', `${projectName(note.projectId)} / ${latest(note).title}`, 'Public link created')
  return { ...link, url: linkUrl(link.shareId) }
}

/** Future: `DELETE /vault/note/link/{share_id}` — the link stops working at once. */
export const deleteNoteLink = async (noteId: number, id: string): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  note.links = note.links.filter((l) => l.shareId !== id)
  recordAudit('vault.note_share', 'vault', `${projectName(note.projectId)} / ${latest(note).title}`, 'Public link removed')
}
