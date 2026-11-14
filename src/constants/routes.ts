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
  Boxes,
  CheckCircle2,
  LayoutGrid,
  LineChart,
  Lock,
  ScrollText,
  Server,
  ShieldCheck,
  Workflow,
  Wrench,
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
  vaultKeys: '/vault/keys',
  vaultNotes: '/vault/notes',
  vaultConfigFiles: '/vault/config-files',
  approvals: '/approvals',
  metrics: '/metrics',
  workflows: '/workflows',
  serviceLogs: '/service-logs',
  admin: '/admin',
  adminOrganization: '/admin/organization',
  adminUsers: '/admin/users',
  adminApiKeys: '/admin/api-keys',
  adminRoles: '/admin/roles',
  tags: '/admin/tags',
  adminAuditLogs: '/admin/audit-logs',
  account: '/account',
  login: '/login',
  twoFactor: '/login/verify-2fa',
  forgotPassword: '/login/forgot-password',
  invite: '/invite/:token',
} as const

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
  { path: ROUTES.servers, title: 'Servers', icon: Server },
  { path: ROUTES.tools, title: 'Tools', icon: Wrench },
  {
    path: ROUTES.serviceManagement,
    title: 'Service management',
    icon: Boxes,
    children: [{ path: ROUTES.postgres, title: 'Postgres' }],
  },
  {
    path: ROUTES.vault,
    title: 'Vault',
    icon: Lock,
    children: [
      { path: ROUTES.vaultKeys, title: 'Keys store' },
      { path: ROUTES.vaultNotes, title: 'Secure notes' },
      { path: ROUTES.vaultConfigFiles, title: 'Config files' },
    ],
  },
  { path: ROUTES.approvals, title: 'Approvals', icon: CheckCircle2 },
  { path: ROUTES.metrics, title: 'Metrics', icon: LineChart },
  { path: ROUTES.workflows, title: 'Workflows', icon: Workflow },
  { path: ROUTES.serviceLogs, title: 'Service logs', icon: ScrollText },
  {
    path: ROUTES.admin,
    title: 'Admin',
    icon: ShieldCheck,
    children: [
      { path: ROUTES.adminOrganization, title: 'Organization' },
      { path: ROUTES.adminUsers, title: 'Users' },
      { path: ROUTES.adminApiKeys, title: 'API keys' },
      { path: ROUTES.adminRoles, title: 'Roles' },
      { path: ROUTES.tags, title: 'Tags' },
      { path: ROUTES.adminAuditLogs, title: 'Audit logs' },
    ],
  },
]

/** Every routed sidebar page: plain sections plus each group's children. */
export const APP_PAGES: readonly AppPage[] = APP_SECTIONS.flatMap((s) => s.children ?? [s])

/** Breadcrumb trail for each signed-in route, e.g. ['Vault', 'Keys store'] (the sidebar pages plus Account). */
export const PAGE_TITLES: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(
    APP_SECTIONS.flatMap((s) => (s.children ? s.children.map((c) => [c.path, [s.title, c.title]]) : [[s.path, [s.title]]])),
  ),
  [ROUTES.account]: ['Account'],
}
