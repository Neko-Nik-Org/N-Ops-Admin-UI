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
import { db as adminDb, resetAdminMock } from '@/features/admin/mock/db'
import { getConfigVersion, listConfigVersions, rollbackConfig, saveConfigVersion } from '@/features/vault/api/configs'
import { createNote, createNoteLink, listNotes, NoteLockedError, openNote, updateNote } from '@/features/vault/api/notes'
import { createProject, deleteProject, listProjects } from '@/features/vault/api/projects'
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
import { resetVaultMock, vaultDb } from '@/features/vault/mock/db'

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
})

/** The payments-api / api DATABASE_URL for production (3 versions). */
const dbUrlProd = () => vaultDb.secrets.find((s) => s.serviceId === 1 && s.name === 'DATABASE_URL' && s.tagId === 1)!

describe('secret keys', () => {
  it('lists keys without values and audits every reveal', async () => {
    const keys = await listSecrets(1)
    expect(JSON.stringify(keys)).not.toContain('postgres://')
    expect(await revealSecret(dbUrlProd().secretId)).toContain('sslmode=require')
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'vault.secret_reveal', resourceName: 'payments-api / api / DATABASE_URL', details: 'v3' })
  })

  it('allows the same name once per tag', async () => {
    await expect(createSecret(1, { name: 'DATABASE_URL', tagId: 1, value: 'x', note: '' })).rejects.toThrow('already exists for this tag')
    await expect(createSecret(1, { name: 'DATABASE_URL', tagId: 4, value: 'x', note: '' })).resolves.toMatchObject({ currentVersion: 1 })
    await expect(createSecret(1, { name: '1BAD', tagId: 4, value: 'x', note: '' })).rejects.toThrow('not starting with a number')
  })

  it('keeps every version: a change adds one, a rollback only moves the pointer', async () => {
    const { secretId } = dbUrlProd()
    await addSecretVersion(secretId, 'postgres://new', 'Rotate')
    expect(dbUrlProd()).toMatchObject({ currentVersion: 4, latestVersion: 4 })

    await rollbackSecret(secretId, 2)
    expect(dbUrlProd()).toMatchObject({ currentVersion: 2, latestVersion: 4 })
    expect(await revealSecret(secretId)).toContain('Lm8Rt3Zp')
    expect((await listSecretVersions(secretId)).map((v) => v.version)).toEqual([4, 3, 2, 1])
  })

  it('imports a .env: new keys, new versions for changed values, skips unchanged ones', async () => {
    const result = await importDotenv(1, 2, 'DATABASE_URL=postgres://payments:staging-pass@db-staging.internal:5432/payments\nLOG_LEVEL=warn\nNEW_ONE=1', '')
    expect(result).toEqual({ created: 1, updated: 1, unchanged: 1 })
    expect(adminDb.auditLogs[0]).toMatchObject({ action: 'vault.env_import', details: '1 new, 1 changed' })

    const exported = await exportDotenv(1, 2)
    expect(exported.split('\n')).toEqual(expect.arrayContaining(['LOG_LEVEL=warn', 'NEW_ONE=1']))
    await expect(importDotenv(1, 2, 'not a line', '')).rejects.toThrow('Line 1: expected KEY=value')
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

describe('secure notes', () => {
  it('needs the password to open a locked note', async () => {
    await expect(openNote(2)).rejects.toBeInstanceOf(NoteLockedError)
    await expect(openNote(2, 'nope')).rejects.toThrow("That password isn't right.")
    expect((await openNote(2, 'open-sesame')).content).toContain('break_glass')
  })

  it('versions edits and can change or remove the password', async () => {
    await updateNote(2, { title: 'Break-glass DB access', content: 'rotated', password: 'new-password' }, 'open-sesame')
    await expect(openNote(2, 'open-sesame')).rejects.toThrow("That password isn't right.")
    expect(await openNote(2, 'new-password')).toMatchObject({ version: 2, content: 'rotated' })

    await updateNote(2, { title: 'Break-glass DB access', content: 'rotated', password: '' }, 'new-password')
    expect((await listNotes(1)).find((n) => n.noteId === 2)?.isProtected).toBe(false)
  })

  it('creates notes and public links', async () => {
    const note = await createNote(3, { title: 'Bank details', content: 'IBAN …', password: 'longpassword' })
    expect(note).toMatchObject({ isProtected: true, ownerName: 'Neko Nik', latestVersion: 1 })
    await expect(createNote(3, { title: 'Bank details', content: '' })).rejects.toThrow('You already have a note called "Bank details"')

    const link = await createNoteLink(note.noteId, { password: 'x', expiresInDays: 7 })
    expect(link.url).toMatch(/\/s\/[A-Za-z0-9]{8}$/)
    expect(link.hasPassword).toBe(true)
  })
})

describe('projects', () => {
  it('counts toward the plan and deletes everything inside', async () => {
    await createProject({ name: 'new-thing', description: '' })
    expect(adminDb.organization.usage.vaultProjects).toBe(5)
    await expect(createProject({ name: 'Bad Name', description: '' })).rejects.toThrow('Use lowercase letters')

    await deleteProject(1)
    expect((await listProjects()).map((p) => p.projectName)).not.toContain('payments-api')
    expect(vaultDb.secrets.some((s) => s.serviceId === 1 || s.serviceId === 2)).toBe(false)
    expect(vaultDb.notes.some((n) => n.projectId === 1)).toBe(false)
  })
})
