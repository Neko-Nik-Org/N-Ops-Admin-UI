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
/**
 * The Main API's username and password rules (`validate_username` and `validate_base64_password` in
 * src/security/auth_tools.rs), as plain functions. Kept apart from the yup schemas so code that only
 * needs a quick check (e.g. the username availability hook) doesn't load yup at startup.
 */

/** Length in UTF-8 bytes, which is what the API's Rust `str::len()` counts. */
const byteLength = (value: string): number => new TextEncoder().encode(value).length

/** A list of [test, message] pairs; a value passes when every test does. */
export type Rules = Array<[test: (v: string) => boolean, message: string]>

/** Password rules, in the order the API checks them. Each returns an error message or null. */
export const PASSWORD_RULES: Rules = [
  [(v) => byteLength(v) >= 8 && byteLength(v) <= 64, 'Use between 8 and 64 characters.'],
  [(v) => /\p{Lu}/u.test(v), 'Add at least one uppercase letter.'],
  [(v) => /\p{Ll}/u.test(v), 'Add at least one lowercase letter.'],
  [(v) => /[0-9]/.test(v), 'Add at least one digit.'],
  [(v) => /[^\p{L}\p{N}]/u.test(v), 'Add at least one special character.'],
]

/** Username rules, in the order the API checks them. */
export const USERNAME_RULES: Rules = [
  [(v) => v.length >= 3 && v.length <= 100, 'Use between 3 and 100 characters.'],
  [(v) => /^[A-Za-z0-9_]+$/.test(v), 'Use only letters (A–Z), digits and underscores.'],
  [(v) => !/^[0-9]/.test(v), "Don't start with a digit."],
  [(v) => !v.includes('__'), "Don't use two underscores in a row."],
  [(v) => !v.startsWith('_') && !v.endsWith('_'), "Don't start or end with an underscore."],
]

/** First rule a value breaks, or null when it passes them all. */
export const firstFailure = (rules: Rules, value: string): string | null => rules.find(([test]) => !test(value))?.[1] ?? null

/** The policy message for an invalid username, or null when the API would accept it. */
export const usernamePolicyError = (value: string): string | null => firstFailure(USERNAME_RULES, value)
