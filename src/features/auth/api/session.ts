import { apiClient } from '@/lib/axios'

export const verifySession = async (): Promise<void> => {
  await apiClient.get('/auth/verify')
}

export const logout = async (): Promise<void> => {
  await apiClient.delete('/auth/logout')
}
