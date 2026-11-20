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
/** Tests for src/app/providers.tsx: the per-user cache is dropped when the session ends. */

import { act, render } from '@testing-library/react'
import { createStore, Provider } from 'jotai'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { queryClient } from '@/lib/queryClient'

describe('AppProviders', () => {
  it("clears the signed-in user's cached data on sign-out, keeping the health check", () => {
    const store = createStore()
    store.set(sessionStatusAtom, 'authenticated')
    queryClient.setQueryData(['admin', 'users'], [{ userId: 1 }])
    queryClient.setQueryData(['system', 'health'], { status: 'up' })
    render(
      <Provider store={store}>
        <AppProviders>
          <p>app</p>
        </AppProviders>
      </Provider>,
    )
    expect(queryClient.getQueryData(['admin', 'users'])).toBeDefined()

    act(() => store.set(sessionStatusAtom, 'unauthenticated'))
    expect(queryClient.getQueryData(['admin', 'users'])).toBeUndefined()
    expect(queryClient.getQueryData(['system', 'health'])).toEqual({ status: 'up' })
  })
})
