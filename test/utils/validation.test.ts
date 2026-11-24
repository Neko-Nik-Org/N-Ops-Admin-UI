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

/** Tests for src/utils/validation.ts. */

import { describe, expect, it } from 'vitest'
import { changePasswordSchema, changeUsernameSchema, usernamePolicyError } from '@/utils/validation'

/** First validation message for the given values, or null if they pass. */
const errorOf = async (schema: typeof changePasswordSchema | typeof changeUsernameSchema, values: object, context?: object) =>
  schema.validate(values, { context }).then(
    () => null,
    (error: Error) => error.message,
  )

describe('changePasswordSchema', () => {
  it.each([
    ['Sh0rt!', 'Use between 8 and 64 characters.'],
    [`Aa1!${'x'.repeat(61)}`, 'Use between 8 and 64 characters.'],
    ['lowercase1!', 'Add at least one uppercase letter.'],
    ['UPPERCASE1!', 'Add at least one lowercase letter.'],
    ['NoDigits!!', 'Add at least one digit.'],
    ['NoSpecial12', 'Add at least one special character.'],
  ])('rejects %j: %s', async (password, message) => {
    await expect(errorOf(changePasswordSchema, { newPassword: password, confirmPassword: password })).resolves.toBe(message)
  })

  it('requires the confirmation to match', async () => {
    await expect(errorOf(changePasswordSchema, { newPassword: 'Valid1!pass', confirmPassword: 'Valid1!pasS' })).resolves.toBe(
      "The passwords don't match.",
    )
  })

  it('accepts a password that meets the policy', async () => {
    await expect(
      errorOf(changePasswordSchema, { newPassword: 'Valid1!pass', confirmPassword: 'Valid1!pass' }),
    ).resolves.toBeNull()
  })
})

describe('username policy', () => {
  it.each([
    ['ab', 'Use between 3 and 100 characters.'],
    ['has space', 'Use only letters (A–Z), digits and underscores.'],
    ['héllo', 'Use only letters (A–Z), digits and underscores.'],
    ['1abc', "Don't start with a digit."],
    ['a__b', "Don't use two underscores in a row."],
    ['_abc', "Don't start or end with an underscore."],
    ['abc_', "Don't start or end with an underscore."],
  ])('rejects %j', (name, message) => {
    expect(usernamePolicyError(name)).toBe(message)
  })

  it('accepts valid names', () => {
    expect(usernamePolicyError('priya_rao2')).toBeNull()
  })

  it('rejects the current username', async () => {
    await expect(errorOf(changeUsernameSchema, { userName: 'priya' }, { currentUserName: 'priya' })).resolves.toBe(
      'That is already your username.',
    )
    await expect(errorOf(changeUsernameSchema, { userName: 'priya_r' }, { currentUserName: 'priya' })).resolves.toBeNull()
  })
})
