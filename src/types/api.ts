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

/** Error body returned by the N-Ops Main API on failed requests. */
/** Types shared across all API calls. */

export interface ApiErrorBody {
  /** e.g. "E221: Insufficient permissions"; some errors have no code prefix. */
  error: string
  /** The error code, e.g. "E221" (see N-Ops-Main-API/docs/Error-Codes.md). Older servers sent the HTTP status here. */
  code: string | number
  status?: number
}

/**
 * Rejection value of every apiClient call: a plain Error carrying the API's message,
 * plus the HTTP status (undefined for network errors) so callers can branch on 409, 410, etc.,
 * and the API's error code when it sent one (e.g. "E221").
 */
export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** A real error code: "E" and three digits. */
const ERROR_CODE = /^E\d{3}$/

/** Clearer words for codes whose server message is terse. */
const FRIENDLY: Record<string, string> = {
  E000: 'Something went wrong on the server.',
  E221: "You don't have permission to do this.",
  E222: "You don't have access to this tag.",
}

/**
 * Splits "E221: Insufficient permissions" into its code and text, and words it for people:
 * "You don't have permission to do this. (E221)". Messages without a code come back unchanged.
 */
export const parseApiMessage = (raw: string, code?: unknown): { message: string; code?: string } => {
  const match = /^(E\d{3}):\s*(.*)$/s.exec(raw.trim())
  const found = match?.[1] ?? (typeof code === 'string' && ERROR_CODE.test(code) ? code : undefined)
  const text = match ? match[2]! : raw.trim()
  if (!found) return { message: text }
  return { message: `${FRIENDLY[found] ?? text} (${found})`, code: found }
}

/** HTTP status of a rejected apiClient call, or undefined if it isn't one. */
export const errorStatus = (error: unknown): number | undefined => (error instanceof ApiError ? error.status : undefined)

/** The API's error code of a rejected apiClient call (e.g. "E221"), if it sent one. */
export const errorCode = (error: unknown): string | undefined => (error instanceof ApiError ? error.code : undefined)
