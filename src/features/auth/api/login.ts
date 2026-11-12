import { apiClient } from '@/lib/axios'
import type { LoginCredentials, LoginResponse } from '../types'

// btoa() only handles Latin1; passwords may contain unicode, so encode via bytes.
const toBase64 = (value: string): string => btoa(Array.from(new TextEncoder().encode(value), (b) => String.fromCharCode(b)).join(''))

export const login = async (credentials: LoginCredentials, turnstileToken: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>(
    '/auth/login',
    {
      user_name: credentials.userName,
      password: toBase64(credentials.password),
      remember_me: credentials.rememberMe,
    },
    {
      headers: {
        'cf-turnstile-token': turnstileToken,
      },
    },
  )
  return data
}
