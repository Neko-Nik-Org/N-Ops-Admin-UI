import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireGuest } from './guards'
import { AppShell } from '@/components/templates/AppShell'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { InvitePage } from '@/pages/InvitePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { TwoFactorPage } from '@/pages/TwoFactorPage'

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/login/verify-2fa"
        element={
          <RequireGuest>
            <TwoFactorPage />
          </RequireGuest>
        }
      />
      <Route
        path="/invite/:token"
        element={
          <RequireGuest>
            <InvitePage />
          </RequireGuest>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<OverviewPage />} />
        <Route path="/admin" element={<ComingSoonPage title="Admin" />} />
        <Route path="/servers" element={<ComingSoonPage title="Servers" />} />
        <Route path="/tools" element={<ComingSoonPage title="Tools" />} />
        <Route path="/service-management" element={<ComingSoonPage title="Service management" />} />
        <Route path="/vault" element={<ComingSoonPage title="Vault" />} />
        <Route path="/approvals" element={<ComingSoonPage title="Approvals" />} />
        <Route path="/metrics" element={<ComingSoonPage title="Metrics" />} />
        <Route path="/workflows" element={<ComingSoonPage title="Workflows" />} />
        <Route path="/service-logs" element={<ComingSoonPage title="Service logs" />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
)
