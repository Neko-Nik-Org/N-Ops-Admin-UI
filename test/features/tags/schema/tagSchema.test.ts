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
/** Tests for src/features/tags/schema/tagSchema.ts. */

import { describe, expect, it } from 'vitest'
import { tagSchema } from '@/features/tags/schema/tagSchema'

describe('tagSchema', () => {
  it('trims the name and defaults the description to empty', async () => {
    await expect(tagSchema.validate({ tagName: '  production ' })).resolves.toEqual({
      tagName: 'production',
      tagDescription: '',
    })
  })

  it('requires a name', async () => {
    await expect(tagSchema.validate({ tagName: '   ' })).rejects.toThrow('Enter a tag name.')
  })

  it('limits the name to 50 characters (the database column size)', async () => {
    await expect(tagSchema.validate({ tagName: 'a'.repeat(50) })).resolves.toBeTruthy()
    await expect(tagSchema.validate({ tagName: 'a'.repeat(51) })).rejects.toThrow('Keep the name to 50 characters or fewer.')
  })
})
