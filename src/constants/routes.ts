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
 * Every route path in the app, plus the dashboard sections shown in the sidebar.
 * The router, Sidebar and Topbar all read from here, so a section is added or renamed in one place.
 */

import {
  // Boxes,
  // CheckCircle2,
  LayoutGrid,
  // LineChart,
  Lock,
  // ScrollText,
  // Server,
  ShieldCheck,
  // Workflow,
  // Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Route paths. Use these instead of writing paths inline. */
export const ROUTES = {
  overview: '/',
  servers: '/servers',
  tools: '/tools',
  serviceManagement: '/service-management',
  postgres: '/service-management/postgres',
  vault: '/vault',
  /** A project folder; `/vault/:projectId/:section` opens its Env, Conf or Notes folder. */
  vaultProject: '/vault/:projectId',
  vaultSection: '/vault/:projectId/:section',
  approvals: '/approvals',
  metrics: '/metrics',
  workflows: '/workflows',
  /** One workflow: its flow and runs. */
  workflowDetail: '/workflows/:workflowId',
  serviceLogs: '/service-logs',
  admin: '/admin',
  adminOrganization: '/admin/organization',
  adminUsers: '/admin/users',
  adminUserNew: '/admin/users/new',
  adminUser: '/admin/users/:userId',
  adminUserEdit: '/admin/users/:userId/edit',
  adminInvitations: '/admin/invitations',
  adminInvitationNew: '/admin/invitations/new',
  adminInvitation: '/admin/invitations/:invitationId',
  adminApiKeys: '/admin/api-keys',
  adminApiKeyNew: '/admin/api-keys/new',
  adminApiKey: '/admin/api-keys/:apiKeyId',
  adminApiKeyEdit: '/admin/api-keys/:apiKeyId/edit',
  adminRoles: '/admin/roles',
  /** New role; `?from=<id>` starts from a copy of that one (Duplicate). */
  adminRoleNew: '/admin/roles/new',
  adminRole: '/admin/roles/:roleId',
  adminRoleEdit: '/admin/roles/:roleId/edit',
  adminAccessPolicies: '/admin/access-policies',
  /** New policy; `?from=<id>` starts from a copy of that one (Duplicate). */
  adminAccessPolicyNew: '/admin/access-policies/new',
  adminAccessPolicy: '/admin/access-policies/:policyId',
  adminAccessPolicyEdit: '/admin/access-policies/:policyId/edit',
  tags: '/admin/tags',
  adminAuditLogs: '/admin/audit-logs',
  /** Redirects to the Profile page. */
  account: '/account',
  accountProfile: '/account/profile',
  accountSecurity: '/account/security',
  accountOrganization: '/account/organization',
  accountDevices: '/account/devices',
  /** Forced 2FA setup required by the user's access policy; outside the app shell. */
  securitySetup: '/security-setup',
  login: '/login',
  twoFactor: '/login/verify-2fa',
  forgotPassword: '/login/forgot-password',
  /** Accept an invitation; the emailed link is `/invite?code=<base64 JSON>`. */
  invite: '/invite',
  /**
   * Super admin (all organizations), behind the API's admin key rather than a user's sign-in.
   * Deliberately not linked from anywhere in the app.
   */
  superAdmin: '/super-admin',
  superAdminOrganizationNew: '/super-admin/organizations/new',
  superAdminOrganization: '/super-admin/organizations/:organizationId',
  superAdminOrganizationEdit: '/super-admin/organizations/:organizationId/edit',
} as const

/** URL of one user's page. */
export const userPath = (userId: number) => ROUTES.adminUser.replace(':userId', String(userId))

/** URL of the page that edits one user. */
export const userEditPath = (userId: number) => ROUTES.adminUserEdit.replace(':userId', String(userId))

/** URL of one invitation's page. */
export const invitationPath = (invitationId: number) => ROUTES.adminInvitation.replace(':invitationId', String(invitationId))

/** URL of one API key's page. */
export const apiKeyPath = (apiKeyId: number) => ROUTES.adminApiKey.replace(':apiKeyId', String(apiKeyId))

/** URL of the page that edits one API key. */
export const apiKeyEditPath = (apiKeyId: number) => ROUTES.adminApiKeyEdit.replace(':apiKeyId', String(apiKeyId))

/** URL of one role's page. */
export const rolePath = (roleId: number) => ROUTES.adminRole.replace(':roleId', String(roleId))

/** URL of the page that edits one role. */
export const roleEditPath = (roleId: number) => ROUTES.adminRoleEdit.replace(':roleId', String(roleId))

/** URL of the new-role page, optionally starting from a copy of another role. */
export const newRolePath = (fromRoleId?: number) =>
  fromRoleId === undefined ? ROUTES.adminRoleNew : `${ROUTES.adminRoleNew}?from=${fromRoleId}`

/** URL of one access policy's page. */
export const accessPolicyPath = (policyId: number) => ROUTES.adminAccessPolicy.replace(':policyId', String(policyId))

/** URL of the page that edits one access policy. */
export const accessPolicyEditPath = (policyId: number) => ROUTES.adminAccessPolicyEdit.replace(':policyId', String(policyId))

/** URL of the new-policy page, optionally starting from a copy of another policy. */
export const newAccessPolicyPath = (fromPolicyId?: number) =>
  fromPolicyId === undefined ? ROUTES.adminAccessPolicyNew : `${ROUTES.adminAccessPolicyNew}?from=${fromPolicyId}`

/** URL of one organization in the super-admin pages. */
export const superAdminOrganizationPath = (organizationId: string) =>
  ROUTES.superAdminOrganization.replace(':organizationId', encodeURIComponent(organizationId))

/** URL of the page that edits one organization, optionally opened at one of its sections. */
export const superAdminOrganizationEditPath = (organizationId: string, section?: 'name' | 'limits' | 'profile' | 'billing') =>
  `${ROUTES.superAdminOrganizationEdit.replace(':organizationId', encodeURIComponent(organizationId))}${section ? `#${section}` : ''}`

/** A routed page reached from the sidebar. */
export interface AppPage {
  path: string
  title: string
}

/**
 * A top-level sidebar entry. With `children` it is a collapsible group: its own `path` is only
 * the URL prefix of its pages (and redirects to the first one); otherwise it is a plain link.
 */
export interface AppSection extends AppPage {
  icon: LucideIcon
  children?: readonly AppPage[]
}

/** Sidebar sections, in display order. */
export const APP_SECTIONS: readonly AppSection[] = [
  { path: ROUTES.overview, title: 'Overview', icon: LayoutGrid },
  // { path: ROUTES.servers, title: 'Servers', icon: Server },
  // { path: ROUTES.tools, title: 'Tools', icon: Wrench },
  // {
  //   path: ROUTES.serviceManagement,
  //   title: 'Service management',
  //   icon: Boxes,
  //   children: [{ path: ROUTES.postgres, title: 'Postgres' }],
  // },
  // one link: the Vault page is a file explorer that navigates its own folders
  { path: ROUTES.vault, title: 'Vault', icon: Lock },
  // { path: ROUTES.approvals, title: 'Approvals', icon: CheckCircle2 },
  // { path: ROUTES.metrics, title: 'Metrics', icon: LineChart },
  // { path: ROUTES.workflows, title: 'Workflows', icon: Workflow },
  // { path: ROUTES.serviceLogs, title: 'Service logs', icon: ScrollText },
  {
    path: ROUTES.admin,
    title: 'Admin',
    icon: ShieldCheck,
    children: [
      { path: ROUTES.adminOrganization, title: 'Organization' },
      { path: ROUTES.adminUsers, title: 'Users' },
      { path: ROUTES.adminInvitations, title: 'Invitations' },
      // { path: ROUTES.adminApiKeys, title: 'API keys' },
      { path: ROUTES.adminRoles, title: 'Roles' },
      { path: ROUTES.adminAccessPolicies, title: 'Access policies' },
      { path: ROUTES.tags, title: 'Tags' },
      // { path: ROUTES.adminAuditLogs, title: 'Audit logs' },
    ],
  },
]

/** Older Vault URLs (tabs and pages before the explorer), kept working by sending them to the Vault root. */
export const VAULT_REDIRECTS: readonly string[] = [
  '/vault/env',
  '/vault/conf',
  '/vault/notes',
  '/vault/keys',
  '/vault/config-files',
]

/** Every routed sidebar page: plain sections plus each group's children. */
export const APP_PAGES: readonly AppPage[] = APP_SECTIONS.flatMap((s) => s.children ?? [s])

/** Breadcrumb trail for each signed-in route, e.g. ['Vault', 'Keys store'] (the sidebar pages plus Account). */
export const PAGE_TITLES: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(
    APP_SECTIONS.flatMap((s) => (s.children ? s.children.map((c) => [c.path, [s.title, c.title]]) : [[s.path, [s.title]]])),
  ),
  [ROUTES.accountProfile]: ['Account', 'Profile'],
  [ROUTES.accountSecurity]: ['Account', 'Security'],
  [ROUTES.accountOrganization]: ['Account', 'Organization'],
  [ROUTES.accountDevices]: ['Account', 'Devices'],
}

/**
 * Breadcrumb trail for a URL: an exact match, else the sidebar section it sits under (e.g. a Vault
 * folder like /vault/3/env shows "Vault", whose own address bar shows the rest).
 */
export const pageTrail = (pathname: string): readonly string[] => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const section = APP_SECTIONS.find((s) => s.path !== ROUTES.overview && pathname.startsWith(`${s.path}/`))
  return section ? [section.title] : []
}
