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
 * Route pages, loaded on demand: each page's code (and heavy libraries like the workflow canvas)
 * downloads the first time its route opens, not with the first visit. Every page is here, the sign-in
 * page included, so signed-in visits don't download it and signed-out visits don't download the app.
 */

import { lazy, type ComponentType } from 'react'
import { matchPath } from 'react-router-dom'
import { APP_PAGES, ROUTES } from '@/constants/routes'

/** One import per page module; each page is a named export with the module's own name. */
const loaders = {
  AccountPage: () => import('@/pages/account'),
  AccessPolicyDetailPage: () => import('@/pages/admin/accessPolicies/details'),
  AccessPolicyFormPage: () => import('@/pages/admin/accessPolicies/form'),
  AdminAccessPoliciesPage: () => import('@/pages/admin/accessPolicies/list'),
  AdminApiKeysPage: () => import('@/pages/admin/apiKeys'),
  AdminAuditLogsPage: () => import('@/pages/admin/auditLogs'),
  AdminInvitationsPage: () => import('@/pages/admin/invitations'),
  AdminOrganizationPage: () => import('@/pages/admin/organization'),
  AdminRolesPage: () => import('@/pages/admin/roles'),
  AdminUsersPage: () => import('@/pages/admin/users'),
  ComingSoonPage: () => import('@/pages/comingSoon'),
  ForgotPasswordPage: () => import('@/pages/auth/forgotPassword'),
  InvitePage: () => import('@/pages/auth/invite'),
  LoginPage: () => import('@/pages/auth/login'),
  NotFoundPage: () => import('@/pages/notFound'),
  OrganizationDetailPage: () => import('@/pages/superAdmin/organizations/details'),
  OrganizationsPage: () => import('@/pages/superAdmin/organizations/list'),
  OverviewPage: () => import('@/pages/overview'),
  SecuritySetupPage: () => import('@/pages/auth/securitySetup'),
  SuperAdminShell: () => import('@/pages/superAdmin/SuperAdminShell'),
  TagsPage: () => import('@/pages/admin/tags'),
  TwoFactorPage: () => import('@/pages/auth/twoFactor'),
  VaultPage: () => import('@/pages/vault'),
  WorkflowDetailPage: () => import('@/pages/workflows/details'),
  WorkflowsPage: () => import('@/pages/workflows/list'),
}

