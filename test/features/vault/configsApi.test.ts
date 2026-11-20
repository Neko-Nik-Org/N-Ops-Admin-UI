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
/** Tests for src/features/vault/api/configs.ts: creating, checking, saving and deleting config files. */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  createConfig,
  deleteConfig,
  getConfigVersion,
  listConfigs,
  listConfigVersions,
  MAX_CONFIG_BYTES,
  saveConfigVersion,
} from '@/features/vault/api/configs'
import { db as adminDb, resetAdminMock } from '@/mocks/adminDb'
import { resetVaultMock, vaultDb } from '@/mocks/vaultDb'

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
})

const lastAudit = () => adminDb.auditLogs[0]!

describe('config files', () => {
  it('creates a file as v1 with its size, and records it in the audit log', async () => {
    const file = await createConfig(1, { fileName: 'redis.conf', tagId: 1, content: 'maxmemory 2gb\n', note: '' })
    expect(file).toMatchObject({ fileName: 'redis.conf', currentVersion: 1, latestVersion: 1, sizeBytes: 14 })
    expect((await listConfigVersions(file.fileId))[0]).toMatchObject({ version: 1, note: 'Initial' })
    expect(lastAudit()).toMatchObject({ action: 'vault.config_create' })
    expect((await listConfigs(1)).map((f) => f.fileName)).toContain('redis.conf')
  })

  it('refuses folder paths, a name already used for that tag, and files over the size limit', async () => {
    const base = { tagId: 1, content: 'x', note: '' }
    await expect(createConfig(1, { ...base, fileName: 'etc/app.conf' })).rejects.toThrow('no folders')
    await expect(createConfig(1, { ...base, fileName: 'app.yaml' })).rejects.toThrow('app.yaml already exists for this tag')
    // the same name under another tag is a separate file
    await expect(createConfig(1, { ...base, fileName: 'app.yaml', tagId: 3 })).resolves.toMatchObject({ tagId: 3 })
    await expect(createConfig(1, { ...base, fileName: 'big.txt', content: 'x'.repeat(MAX_CONFIG_BYTES + 1) })).rejects.toThrow(
      'Files can be up to 256 KB.',
    )
  })

  it("stops at the plan's per-project file limit", async () => {
    adminDb.organization.limits.vaultKeysPerProject = vaultDb.configs.filter((c) => c.projectId === 1).length
    await expect(createConfig(1, { fileName: 'one-more.conf', tagId: 1, content: 'x', note: '' })).rejects.toThrow(
      'This project has reached its file limit.',
    )
  })

  it('refuses to save a version identical to the one in use', async () => {
    const fileId = vaultDb.configs.find((c) => c.fileName === 'docker-compose.yml')!.fileId
    const { content } = await getConfigVersion(fileId)
    await expect(saveConfigVersion(fileId, content, 'no-op')).rejects.toThrow('Nothing changed.')
  })

  it('deletes a file, and says so for one that is already gone', async () => {
    const fileId = vaultDb.configs.find((c) => c.fileName === 'worker.toml')!.fileId
    await deleteConfig(fileId)
    expect((await listConfigs(1)).map((f) => f.fileName)).not.toContain('worker.toml')
    expect(lastAudit()).toMatchObject({ action: 'vault.config_delete' })
    await expect(deleteConfig(fileId)).rejects.toThrow()
  })
})
