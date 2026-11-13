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

/** Tests for the sign-in form validation rules (src/features/auth/schema/loginSchema.ts). */

import { describe, expect, it } from 'vitest'
import { loginSchema } from '@/features/auth/schema/loginSchema'

describe('loginSchema', () => {
  it('accepts valid credentials', async () => {
    await expect(
      loginSchema.validate({ userName: 'admin', password: 'secret', rememberMe: true }),
    ).resolves.toMatchObject({ userName: 'admin', password: 'secret' })
  })

  it('rejects an empty username', async () => {
    await expect(loginSchema.validate({ userName: '', password: 'secret' })).rejects.toThrow('Enter your username.')
  })

  it('rejects an empty password', async () => {
    await expect(loginSchema.validate({ userName: 'admin', password: '' })).rejects.toThrow(
      'Enter your password.',
    )
  })

  it('trims whitespace from the username', async () => {
    await expect(
      loginSchema.validate({ userName: '  admin  ', password: 'secret' }),
    ).resolves.toMatchObject({ userName: 'admin' })
  })
})
