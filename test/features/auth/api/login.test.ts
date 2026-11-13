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
/** Tests for src/features/auth/api/login.ts. */

import { describe, expect, it } from 'vitest'
import { login } from '@/features/auth/api/login'
import { api } from '../../../testUtils'

describe('login', () => {
  it('posts the credentials with a base64 password and the Turnstile header', async () => {
    api.post.mockResolvedValue({ data: { is_2fa_required: false } })
    await login({ userName: 'priya', password: 'secret', rememberMe: true }, 'cf-token')

    expect(api.post).toHaveBeenCalledWith(
      '/auth/login',
      { user_name: 'priya', password: btoa('secret'), remember_me: true },
      { headers: { 'cf-turnstile-token': 'cf-token' } },
    )
  })

  it('encodes non-Latin1 passwords as UTF-8 bytes', async () => {
    api.post.mockResolvedValue({ data: {} })
    await login({ userName: 'priya', password: 'pässwörd🔑', rememberMe: false }, 't')

    const sent = api.post.mock.calls[0][1] as { password: string }
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(sent.password), (c) => c.charCodeAt(0)))
    expect(decoded).toBe('pässwörd🔑')
  })

  it("returns the API's response unchanged", async () => {
    const response = { is_2fa_required: true, temporary_auth_token: 'tmp' }
    api.post.mockResolvedValue({ data: response })
    await expect(login({ userName: 'a', password: 'b', rememberMe: false }, 't')).resolves.toBe(response)
  })
})
