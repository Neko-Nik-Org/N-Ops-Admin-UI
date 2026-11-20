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
 * Every permission a role can grant, grouped for the role editor, plus the audit log's
 * action types. The tag:*, user:*, user:role:* and vault:project:* permissions exist in the API
 * today (docs/Permissions.md); the rest are the planned ones from the admin modules.
 */

/** A group of related permissions shown together in the role editor. */
export interface PermissionGroup {
  label: string
  permissions: ReadonlyArray<{ key: string; label: string }>
}

/**
 * Permissions in display order. Keys match the Main API (docs/Permissions.md and the
 * `has_all_permissions` checks in src/routes). Listing tags needs no permission, so there is no `tag:view`.
 */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    label: 'Organization',
    permissions: [
      { key: 'org:view', label: 'View organization' },
      { key: 'org:edit', label: 'Edit organization' },
    ],
  },
  {
    label: 'Users',
    permissions: [
      { key: 'user:view', label: 'View users' },
      { key: 'user:create', label: 'Create users' },
      { key: 'user:edit', label: 'Edit users' },
      { key: 'user:delete', label: 'Delete users' },
    ],
  },
  {
    label: 'Roles',
    permissions: [
      { key: 'user:role:view', label: 'View roles' },
      { key: 'user:role:create', label: 'Create roles' },
      { key: 'user:role:edit', label: 'Edit roles' },
      { key: 'user:role:delete', label: 'Delete roles' },
    ],
  },
  {
    label: 'API keys',
    permissions: [
      { key: 'api_key:view', label: 'View API keys' },
      { key: 'api_key:create', label: 'Create API keys' },
      { key: 'api_key:edit', label: 'Edit API keys' },
      { key: 'api_key:delete', label: 'Delete API keys' },
    ],
  },
  {
    label: 'Tags',
    permissions: [
      { key: 'tag:create', label: 'Create tags' },
      { key: 'tag:edit', label: 'Edit tags' },
      { key: 'tag:delete', label: 'Delete tags' },
    ],
  },
  {
    label: 'Audit logs',
    permissions: [
      { key: 'audit:view', label: 'View audit logs' },
      { key: 'audit:export', label: 'Export audit logs' },
    ],
  },
  {
    label: 'Servers',
    permissions: [
      { key: 'server:view', label: 'View servers' },
      { key: 'server:manage', label: 'Add, edit and remove servers' },
      { key: 'server:ssh', label: 'Open SSH sessions' },
      { key: 'server:exec', label: 'Run remote commands' },
    ],
  },
  {
    label: 'Vault',
    permissions: [
      { key: 'vault:project:view', label: 'View vault projects' },
      { key: 'vault:project:create', label: 'Create vault projects' },
      { key: 'vault:project:edit', label: 'Rename vault projects' },
      { key: 'vault:project:delete', label: 'Delete vault projects' },
      { key: 'vault:keys:view', label: 'View secret keys' },
      { key: 'vault:keys:edit', label: 'Edit secret keys' },
      { key: 'vault:notes:view', label: 'View secure notes' },
      { key: 'vault:notes:edit', label: 'Edit secure notes' },
      { key: 'vault:config:view', label: 'View config files' },
      { key: 'vault:config:edit', label: 'Edit config files' },
    ],
  },
  {
    label: 'Workflows',
    permissions: [
      { key: 'workflow:view', label: 'View workflows' },
      { key: 'workflow:edit', label: 'Build and edit workflows' },
      { key: 'workflow:run', label: 'Run workflows' },
    ],
  },
]

/** The four columns of the role editor's permission matrix. */
export const MATRIX_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type MatrixAction = (typeof MATRIX_ACTIONS)[number]

/** One row of the matrix: a module, its permission per column (absent = "—") and any others. */
export interface PermissionRow {
  label: string
  actions: Partial<Record<MatrixAction, string>>
  /** Permissions that don't fit View / Create / Edit / Delete, shown in the "More" column. */
  more?: ReadonlyArray<{ key: string; label: string }>
}

export interface PermissionSection {
  label: string
  rows: readonly PermissionRow[]
}

