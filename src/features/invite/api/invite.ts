import { apiClient } from '@/lib/axios'
import type { LoginSuccessResponse } from '@/features/auth/types'
import type { AcceptInvitePayload, InviteDetails } from '../types'

/**
 * There's no invite feature on N-Ops-Main-API yet — no table, no route, not even a commented-out
 * stub (unlike `/auth/verify-otp`). These paths/shapes are this app's best guess at the contract,
 * kept here as the integration point to adjust once the backend lands.
 */

export const getInviteDetails = async (token: string): Promise<InviteDetails> => {
  const { data } = await apiClient.get<InviteDetails>(`/invite/${token}`)
  return data
}

/** Guessed to return the same shape as `/auth/login`'s success response, so accepting signs you in. */
export const acceptInvite = async (token: string, payload: AcceptInvitePayload): Promise<LoginSuccessResponse> => {
  const { data } = await apiClient.post<LoginSuccessResponse>(`/invite/${token}/accept`, {
    full_name: payload.fullName,
    password: payload.password,
  })
  return data
}
