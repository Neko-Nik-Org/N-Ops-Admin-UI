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
 * Vault types: projects → services → secret keys and config files (tagged, versioned),
 * and per-project secure notes. Mirrors the vault_* tables in N-Ops-Main-API/docs/Schema/PGSQL.sql.
 */

/** Top level of the Vault (`vault_project`). Counts toward the plan's project limit. */
export interface VaultProject {
  projectId: number
  projectName: string
  description: string
  createdAt: string
  updatedAt: string
}

/** A service inside a project (`vault_service`); keys and config files live here. */
export interface VaultService {
  serviceId: number
  projectId: number
  serviceName: string
  description: string
  createdAt: string
  updatedAt: string
}

/** Fields for creating or renaming a project or service. */
export interface VaultContainerInput {
  name: string
  description: string
}

/** One immutable version of a secret or file. Never edited; a change adds a new one. */
export interface VaultVersionMeta {
  version: number
  createdAt: string
  createdBy: string
  /** Why it changed, e.g. "Rotated after leak drill". */
  note: string
}

/** A secret key (env var) without its value (`vault_secret_keys`). Unique per name + service + tag. */
export interface SecretKey {
  secretId: number
  serviceId: number
  name: string
  tagId: number
  /** The version in use; can point back at an older one after a rollback. */
  currentVersion: number
  latestVersion: number
  updatedAt: string
  updatedBy: string
}

/** A secret version's metadata plus its value (only returned when revealed). */
export interface SecretVersion extends VaultVersionMeta {
  value: string
}

/** Fields for a new secret. */
export interface SecretInput {
  name: string
  tagId: number
  value: string
  note: string
}

/** A config file without its content. Same rules as keys: tagged, versioned. */
export interface ConfigFile {
  fileId: number
  serviceId: number
  fileName: string
  tagId: number
  currentVersion: number
  latestVersion: number
  sizeBytes: number
  updatedAt: string
  updatedBy: string
}

/** A config file version with its content. */
export interface ConfigVersion extends VaultVersionMeta {
  content: string
  sizeBytes: number
}

/** Fields for a new config file. */
export interface ConfigFileInput {
  fileName: string
  tagId: number
  content: string
  note: string
}

/** Someone in the org a note is shared with (`vault_secure_note_internal_shares`). */
export interface NoteShare {
  userId: number
  displayName: string
  canEdit: boolean
}

/** A public link to a note (`vault_secure_note_external_shares`). */
export interface NoteLink {
  shareId: string
  url: string
  hasPassword: boolean
  expiresAt: string | null
  createdAt: string
}

/** A secure note's summary (no content). */
export interface SecureNote {
  noteId: number
  projectId: number
  title: string
  ownerId: number
  ownerName: string
  /** Locked with a password: the content is encrypted and needs the password to read. */
  isProtected: boolean
  latestVersion: number
  createdAt: string
  updatedAt: string
  shares: NoteShare[]
  links: NoteLink[]
}

/** A note version with its content. */
export interface NoteVersion extends VaultVersionMeta {
  title: string
  content: string
}

/** Fields for creating or editing a note. `password`: undefined keeps the current lock, '' removes it. */
export interface NoteInput {
  title: string
  content: string
  password?: string
  note?: string
}

/** Options for a new public link. */
export interface NoteLinkInput {
  password: string
  /** Days until it stops working; null = never. */
  expiresInDays: number | null
}