/** The permissions laid out as the role editor's matrix. Covers every key in PERMISSION_GROUPS. */
export const PERMISSION_MATRIX: readonly PermissionSection[] = [
  {
    label: 'Admin management',
    rows: [
      { label: 'Organization', actions: { view: 'org:view', edit: 'org:edit' } },
      { label: 'Users', actions: { view: 'user:view', create: 'user:create', edit: 'user:edit', delete: 'user:delete' } },
      {
        label: 'Roles',
        actions: { view: 'user:role:view', create: 'user:role:create', edit: 'user:role:edit', delete: 'user:role:delete' },
      },
      {
        label: 'API keys',
        actions: { view: 'api_key:view', create: 'api_key:create', edit: 'api_key:edit', delete: 'api_key:delete' },
      },
      { label: 'Audit logs', actions: { view: 'audit:view' }, more: [{ key: 'audit:export', label: 'Export' }] },
    ],
  },
  {
    label: 'Infrastructure',
    rows: [
      // everyone can list tags, so there is no tag:view
      { label: 'Tags', actions: { create: 'tag:create', edit: 'tag:edit', delete: 'tag:delete' } },
      {
        label: 'Servers',
        actions: { view: 'server:view' },
        more: [
          { key: 'server:manage', label: 'Manage' },
          { key: 'server:ssh', label: 'SSH' },
          { key: 'server:exec', label: 'Run commands' },
        ],
      },
    ],
  },
  {
    label: 'Vault',
    rows: [
      {
        label: 'Projects',
        actions: {
          view: 'vault:project:view',
          create: 'vault:project:create',
          edit: 'vault:project:edit',
          delete: 'vault:project:delete',
        },
      },
      { label: 'Secret keys', actions: { view: 'vault:keys:view', edit: 'vault:keys:edit' } },
      { label: 'Secure notes', actions: { view: 'vault:notes:view', edit: 'vault:notes:edit' } },
      { label: 'Config files', actions: { view: 'vault:config:view', edit: 'vault:config:edit' } },
    ],
  },
  {
    label: 'Automation',
    rows: [
      {
        label: 'Workflows',
        actions: { view: 'workflow:view', edit: 'workflow:edit' },
        more: [{ key: 'workflow:run', label: 'Run' }],
      },
    ],
  },
]

/** Every permission key in a matrix row. */
export const rowKeys = (row: PermissionRow): string[] => [
  ...MATRIX_ACTIONS.flatMap((a) => (row.actions[a] ? [row.actions[a]] : [])),
  ...(row.more ?? []).map((m) => m.key),
]

/** A permission's human label, e.g. "Create tags". */
export const permissionLabel = (key: string): string =>
  PERMISSION_GROUPS.flatMap((g) => g.permissions).find((p) => p.key === key)?.label ?? key

/** Every permission key. */
export const ALL_PERMISSIONS: readonly string[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))

/** Audit log action types, grouped by category (the part before the dot). */
export const AUDIT_ACTIONS: Readonly<Record<string, string>> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.logout': 'Signed out',
  'org.update': 'Updated organization',
  'user.create': 'Created user',
  'user.update': 'Updated user',
  'user.delete': 'Deleted user',
  'role.create': 'Created role',
  'role.update': 'Updated role',
  'role.delete': 'Deleted role',
  'api_key.create': 'Created API key',
  'api_key.update': 'Updated API key',
  'api_key.delete': 'Deleted API key',
  'api_key.use': 'Used API key',
  'tag.create': 'Created tag',
  'tag.update': 'Updated tag',
  'tag.delete': 'Deleted tag',
  'vault.secret_reveal': 'Revealed a secret',
  'vault.secret_create': 'Created a secret',
  'vault.secret_update': 'Changed a secret',
  'vault.secret_rollback': 'Rolled back a secret',
  'vault.secret_delete': 'Deleted a secret',
  'vault.env_import': 'Imported a .env file',
  'vault.env_export': 'Exported a .env file',
  'vault.config_read': 'Read a config file',
  'vault.config_create': 'Created a config file',
  'vault.config_update': 'Changed a config file',
  'vault.config_rollback': 'Rolled back a config file',
  'vault.config_delete': 'Deleted a config file',
  'vault.note_read': 'Opened a secure note',
  'vault.note_create': 'Created a secure note',
  'vault.note_update': 'Changed a secure note',
  'vault.note_delete': 'Deleted a secure note',
  'vault.note_share': 'Shared a secure note',
  'vault.project_create': 'Created a vault project',
  'vault.project_update': 'Updated a vault project',
  'vault.project_delete': 'Deleted a vault project',
  'server.ssh_session': 'Opened SSH session',
  'server.command': 'Ran a command',
  'approval.approve': 'Approved a request',
  'approval.reject': 'Rejected a request',
  'workflow.run': 'Ran a workflow',
  'workflow.create': 'Created a workflow',
  'workflow.update': 'Updated a workflow',
  'workflow.delete': 'Deleted a workflow',
  'audit.export': 'Exported audit logs',
}

/** Audit categories for the action filter, e.g. "user" → "Users". */
export const AUDIT_CATEGORIES: Readonly<Record<string, string>> = {
  auth: 'Sign-in',
  org: 'Organization',
  user: 'Users',
  role: 'Roles',
  api_key: 'API keys',
  tag: 'Tags',
  vault: 'Vault',
  server: 'Servers',
  approval: 'Approvals',
  workflow: 'Workflows',
  audit: 'Audit logs',
}

/** How far back audit logs are kept. */
export const AUDIT_RETENTION_DAYS = 90
