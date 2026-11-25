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
/**
 * API calls for the signed-in user's linked devices (`/user/devices/*`). Any signed-in user can use
 * them for their own devices; no permission is needed.
 *
 * Linking works like this: the web app asks for a one-time device token (`/generate`), the user enters
 * it and their user id in the N-Ops mobile app, and the app trades both for a long-lived device session
 * (`POST /auth/device/login`, which deletes the token whether it matched or not). The token lives for
 * 5 minutes and only one can be waiting at a time. The access policy's "allow device logins" rule
 * decides whether a user may do this at all (`GET /auth/session` says so up front).
 */

import { apiClient } from '@/api/client'
import { isJsonObject } from '@/api/account'
import type { Device } from '@/types/device'

const BASE = '/user/devices'

/** How long a device token stays usable after it's made (the API keeps it 5 minutes). */
export const DEVICE_TOKEN_TTL_MS = 5 * 60 * 1000

/**
 * A device not used for this long can't renew its sign-in, and the API deletes it (a job every 6 hours).
 * Counted from `last_accessed_at`.
 */
export const DEVICE_IDLE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000

/** When a device stops being able to sign in, unless it's used before then. */
export const deviceExpiresAt = (lastAccessedAt: string): number => Date.parse(lastAccessedAt) + DEVICE_IDLE_LIMIT_MS

/** Device session as the API sends it (`DeviceSession` in the Main API). */
interface RawDevice {
  session_id: number
  device_name: string
  device_type: string
  device_identifier: string
  device_details: unknown
  created_at: string
  last_accessed_at: string
}

const toDevice = (d: RawDevice): Device => ({
  sessionId: d.session_id,
  deviceName: d.device_name,
  deviceType: d.device_type,
  deviceIdentifier: d.device_identifier,
  deviceDetails: isJsonObject(d.device_details) ? d.device_details : {},
  createdAt: d.created_at,
  lastAccessedAt: d.last_accessed_at,
})

/** `GET /user/devices/list` — every device linked to the user, most recently used first (the API sends them unordered). */
export const listDevices = async (): Promise<Device[]> => {
  const { data } = await apiClient.get<RawDevice[]>(`${BASE}/list`)
  return (Array.isArray(data) ? data : []).map(toDevice).sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt))
}

/** `GET /user/devices/get/{id}` — one device, or null when it isn't linked (the API answers 200 with null). */
export const fetchDevice = async (sessionId: number): Promise<Device | null> => {
  const { data } = await apiClient.get<RawDevice | null>(`${BASE}/get/${sessionId}`)
  return data ? toDevice(data) : null
}

/**
 * `DELETE /user/devices/delete/{id}` — the device can't renew its sign-in any more; the app has to be
 * linked again. The sign-in it already has (up to 3 hours) isn't ended. The API answers 204 even if the
 * device was already gone.
 */
export const removeDevice = async (sessionId: number): Promise<void> => {
  await apiClient.delete(`${BASE}/delete/${sessionId}`)
}

/**
 * `POST /user/devices/generate` — a new one-time token for linking a device (a UUID, as a JSON string).
 * Answers 403 when the policy forbids the mobile app, and also when a token is already waiting.
 */
export const generateDeviceToken = async (): Promise<string> => {
  const { data } = await apiClient.post<unknown>(`${BASE}/generate`)
  if (typeof data !== 'string' || !data) throw new Error('The API sent no device code.')
  return data
}

/** `GET /user/devices/check/device-token` — true while a device token is waiting to be used. */
export const hasPendingDeviceToken = async (): Promise<boolean> => {
  const { data } = await apiClient.get<unknown>(`${BASE}/check/device-token`)
  return data === true
}

/** `DELETE /user/devices/revoke` — throws away the waiting device token, so it can't be used. */
export const revokeDeviceToken = async (): Promise<void> => {
  await apiClient.delete(`${BASE}/revoke`)
}
