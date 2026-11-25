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
/** Types for the signed-in user's linked devices (`/user/devices/*`): phones signed in with the N-Ops app. */

import type { JsonObject } from '@/types/account'

/** A device signed in with the N-Ops mobile app (a long-lived device session, `device_session`). */
export interface Device {
  sessionId: number
  /** e.g. "Pixel 9". */
  deviceName: string
  /** e.g. "smartphone", "tablet". */
  deviceType: string
  /** The app's id for the device (a UUID or serial number). */
  deviceIdentifier: string
  /** Whatever else the app sent, e.g. OS and app version. */
  deviceDetails: JsonObject
  createdAt: string
  lastAccessedAt: string
}