/** A lazy component for the page export named `name` in the module `load` imports. */
const page = <K extends string, P extends object>(load: () => Promise<Record<K, ComponentType<P>>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

export const AccountPage = page(loaders.AccountPage, 'AccountPage')
export const AccessPolicyDetailPage = page(loaders.AccessPolicyDetailPage, 'AccessPolicyDetailPage')
export const AccessPolicyFormPage = page(loaders.AccessPolicyFormPage, 'AccessPolicyFormPage')
export const AdminAccessPoliciesPage = page(loaders.AdminAccessPoliciesPage, 'AdminAccessPoliciesPage')
export const AdminApiKeysPage = page(loaders.AdminApiKeysPage, 'AdminApiKeysPage')
export const AdminAuditLogsPage = page(loaders.AdminAuditLogsPage, 'AdminAuditLogsPage')
export const AdminInvitationsPage = page(loaders.AdminInvitationsPage, 'AdminInvitationsPage')
export const AdminOrganizationPage = page(loaders.AdminOrganizationPage, 'AdminOrganizationPage')
export const AdminRolesPage = page(loaders.AdminRolesPage, 'AdminRolesPage')
export const AdminUsersPage = page(loaders.AdminUsersPage, 'AdminUsersPage')
export const ComingSoonPage = page(loaders.ComingSoonPage, 'ComingSoonPage')
export const ForgotPasswordPage = page(loaders.ForgotPasswordPage, 'ForgotPasswordPage')
export const InvitePage = page(loaders.InvitePage, 'InvitePage')
export const LoginPage = page(loaders.LoginPage, 'LoginPage')
export const NotFoundPage = page(loaders.NotFoundPage, 'NotFoundPage')
export const OverviewPage = page(loaders.OverviewPage, 'OverviewPage')
export const SecuritySetupPage = page(loaders.SecuritySetupPage, 'SecuritySetupPage')
export const SuperAdminShell = page(loaders.SuperAdminShell, 'SuperAdminShell')
export const OrganizationsPage = page(loaders.OrganizationsPage, 'OrganizationsPage')
export const OrganizationDetailPage = page(loaders.OrganizationDetailPage, 'OrganizationDetailPage')
export const TagsPage = page(loaders.TagsPage, 'TagsPage')
export const TwoFactorPage = page(loaders.TwoFactorPage, 'TwoFactorPage')
export const VaultPage = page(loaders.VaultPage, 'VaultPage')
export const WorkflowDetailPage = page(loaders.WorkflowDetailPage, 'WorkflowDetailPage')
export const WorkflowsPage = page(loaders.WorkflowsPage, 'WorkflowsPage')

/** Which page module each URL pattern opens, most specific first. */
const ROUTE_LOADERS: Array<[pattern: string, load: () => Promise<unknown>]> = [
  [ROUTES.twoFactor, loaders.TwoFactorPage],
  [ROUTES.forgotPassword, loaders.ForgotPasswordPage],
  [ROUTES.login, loaders.LoginPage],
  [ROUTES.invite, loaders.InvitePage],
  [ROUTES.overview, loaders.OverviewPage],
  [ROUTES.tags, loaders.TagsPage],
  [ROUTES.adminOrganization, loaders.AdminOrganizationPage],
  [ROUTES.adminUsers, loaders.AdminUsersPage],
  [ROUTES.adminInvitations, loaders.AdminInvitationsPage],
  [ROUTES.adminApiKeys, loaders.AdminApiKeysPage],
  [ROUTES.adminRoles, loaders.AdminRolesPage],
  [ROUTES.adminAccessPolicies, loaders.AdminAccessPoliciesPage],
  [ROUTES.adminAccessPolicyNew, loaders.AccessPolicyFormPage],
  [ROUTES.adminAccessPolicyEdit, loaders.AccessPolicyFormPage],
  [ROUTES.adminAccessPolicy, loaders.AccessPolicyDetailPage],
  [ROUTES.adminAuditLogs, loaders.AdminAuditLogsPage],
  [ROUTES.workflowDetail, loaders.WorkflowDetailPage],
  [ROUTES.workflows, loaders.WorkflowsPage],
  [ROUTES.vaultSection, loaders.VaultPage],
  [ROUTES.vaultProject, loaders.VaultPage],
  [ROUTES.vault, loaders.VaultPage],
  [ROUTES.account, loaders.AccountPage],
  [ROUTES.securitySetup, loaders.SecuritySetupPage],
  [ROUTES.superAdminOrganization, loaders.OrganizationDetailPage],
  [ROUTES.superAdmin, loaders.OrganizationsPage],
]

/** Sidebar sections without a real page yet open the "coming soon" page. */
const COMING_SOON_PATHS = new Set(APP_PAGES.map((p) => p.path))

/**
 * Starts downloading the code of the page `path` opens, before it is opened, so the click shows
 * the page without waiting. Safe to call repeatedly: the browser caches each module.
 */
export const preloadRoute = (path: string) => {
  const load =
    ROUTE_LOADERS.find(([pattern]) => matchPath(pattern, path))?.[1] ??
    (COMING_SOON_PATHS.has(path) ? loaders.ComingSoonPage : undefined)
  load?.().catch(() => {
    // a failed prefetch is retried by the real navigation
  })
}

/**
 * Preloads the page behind any in-app link the pointer rests on or keyboard focus reaches,
 * anywhere in the app. Returns the cleanup for useEffect.
 */
export const preloadLinksOnIntent = () => {
  const onIntent = (e: Event) => {
    const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link || link.origin !== window.location.origin || link.target === '_blank') return
    preloadRoute(link.pathname)
  }
  document.addEventListener('pointerover', onIntent, { passive: true })
  document.addEventListener('focusin', onIntent)
  return () => {
    document.removeEventListener('pointerover', onIntent)
    document.removeEventListener('focusin', onIntent)
  }
}
