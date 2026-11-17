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

/** Everything the startup screen (ScreenLoader) waits for before the dashboard first renders. */

import { useQueries, useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { currentUserAtom, sessionStatusAtom, type SessionStatus } from '@/features/auth/store/session'
import { clearSessionToken } from '@/features/auth/store/sessionToken'
import { healthQuery } from '@/features/system/hooks/useServiceHealth'
import { tagsQuery } from '@/features/tags/hooks/useTags'
import { InactiveAccountError } from '../api/account'
import { orgInfoQuery, profileQuery, uiInfoQuery, userDetailsQuery } from './useAccount'

/** Status line for the saved-session check (`GET /auth/verify`, run by useSessionBootstrap). */
export const SESSION_STEP_LABEL = 'Checking your session'

/**
 * Startup requests, with the status line shown while each is pending. The health check needs no
 * sign-in, so it starts at once, alongside the session check; the rest wait for a valid session.
 */
const STEPS = [
  { query: healthQuery, label: 'Checking N-Ops services', needsSession: false },
  { query: profileQuery, label: 'Loading your profile and access', needsSession: true },
  { query: uiInfoQuery, label: 'Loading your preferences', needsSession: true },
  { query: userDetailsQuery, label: 'Loading your account details', needsSession: true },
  { query: orgInfoQuery, label: 'Loading organization details', needsSession: true },
  { query: tagsQuery, label: 'Loading your tags', needsSession: true },
] as const

/** Progress of the startup steps. */
export interface AppBootstrapState {
  /** True once the session is valid and every request has finished, successfully or not. */
  ready: boolean
  /** Share of steps finished (the session check plus each request), 0 to 1. */
  progress: number
  /** Status lines for the steps running right now, session check first. */
  pendingLabels: string[]
}

/**
 * Runs the startup steps in parallel: `/auth/verify` (via the session status), `/health/service`,
 * `/user/self/profile`, `/user/self/ui-info`, `/user/self/details`, `/user/self/org-info` and `/tag/list`.
 *
 * The fresh profile replaces the copy saved at sign-in, so a role changed since then is reflected
 * (and the role editor learns the user's Linux-user and approval limits). If it reports the user or
 * organization as deactivated, the user is signed out.
 *
 * Results land in the React Query cache, so the theme is applied before the shell appears and
 * pages (and the sidebar's health indicator) render from cache. A failed request still counts as
 * finished: whatever needs it shows its own error rather than blocking the whole app.
 */
export const useAppBootstrap = (status: SessionStatus): AppBootstrapState => {
  const signedIn = status === 'authenticated'
  const results = useQueries({
    queries: STEPS.map(({ query, needsSession }) => ({ ...query, enabled: signedIn || !needsSession })),
  })

  const setCurrentUser = useSetAtom(currentUserAtom)
  const setStatus = useSetAtom(sessionStatusAtom)
  // same cache entry as the profile step above (one request); read separately for its type
  const { data: profile, error: profileError } = useQuery({ ...profileQuery, enabled: signedIn })
  useEffect(() => {
    if (profile) setCurrentUser(profile)
  }, [profile, setCurrentUser])
  useEffect(() => {
    if (!(profileError instanceof InactiveAccountError)) return
    toast.error(profileError.message)
    clearSessionToken()
    setCurrentUser(null)
    setStatus('unauthenticated')
  }, [profileError, setCurrentUser, setStatus])

  const checking = status === 'checking'
  // A request that hasn't started (waiting for the session) is unfinished but gets no status line yet.
  const unfinished = STEPS.filter((_, i) => results[i].isPending)
  const running = unfinished.filter((step) => signedIn || !step.needsSession)
  const total = STEPS.length + 1
  const remaining = unfinished.length + (checking ? 1 : 0)

  return {
    ready: signedIn && remaining === 0,
    progress: (total - remaining) / total,
    pendingLabels: [...(checking ? [SESSION_STEP_LABEL] : []), ...running.map(({ label }) => label)],
  }
}
