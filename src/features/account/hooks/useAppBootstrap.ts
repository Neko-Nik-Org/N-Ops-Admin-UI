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

/** Loads the signed-in user's basic data before the dashboard first renders. */

import { useQueries } from '@tanstack/react-query'
import { orgInfoQuery, uiInfoQuery, userDetailsQuery } from './useAccount'

/** Each startup request, with the status line shown on the ScreenLoader while it is pending. */
const STEPS = [
  { query: uiInfoQuery, label: 'Loading your preferences' },
  { query: userDetailsQuery, label: 'Loading your profile' },
  { query: orgInfoQuery, label: 'Loading organization details' },
] as const

/** Progress of the startup requests. */
export interface AppBootstrapState {
  /** True once every request has finished, successfully or not. */
  ready: boolean
  /** Share of requests finished, 0 to 1. */
  progress: number
  /** Status lines for the requests still running. */
  pendingLabels: string[]
}

/**
 * Fetches UI preferences, profile details and organization info in parallel once the user is signed in.
 *
 * Results land in the React Query cache, so the theme is applied before the shell appears and pages
 * that use useUiInfo / useUserDetails / useOrgInfo render from cache. A failed request still counts as
 * finished: the page that needs it shows its own error rather than blocking the whole app.
 */
export const useAppBootstrap = (enabled: boolean): AppBootstrapState => {
  const results = useQueries({
    queries: STEPS.map(({ query }) => ({ ...query, enabled })),
  })

  const pendingLabels = STEPS.filter((_, i) => results[i].isPending).map(({ label }) => label)
  const done = STEPS.length - pendingLabels.length

  return {
    ready: enabled && pendingLabels.length === 0,
    progress: done / STEPS.length,
    pendingLabels,
  }
}
