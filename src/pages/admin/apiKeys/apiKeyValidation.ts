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
/** Validation for the create / edit API key form. */

import * as yup from 'yup'

export const apiKeySchema = yup.object({
  keyName: yup
    .string()
    .trim()
    .required('Enter a name.')
    .max(100, 'Keep it to 100 characters or fewer.')
    .matches(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores.'),
  keyDescription: yup.string().trim().required('Say what this key is for.'),
  roleId: yup.number().typeError('Pick a role.').required('Pick a role.').min(1, 'Pick a role.'),
  tagId: yup.number().typeError('Pick a tag.').required('Pick a tag.').min(1, 'Pick a tag.'),
  vaultProjectIds: yup.array(yup.number().required()).min(1, 'Pick at least one vault project.').default([]),
  isActive: yup.boolean().default(true),
  /** '' = never expires; otherwise YYYY-MM-DD. */
  expiresOn: yup
    .string()
    .default('')
    .test('future', 'Pick a date after today.', (v) => !v || new Date(`${v}T23:59:59`) > new Date()),
})

export type ApiKeyFormValues = yup.InferType<typeof apiKeySchema>
