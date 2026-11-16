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
  error: string
  code: number
}

/**
 * Rejection value of every apiClient call: a plain Error carrying the API's message,
 * plus the HTTP status (undefined for network errors) so callers can branch on 409, 410, etc.
 */
export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** HTTP status of a rejected apiClient call, or undefined if it isn't one. */
export const errorStatus = (error: unknown): number | undefined => (error instanceof ApiError ? error.status : undefined)
