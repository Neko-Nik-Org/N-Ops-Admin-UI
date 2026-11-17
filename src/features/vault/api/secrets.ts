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
/** Env: secret keys (deployment credentials and application secrets as env vars) with immutable versions, rollback and .env import/export. Mock until `/vault/secret/*` is live. */

import { db as adminDb, recordAudit } from '@/mocks/adminDb'
import { clone, mockDelay, notFound } from '@/mocks/helpers'
import { parseDotenv, serializeDotenv } from '../dotenv'
import { me, vaultDb, type StoredSecret } from '@/mocks/vaultDb'
import type { SecretInput, SecretKey, SecretVersionMeta } from '../types'
import { projectPath } from './projects'

const findSecret = (secretId: number) => vaultDb.secrets.find((s) => s.secretId === secretId) ?? notFound('secret')

/** Env var names: letters, digits and underscores, not starting with a digit. */
export const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/

/** A secret without its versions (values never leave the server unless revealed). */
const summary = ({ versions: _versions, ...secret }: StoredSecret): SecretKey => clone(secret)

const label = (s: StoredSecret) => `${projectPath(s.projectId)} / ${s.name}`

/** Thrown when someone asks for the value of a hidden (write-only) version. */
export const HIDDEN_SECRET_MESSAGE = 'This value is hidden. It can be used, but not shown or exported.'

/** The version in use. */
const currentOf = (secret: StoredSecret) => secret.versions.find((v) => v.version === secret.currentVersion)!

/** Plan limit: keys per project. */
const checkProjectLimit = (projectId: number, adding: number) => {
  const count = vaultDb.secrets.filter((s) => s.projectId === projectId).length
  const limit = adminDb.organization.limits.vaultKeysPerProject
  if (count + adding > limit) throw new Error(`Your plan allows ${limit} keys per project. This project has ${count}.`)
}

/** Adds an immutable version and makes it current. */
const pushVersion = (secret: StoredSecret, value: string, note: string, isHidden: boolean) => {
  const version = secret.latestVersion + 1
  const now = new Date().toISOString()
  secret.versions.push({ version, value, note, isHidden, createdAt: now, createdBy: me().displayName })
  Object.assign(secret, {
    latestVersion: version,
    currentVersion: version,
    isHidden,
    updatedAt: now,
    updatedBy: me().displayName,
  })
}

/** Future: `GET /vault/secret/list?project_id` — names and versions only. */
export const listSecrets = async (projectId: number): Promise<SecretKey[]> => {
  await mockDelay()
  return vaultDb.secrets.filter((s) => s.projectId === projectId).map(summary)
}

/**
 * Future: `GET /vault/secret/reveal/{id}?version`. Every reveal is audited. Defaults to the current
 * version. A hidden version (`is_hidden`) is refused, and the attempt is recorded as denied.
 */
export const revealSecret = async (secretId: number, version?: number): Promise<string> => {
  await mockDelay()
  const secret = findSecret(secretId)
  const v = version ?? secret.currentVersion
  const found = secret.versions.find((x) => x.version === v) ?? notFound('version')
  if (found.isHidden) {
    recordAudit('vault.secret_reveal', 'vault', label(secret), `v${v} is hidden`, 'denied')
    throw new Error(HIDDEN_SECRET_MESSAGE)
  }
  recordAudit('vault.secret_reveal', 'vault', label(secret), `v${v}`)
  return found.value
}

/** Future: `GET /vault/secret/versions/{id}` — history without values. */
export const listSecretVersions = async (secretId: number): Promise<SecretVersionMeta[]> => {
  await mockDelay()
  return findSecret(secretId)
    .versions.map(({ value: _value, ...meta }) => clone(meta))
    .reverse()
}

/** Future: `POST /vault/secret/create`. Unique per name + project + tag. */
export const createSecret = async (projectId: number, input: SecretInput): Promise<SecretKey> => {
  await mockDelay()
  if (!SECRET_NAME.test(input.name)) throw new Error('Use letters, numbers and underscores, not starting with a number.')
  if (vaultDb.secrets.some((s) => s.projectId === projectId && s.name === input.name && s.tagId === input.tagId)) {
    throw new Error(`${input.name} already exists for this tag. Add a new version to it instead.`)
  }
  checkProjectLimit(projectId, 1)
  const now = new Date().toISOString()
  const secret: StoredSecret = {
    secretId: vaultDb.nextId.secret++,
    projectId,
    name: input.name,
    tagId: input.tagId,
    currentVersion: 1,
    latestVersion: 1,
    isHidden: input.isHidden,
    updatedAt: now,
    updatedBy: me().displayName,
    versions: [
      {
        version: 1,
        value: input.value,
        note: input.note || 'Initial',
        isHidden: input.isHidden,
        createdAt: now,
        createdBy: me().displayName,
      },
    ],
  }
  vaultDb.secrets.push(secret)
  recordAudit('vault.secret_create', 'vault', label(secret))
  return summary(secret)
}

