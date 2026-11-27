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
/** Tests for the mock-backed Vault API (src/api/vaultConfigs.ts, vaultNotes.ts, vaultContents.ts). */

import { beforeEach, describe, expect, it } from 'vitest'
import { db as adminDb, resetAdminMock } from '@/data/mockAdmin'
import { getConfigVersion, listConfigVersions, rollbackConfig, saveConfigVersion } from '@/api/vaultConfigs'
import {
  createNote,
  createNoteLink,
  deleteNote,
  listNotes,
  listNoteVersions,
  openNote,
  setNoteShares,
  updateNote,
} from '@/api/vaultNotes'
import { forgetProjectContents, projectPath } from '@/api/vaultContents'
import { resetVaultMock, vaultDb } from '@/data/mockVault'

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
})

describe('config files', () => {
  it('saves new versions, refuses no-op saves, and rolls back', async () => {
    const nginx = vaultDb.configs.find((c) => c.fileName === 'nginx.conf')!
    const current = await getConfigVersion(nginx.fileId)
    await expect(saveConfigVersion(nginx.fileId, current.content, '')).rejects.toThrow('Nothing changed.')

    await saveConfigVersion(nginx.fileId, `${current.content}# tuned\n`, 'Tune')
    expect((await listConfigVersions(nginx.fileId))[0]).toMatchObject({ version: 4, note: 'Tune' })

    await rollbackConfig(nginx.fileId, 1)
    expect((await getConfigVersion(nginx.fileId)).content).toContain('proxy_pass http://10.0.4.12:3000')
  })
})

describe('secure notes (signed in as Neko Nik, user 1)', () => {
  it('lists only notes you own or that are shared with you, with your access', async () => {
    const notes = await listNotes(1)
    expect(notes.map((n) => [n.title, n.myAccess])).toEqual([
      ['On-call runbook', 'edit'],
      ['Break-glass DB access', 'owner'],
    ])
    expect((await listNotes(2)).map((n) => [n.title, n.myAccess])).toEqual([['CDN cutover checklist', 'read']])
    expect(await listNotes(3)).toEqual([]) // Vendor contacts is private to someone else
  })

  it("treats someone else's private note as missing", async () => {
    await expect(openNote(5)).rejects.toThrow()
    await expect(listNoteVersions(4)).rejects.toThrow()
  })

  it('opens notes with no password, and audits each read', async () => {
    expect((await openNote(2)).content).toContain('break_glass')
    expect(adminDb.auditLogs[0]).toMatchObject({
      action: 'vault.note_read',
      resourceName: 'payments-api / Break-glass DB access',
    })
  })

  it('lets a can-edit share save versions, but not a read-only one', async () => {
    await updateNote(1, { title: 'On-call runbook', content: 'edited by a share' })
    expect((await openNote(1)).version).toBe(4)
    await expect(updateNote(3, { title: 'CDN cutover checklist', content: 'x' })).rejects.toThrow('read-only')
  })

  it('keeps sharing, links and deleting to the owner', async () => {
    await expect(setNoteShares(1, [])).rejects.toThrow("Only the note's owner can change who it is shared with.")
    await expect(createNoteLink(1, { password: '', expiresInDays: 7 })).rejects.toThrow("Only the note's owner")
    await expect(deleteNote(1)).rejects.toThrow("Only the note's owner can delete it.")
    await deleteNote(2)
    expect((await listNotes(1)).map((n) => n.title)).not.toContain('Break-glass DB access')
  })

  it('creates private notes; titles are unique per owner and project', async () => {
    const note = await createNote(3, { title: 'Bank details', content: 'IBAN …' })
    expect(note).toMatchObject({ myAccess: 'owner', shares: [], links: [], ownerName: 'Neko Nik', latestVersion: 1 })
    await expect(createNote(3, { title: 'Bank details', content: '' })).rejects.toThrow(
      'You already have a note called "Bank details"',
    )
  })

  it('makes public links with or without a password and expiry', async () => {
    const withBoth = await createNoteLink(2, { password: 'x', expiresInDays: 7 })
    expect(withBoth).toMatchObject({ hasPassword: true, expiresAt: expect.any(String) })
    expect(withBoth.url).toMatch(/\/s\/[A-Za-z0-9]{8}$/)
    expect(await createNoteLink(2, { password: '', expiresInDays: null })).toMatchObject({ hasPassword: false, expiresAt: null })
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'vault.note_share', details: 'Public link, no expiry' })
  })

  it('shares with people, read or edit, and back to private', async () => {
    await setNoteShares(2, [
      { userId: 2, canEdit: false },
      { userId: 3, canEdit: true },
    ])
    expect((await listNotes(1)).find((n) => n.noteId === 2)?.shares.map((s) => [s.userId, s.canEdit])).toEqual([
      [2, false],
      [3, true],
    ])
    await setNoteShares(2, [])
    expect(adminDb.auditLogs[0]).toMatchObject({ details: 'Private' })
  })
})

describe('project contents (the mock side of real projects)', () => {
  it('names projects the mock knows, and shows any other by id', () => {
    expect(projectPath(1)).toBe('payments-api')
    expect(projectPath(42)).toBe('project #42')
  })

  it('drops a deleted project’s files, notes and API key links', () => {
    forgetProjectContents(1)
    expect(vaultDb.configs.some((c) => c.projectId === 1)).toBe(false)
    expect(vaultDb.notes.some((n) => n.projectId === 1)).toBe(false)
    // API keys lose the link to the project (ON DELETE CASCADE on api_key_vault_project), not the key
    expect(adminDb.apiKeys.find((k) => k.keyName === 'staging-config-sync')?.vaultProjectIds).toEqual([2])
    expect(adminDb.apiKeys.find((k) => k.keyName === 'github-actions-prod')?.vaultProjectIds).toEqual([])
  })
})
