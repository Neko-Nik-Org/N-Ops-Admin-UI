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
/** Tests for src/features/invite/schema/inviteSchema.ts. */

import { describe, expect, it } from 'vitest'
import { inviteSchema } from '@/features/invite/schema/inviteSchema'

describe('inviteSchema', () => {
  it('accepts a name and a password of 8+ characters, trimming both', async () => {
    await expect(inviteSchema.validate({ fullName: '  Priya  ', password: ' 12345678 ' })).resolves.toEqual({
      fullName: 'Priya',
      password: '12345678',
    })
  })

  it('requires a full name', async () => {
    await expect(inviteSchema.validate({ fullName: '  ', password: '12345678' })).rejects.toThrow('Enter your full name.')
  })

  it('requires a password', async () => {
    await expect(inviteSchema.validate({ fullName: 'Priya', password: '' })).rejects.toThrow('Create a password.')
  })

  it('rejects passwords shorter than 8 characters', async () => {
    await expect(inviteSchema.validate({ fullName: 'Priya', password: '1234567' })).rejects.toThrow(
      'Use at least 8 characters.',
    )
  })
})
