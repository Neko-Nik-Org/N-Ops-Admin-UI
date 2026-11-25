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
/** Tests for src/utils/deviceLink.ts. */

import { describe, expect, it } from 'vitest'
import { deviceLinkPayload } from '@/utils/deviceLink'

describe('deviceLinkPayload', () => {
  it('holds the API, user id and device code as JSON the app can check', () => {
    expect(JSON.parse(deviceLinkPayload('https://api.n-ops.dev/', 2, 'W28OV5NXRgI', 'https://admin.n-ops.dev'))).toEqual({
      type: 'n-ops-device-link',
      version: 1,
      api: 'https://api.n-ops.dev',
      user_id: 2,
      device_token: 'W28OV5NXRgI',
    })
  })

  it('makes a relative API base URL absolute, since the phone is not on this page', () => {
    expect(JSON.parse(deviceLinkPayload('/api', 2, 't', 'https://admin.n-ops.dev')).api).toBe('https://admin.n-ops.dev/api')
  })
})
