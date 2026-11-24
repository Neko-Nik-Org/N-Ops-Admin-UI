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

/** Validation rules for the create / edit tag form. */

import * as yup from 'yup'

/** Mirrors `resource_tag`: `tag_name VARCHAR(50)` (unique per org), `tag_description TEXT NOT NULL`. */
export const tagSchema = yup.object({
  tagName: yup.string().trim().required('Enter a tag name.').max(50, 'Keep the name to 50 characters or fewer.'),
  tagDescription: yup.string().trim().default(''),
})

/** Values produced by the tag form after validation. */
export type TagFormValues = yup.InferType<typeof tagSchema>
