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
 * Env: secret keys (`/vault/secret/keys/*`) — env vars with immutable versions, rollback and .env
 * import/export. Every key belongs to a project and one tag, and the API lists them per project +
 * tag, so a project's keys are fetched tag by tag. Values are encrypted by the API with the
 * organization's key and only come back from `read`, never for a hidden version.
 *
 * Permissions: `vault:keys:view` for everything; creating adds `vault:keys:create`, a new version
 * or a rollback `vault:keys:edit`, deleting `vault:keys:delete`; plus access to the key's tag.
 *
 * The API has no import / export endpoints, so those run here on top of create / update / read.
 * Each version's `details` JSON carries the UI's `note` (reason for the change) and `created_by`.
 */

import { apiClient } from '@/api/client'
import { ApiError, errorCode, errorStatus } from '@/types/api'
import type { JsonObject } from '@/types/account'
import type { SecretInput, SecretKey, SecretVersionMeta } from '@/types/vault'
import { parseDotenv, serializeDotenv } from '@/utils/dotenv'

/** Env var names: letters, digits and underscores, not starting with a digit (`secret_name` is VARCHAR(100)). */
export const SECRET_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/

/** The API refuses values longer than this many bytes (UTF-8). */
export const SECRET_VALUE_MAX_BYTES = 255

/** Why a value can't be saved, or undefined when it's fine. Mirrors `validate_secret_value` in the API. */
export const secretValueError = (value: string): string | undefined => {
  if (!value.trim()) return 'Enter a value.'
  if (new TextEncoder().encode(value).length > SECRET_VALUE_MAX_BYTES)
    return `Values can be at most ${SECRET_VALUE_MAX_BYTES} bytes.`
  return undefined
}

/** Rows fetched per request when paging through a list. */
export const SECRET_PAGE_SIZE = 100

/** A key as `GET /vault/secret/keys/list` returns it (`VaultKeysListing`). */
interface RawSecretKey {
  secret_id: number
  secret_name: string
  current_version: number
  /** Whether the version in use is hidden. */
  is_hidden: boolean
  created_at: string
  updated_at: string
}

/** A version as `GET /vault/secret/keys/list-versions` returns it (`VaultKeyVersionsListing`). */
interface RawSecretVersion {
  version_number: number
  is_hidden: boolean
  details: JsonObject | null
  created_at: string
}

/** A version with its value, from `GET /vault/secret/keys/read/{id}/{version}` (`SkVersionDto`). */
interface RawSecretValue {
  project_id: number
  secret_id: number
  tag_id: number
  secret_value: string
  hide_from_ui: boolean
  details: JsonObject | null
}

/** The paged list shape: `{ total_count, data }`. */
interface RawPage<T> {
  total_count: number
  data: T[]
}

/** Which key a call is about: the API checks the project and tag along with the id. */
export type SecretRef = Pick<SecretKey, 'secretId' | 'projectId' | 'tagId'>

const toSecretKey = (projectId: number, tagId: number, s: RawSecretKey): SecretKey => ({
  secretId: s.secret_id,
  projectId,
  tagId,
  name: s.secret_name,
  currentVersion: s.current_version,
  isHidden: s.is_hidden,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
})

const text = (v: unknown) => (typeof v === 'string' ? v : '')

const toVersionMeta = (v: RawSecretVersion): SecretVersionMeta => ({
  version: v.version_number,
  isHidden: v.is_hidden,
  createdAt: v.created_at,
  createdBy: text(v.details?.created_by),
  note: text(v.details?.note),
})

/** The `details` stored with a version. */
const versionDetails = (note: string, by: string): JsonObject => {
  const details: JsonObject = {}
  if (note.trim()) details.note = note.trim()
  if (by) details.created_by = by
  return details
}

/** Fetches every page of a `{ total_count, data }` list. */
const fetchAll = async <T>(fetchPage: (offset: number) => Promise<RawPage<T>>): Promise<T[]> => {
  const rows: T[] = []
  for (;;) {
    const page = await fetchPage(rows.length)
    rows.push(...page.data)
    if (!page.data.length || rows.length >= page.total_count) return rows
  }
}

