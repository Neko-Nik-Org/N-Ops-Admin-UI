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

/** Shared HTTP client for the N-Ops Main API. */

import axios, { type AxiosError } from 'axios'
import { env } from '@/config/env'
import { clearSessionToken, getSessionToken } from '@/features/auth/store/sessionToken'
import type { ApiErrorBody } from '@/types/api'

/** Axios instance pointed at the configured Main API base URL. Use this for every API call. */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
})

/** Authenticates each request: the API uses the `x-nops-token` header, not cookies. */
apiClient.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) {
    config.headers.set('x-nops-token', token)
  }
  return config
})

/**
 * Normalizes errors to a plain Error carrying the API's `error` message, and drops
 * the stored session on 401 so the route guards send the user back to login.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      clearSessionToken()
    }
    const message = error.response?.data?.error ?? error.message
    return Promise.reject(new Error(message))
  },
)
