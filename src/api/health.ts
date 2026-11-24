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
/** API health check. */

import { apiClient } from '@/api/client'
import { errorStatus } from '@/types/api'

/** Result of a health check. `down` covers both a failing dependency and an unreachable API. */
export interface ServiceHealth {
  status: 'up' | 'down'
  /** The API's own words, e.g. "All services are running!" or "Database is not healthy!". */
  message: string
  checkedAt: number
}

/**
 * `GET /health/service` — no sign-in needed. The API checks Postgres and Redis and answers 200, or
 * 412 naming the dependency that failed. Never rejects: a failure is reported as `down`, so the
 * startup screen and the status indicator can show it instead of treating it as an error.
 */
export const getServiceHealth = async (): Promise<ServiceHealth> => {
  const checkedAt = Date.now()
  try {
    const { data } = await apiClient.get<string>('/health/service')
    return { status: 'up', message: (typeof data === 'string' && data.trim()) || 'All services are running!', checkedAt }
  } catch (error) {
    const reachable = errorStatus(error) !== undefined
    return {
      status: 'down',
      message: reachable ? (error as Error).message : 'Can’t reach the N-Ops API.',
      checkedAt,
    }
  }
}
