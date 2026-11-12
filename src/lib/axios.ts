import axios, { type AxiosError } from 'axios'
import { env } from '@/config/env'
import { clearSessionToken, getSessionToken } from '@/features/auth/store/sessionToken'
import type { ApiErrorBody } from '@/types/api'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
})

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) {
    config.headers.set('x-nops-token', token)
  }
  return config
})

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
