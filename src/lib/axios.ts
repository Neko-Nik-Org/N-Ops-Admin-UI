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
import { ApiError, type ApiErrorBody } from '@/types/api'

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

/** Longest plain-text body shown as an error message; anything longer is likely an HTML error page. */
const MAX_TEXT_MESSAGE = 200

/**
 * The API's message for a failed response. Service errors send `{ error, code }` JSON, but some
 * routes (e.g. `/user/self/verify-email/*`) answer with a short plain-text body instead.
 */
const messageOf = (error: AxiosError<ApiErrorBody | string>): string => {
  const data = error.response?.data
  if (data && typeof data === 'object' && typeof data.error === 'string') return data.error
  if (typeof data === 'string' && data.trim() && data.length <= MAX_TEXT_MESSAGE && !data.trimStart().startsWith('<')) {
    return data.trim()
  }
  return error.message
}

/**
 * Normalizes errors to an ApiError carrying the API's message and HTTP status, and drops
 * the stored session on 401 so the route guards send the user back to login.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody | string>) => {
    if (error.response?.status === 401) {
      clearSessionToken()
    }
    return Promise.reject(new ApiError(messageOf(error), error.response?.status))
  },
)
