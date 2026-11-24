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
 * Turning on second factors (`/user/2fa/*`).
 *
 * NOT RELEASED in the Main API yet: the `/user/2fa` scope is still commented out in its main.rs
 * (set_email_2fa, create_totp_entry, check_totp_code, set_totp_2fa). The paths and shapes below are
 * this client's expectation. Until the API ships them, calls fail with 404 and the user is told
 * setup isn't available yet. Update this file once the real routes land.
 */

import { apiClient } from '@/lib/axios'
import { errorStatus } from '@/types/api'

/** A new authenticator-app entry, before its first code has been checked. */
export interface TotpEnrollment {
  entryId: number
  /** Base32 secret, for typing into the app by hand. */
  secret: string
  /** `otpauth://totp/...` URI, which authenticator apps open directly. */
  otpauthUrl: string
}

/** Shown when a setup endpoint is missing on the server (404/405). */
export const SETUP_UNAVAILABLE =
  "Two-step setup isn't available on the server yet. Ask your admin, or sign out and try again later."

/** Re-throws `error`, swapping a missing-endpoint error for SETUP_UNAVAILABLE. */
const explain = (error: unknown): never => {
  const status = errorStatus(error)
  if (status === 404 || status === 405) throw new Error(SETUP_UNAVAILABLE)
  throw error
}

/** Turns email codes on or off (`set_email_2fa`; the API allows it only for a verified email). */
export const setEmailTwoFactor = async (enabled: boolean): Promise<void> => {
  await apiClient.post('/user/2fa/email', { enabled }).catch(explain)
}

/** Starts adding an authenticator app (`create_totp_entry`). */
export const createTotpEntry = async (entryName: string): Promise<TotpEnrollment> => {
  const { data } = await apiClient
    .post<{ entry_id: number; secret: string; otpauth_url: string }>('/user/2fa/totp/entries', { entry_name: entryName })
    .catch(explain)
  return { entryId: data.entry_id, secret: data.secret, otpauthUrl: data.otpauth_url }
}

/** Checks a code from the new app (`check_totp_code`). Rejects (400) when the code is wrong. */
export const checkTotpCode = async (entryId: number, code: string): Promise<void> => {
  await apiClient.post(`/user/2fa/totp/entries/${entryId}/check`, { code }).catch(explain)
}

/** Turns authenticator-app codes on or off (`set_totp_2fa`; needs at least one checked entry). */
export const setTotpTwoFactor = async (enabled: boolean): Promise<void> => {
  await apiClient.post('/user/2fa/totp', { enabled }).catch(explain)
}
