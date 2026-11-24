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

/** Helpers shared by the in-memory mock backends in src/mocks/. */

/** Pretend network latency; none under test so the suite stays fast. */
export const mockDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : 200 + Math.random() * 250))

/** Deep copy, so callers can't mutate the mock's state through returned objects. */
export const clone = <T>(value: T): T => structuredClone(value)

/** Throws the error a real API would return for a missing record. */
export const notFound = (what: string): never => {
  throw new Error(`That ${what} no longer exists. Refresh and try again.`)
}
