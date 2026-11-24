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

import { queryOptions, useQueries, useQuery, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { currentUserAtom, sessionStatusAtom, type SessionStatus } from '@/store/session'
import { clearSessionToken, getSessionToken } from '@/store/sessionToken'
import { healthQuery } from '@/hooks/useServiceHealth'
import { tagsQuery } from '@/hooks/useTags'
import { InactiveAccountError } from '@/api/account'
import { loadAppCode } from '@/routes/lazyPages'
import { orgInfoQuery, profileQuery, uiInfoQuery, userDetailsQuery } from './useAccount'

/** Status line for the saved-session check (`GET /auth/verify`, run by useSessionBootstrap). */
export const SESSION_STEP_LABEL = 'Checking your session'

/**
 * The app's code (every signed-in page and the shared libraries), downloaded behind the startup
 * screen so later page changes don't wait on the network. Once per page load; not per user.
 */
const appCodeQuery = queryOptions({
  queryKey: ['system', 'app-code'],
  queryFn: () => loadAppCode(window.location.pathname).then(() => true),
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
})

/**
 * Startup steps, with the status line shown while each is pending. The health check and the app's
 * code need no sign-in, so they start at once, alongside the session check; the rest wait for a valid session.
 */
const STEPS = [
  { query: healthQuery, label: 'Checking N-Ops services', needsSession: false },
  { query: appCodeQuery, label: 'Loading the app', needsSession: false },
  { query: profileQuery, label: 'Loading your profile and access', needsSession: true },
  { query: uiInfoQuery, label: 'Loading your preferences', needsSession: true },
  { query: userDetailsQuery, label: 'Loading your account details', needsSession: true },
  { query: orgInfoQuery, label: 'Loading organization details', needsSession: true },
  { query: tagsQuery, label: 'Loading your tags', needsSession: true },
] as const

/**
 * The signed-in user's startup data, saved (encrypted) across reloads by utils/queryPersistence, so a
 * reload opens the app from it while fresh copies load. The health check is left out: it's not per
 * user, and an old answer would be misleading.
 */
export const SAVED_STARTUP_QUERIES: readonly QueryKey[] = STEPS.filter((s) => s.needsSession).map((s) => s.query.queryKey)

/** Owner of the saved startup data: the user in the cached profile. */
export const startupDataOwner = (client: QueryClient): number | undefined => client.getQueryData(profileQuery.queryKey)?.userId

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
 * Runs the startup steps in parallel, alongside `/auth/verify` when a session is saved: `/health/service`,
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
  // With a saved session, start loading alongside the session check instead of after it: one round
  // trip less on every load. If the session turns out to be invalid these fail with 401, the user is
  // signed out, and the cache is cleared (see AppProviders).
  const canFetch = signedIn || (status === 'checking' && !!getSessionToken())
  const results = useQueries({
    queries: STEPS.map(({ query, needsSession }) => ({ ...query, enabled: canFetch || !needsSession })),
  })

  // Every per-user step already had data (restored from the saved copy) when startup began: the app
  // opens from it at once and refreshes in the background, without waiting for the health check.
  const [warm] = useState(() => STEPS.every((step, i) => !step.needsSession || results[i].data !== undefined))

  const setCurrentUser = useSetAtom(currentUserAtom)
  const setStatus = useSetAtom(sessionStatusAtom)
  // same cache entry as the profile step above (one request); read separately for its type
  const { data: profile, error: profileError } = useQuery({ ...profileQuery, enabled: canFetch })
  // applied once the session check is done, so its stored copy of the profile can't overwrite this one
  useEffect(() => {
    if (profile && signedIn) setCurrentUser(profile)
  }, [profile, signedIn, setCurrentUser])
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
  const running = unfinished.filter((step) => canFetch || !step.needsSession)
  const total = STEPS.length + 1
  const remaining = unfinished.length + (checking ? 1 : 0)

  const userDataIn = unfinished.every((step) => !step.needsSession)

  return {
    ready: signedIn && (remaining === 0 || (warm && userDataIn)),
    progress: (total - remaining) / total,
    pendingLabels: [...(checking ? [SESSION_STEP_LABEL] : []), ...running.map(({ label }) => label)],
  }
}
