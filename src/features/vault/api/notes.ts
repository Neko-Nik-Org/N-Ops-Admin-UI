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
 * Secure notes per project: human-readable sensitive information, docs, recovery instructions and
 * procedures. Versioned and private by default: only the owner and the people it is shared with see
 * a note. Shares are read-only or can-edit; only the owner can share, make public links or delete.
 * Notes have no tag. Mock until `/vault/note/*` is live.
 */

import { db as adminDb, recordAudit } from '@/mocks/adminDb'
import { clone, mockDelay, notFound } from '@/mocks/helpers'
import moment from 'moment'
import { me, vaultDb, type StoredNote } from '@/mocks/vaultDb'
import type { NoteAccess, NoteInput, NoteLink, NoteLinkInput, NoteShare, NoteVersion, SecureNote } from '../types'

const latest = (note: StoredNote) => note.versions.at(-1)!
const projectName = (projectId: number) => vaultDb.projects.find((p) => p.projectId === projectId)?.projectName ?? '?'
const label = (note: StoredNote) => `${projectName(note.projectId)} / ${latest(note).title}`

/** The signed-in user's access to a note, or null when it is private to someone else. */
const accessOf = (note: StoredNote): NoteAccess | null => {
  if (note.ownerId === me().userId) return 'owner'
  const share = note.shares.find((s) => s.userId === me().userId)
  return share ? (share.canEdit ? 'edit' : 'read') : null
}

/** A note the signed-in user can see; anyone else's private note looks like it doesn't exist. */
const findNote = (noteId: number) => {
  const note = vaultDb.notes.find((n) => n.noteId === noteId)
  return note && accessOf(note) ? note : notFound('note')
}

/** Rejects unless the signed-in user may edit (owner or a can-edit share). */
const requireEdit = (note: StoredNote) => {
  if (accessOf(note) === 'read') throw new Error('This note is shared with you read-only. Ask its owner for edit access.')
}

/** Rejects unless the signed-in user owns the note. */
const requireOwner = (note: StoredNote, action: string) => {
  if (accessOf(note) !== 'owner') throw new Error(`Only the note's owner can ${action}.`)
}