/** `GET /vault/secret/keys/list` — one project + tag's keys, sorted by name, without values. */
export const listTagSecrets = async (projectId: number, tagId: number): Promise<SecretKey[]> => {
  const rows = await fetchAll(async (offset) => {
    const { data } = await apiClient.get<RawPage<RawSecretKey>>('/vault/secret/keys/list', {
      params: { project_id: projectId, tag_id: tagId, limit: SECRET_PAGE_SIZE, offset },
    })
    return data
  })
  return rows.map((s) => toSecretKey(projectId, tagId, s))
}

/** A project's keys across `tagIds` (the tags the user can see), one request per tag. */
export const listSecrets = async (projectId: number, tagIds: readonly number[]): Promise<SecretKey[]> =>
  (await Promise.all(tagIds.map((tagId) => listTagSecrets(projectId, tagId)))).flat()

/** How many keys a project holds across `tagIds`, without loading them. */
export const countSecrets = async (projectId: number, tagIds: readonly number[]): Promise<number> => {
  const counts = await Promise.all(
    tagIds.map(async (tagId) => {
      const { data } = await apiClient.get<RawPage<RawSecretKey>>('/vault/secret/keys/list', {
        params: { project_id: projectId, tag_id: tagId, limit: 1, offset: 0 },
      })
      return data.total_count
    }),
  )
  return counts.reduce((a, b) => a + b, 0)
}

/**
 * `GET /vault/secret/keys/read/{id}/{version}` — the decrypted value of one version. The API answers
 * 404 for a hidden version, the same as for a missing one.
 */
export const revealSecret = async (secretId: number, version: number): Promise<string> => {
  try {
    const { data } = await apiClient.get<RawSecretValue>(`/vault/secret/keys/read/${secretId}/${version}`)
    return data.secret_value
  } catch (error) {
    if (errorStatus(error) === 404)
      throw new ApiError(`v${version} is hidden or no longer exists, so it can't be shown.`, 404, errorCode(error))
    throw error
  }
}

/** `GET /vault/secret/keys/list-versions` — every version of a key, newest first, without values. */
export const listSecretVersions = async (secret: SecretRef): Promise<SecretVersionMeta[]> => {
  const rows = await fetchAll(async (offset) => {
    const { data } = await apiClient.get<RawPage<RawSecretVersion>>('/vault/secret/keys/list-versions', {
      params: {
        project_id: secret.projectId,
        tag_id: secret.tagId,
        secret_id: secret.secretId,
        limit: SECRET_PAGE_SIZE,
        offset,
      },
    })
    return data
  })
  return rows.map(toVersionMeta)
}

/**
 * The API reports its own checks (duplicate name, key limit, project gone) as a bare
 * "E112: SQL Database error", so say what it most likely was.
 */
const explainE112 = (error: unknown, message: string): never => {
  if (errorCode(error) === 'E112') throw new ApiError(`${message} (E112)`, errorStatus(error), 'E112')
  throw error
}

/**
 * `POST /vault/secret/keys/create` — a new key at v1. Unique per project + tag + name; answers 201
 * with no body. The name is checked here first, since the API's duplicate error is lost (E112).
 */
export const createSecret = async (projectId: number, input: SecretInput, by = ''): Promise<void> => {
  if (!SECRET_NAME.test(input.name)) throw new Error('Use letters, numbers and underscores, not starting with a number.')
  const valueError = secretValueError(input.value)
  if (valueError) throw new Error(valueError)
  if ((await listTagSecrets(projectId, input.tagId)).some((s) => s.name === input.name))
    throw new Error(`${input.name} already exists for this tag. Add a new version to it instead.`)
  try {
    await apiClient.post('/vault/secret/keys/create', {
      project_id: projectId,
      tag_id: input.tagId,
      secret_name: input.name,
      secret_value: input.value,
      hide_from_ui: input.isHidden,
      details: versionDetails(input.note || 'Initial', by),
    })
  } catch (error) {
    explainE112(error, `Couldn't add ${input.name}. The project may have reached your plan's key limit.`)
  }
}

/**
 * `PUT /vault/secret/keys/update` — a new value becomes a new version and the one in use; older
 * versions are kept. Hiding is per version, so a key can switch between hidden and visible.
 */
