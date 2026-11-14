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
/** Keys store: secret keys (env vars) with immutable versions, rollback and .env import/export. Mock until `/vault/secret/*` is live. */

import { db as adminDb, clone, mockDelay, notFound, recordAudit } from '@/features/admin/mock/db'
import { parseDotenv, serializeDotenv } from '../dotenv'
import { me, vaultDb, type StoredSecret } from '../mock/db'
import type { SecretInput, SecretKey, VaultVersionMeta } from '../types'
import { servicePath } from './projects'

const findSecret = (secretId: number) => vaultDb.secrets.find((s) => s.secretId === secretId) ?? notFound('secret')

/** Env var names: letters, digits and underscores, not starting with a digit. */
export const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/

/** A secret without its versions (values never leave the server unless revealed). */
const summary = ({ versions: _versions, ...secret }: StoredSecret): SecretKey => clone(secret)

const label = (s: StoredSecret) => `${servicePath(s.serviceId)} / ${s.name}`

/** Plan limit: keys per project. */
const checkProjectLimit = (serviceId: number, adding: number) => {
  const projectId = vaultDb.services.find((s) => s.serviceId === serviceId)?.projectId
  const serviceIds = vaultDb.services.filter((s) => s.projectId === projectId).map((s) => s.serviceId)
  const count = vaultDb.secrets.filter((s) => serviceIds.includes(s.serviceId)).length
  const limit = adminDb.organization.limits.vaultKeysPerProject
  if (count + adding > limit) throw new Error(`Your plan allows ${limit} keys per project. This project has ${count}.`)
}

/** Adds an immutable version and makes it current. */
const pushVersion = (secret: StoredSecret, value: string, note: string) => {
  const version = secret.latestVersion + 1
  const now = new Date().toISOString()
  secret.versions.push({ version, value, note, createdAt: now, createdBy: me().displayName })
  Object.assign(secret, { latestVersion: version, currentVersion: version, updatedAt: now, updatedBy: me().displayName })
}

/** Future: `GET /vault/secret/list?service_id` — names and versions only. */
export const listSecrets = async (serviceId: number): Promise<SecretKey[]> => {
  await mockDelay()
  return vaultDb.secrets.filter((s) => s.serviceId === serviceId).map(summary)
}

/** Future: `GET /vault/secret/reveal/{id}?version`. Every reveal is audited. Defaults to the current version. */
export const revealSecret = async (secretId: number, version?: number): Promise<string> => {
  await mockDelay()
  const secret = findSecret(secretId)
  const v = version ?? secret.currentVersion
  const found = secret.versions.find((x) => x.version === v) ?? notFound('version')
  recordAudit('vault.secret_reveal', 'vault', label(secret), `v${v}`)
  return found.value
}

/** Future: `GET /vault/secret/versions/{id}` — history without values. */
export const listSecretVersions = async (secretId: number): Promise<VaultVersionMeta[]> => {
  await mockDelay()
  return findSecret(secretId)
    .versions.map(({ value: _value, ...meta }) => clone(meta))
    .reverse()
}

/** Future: `POST /vault/secret/create`. Unique per name + service + tag. */
export const createSecret = async (serviceId: number, input: SecretInput): Promise<SecretKey> => {
  await mockDelay()
  if (!SECRET_NAME.test(input.name)) throw new Error('Use letters, numbers and underscores, not starting with a number.')
  if (vaultDb.secrets.some((s) => s.serviceId === serviceId && s.name === input.name && s.tagId === input.tagId)) {
    throw new Error(`${input.name} already exists for this tag. Add a new version to it instead.`)
  }
  checkProjectLimit(serviceId, 1)
  const now = new Date().toISOString()
  const secret: StoredSecret = {
    secretId: vaultDb.nextId.secret++,
    serviceId,
    name: input.name,
    tagId: input.tagId,
    currentVersion: 1,
    latestVersion: 1,
    updatedAt: now,
    updatedBy: me().displayName,
    versions: [{ version: 1, value: input.value, note: input.note || 'Initial', createdAt: now, createdBy: me().displayName }],
  }
  vaultDb.secrets.push(secret)
  recordAudit('vault.secret_create', 'vault', label(secret))
  return summary(secret)
}

