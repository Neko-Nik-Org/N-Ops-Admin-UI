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
/** Validation for the create / edit role form. */

import * as yup from 'yup'
import { splitList } from '@/utils/validation'

export const roleSchema = yup.object({
  roleName: yup.string().trim().required('Enter a role name.').max(100, 'Keep it to 100 characters or fewer.'),
  roleDescription: yup.string().trim().default(''),
  permissions: yup.array(yup.string().required()).min(1, 'Give the role at least one permission.').default([]),
  tagIds: yup.array(yup.number().required()).default([]),
  canApproveApprovals: yup.boolean().default(false),
  canBypassApprovals: yup.boolean().default(false),
  allowedLinuxUsers: yup
    .string()
    .default('')
    .test('linux-users', 'Linux usernames use lowercase letters, numbers, - and _.', (v) =>
      splitList(v).every((u) => /^[a-z_][a-z0-9_-]{0,31}$/.test(u)),
    ),
})

export type RoleFormValues = yup.InferType<typeof roleSchema>
