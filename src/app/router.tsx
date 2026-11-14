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

import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireGuest } from './guards'
import { AppShell } from '@/components/templates/AppShell'
import { APP_PAGES, APP_SECTIONS, ROUTES } from '@/constants/routes'
import { AccountPage } from '@/pages/AccountPage'
import { AdminApiKeysPage } from '@/pages/admin/AdminApiKeysPage'
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage'
import { AdminOrganizationPage } from '@/pages/admin/AdminOrganizationPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { InvitePage } from '@/pages/InvitePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { TagsPage } from '@/pages/TagsPage'
import { TwoFactorPage } from '@/pages/TwoFactorPage'
import { VaultConfigFilesPage } from '@/pages/vault/VaultConfigFilesPage'
import { VaultKeysPage } from '@/pages/vault/VaultKeysPage'
import { VaultNotesPage } from '@/pages/vault/VaultNotesPage'

/** Sections that have a real page; every other sidebar section renders ComingSoonPage. */
const BUILT_PAGES: Partial<Record<string, ReactNode>> = {
  [ROUTES.overview]: <OverviewPage />,
  [ROUTES.tags]: <TagsPage />,
  [ROUTES.adminOrganization]: <AdminOrganizationPage />,
  [ROUTES.adminUsers]: <AdminUsersPage />,
  [ROUTES.adminApiKeys]: <AdminApiKeysPage />,
  [ROUTES.adminRoles]: <AdminRolesPage />,
  [ROUTES.adminAuditLogs]: <AdminAuditLogsPage />,
  [ROUTES.vaultKeys]: <VaultKeysPage />,
  [ROUTES.vaultNotes]: <VaultNotesPage />,
  [ROUTES.vaultConfigFiles]: <VaultConfigFilesPage />,
}

/** All application routes. Sections that are not built yet render ComingSoonPage. */
export const AppRouter = () => (
  <BrowserRouter>
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
        {APP_PAGES.map(({ path, title }) => (
          <Route key={path} path={path} element={BUILT_PAGES[path] ?? <ComingSoonPage title={title} />} />
        ))}
        {/* A group's own URL (e.g. /vault) opens its first page */}
        {APP_SECTIONS.filter((s) => s.children?.length).map(({ path, children }) => (
          <Route key={path} path={path} element={<Navigate to={children![0].path} replace />} />
        ))}
        <Route path={ROUTES.account} element={<AccountPage />} />
      </Route>
      {/* Anything unmatched */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
)
