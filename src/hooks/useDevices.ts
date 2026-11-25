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
/** Query and mutation hooks for the signed-in user's linked devices (Account › Devices). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchDevice,
  generateDeviceToken,
  hasPendingDeviceToken,
  listDevices,
  removeDevice,
  revokeDeviceToken,
} from '@/api/devices'
import { getSessionInfo } from '@/api/session'

const DEVICES_KEY = ['user-self', 'devices'] as const
const PENDING_TOKEN_KEY = ['user-self', 'devices', 'pending-token'] as const

/** How often to ask whether the device code has been used, while one is shown. */
export const DEVICE_TOKEN_POLL_MS = 3000

/** What this session may do; the Devices page reads `allowDeviceLogins` from it. Changes only on a new sign-in. */
export const useSessionInfo = () =>
  useQuery({ queryKey: ['auth', 'session'], queryFn: getSessionInfo, retry: false, staleTime: Infinity })

/** The user's linked devices. */
export const useDevices = () => useQuery({ queryKey: DEVICES_KEY, queryFn: listDevices, retry: false })

/** One device, read fresh (for its details dialog). */
export const useDevice = (sessionId: number | null) =>
  useQuery({
    queryKey: [...DEVICES_KEY, sessionId],
    queryFn: () => fetchDevice(sessionId!),
    enabled: sessionId !== null,
    retry: false,
  })

/** Whether a device code is waiting to be used (the link card asks again while it shows one). */
export const usePendingDeviceToken = () => useQuery({ queryKey: PENDING_TOKEN_KEY, queryFn: hasPendingDeviceToken, retry: false })

/** Makes a new device code. */
export const useGenerateDeviceToken = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateDeviceToken,
    onSuccess: () => queryClient.setQueryData(PENDING_TOKEN_KEY, true),
  })
}

/** Throws away the waiting device code. */
export const useRevokeDeviceToken = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeDeviceToken,
    onSuccess: () => queryClient.setQueryData(PENDING_TOKEN_KEY, false),
  })
}

/** Signs a device out and drops it from the list. */
export const useRemoveDevice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY }),
  })
}
