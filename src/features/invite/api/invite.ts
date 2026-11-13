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

/** API calls for accepting an invitation to join an organization. */

import { apiClient } from '@/lib/axios'
import type { LoginSuccessResponse } from '@/features/auth/types'
import type { AcceptInvitePayload, InviteDetails } from '../types'

/**
 * There's no invite feature on N-Ops-Main-API yet — no table, no route, not even a commented-out
 * stub (unlike `/auth/verify-otp`). These paths/shapes are this app's best guess at the contract,
 * kept here as the integration point to adjust once the backend lands.
 */

/** Looks up who sent the invite, for which organization, role and tags. */
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
