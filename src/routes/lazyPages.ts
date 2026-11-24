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
  AccountProfilePage: () => import('@/pages/account/profile'),
  AccountSecurityPage: () => import('@/pages/account/security'),
  AccountOrganizationPage: () => import('@/pages/account/organization'),
  AccessPolicyDetailPage: () => import('@/pages/admin/accessPolicies/details'),
  AccessPolicyFormPage: () => import('@/pages/admin/accessPolicies/form'),
  AdminAccessPoliciesPage: () => import('@/pages/admin/accessPolicies/list'),
  AdminApiKeysPage: () => import('@/pages/admin/apiKeys/list'),
  ApiKeyDetailPage: () => import('@/pages/admin/apiKeys/details'),
  ApiKeyFormPage: () => import('@/pages/admin/apiKeys/form'),
  AdminAuditLogsPage: () => import('@/pages/admin/auditLogs'),
  AdminInvitationsPage: () => import('@/pages/admin/invitations/list'),
  InvitationDetailPage: () => import('@/pages/admin/invitations/details'),
  InvitationFormPage: () => import('@/pages/admin/invitations/form'),
  AdminOrganizationPage: () => import('@/pages/admin/organization'),
  AdminRolesPage: () => import('@/pages/admin/roles/list'),
  RoleDetailPage: () => import('@/pages/admin/roles/details'),
  RoleFormPage: () => import('@/pages/admin/roles/form'),
  AdminUsersPage: () => import('@/pages/admin/users/list'),
  UserDetailPage: () => import('@/pages/admin/users/details'),
  UserFormPage: () => import('@/pages/admin/users/form'),
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

export const AccountProfilePage = page(loaders.AccountProfilePage, 'AccountProfilePage')
export const AccountSecurityPage = page(loaders.AccountSecurityPage, 'AccountSecurityPage')
export const AccountOrganizationPage = page(loaders.AccountOrganizationPage, 'AccountOrganizationPage')
export const AccessPolicyDetailPage = page(loaders.AccessPolicyDetailPage, 'AccessPolicyDetailPage')
export const AccessPolicyFormPage = page(loaders.AccessPolicyFormPage, 'AccessPolicyFormPage')
export const AdminAccessPoliciesPage = page(loaders.AdminAccessPoliciesPage, 'AdminAccessPoliciesPage')
export const AdminApiKeysPage = page(loaders.AdminApiKeysPage, 'AdminApiKeysPage')
export const ApiKeyDetailPage = page(loaders.ApiKeyDetailPage, 'ApiKeyDetailPage')
export const ApiKeyFormPage = page(loaders.ApiKeyFormPage, 'ApiKeyFormPage')
export const AdminAuditLogsPage = page(loaders.AdminAuditLogsPage, 'AdminAuditLogsPage')
export const AdminInvitationsPage = page(loaders.AdminInvitationsPage, 'AdminInvitationsPage')
export const InvitationDetailPage = page(loaders.InvitationDetailPage, 'InvitationDetailPage')
export const InvitationFormPage = page(loaders.InvitationFormPage, 'InvitationFormPage')
export const AdminOrganizationPage = page(loaders.AdminOrganizationPage, 'AdminOrganizationPage')
export const AdminRolesPage = page(loaders.AdminRolesPage, 'AdminRolesPage')
export const RoleDetailPage = page(loaders.RoleDetailPage, 'RoleDetailPage')
export const RoleFormPage = page(loaders.RoleFormPage, 'RoleFormPage')
export const AdminUsersPage = page(loaders.AdminUsersPage, 'AdminUsersPage')
export const UserDetailPage = page(loaders.UserDetailPage, 'UserDetailPage')
export const UserFormPage = page(loaders.UserFormPage, 'UserFormPage')
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
  [ROUTES.adminUserNew, loaders.UserFormPage],
  [ROUTES.adminUserEdit, loaders.UserFormPage],
  [ROUTES.adminUser, loaders.UserDetailPage],
  [ROUTES.adminInvitations, loaders.AdminInvitationsPage],
  [ROUTES.adminInvitationNew, loaders.InvitationFormPage],
  [ROUTES.adminInvitation, loaders.InvitationDetailPage],
  [ROUTES.adminApiKeys, loaders.AdminApiKeysPage],
  [ROUTES.adminApiKeyNew, loaders.ApiKeyFormPage],
  [ROUTES.adminApiKeyEdit, loaders.ApiKeyFormPage],
  [ROUTES.adminApiKey, loaders.ApiKeyDetailPage],
  [ROUTES.adminRoles, loaders.AdminRolesPage],
  [ROUTES.adminRoleNew, loaders.RoleFormPage],
  [ROUTES.adminRoleEdit, loaders.RoleFormPage],
  [ROUTES.adminRole, loaders.RoleDetailPage],
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
  [ROUTES.accountProfile, loaders.AccountProfilePage],
  [ROUTES.accountSecurity, loaders.AccountSecurityPage],
  [ROUTES.accountOrganization, loaders.AccountOrganizationPage],
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

/**
 * Libraries most pages share but the first screen doesn't need: forms (react-hook-form + yup) and
 * dates (moment).
 */
const SHARED_LIBRARIES: ReadonlyArray<() => Promise<unknown>> = [
  () => import('react-hook-form'),
  () => import('yup'),
  () => import('@hookform/resolvers/yup'),
  () => import('moment'),
]

/** Pages only signed-out visitors (or the super admin, with its own key) open: not part of the signed-in app. */
const NOT_SIGNED_IN_APP = new Set<string>([
  ROUTES.login,
  ROUTES.twoFactor,
  ROUTES.forgotPassword,
  ROUTES.invite,
  ROUTES.superAdmin,
  ROUTES.superAdminOrganization,
])

/** Longest the startup screen waits for the app's code; anything slower keeps loading in the background. */
export const APP_CODE_WAIT_MS = 10_000

/**
 * Downloads the signed-in app's code up front, like a mail app does behind its loading screen: the
 * page at `path` first, then the shared libraries and every other signed-in page, so moving around
 * afterwards never waits on the network. Settles once it's all in (failures included: a page that
 * didn't load is fetched again when opened) or after APP_CODE_WAIT_MS. Skipped under test.
 */
export const loadAppCode = async (path: string): Promise<void> => {
  if (import.meta.env.MODE === 'test') return
  const pages = new Set<() => Promise<unknown>>([loaders.ComingSoonPage])
  for (const [pattern, load] of ROUTE_LOADERS) if (!NOT_SIGNED_IN_APP.has(pattern)) pages.add(load)
  const current = ROUTE_LOADERS.find(([pattern]) => matchPath(pattern, path))?.[1]
  const all = Promise.allSettled([current?.(), ...SHARED_LIBRARIES.map((load) => load()), ...[...pages].map((load) => load())])
  await Promise.race([all, new Promise((resolve) => setTimeout(resolve, APP_CODE_WAIT_MS))])
}