/** Future: `POST /vault/secret/version` — a new value becomes a new version; old ones are kept. */
export const addSecretVersion = async (secretId: number, value: string, note: string): Promise<void> => {
  await mockDelay()
  const secret = findSecret(secretId)
  pushVersion(secret, value, note)
  recordAudit('vault.secret_update', 'vault', label(secret), `v${secret.latestVersion}${note ? ` — ${note}` : ''}`)
}

/** Future: `PUT /vault/secret/rollback` — points the key at an older version; nothing is deleted. */
export const rollbackSecret = async (secretId: number, version: number): Promise<void> => {
  await mockDelay()
  const secret = findSecret(secretId)
  if (!secret.versions.some((v) => v.version === version)) notFound('version')
  Object.assign(secret, { currentVersion: version, updatedAt: new Date().toISOString(), updatedBy: me().displayName })
  recordAudit('vault.secret_rollback', 'vault', label(secret), `Now using v${version}`)
}

/** Future: `DELETE /vault/secret/delete/{id}` — the key and all its versions. */
export const deleteSecret = async (secretId: number): Promise<void> => {
  await mockDelay()
  const secret = findSecret(secretId)
  vaultDb.secrets = vaultDb.secrets.filter((s) => s.secretId !== secretId)
  recordAudit('vault.secret_delete', 'vault', label(secret))
}

/** What an import did. */
export interface ImportResult {
  created: number
  updated: number
  unchanged: number
}

/**
 * Future: `POST /vault/secret/import`. Each KEY=value becomes a new key, or a new version of the
 * existing key for this tag; values that didn't change are skipped.
 */
export const importDotenv = async (serviceId: number, tagId: number, text: string, note: string): Promise<ImportResult> => {
  await mockDelay()
  const { entries, errors } = parseDotenv(text)
  if (errors.length) throw new Error(`Line ${errors[0]!.line}: ${errors[0]!.message}`)
  if (!entries.length) throw new Error('There are no KEY=value lines to import.')
  const existing = (name: string) =>
    vaultDb.secrets.find((s) => s.serviceId === serviceId && s.tagId === tagId && s.name === name)
  checkProjectLimit(serviceId, entries.filter((e) => !existing(e.key)).length)

  const result: ImportResult = { created: 0, updated: 0, unchanged: 0 }
  for (const { key, value } of entries) {
    const secret = existing(key)
    if (!secret) {
      const now = new Date().toISOString()
      vaultDb.secrets.push({
        secretId: vaultDb.nextId.secret++,
        serviceId,
        name: key,
        tagId,
        currentVersion: 1,
        latestVersion: 1,
        updatedAt: now,
        updatedBy: me().displayName,
        versions: [{ version: 1, value, note: note || 'Imported from .env', createdAt: now, createdBy: me().displayName }],
      })
      result.created++
    } else if (secret.versions.find((v) => v.version === secret.currentVersion)?.value === value) {
      result.unchanged++
    } else {
      pushVersion(secret, value, note || 'Imported from .env')
      result.updated++
    }
  }
  recordAudit('vault.env_import', 'vault', servicePath(serviceId), `${result.created} new, ${result.updated} changed`)
  return result
}

/** Future: `GET /vault/secret/export?service_id&tag_id` — the current values as a .env file. Audited like a reveal. */
export const exportDotenv = async (serviceId: number, tagId: number): Promise<string> => {
  await mockDelay()
  const secrets = vaultDb.secrets
    .filter((s) => s.serviceId === serviceId && s.tagId === tagId)
    .sort((a, b) => a.name.localeCompare(b.name))
  recordAudit('vault.env_export', 'vault', servicePath(serviceId), `${secrets.length} keys`)
  return serializeDotenv(
    secrets.map((s) => ({ key: s.name, value: s.versions.find((v) => v.version === s.currentVersion)!.value })),
  )
}
