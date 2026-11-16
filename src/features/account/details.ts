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
 * Helpers for the free-form profile details object (`app_user.user_details`).
 *
 * The editor only edits text values. Anything else (numbers, lists, nested objects written by another
 * client) is kept as-is, because `POST /user/self/details` replaces the whole object.
 */

import type { JsonObject } from './types'

/** One editable text entry. */
export interface DetailField {
  label: string
  value: string
}

/** Splits details into editable text fields (in stored order) and everything else. */
export const splitDetails = (details: JsonObject): { fields: DetailField[]; preserved: JsonObject } => {
  const fields: DetailField[] = []
  const preserved: JsonObject = {}
  for (const [label, value] of Object.entries(details)) {
    if (typeof value === 'string') fields.push({ label, value })
    else preserved[label] = value
  }
  return { fields, preserved }
}

/**
 * Builds the object to save: the preserved non-text values plus the edited fields (trimmed).
 * An edited field with the same label as a preserved value replaces it.
 */
export const mergeDetails = (fields: DetailField[], preserved: JsonObject): JsonObject => {
  const details: JsonObject = { ...preserved }
  for (const { label, value } of fields) details[label.trim()] = value.trim()
  return details
}

/** Short display text for a non-text value. */
export const formatDetailValue = (value: unknown): string => (value === null ? 'null' : JSON.stringify(value))
