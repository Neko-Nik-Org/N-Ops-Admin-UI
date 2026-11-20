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
 * Client-side route table.
 *
 * Public routes (login, 2FA, forgot password, invite) are wrapped in RequireGuest; everything else
 * is rendered inside the AppShell layout behind RequireAuth.
 */

import { Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireGuest } from './guards'
import { AppShell } from '@/components/templates/AppShell'
import { ScreenLoader } from '@/components/organisms/ScreenLoader'
import { APP_PAGES, APP_SECTIONS, ROUTES, VAULT_REDIRECTS } from '@/constants/routes'
import { useForgetSuperAdminKeyElsewhere } from '@/features/superAdmin/store/adminKey'
import {
  AccountPage,
  AdminApiKeysPage,
  AdminAuditLogsPage,
  AdminOrganizationPage,
  AdminRolesPage,
  AdminUsersPage,
  ComingSoonPage,
  ForgotPasswordPage,
  InvitePage,
  LoginPage,
  NotFoundPage,
  preloadLinksOnIntent,
  OrganizationDetailPage,
  OrganizationsPage,
  OverviewPage,
  SuperAdminShell,
  TagsPage,
  TwoFactorPage,
  VaultPage,
  WorkflowDetailPage,
  WorkflowsPage,
} from './lazyPages'

/** Sections that have a real page; every other sidebar section renders ComingSoonPage. */
const BUILT_PAGES: Partial<Record<string, ReactNode>> = {
  [ROUTES.overview]: <OverviewPage />,
  [ROUTES.tags]: <TagsPage />,
  [ROUTES.adminOrganization]: <AdminOrganizationPage />,
  [ROUTES.adminUsers]: <AdminUsersPage />,
  [ROUTES.adminApiKeys]: <AdminApiKeysPage />,
  [ROUTES.adminRoles]: <AdminRolesPage />,
  [ROUTES.adminAuditLogs]: <AdminAuditLogsPage />,
  [ROUTES.workflows]: <WorkflowsPage />,
}

/** Router-level effects that need the current location. */
const RouteEffects = () => {
  // the super-admin key never outlives the super-admin pages
  useForgetSuperAdminKeyElsewhere()
  return null
}

/** All application routes. Sections that are not built yet render ComingSoonPage. */
export const AppRouter = () => {
  // Hovering or focusing any in-app link starts loading that page's code
  useEffect(preloadLinksOnIntent, [])

  // No transitions: by default React Router switches pages inside React.startTransition, which keeps
  // the old page on screen (and hides the loading screen) until the new page's code has downloaded,
  // so a click looked like it did nothing. Switching at once shows the loading screen straight away.
  return (
    <BrowserRouter useTransitions={false}>
      <RouteEffects />
      {/* Full-screen loading screen while a page's code downloads (sign-in pages, not-found); AppShell has its own boundary so the sidebar stays put */}
      <Suspense fallback={<ScreenLoader messages={['Loading page']} />}>
        <Routes>
          {/* Public, signed-out only */}
          <Route
            path={ROUTES.login}
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path={ROUTES.twoFactor}
            element={
              <RequireGuest>
                <TwoFactorPage />
              </RequireGuest>
            }
          />
          <Route
            path={ROUTES.forgotPassword}
            element={
              <RequireGuest>
                <ForgotPasswordPage />
              </RequireGuest>
            }
          />
          <Route
            path={ROUTES.invite}
            element={
              <RequireGuest>
                <InvitePage />
              </RequireGuest>
            }
          />
          {/* Authenticated area: sidebar + topbar layout around every page below */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            {APP_PAGES.filter(({ path }) => path !== ROUTES.vault).map(({ path, title }) => (
              <Route key={path} path={path} element={BUILT_PAGES[path] ?? <ComingSoonPage title={title} />} />
            ))}
            {/* Vault: a file explorer whose URL is the open folder; older Vault URLs go to its root */}
            <Route path={ROUTES.vault} element={<VaultPage />} />
            <Route path={ROUTES.vaultProject} element={<VaultPage />} />
            <Route path={ROUTES.vaultSection} element={<VaultPage />} />
            <Route path={ROUTES.workflowDetail} element={<WorkflowDetailPage />} />
            {VAULT_REDIRECTS.map((from) => (
              <Route key={from} path={from} element={<Navigate to={ROUTES.vault} replace />} />
            ))}
            {/* A group's own URL (e.g. /vault) opens its first page */}
            {APP_SECTIONS.filter((s) => s.children?.length).map(({ path, children }) => (
              <Route key={path} path={path} element={<Navigate to={children![0].path} replace />} />
            ))}
            <Route path={ROUTES.account} element={<AccountPage />} />
          </Route>
          {/* Super admin: its own layout and key prompt, open whether or not anyone is signed in */}
          <Route path={ROUTES.superAdmin} element={<SuperAdminShell />}>
            <Route index element={<OrganizationsPage />} />
            <Route path={ROUTES.superAdminOrganization} element={<OrganizationDetailPage />} />
          </Route>
          {/* Anything unmatched */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
