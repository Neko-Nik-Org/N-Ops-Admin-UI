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
/** Types for API keys. */

/**
 * An API key. It acts with an existing role's permissions, limited to one tag and to the vault
 * projects it is linked to (`api_key` + `api_key_vault_project`).
 */
export interface ApiKey {
  apiKeyId: number
  keyName: string
  keyDescription: string
  /** The non-secret start of the key, e.g. "nk-12_3fA9", for recognizing it. */
  keyPrefix: string
  roleId: number
  tagId: number
  /** Vault projects the key can read; at least one. */
  vaultProjectIds: number[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** null = never expires. */
  expiresAt: string | null
  lastUsedAt: string | null
}

/** Fields set when creating or editing an API key. */
export interface ApiKeyInput {
  keyName: string
  keyDescription: string
  roleId: number
  tagId: number
  vaultProjectIds: number[]
  isActive: boolean
  expiresAt: string | null
}

/** A new key plus its secret, which is shown exactly once. */
export interface CreatedApiKey {
  apiKey: ApiKey
  secret: string
}
