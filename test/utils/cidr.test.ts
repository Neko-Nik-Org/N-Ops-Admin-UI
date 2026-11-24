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
/** Tests for src/utils/cidr.ts: addresses and CIDR ranges, checked the way the Main API checks them. */

import { describe, expect, it } from 'vitest'
import { checkCidr, describeCidr, isValidCidr, normalizeCidr } from '@/utils/cidr'

describe('checkCidr', () => {
  it('accepts IPv4 and IPv6 addresses and ranges', () => {
    for (const ok of [
      '198.51.100.7',
      '203.0.113.0/24',
      '10.0.0.0/8',
      '0.0.0.0/0',
      '2001:db8::1',
      '2001:db8::/32',
      '::/0',
      '10.0.0.1/32',
    ])
      expect(isValidCidr(ok), ok).toBe(true)
  })

  it('describes what an entry covers', () => {
    expect(checkCidr('203.0.113.0/24')).toMatchObject({
      ok: true,
      version: 4,
      prefix: 24,
      first: '203.0.113.0',
      last: '203.0.113.255',
      size: '256 addresses',
    })
    expect(describeCidr('203.0.113.0/24')).toBe('203.0.113.0 – 203.0.113.255 · 256 addresses')
    expect(describeCidr('198.51.100.7')).toBe('Single address · IPv4')
    expect(checkCidr('2001:db8::/32')).toMatchObject({ ok: true, version: 6, size: '2^96 addresses' })
  })

  it('normalizes: IPv6 compressed, a full-length prefix dropped', () => {
    expect(normalizeCidr(' 2001:0db8:0000:0000:0000:0000:0000:0001 ')).toBe('2001:db8::1')
    expect(normalizeCidr('10.0.0.1/32')).toBe('10.0.0.1')
    expect(normalizeCidr('2001:db8::/128')).toBe('2001:db8::')
  })

  it('refuses a range whose address has host bits set, and offers the network range', () => {
    const check = checkCidr('203.0.113.5/24')
    expect(check).toMatchObject({ ok: false, suggestion: '203.0.113.0/24' })
    expect(check.ok || check.error).toMatch(/isn't the start of a \/24 range/)
    expect(checkCidr('2001:db8::1/64')).toMatchObject({ ok: false, suggestion: '2001:db8::/64' })
  })

  it('refuses shorthand and malformed input the API would refuse', () => {
    for (const bad of [
      '',
      '300.1.1.1',
      '10.1',
      '0x0a.0.0.1',
      '010.0.0.1',
      '10.0.0.0/33',
      '10.0.0.0/',
      '10.0.0.0/8/8',
      'fe80::1%eth0',
      'example.com',
      '2001:db8::/129',
      '10.0.0.0/-1',
    ])
      expect(isValidCidr(bad), bad).toBe(false)
    expect(checkCidr('10.0.0.0/33')).toMatchObject({ ok: false, error: expect.stringContaining('from 0 to 32') })
  })
})
