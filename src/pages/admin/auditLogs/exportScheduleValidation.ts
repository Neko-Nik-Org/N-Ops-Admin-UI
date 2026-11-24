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
/** Validation for the scheduled audit log export form. */

import * as yup from 'yup'
import { splitList } from '@/utils/validation'

export const exportScheduleSchema = yup.object({
  frequency: yup.mixed<'daily' | 'weekly' | 'monthly'>().oneOf(['daily', 'weekly', 'monthly']).required(),
  format: yup.mixed<'csv' | 'json'>().oneOf(['csv', 'json']).required(),
  recipients: yup
    .string()
    .default('')
    .test('has', 'Add at least one email address.', (v) => splitList(v).length > 0)
    .test('emails', 'One of those isn’t a valid email address.', (v) =>
      splitList(v).every((e) => yup.string().email().isValidSync(e)),
    ),
  enabled: yup.boolean().default(true),
})

export type ExportScheduleFormValues = yup.InferType<typeof exportScheduleSchema>
