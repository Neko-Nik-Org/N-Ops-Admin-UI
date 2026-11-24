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
 * Vault types. Each project holds three things:
 * - env: secret keys (deployment credentials and application secrets), tagged and versioned;
 * - conf: config files (deployable configuration artifacts), tagged and versioned;
 * - notes: secure notes (human-readable sensitive information, docs, recovery instructions,
 *   procedures), private to their owner unless shared, and never tagged.
 * Mirrors the vault_* tables in N-Ops-Main-API/docs/Schema/PGSQL.sql.
 */

/** Top level of the Vault (`vault_project`). Counts toward the plan's project limit. */
export interface VaultProject {
  projectId: number
  projectName: string
  description: string
  createdAt: string
  updatedAt: string
  /** The API's free-form `details` (the description lives in it); kept so a rename doesn't drop other keys. */
  details?: Record<string, unknown>
}

/** Fields for creating or renaming a project. */
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

/** A secret key (env var) without its value (`vault_secret_keys`). Unique per name + project + tag. */
export interface SecretKey {
  secretId: number
  projectId: number
  name: string
  tagId: number
  /** The version in use; can point back at an older one after a rollback. */
  currentVersion: number
  latestVersion: number
  /** The version in use is hidden: its value can't be revealed, copied or exported from the UI. */
  isHidden: boolean
  updatedAt: string
  updatedBy: string
}

/** A secret version's metadata (`vault_secret_key_versions`), without its value. */
export interface SecretVersionMeta extends VaultVersionMeta {
  /** `is_hidden`: a write-only value, never shown in the UI or logs. */
  isHidden: boolean
}

/** A secret version with its value (only returned when revealed, and never for a hidden one). */
export interface SecretVersion extends SecretVersionMeta {
  value: string
}

/** Fields for a new secret. */
export interface SecretInput {
  name: string
  tagId: number
  value: string
  note: string
  /** Store it write-only: it can be used but never shown again. */
  isHidden: boolean
}

/** A config file without its content. Same rules as keys: tagged, versioned. */
export interface ConfigFile {
  fileId: number
  projectId: number
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

/** What the signed-in user may do with a note: the owner does everything; shares are read or edit. */
export type NoteAccess = 'owner' | 'edit' | 'read'

/**
 * A secure note's summary (no content). Private by default: only its owner and the people it is
 * shared with see it. Notes have no tag. Public links (optionally with a password and expiry) let
 * anyone read the latest version.
 */
export interface SecureNote {
  noteId: number
  projectId: number
  title: string
  ownerId: number
  ownerName: string
  /** The signed-in user's access to this note. */
  myAccess: NoteAccess
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

/** Fields for creating or editing a note. `note` is the optional "what changed" for the version. */
export interface NoteInput {
  title: string
  content: string
  note?: string
}

/** Options for a new public link. */
export interface NoteLinkInput {
  password: string
  /** Days until it stops working; null = never. */
  expiresInDays: number | null
}
