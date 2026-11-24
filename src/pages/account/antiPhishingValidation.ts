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

/** Validation for the anti-phishing secret form, matching the API's rules. */

import * as yup from 'yup'

/** 4–16 characters: letters, digits, `-` and `_` (ASCII only, so the API's byte-length check agrees). */
export const ANTI_PHISHING_PATTERN = /^[A-Za-z0-9_-]{4,16}$/

export const antiPhishingSchema = yup.object({
  secret: yup
    .string()
    .trim()
    .required('Enter a secret.')
    .min(4, 'Use at least 4 characters.')
    .max(16, 'Use 16 characters or fewer.')
    .matches(ANTI_PHISHING_PATTERN, 'Use only letters, digits, - and _.'),
})

export type AntiPhishingFormValues = yup.InferType<typeof antiPhishingSchema>