/** Where public links point. The public page itself isn't built yet. */
const linkUrl = (shareId: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/s/${shareId}`

const summary = (note: StoredNote): SecureNote => ({
  noteId: note.noteId,
  projectId: note.projectId,
  title: latest(note).title,
  ownerId: note.ownerId,
  ownerName: adminDb.users.find((u) => u.userId === note.ownerId)?.displayName ?? 'Removed user',
  myAccess: accessOf(note)!,
  latestVersion: latest(note).version,
  createdAt: note.createdAt,
  updatedAt: latest(note).createdAt,
  shares: clone(note.shares),
  links: note.links.map((l) => ({ ...l, url: linkUrl(l.shareId) })),
})

/** Note titles are unique per owner and project. */
const checkTitle = (projectId: number, ownerId: number, title: string, exceptId?: number) => {
  const clean = title.trim()
  if (!clean) throw new Error('Give the note a title.')
  if (clean.length > 100) throw new Error('Keep the title to 100 characters or fewer.')
  if (
    vaultDb.notes.some(
      (n) => n.noteId !== exceptId && n.projectId === projectId && n.ownerId === ownerId && latest(n).title === clean,
    )
  ) {
    throw new Error(
      `${ownerId === me().userId ? 'You already have' : 'The owner already has'} a note called "${clean}" in this project.`,
    )
  }
  return clean
}

/** Future: `GET /vault/note/list?project_id` — notes you own or that are shared with you, newest first. */
export const listNotes = async (projectId: number): Promise<SecureNote[]> => {
  await mockDelay()
  return vaultDb.notes
    .filter((n) => n.projectId === projectId && accessOf(n))
    .map(summary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Future: `GET /vault/note/open/{id}` — the latest version. Audited. */
export const openNote = async (noteId: number): Promise<NoteVersion> => {
  await mockDelay()
  const note = findNote(noteId)
  recordAudit('vault.note_read', 'vault', label(note))
  return clone(latest(note))
}

/** Future: `GET /vault/note/versions/{id}` — every version, newest first. */
export const listNoteVersions = async (noteId: number): Promise<NoteVersion[]> => {
  await mockDelay()
  return clone(findNote(noteId).versions).reverse()
}

/** Future: `POST /vault/note/create`. The new note is private to you until you share it. */
export const createNote = async (projectId: number, input: NoteInput): Promise<SecureNote> => {
  await mockDelay()
  const title = checkTitle(projectId, me().userId, input.title)
  const limit = adminDb.organization.limits.vaultNotesPerProject
  if (vaultDb.notes.filter((n) => n.projectId === projectId).length >= limit)
    throw new Error(`Your plan allows ${limit} notes per project.`)
  const now = new Date().toISOString()
  const note: StoredNote = {
    noteId: vaultDb.nextId.note++,
    projectId,
    ownerId: me().userId,
    createdAt: now,
    shares: [],
    links: [],
    versions: [{ version: 1, title, content: input.content, createdAt: now, createdBy: me().displayName, note: '' }],
  }
  vaultDb.notes.push(note)
  recordAudit('vault.note_create', 'vault', label(note))
  return summary(note)
}

/** Future: `PUT /vault/note/update` — saves a new version. Owner or a can-edit share. */
export const updateNote = async (noteId: number, input: NoteInput): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  requireEdit(note)
  const title = checkTitle(note.projectId, note.ownerId, input.title, noteId)
  const prev = latest(note)
  if (prev.title === title && prev.content === input.content) throw new Error('Nothing changed.')
  note.versions.push({
    version: prev.version + 1,
    title,
    content: input.content,
    createdAt: new Date().toISOString(),
    createdBy: me().displayName,
    note: input.note ?? '',
  })
  recordAudit('vault.note_update', 'vault', label(note), `v${latest(note).version}`)
}

/** Future: `DELETE /vault/note/delete/{id}` — the note, its history, shares and links. Owner only. */
export const deleteNote = async (noteId: number): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  requireOwner(note, 'delete it')
  vaultDb.notes = vaultDb.notes.filter((n) => n.noteId !== noteId)
  recordAudit('vault.note_delete', 'vault', label(note))
}

/** Future: `PUT /vault/note/shares` — replaces who in the org can read (or edit) the note. Owner only. */
export const setNoteShares = async (noteId: number, shares: Array<Pick<NoteShare, 'userId' | 'canEdit'>>): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  requireOwner(note, 'change who it is shared with')
  note.shares = shares
    .filter((s) => s.userId !== note.ownerId)
    .map((s) => ({ ...s, displayName: adminDb.users.find((u) => u.userId === s.userId)?.displayName ?? notFound('user') }))
  recordAudit('vault.note_share', 'vault', label(note), note.shares.length ? `${note.shares.length} people` : 'Private')
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
  requireOwner(note, 'create public links')
  const link = {
    shareId: shareId(),
    url: '',
    hasPassword: !!input.password,
    expiresAt: input.expiresInDays === null ? null : moment().add(input.expiresInDays, 'days').toISOString(),
    createdAt: new Date().toISOString(),
  }
  note.links.push(link)
  recordAudit(
    'vault.note_share',
    'vault',
    label(note),
    `Public link${link.hasPassword ? ' with password' : ''}, ${link.expiresAt ? `expires ${moment(link.expiresAt).format('YYYY-MM-DD')}` : 'no expiry'}`,
  )
  return { ...link, url: linkUrl(link.shareId) }
}

/** Future: `DELETE /vault/note/link/{share_id}` — the link stops working at once. */
export const deleteNoteLink = async (noteId: number, id: string): Promise<void> => {
  await mockDelay()
  const note = findNote(noteId)
  requireOwner(note, 'remove public links')
  note.links = note.links.filter((l) => l.shareId !== id)
  recordAudit('vault.note_share', 'vault', label(note), 'Public link removed')
}
