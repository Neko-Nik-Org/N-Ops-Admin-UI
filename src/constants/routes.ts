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
  Tag,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Route paths. Use these instead of writing paths inline. */
export const ROUTES = {
  overview: '/',
  admin: '/admin',
  tags: '/tags',
  servers: '/servers',
  tools: '/tools',
  serviceManagement: '/service-management',
  vault: '/vault',
  approvals: '/approvals',
  metrics: '/metrics',
  workflows: '/workflows',
  serviceLogs: '/service-logs',
  account: '/account',
  login: '/login',
  twoFactor: '/login/verify-2fa',
  invite: '/invite/:token',
} as const

/** A dashboard section: a sidebar link and its route. */
export interface AppSection {
  path: string
  title: string
  icon: LucideIcon
}

/** Sidebar sections, in display order. */
export const APP_SECTIONS: readonly AppSection[] = [
  { path: ROUTES.overview, title: 'Overview', icon: LayoutGrid },
  { path: ROUTES.admin, title: 'Admin', icon: Users },
  { path: ROUTES.tags, title: 'Tags', icon: Tag },
  { path: ROUTES.servers, title: 'Servers', icon: Server },
  { path: ROUTES.tools, title: 'Tools', icon: Wrench },
  { path: ROUTES.serviceManagement, title: 'Service management', icon: Boxes },
  { path: ROUTES.vault, title: 'Vault', icon: Lock },
  { path: ROUTES.approvals, title: 'Approvals', icon: CheckCircle2 },
  { path: ROUTES.metrics, title: 'Metrics', icon: LineChart },
  { path: ROUTES.workflows, title: 'Workflows', icon: Workflow },
  { path: ROUTES.serviceLogs, title: 'Service logs', icon: ScrollText },
]

/** Breadcrumb title for each signed-in route (the sidebar sections plus Account). */
export const PAGE_TITLES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(APP_SECTIONS.map((s) => [s.path, s.title])),
  [ROUTES.account]: 'Account',
}
