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

/** Base64 helpers for values the Main API expects encoded (passwords). */

/**
 * UTF-8 safe base64. btoa() only handles Latin1, and passwords may contain any unicode,
 * so the string is encoded to bytes first.
 */
export const toBase64 = (value: string): string =>
  btoa(Array.from(new TextEncoder().encode(value), (b) => String.fromCharCode(b)).join(''))
