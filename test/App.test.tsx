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

/** Tests for src/App.tsx: the real root renders with its providers. */

import { render, waitFor } from '@testing-library/react'
import { Provider, createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { sessionStatusAtom } from '@/store/session'

describe('App', () => {
  it('renders and runs the session check inside its providers', async () => {
    const store = createStore()
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )
    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
  })
})
