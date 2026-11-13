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
/** Tests for src/lib/axios.ts: the session header, 401 handling and error messages. */

import { AxiosError, type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'

// test/setup.ts mocks this module for everyone else; here we want the real client
const { apiClient } = await vi.importActual<{ apiClient: AxiosInstance }>('@/lib/axios')

let lastRequest: InternalAxiosRequestConfig | undefined

/** Replaces the network with a fixed response (or a failure with `status` and `data`). */
const respond = (status: number, data: unknown = {}): AxiosAdapter =>
  async (config) => {
    lastRequest = config
    const response = { status, data, statusText: '', headers: {}, config }
    if (status >= 400) throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
    return response
  }

beforeEach(() => {
  lastRequest = undefined
})

describe('apiClient', () => {
  it('uses the configured API base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('https://api.test')
  })

  it('sends the session token as the x-nops-token header', async () => {
    setSessionToken('session-123', false)
    apiClient.defaults.adapter = respond(200)
    await apiClient.get('/tag/list')
    expect(lastRequest?.headers.get('x-nops-token')).toBe('session-123')
  })

  it('sends no token header when signed out', async () => {
    apiClient.defaults.adapter = respond(200)
    await apiClient.get('/tag/list')
    expect(lastRequest?.headers.has('x-nops-token')).toBe(false)
  })

  it('clears the stored session on 401', async () => {
    setSessionToken('expired', false)
    apiClient.defaults.adapter = respond(401, { error: 'Session expired', code: 401 })
    await expect(apiClient.get('/auth/verify')).rejects.toThrow('Session expired')
    expect(getSessionToken()).toBeUndefined()
  })

  it("keeps the session on other errors and surfaces the API's message", async () => {
    setSessionToken('valid', false)
    apiClient.defaults.adapter = respond(403, { error: 'Missing permission tag:create', code: 403 })
    await expect(apiClient.post('/tag/create')).rejects.toThrow('Missing permission tag:create')
    expect(getSessionToken()).toBe('valid')
  })

  it('falls back to the transport error message when the body has none', async () => {
    apiClient.defaults.adapter = respond(500, 'Internal Server Error')
    await expect(apiClient.get('/tag/list')).rejects.toThrow('Request failed')
  })
})
