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
/** Tests for the mock-backed Vault API (src/features/vault/api/*). */

import { beforeEach, describe, expect, it } from 'vitest'
import { db as adminDb, resetAdminMock } from '@/mocks/adminDb'
import { getConfigVersion, listConfigVersions, rollbackConfig, saveConfigVersion } from '@/features/vault/api/configs'
import {
  createNote,
  createNoteLink,
  deleteNote,
  listNotes,
  listNoteVersions,
  openNote,
  setNoteShares,
  updateNote,
} from '@/features/vault/api/notes'
import { forgetProjectContents, projectPath } from '@/features/vault/api/projects'
import {
  addSecretVersion,
  createSecret,
  exportDotenv,
  importDotenv,
  listSecrets,
  listSecretVersions,
  revealSecret,
  rollbackSecret,
} from '@/features/vault/api/secrets'
import { resetVaultMock, vaultDb } from '@/mocks/vaultDb'

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
})

/** The payments-api DATABASE_URL for production (3 versions). */
const dbUrlProd = () => vaultDb.secrets.find((s) => s.projectId === 1 && s.name === 'DATABASE_URL' && s.tagId === 1)!
/** The payments-api STRIPE_SECRET_KEY for production: v1 visible, v2 and v3 hidden. */
const stripeProd = () => vaultDb.secrets.find((s) => s.projectId === 1 && s.name === 'STRIPE_SECRET_KEY' && s.tagId === 1)!
const input = (name: string, tagId: number, isHidden = false) => ({ name, tagId, value: 'x', note: '', isHidden })

describe('secret keys', () => {
  it("lists a project's keys (all former services together) without values, and audits every reveal", async () => {
    const keys = await listSecrets(1)
    expect(keys.map((k) => k.name)).toEqual(expect.arrayContaining(['DATABASE_URL', 'QUEUE_URL', 'CONCURRENCY']))
    expect(JSON.stringify(keys)).not.toContain('postgres://')
    expect(await revealSecret(dbUrlProd().secretId)).toContain('sslmode=require')
    expect(adminDb.auditLogs[0]).toMatchObject({
      action: 'vault.secret_reveal',
      resourceName: 'payments-api / DATABASE_URL',
      details: 'v3',
    })
  })

  it('allows the same name once per tag', async () => {
    await expect(createSecret(1, input('DATABASE_URL', 1))).rejects.toThrow('already exists for this tag')
    await expect(createSecret(1, input('DATABASE_URL', 4))).resolves.toMatchObject({ currentVersion: 1 })
    await expect(createSecret(1, input('1BAD', 4))).rejects.toThrow('not starting with a number')
  })

  it('keeps every version: a change adds one, a rollback only moves the pointer', async () => {
    const { secretId } = dbUrlProd()
    await addSecretVersion(secretId, 'postgres://new', 'Rotate', false)
    expect(dbUrlProd()).toMatchObject({ currentVersion: 4, latestVersion: 4 })

    await rollbackSecret(secretId, 2)
    expect(dbUrlProd()).toMatchObject({ currentVersion: 2, latestVersion: 4 })
    expect(await revealSecret(secretId)).toContain('Lm8Rt3Zp')
    expect((await listSecretVersions(secretId)).map((v) => v.version)).toEqual([4, 3, 2, 1])
  })

  it('imports a .env: new keys, new versions for changed values, skips unchanged ones', async () => {
    const result = await importDotenv(
      1,
      2,
      'DATABASE_URL=postgres://payments:staging-pass@db-staging.internal:5432/payments\nLOG_LEVEL=warn\nNEW_ONE=1',
      '',
    )
    expect(result).toEqual({ created: 1, updated: 1, unchanged: 1 })
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'vault.env_import', details: '1 new, 1 changed' })

    const exported = await exportDotenv(1, 2)
    expect(exported.body.split('\n')).toEqual(expect.arrayContaining(['LOG_LEVEL=warn', 'NEW_ONE=1']))
    expect(exported.skippedHidden).toEqual([])
    await expect(importDotenv(1, 2, 'not a line', '')).rejects.toThrow('Line 1: expected KEY=value')
  })
})

describe('hidden secrets (is_hidden)', () => {
  it('lists a hidden key as hidden and refuses to reveal it, recording a denied attempt', async () => {
    const stripe = stripeProd()
    expect((await listSecrets(1)).find((s) => s.secretId === stripe.secretId)).toMatchObject({ isHidden: true })
    await expect(revealSecret(stripe.secretId)).rejects.toThrow('This value is hidden.')
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'vault.secret_reveal', outcome: 'denied', details: 'v3 is hidden' })
  })

  it('is per version: an older visible version can still be revealed, and the history says which are hidden', async () => {
    const { secretId } = stripeProd()
    expect(await revealSecret(secretId, 1)).toBe('sk_live_51Hc2f…old1')
    expect((await listSecretVersions(secretId)).map((v) => [v.version, v.isHidden])).toEqual([
      [3, true],
      [2, true],
      [1, false],
    ])
  })

  it('follows the version in use on rollback and on new versions', async () => {
    const { secretId } = stripeProd()
    await rollbackSecret(secretId, 1)
    expect(stripeProd().isHidden).toBe(false)
    await addSecretVersion(secretId, 'sk_live_new', 'Rotate', true)
    expect(stripeProd()).toMatchObject({ currentVersion: 4, isHidden: true })
  })

  it('creates a hidden key, and leaves hidden keys out of a .env export', async () => {
    await createSecret(1, input('WEBHOOK_SECRET', 2, true))
    const exported = await exportDotenv(1, 2)
    expect(exported.body).not.toContain('WEBHOOK_SECRET')
    expect(exported.skippedHidden).toEqual(['WEBHOOK_SECRET'])
    expect(adminDb.auditLogs[0]).toMatchObject({
      action: 'vault.env_export',
      details: expect.stringContaining('1 hidden left out'),
    })
  })

  it('keeps a hidden key hidden when a .env import changes it', async () => {
    await importDotenv(1, 1, 'STRIPE_SECRET_KEY=sk_live_imported', '')
    expect(stripeProd()).toMatchObject({ currentVersion: 4, isHidden: true })
  })
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

  it('drops a deleted project’s keys, files, notes and API key links', () => {
    forgetProjectContents(1)
    expect(vaultDb.secrets.some((s) => s.projectId === 1)).toBe(false)
    expect(vaultDb.configs.some((c) => c.projectId === 1)).toBe(false)
    expect(vaultDb.notes.some((n) => n.projectId === 1)).toBe(false)
    // API keys lose the link to the project (ON DELETE CASCADE on api_key_vault_project), not the key
    expect(adminDb.apiKeys.find((k) => k.keyName === 'staging-config-sync')?.vaultProjectIds).toEqual([2])
    expect(adminDb.apiKeys.find((k) => k.keyName === 'github-actions-prod')?.vaultProjectIds).toEqual([])
  })

  it('lets a real project the mock has never seen hold keys', async () => {
    await createSecret(42, { name: 'TOKEN', tagId: 1, value: 'x', note: '', isHidden: false })
    expect((await listSecrets(42)).map((k) => k.name)).toEqual(['TOKEN'])
    expect(adminDb.auditLogs[0]).toMatchObject({ resourceName: 'project #42 / TOKEN' })
  })
})