export const addSecretVersion = async (
  secret: SecretRef,
  value: string,
  note: string,
  isHidden: boolean,
  by = '',
): Promise<void> => {
  const valueError = secretValueError(value)
  if (valueError) throw new Error(valueError)
  try {
    await apiClient.put('/vault/secret/keys/update', {
      project_id: secret.projectId,
      secret_id: secret.secretId,
      tag_id: secret.tagId,
      secret_value: value,
      hide_from_ui: isHidden,
      details: versionDetails(note, by),
    })
  } catch (error) {
    explainE112(error, "Couldn't save the new version. The key may have been deleted: refresh and try again.")
  }
}

/** `PATCH /vault/secret/keys/rollback/{id}/{version}` — points the key at an older version; nothing is deleted. */
export const rollbackSecret = async (secretId: number, version: number): Promise<void> => {
  await apiClient.patch(`/vault/secret/keys/rollback/${secretId}/${version}`)
}

/** `DELETE /vault/secret/keys/delete` — the key and all its versions; 204. */
export const deleteSecret = async (secret: SecretRef): Promise<void> => {
  await apiClient.delete('/vault/secret/keys/delete', {
    params: { project_id: secret.projectId, tag_id: secret.tagId, secret_id: secret.secretId },
  })
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
 * Imports a .env into one project + tag: a new name becomes a key, a known one gets a new version
 * when its value changed. A hidden key's value can't be read to compare, so it always gets a new
 * version, and stays hidden. Runs one request at a time; stops at the first failure, keeping what
 * was already saved.
 */
export const importDotenv = async (
  projectId: number,
  tagId: number,
  text: string,
  note: string,
  by = '',
): Promise<ImportResult> => {
  const { entries, errors } = parseDotenv(text)
  if (errors.length) throw new Error(`Line ${errors[0]!.line}: ${errors[0]!.message}`)
  if (!entries.length) throw new Error('There are no KEY=value lines to import.')
  const badName = entries.find((e) => !SECRET_NAME.test(e.key))
  if (badName) throw new Error(`${badName.key}: use letters, numbers and underscores, not starting with a number.`)
  for (const { key, value } of entries) {
    const valueError = secretValueError(value)
    if (valueError) throw new Error(`${key}: ${valueError}`)
  }

  const existing = new Map((await listTagSecrets(projectId, tagId)).map((s) => [s.name, s]))
  const reason = note.trim() || 'Imported from .env'
  const result: ImportResult = { created: 0, updated: 0, unchanged: 0 }
  for (const { key, value } of entries) {
    const secret = existing.get(key)
    try {
      if (!secret) {
        await apiClient.post('/vault/secret/keys/create', {
          project_id: projectId,
          tag_id: tagId,
          secret_name: key,
          secret_value: value,
          hide_from_ui: false,
          details: versionDetails(reason, by),
        })
        result.created++
      } else if (!secret.isHidden && (await revealSecret(secret.secretId, secret.currentVersion)) === value) {
        result.unchanged++
      } else {
        await addSecretVersion(secret, value, reason, secret.isHidden, by)
        result.updated++
      }
    } catch (error) {
      const done = `${result.created} new and ${result.updated} changed were saved before it stopped`
      if (!secret && errorCode(error) === 'E112')
        throw new ApiError(
          `Couldn't import ${key}; the project may have reached your plan's key limit. ${done}. (E112)`,
          errorStatus(error),
          'E112',
        )
      throw new Error(`Couldn't import ${key}: ${(error as Error).message} ${done}.`)
    }
  }
  return result
}

/** One project + tag's keys as a .env file: the value in use for each, leaving hidden keys out. */
export const exportDotenv = async (projectId: number, tagId: number): Promise<ExportResult> => {
  const secrets = (await listTagSecrets(projectId, tagId)).sort((a, b) => a.name.localeCompare(b.name))
  const shown = secrets.filter((s) => !s.isHidden)
  const values = await Promise.all(shown.map((s) => revealSecret(s.secretId, s.currentVersion)))
  return {
    body: serializeDotenv(shown.map((s, i) => ({ key: s.name, value: values[i]! }))),
    exported: shown.length,
    skippedHidden: secrets.filter((s) => s.isHidden).map((s) => s.name),
  }
}
