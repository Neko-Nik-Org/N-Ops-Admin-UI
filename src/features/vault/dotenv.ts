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
/** Reading and writing `.env` files for the Keys store's import and export. */

/** One KEY=value pair. */
export interface DotenvEntry {
  key: string
  value: string
}

/**
 * Parses a .env file: `KEY=value`, optional `export `, `#` comments, blank lines, and single- or
 * double-quoted values (double quotes understand \n, \" and \\). Later duplicates win.
 */
export const parseDotenv = (text: string): { entries: DotenvEntry[]; errors: Array<{ line: number; message: string }> } => {
  const found = new Map<string, string>()
  const errors: Array<{ line: number; message: string }> = []

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) {
      errors.push({ line: i + 1, message: 'expected KEY=value' })
      return
    }
    const [, key, rest] = match as unknown as [string, string, string]
    let value = rest
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\(["\\n])/g, (_, c: string) => (c === 'n' ? '\n' : c))
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '') // inline comment
    }
    found.set(key, value)
  })
  return { entries: [...found].map(([key, value]) => ({ key, value })), errors }
}

/** Writes a .env file, quoting values that need it. */
export const serializeDotenv = (entries: DotenvEntry[]): string =>
  entries
    .map(({ key, value }) =>
      /^[A-Za-z0-9_./:@%+,-]*$/.test(value)
        ? `${key}=${value}`
        : `${key}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
    )
    .join('\n')
    .concat(entries.length ? '\n' : '')
