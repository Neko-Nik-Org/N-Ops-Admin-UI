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
 * Checking and describing the IP entries of an access policy, which may be a single address
 * (`198.51.100.7`, `2001:db8::1`) or a CIDR range (`203.0.113.0/24`, `2001:db8::/32`).
 *
 * Mirrors what the Main API accepts: it parses each entry with Rust's `cidr` crate, which takes IPv4
 * and IPv6, treats a bare address as a /32 or /128, and refuses a range whose address has bits set
 * past the prefix (`203.0.113.5/24`) — so that case gets the corrected range as a suggestion.
 * Parsing uses ipaddr.js, restricted to the plain forms (no "10.1", hex or octal IPv4 shorthands,
 * no IPv6 zone ids), which the API would refuse too.
 */

import ipaddr from 'ipaddr.js'

export type CidrCheck =
  | {
      ok: true
      /** The entry as it should be saved (IPv6 compressed, prefix kept only for real ranges). */
      value: string
      version: 4 | 6
      prefix: number
      /** First and last address the entry covers. */
      first: string
      last: string
      /** e.g. "256 addresses", "1 address", "2^64 addresses". */
      size: string
    }
  | {
      ok: false
      error: string
      /** A corrected entry to offer, e.g. the network range when host bits are set. */
      suggestion?: string
    }

const ADDRESS_ERROR = 'Enter an IP address like 198.51.100.7, or a range like 203.0.113.0/24.'

/** A plain IPv4 (dotted decimal) or IPv6 address, parsed; null for anything else. */
const parseAddress = (text: string) => {
  if (ipaddr.IPv4.isValidFourPartDecimal(text)) return ipaddr.IPv4.parse(text)
  if (text.includes(':') && !text.includes('%') && ipaddr.IPv6.isValid(text)) return ipaddr.IPv6.parse(text)
  return null
}

const sizeOf = (version: 4 | 6, prefix: number) => {
  const bits = (version === 4 ? 32 : 128) - prefix
  if (bits === 0) return '1 address'
  return bits <= 32 ? `${(2 ** bits).toLocaleString('en-US')} addresses` : `2^${bits} addresses`
}

/** Checks one entry (already trimmed or not) the way the API will. */
export const checkCidr = (input: string): CidrCheck => {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter an IP address or range.' }
  const [addressText, prefixText, extra] = text.split('/')
  if (extra !== undefined) return { ok: false, error: ADDRESS_ERROR }
  const address = parseAddress(addressText)
  if (!address) return { ok: false, error: ADDRESS_ERROR }
  const version = address.kind() === 'ipv4' ? 4 : 6
  const max = version === 4 ? 32 : 128

  let prefix = max
  if (prefixText !== undefined) {
    if (!/^\d{1,3}$/.test(prefixText) || Number(prefixText) > max)
      return { ok: false, error: `The prefix after "/" must be a whole number from 0 to ${max}.` }
    prefix = Number(prefixText)
  }

  const cidr = `${address.toString()}/${prefix}`
  const Family = version === 4 ? ipaddr.IPv4 : ipaddr.IPv6
  const network = Family.networkAddressFromCIDR(cidr).toString()
  const last = Family.broadcastAddressFromCIDR(cidr).toString()
  if (network !== address.toString()) {
    const fixed = `${network}/${prefix}`
    return {
      ok: false,
      error: `${text} isn't the start of a /${prefix} range. Use ${fixed}, or the single address ${address.toString()}.`,
      suggestion: fixed,
    }
  }
  return {
    ok: true,
    value: prefix === max ? address.toString() : cidr,
    version,
    prefix,
    first: network,
    last,
    size: sizeOf(version, prefix),
  }
}

/** True when the entry is one the API accepts. */
export const isValidCidr = (input: string) => checkCidr(input).ok

/** The entry as it should be saved; the trimmed text when it isn't valid. */
export const normalizeCidr = (input: string) => {
  const check = checkCidr(input)
  return check.ok ? check.value : input.trim()
}

/** "203.0.113.0 – 203.0.113.255 · 256 addresses", or the address alone for a single one. */
export const describeCidr = (input: string): string => {
  const check = checkCidr(input)
  if (!check.ok) return ''
  return check.first === check.last ? `Single address · IPv${check.version}` : `${check.first} – ${check.last} · ${check.size}`
}