/**
 * Future: `POST /vault/secret/version` — a new value becomes a new version; old ones are kept.
 * Each version has its own `isHidden`, so a key can switch between hidden and visible over time.
 */
export const addSecretVersion = async (secretId: number, value: string, note: string, isHidden: boolean): Promise<void> => {
  await mockDelay()
  const secret = findSecret(secretId)
  pushVersion(secret, value, note, isHidden)
  recordAudit('vault.secret_update', 'vault', label(secret), `v${secret.latestVersion}${note ? ` — ${note}` : ''}`)
}

/** Future: `PUT /vault/secret/rollback` — points the key at an older version; nothing is deleted. */
export const rollbackSecret = async (secretId: number, version: number): Promise<void> => {
  await mockDelay()
  const secret = findSecret(secretId)
  if (!secret.versions.some((v) => v.version === version)) notFound('version')
  Object.assign(secret, {
    currentVersion: version,
    isHidden: secret.versions.find((v) => v.version === version)!.isHidden,
    updatedAt: new Date().toISOString(),
    updatedBy: me().displayName,
  })
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

/** What an export produced. */
export interface ExportResult {
  /** The .env body. */
  body: string
  exported: number
  /** Hidden keys left out: their values never leave the vault through the UI. */
  skippedHidden: string[]
}

/**
 * Future: `POST /vault/secret/import`. Each KEY=value becomes a new key, or a new version of the
 * existing key for this tag; values that didn't change are skipped.
 */
export const importDotenv = async (projectId: number, tagId: number, text: string, note: string): Promise<ImportResult> => {
  await mockDelay()
  const { entries, errors } = parseDotenv(text)
  if (errors.length) throw new Error(`Line ${errors[0]!.line}: ${errors[0]!.message}`)
  if (!entries.length) throw new Error('There are no KEY=value lines to import.')
  const existing = (name: string) =>
    vaultDb.secrets.find((s) => s.projectId === projectId && s.tagId === tagId && s.name === name)
  checkProjectLimit(projectId, entries.filter((e) => !existing(e.key)).length)

  const result: ImportResult = { created: 0, updated: 0, unchanged: 0 }
  for (const { key, value } of entries) {
    const secret = existing(key)
    if (!secret) {
      const now = new Date().toISOString()
      vaultDb.secrets.push({
        secretId: vaultDb.nextId.secret++,
        projectId,
        name: key,
        tagId,
        currentVersion: 1,
        latestVersion: 1,
        isHidden: false,
        updatedAt: now,
        updatedBy: me().displayName,
        versions: [
          {
            version: 1,
            value,
            note: note || 'Imported from .env',
            isHidden: false,
            createdAt: now,
            createdBy: me().displayName,
          },
        ],
      })
      result.created++
    } else if (currentOf(secret).value === value) {
      result.unchanged++
    } else {
      // an import keeps a hidden key hidden
      pushVersion(secret, value, note || 'Imported from .env', secret.isHidden)
      result.updated++
    }
  }
  recordAudit('vault.env_import', 'vault', projectPath(projectId), `${result.created} new, ${result.updated} changed`)
  return result
}

/**
 * Future: `GET /vault/secret/export?project_id&tag_id` — the current values as a .env file. Audited
 * like a reveal. Hidden keys are left out and listed, since their values must not leave the vault.
 */
export const exportDotenv = async (projectId: number, tagId: number): Promise<ExportResult> => {
  await mockDelay()
  const secrets = vaultDb.secrets
    .filter((s) => s.projectId === projectId && s.tagId === tagId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const shown = secrets.filter((s) => !currentOf(s).isHidden)
  const skippedHidden = secrets.filter((s) => currentOf(s).isHidden).map((s) => s.name)
  recordAudit(
    'vault.env_export',
    'vault',
    projectPath(projectId),
    `${shown.length} keys${skippedHidden.length ? `, ${skippedHidden.length} hidden left out` : ''}`,
  )
  return {
    body: serializeDotenv(shown.map((s) => ({ key: s.name, value: currentOf(s).value }))),
    exported: shown.length,
    skippedHidden,
  }
}
