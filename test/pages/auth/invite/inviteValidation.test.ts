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
/** Tests for src/pages/auth/invite/inviteValidation.ts. */

import { describe, expect, it } from 'vitest'
import { inviteSchema } from '@/pages/auth/invite/inviteValidation'

const valid = { displayName: '  Priya  ', userName: 'priya', password: 'Start#Pass1', confirmPassword: 'Start#Pass1' }

describe('inviteSchema', () => {
  it('accepts a name, username and matching passwords, trimming the name', async () => {
    await expect(inviteSchema.validate(valid)).resolves.toMatchObject({ displayName: 'Priya', userName: 'priya' })
  })

  it('requires a name and a username', async () => {
    await expect(inviteSchema.validate({ ...valid, displayName: '  ' })).rejects.toThrow('Enter your name.')
    await expect(inviteSchema.validate({ ...valid, userName: '' })).rejects.toThrow('Choose a username.')
  })

  it("applies the API's password rules and checks the confirmation", async () => {
    await expect(inviteSchema.validateAt('password', { ...valid, password: '' })).rejects.toThrow('Create a password.')
    await expect(inviteSchema.validate({ ...valid, password: 'short', confirmPassword: 'short' })).rejects.toThrow()
    await expect(inviteSchema.validate({ ...valid, confirmPassword: 'Other#Pass1' })).rejects.toThrow(
      "The passwords don't match.",
    )
  })
})
