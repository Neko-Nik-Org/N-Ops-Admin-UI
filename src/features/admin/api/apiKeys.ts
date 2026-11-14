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
/** API keys (CRUD). Mock until `/api-keys/*` is live. */

import { clone, db, mockDelay, notFound, recordAudit } from '../mock/db'
import type { ApiKey, ApiKeyInput, CreatedApiKey } from '../types'

const findKey = (apiKeyId: number) => db.apiKeys.find((k) => k.apiKeyId === apiKeyId) ?? notFound('API key')

/** Key names are unique per organization; the role must exist. */
const assertValid = (input: ApiKeyInput, exceptId?: number) => {
  if (db.apiKeys.some((k) => k.apiKeyId !== exceptId && k.keyName.toLowerCase() === input.keyName.toLowerCase())) {
    throw new Error(`An API key called "${input.keyName}" already exists.`)
  }
  if (!db.roles.some((r) => r.roleId === input.roleId)) throw new Error('Pick a role for this key.')
}

/** Random URL-safe characters for the mock secret. */
const randomChars = (length: number) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** Future: `GET /api-keys/list`. */
export const listApiKeys = async (): Promise<ApiKey[]> => {
  await mockDelay()
  return clone(db.apiKeys)
}

/**
 * Future: `POST /api-keys/create`. Returns the full secret once, in the schema's
 * `nk-{id}_{random}` format; only its hash is stored, so it can't be shown again.
 */
export const createApiKey = async (input: ApiKeyInput): Promise<CreatedApiKey> => {
  await mockDelay()
  assertValid(input)
  const apiKeyId = db.nextId.apiKey++
  const secret = `nk-${apiKeyId}_${randomChars(40)}`
  const now = new Date().toISOString()
  const apiKey: ApiKey = { ...input, apiKeyId, keyPrefix: secret.slice(0, secret.indexOf('_') + 5), createdAt: now, updatedAt: now, lastUsedAt: null }
  db.apiKeys.push(apiKey)
  recordAudit('api_key.create', 'api_key', apiKey.keyName, `Role: ${db.roles.find((r) => r.roleId === input.roleId)?.roleName}`)
  return { apiKey: clone(apiKey), secret }
}

/** Future: `PUT /api-keys/update`. The secret itself never changes. */
export const updateApiKey = async (apiKeyId: number, input: ApiKeyInput): Promise<void> => {
  await mockDelay()
  const key = findKey(apiKeyId)
  assertValid(input, apiKeyId)
  Object.assign(key, input, { updatedAt: new Date().toISOString() })
  recordAudit('api_key.update', 'api_key', key.keyName, key.isActive ? '' : 'Disabled')
}

/** Future: `DELETE /api-keys/delete/{id}`. Anything using the key stops working at once. */
export const deleteApiKey = async (apiKeyId: number): Promise<void> => {
  await mockDelay()
  const key = findKey(apiKeyId)
  db.apiKeys = db.apiKeys.filter((k) => k.apiKeyId !== apiKeyId)
  recordAudit('api_key.delete', 'api_key', key.keyName)
}
