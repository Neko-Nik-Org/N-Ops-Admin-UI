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
 * What the "Link a mobile device" QR code holds. The N-Ops app scans it and has everything it needs for
 * `POST /auth/device/login`: which API to call, the user id and the one-time device code.
 */

/** Marks the JSON as an N-Ops device link, so the app can reject other QR codes. */
export const DEVICE_LINK_TYPE = 'n-ops-device-link'
/** Bump when the fields change, so older apps can say they need an update. */
export const DEVICE_LINK_VERSION = 1

export interface DeviceLink {
  type: typeof DEVICE_LINK_TYPE
  version: typeof DEVICE_LINK_VERSION
  /** Absolute API base URL, without a trailing slash. */
  api: string
  user_id: number
  device_token: string
}

/** The QR code's text: compact JSON. A relative API base URL is made absolute against `origin`. */
export const deviceLinkPayload = (apiBaseUrl: string, userId: number, deviceToken: string, origin: string): string => {
  const link: DeviceLink = {
    type: DEVICE_LINK_TYPE,
    version: DEVICE_LINK_VERSION,
    api: new URL(apiBaseUrl, origin).href.replace(/\/+$/, ''),
    user_id: userId,
    device_token: deviceToken,
  }
  return JSON.stringify(link)
}
