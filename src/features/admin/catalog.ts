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
 * action types. Only the tag:* permissions exist in the API today (docs/Permissions.md);
 * the rest are the planned ones from the admin modules.
 */

/** A group of related permissions shown together in the role editor. */
export interface PermissionGroup {
  label: string
  permissions: ReadonlyArray<{ key: string; label: string }>
}

/** Permissions in display order. */
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
      { key: 'role:view', label: 'View roles' },
      { key: 'role:create', label: 'Create roles' },
      { key: 'role:edit', label: 'Edit roles' },
      { key: 'role:delete', label: 'Delete roles' },
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
      { key: 'tag:view', label: 'View tags' },
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
  'vault.service_create': 'Created a vault service',
  'vault.service_update': 'Updated a vault service',
  'vault.service_delete': 'Deleted a vault service',
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
