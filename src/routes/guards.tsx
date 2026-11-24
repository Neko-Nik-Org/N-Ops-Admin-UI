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

/** Route guards that gate pages on the current session status. */

import { useAtomValue } from 'jotai'
import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ScreenLoader } from '@/components/ScreenLoader'
import { SESSION_STEP_LABEL, useAppBootstrap } from '@/hooks/useAppBootstrap'
import { pendingSetupSteps } from '@/utils/securitySetup'
import { securityRequirementsAtom } from '@/store/securityRequirements'
import { currentUserAtom, sessionStatusAtom } from '@/store/session'
import { ROUTES } from '@/constants/routes'

/** Full-screen loader shown while the saved session is still being verified. */
const SessionCheck = () => <ScreenLoader messages={[SESSION_STEP_LABEL]} />

/**
 * Renders its children only for signed-in users; everyone else is redirected to /login.
 *
 * One ScreenLoader covers every startup step (useAppBootstrap: session check, health check and
 * the signed-in user's data), so it runs straight through from sign-in to the dashboard. The
 * pages mount once the data is in, while the loader fades out on top of them.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)
  const bootstrap = useAppBootstrap(status)
  const [loaderGone, setLoaderGone] = useState(false)
  // Startup runs once. Afterwards a page refetching a failed startup query (which React Query
  // briefly reports as pending again) must not bring the loader back: that would unmount the page,
  // which refetches on its next mount, and loop.
  const [started, setStarted] = useState(false)
  if (bootstrap.ready && !started) setStarted(true)

  if (status === 'unauthenticated') return <Navigate to={ROUTES.login} replace />

  const ready = started || bootstrap.ready

  return (
    <>
      {ready && children}
      {!loaderGone && (
        <ScreenLoader
          visible={!ready}
          messages={bootstrap.pendingLabels}
          progress={bootstrap.progress}
          onHidden={() => setLoaderGone(true)}
        />
      )}
    </>
  )
}

/**
 * Renders its children only for signed-out users (login, 2FA, invite);
 * signed-in users are sent to the dashboard instead.
 */
/**
 * Sends every page to the security setup while the user's access policy requires a second factor
 * they haven't turned on. Only a UI gate: the API itself must refuse requests until setup is done.
 */
export const RequireSecuritySetup = ({ children }: { children: ReactNode }) => {
  const requirements = useAtomValue(securityRequirementsAtom)
  const user = useAtomValue(currentUserAtom)
  if (pendingSetupSteps(requirements, user).length) return <Navigate to={ROUTES.securitySetup} replace />
  return <>{children}</>
}

export const RequireGuest = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)

  if (status === 'checking') return <SessionCheck />
  if (status === 'authenticated') return <Navigate to={ROUTES.overview} replace />
  return <>{children}</>
}
