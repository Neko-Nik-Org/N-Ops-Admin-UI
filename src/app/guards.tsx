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
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ScreenLoader } from '@/components/loading'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { ROUTES } from '@/constants/routes'

/** Full-screen loader shown while the saved session is still being verified. */
const SessionCheck = () => <ScreenLoader messages={['Checking your session']} />

/** Renders its children only for signed-in users; everyone else is redirected to /login. */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)

  if (status === 'checking') return <SessionCheck />
  if (status === 'unauthenticated') return <Navigate to={ROUTES.login} replace />
  return <>{children}</>
}

/**
 * Renders its children only for signed-out users (login, 2FA, invite);
 * signed-in users are sent to the dashboard instead.
 */
export const RequireGuest = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)

  if (status === 'checking') return <SessionCheck />
  if (status === 'authenticated') return <Navigate to={ROUTES.overview} replace />
  return <>{children}</>
}
