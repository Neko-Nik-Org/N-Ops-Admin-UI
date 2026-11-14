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
/** Tests for the .env helpers (src/features/vault/dotenv.ts) and the line diff (src/utils/diff.ts). */

import { describe, expect, it } from 'vitest'
import { parseDotenv, serializeDotenv } from '@/features/vault/dotenv'
import { diffLines } from '@/utils/diff'

describe('parseDotenv', () => {
  it('reads plain, quoted, exported and commented lines', () => {
    const { entries, errors } = parseDotenv(
      ['# comment', '', 'A=1', 'export B = two', 'C="multi\\nline \\"q\\""', "D='keep $raw'", 'E=value # trailing', 'A=again'].join('\n'),
    )
    expect(errors).toEqual([])
    expect(entries).toEqual([
      { key: 'A', value: 'again' },
      { key: 'B', value: 'two' },
      { key: 'C', value: 'multi\nline "q"' },
      { key: 'D', value: 'keep $raw' },
      { key: 'E', value: 'value' },
    ])
  })

  it('reports the line of anything that is not KEY=value', () => {
    expect(parseDotenv('OK=1\n9BAD=2').errors).toEqual([{ line: 2, message: 'expected KEY=value' }])
  })

  it('round-trips through serializeDotenv', () => {
    const entries = [
      { key: 'URL', value: 'postgres://u:p@h:5432/db' },
      { key: 'MSG', value: 'hello "world"\nbye' },
      { key: 'EMPTY', value: '' },
    ]
    expect(parseDotenv(serializeDotenv(entries)).entries).toEqual(entries)
  })
})

describe('diffLines', () => {
  it('marks added and removed lines around unchanged ones', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc\nd')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
      { kind: 'add', text: 'd' },
    ])
  })
})
