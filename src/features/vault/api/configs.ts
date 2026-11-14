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
/** Config files: simple tagged, versioned text files per service. Mock until the API has them. */

import { db as adminDb, clone, mockDelay, notFound, recordAudit } from '@/features/admin/mock/db'
import { byteSize, me, vaultDb, type StoredConfig } from '../mock/db'
import type { ConfigFile, ConfigFileInput, ConfigVersion, VaultVersionMeta } from '../types'
import { servicePath } from './projects'

/** Largest file the store accepts. */
export const MAX_CONFIG_BYTES = 256 * 1024

const findConfig = (fileId: number) => vaultDb.configs.find((c) => c.fileId === fileId) ?? notFound('file')
const summary = ({ versions: _versions, ...file }: StoredConfig): ConfigFile => clone(file)
const label = (c: StoredConfig) => `${servicePath(c.serviceId)} / ${c.fileName}`

const checkContent = (content: string) => {
  if (byteSize(content) > MAX_CONFIG_BYTES) throw new Error(`Files can be up to ${MAX_CONFIG_BYTES / 1024} KB.`)
}

/** Future: `GET /vault/config/list?service_id`. */
export const listConfigs = async (serviceId: number): Promise<ConfigFile[]> => {
  await mockDelay()
  return vaultDb.configs.filter((c) => c.serviceId === serviceId).map(summary)
}

/** Future: `GET /vault/config/get/{id}?version` — a version's content (default: current). Audited. */
export const getConfigVersion = async (fileId: number, version?: number): Promise<ConfigVersion> => {
  await mockDelay()
  const file = findConfig(fileId)
  const v = version ?? file.currentVersion
  const found = file.versions.find((x) => x.version === v) ?? notFound('version')
  recordAudit('vault.config_read', 'vault', label(file), `v${v}`)
  return clone(found)
}

/** Future: `GET /vault/config/versions/{id}` — history without content. */
export const listConfigVersions = async (fileId: number): Promise<Array<VaultVersionMeta & { sizeBytes: number }>> => {
  await mockDelay()
  return findConfig(fileId)
    .versions.map(({ content: _content, ...meta }) => clone(meta))
    .reverse()
}

/** Future: `POST /vault/config/create`. File names are unique per service + tag. */
export const createConfig = async (serviceId: number, input: ConfigFileInput): Promise<ConfigFile> => {
  await mockDelay()
  if (!/^[\w.-]{1,100}$/.test(input.fileName)) throw new Error('Use letters, numbers, dots, dashes or underscores (no folders).')
  if (vaultDb.configs.some((c) => c.serviceId === serviceId && c.fileName === input.fileName && c.tagId === input.tagId)) {
    throw new Error(`${input.fileName} already exists for this tag. Edit it to add a new version.`)
  }
  checkContent(input.content)
  const projectId = vaultDb.services.find((s) => s.serviceId === serviceId)?.projectId
  const count = vaultDb.configs.filter(
    (c) => vaultDb.services.find((s) => s.serviceId === c.serviceId)?.projectId === projectId,
  ).length
  if (count >= adminDb.organization.limits.vaultKeysPerProject) throw new Error('This project has reached its file limit.')

  const now = new Date().toISOString()
  const sizeBytes = byteSize(input.content)
  const file: StoredConfig = {
    fileId: vaultDb.nextId.config++,
    serviceId,
    fileName: input.fileName,
    tagId: input.tagId,
    currentVersion: 1,
    latestVersion: 1,
    sizeBytes,
    updatedAt: now,
    updatedBy: me().displayName,
    versions: [
      {
        version: 1,
        content: input.content,
        sizeBytes,
        note: input.note || 'Initial',
        createdAt: now,
        createdBy: me().displayName,
      },
    ],
  }
  vaultDb.configs.push(file)
  recordAudit('vault.config_create', 'vault', label(file))
  return summary(file)
}

/** Future: `POST /vault/config/version` — saves new content as a new version. */
export const saveConfigVersion = async (fileId: number, content: string, note: string): Promise<void> => {
  await mockDelay()
  const file = findConfig(fileId)
  checkContent(content)
  if (file.versions.find((v) => v.version === file.currentVersion)?.content === content) throw new Error('Nothing changed.')
  const version = file.latestVersion + 1
  const now = new Date().toISOString()
  const sizeBytes = byteSize(content)
  file.versions.push({ version, content, sizeBytes, note, createdAt: now, createdBy: me().displayName })
  Object.assign(file, { latestVersion: version, currentVersion: version, sizeBytes, updatedAt: now, updatedBy: me().displayName })
  recordAudit('vault.config_update', 'vault', label(file), `v${version}${note ? ` — ${note}` : ''}`)
}

/** Future: `PUT /vault/config/rollback` — points the file at an older version. */
export const rollbackConfig = async (fileId: number, version: number): Promise<void> => {
  await mockDelay()
  const file = findConfig(fileId)
  const target = file.versions.find((v) => v.version === version) ?? notFound('version')
  Object.assign(file, {
    currentVersion: version,
    sizeBytes: target.sizeBytes,
    updatedAt: new Date().toISOString(),
    updatedBy: me().displayName,
  })
  recordAudit('vault.config_rollback', 'vault', label(file), `Now using v${version}`)
}

/** Future: `DELETE /vault/config/delete/{id}`. */
export const deleteConfig = async (fileId: number): Promise<void> => {
  await mockDelay()
  const file = findConfig(fileId)
  vaultDb.configs = vaultDb.configs.filter((c) => c.fileId !== fileId)
  recordAudit('vault.config_delete', 'vault', label(file))
}
