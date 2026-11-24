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
/** React Query hook for the API health check. */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { getServiceHealth } from '@/api/health'

/** How often the health check repeats while the app is open. */
export const HEALTH_POLL_MS = 60_000

/**
 * Shared definition: the startup screen runs it once (useAppBootstrap) and the login page
 * reads the same cache entry, then re-checks every minute.
 */
export const healthQuery = queryOptions({ queryKey: ['system', 'health'], queryFn: getServiceHealth, retry: false })

/** Latest API health, refreshed every HEALTH_POLL_MS. */
export const useServiceHealth = () => useQuery({ ...healthQuery, refetchInterval: HEALTH_POLL_MS })
