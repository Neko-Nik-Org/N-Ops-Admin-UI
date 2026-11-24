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
/** Converts profile details to and from the shape of the profile details form (lists typed as text). */

import { emptyProfileDetails, WEEKDAYS, type ProfileDetails, type Weekday } from './profileDetails'
import { splitLines, splitList, type ProfileDetailsFormValues } from './schema/accountSchemas'

/** Saved details → form values (lists become text). */
export const toDetailsForm = (d: ProfileDetails): ProfileDetailsFormValues => ({
  ...d,
  engineering: {
    ...d.engineering,
    expertise: d.engineering.expertise.join(', '),
    sshPublicKeys: d.engineering.sshPublicKeys.join('\n'),
  },
})

/** Form values → details (text back to lists). */
export const fromDetailsForm = (v: ProfileDetailsFormValues): ProfileDetails => ({
  ...v,
  availability: {
    ...v.availability,
    workDays: v.availability.workDays.filter((x): x is Weekday => (WEEKDAYS as readonly string[]).includes(x)),
  },
  engineering: {
    ...v.engineering,
    expertise: splitList(v.engineering.expertise),
    sshPublicKeys: splitLines(v.engineering.sshPublicKeys),
  },
  custom: v.custom.filter((c) => c.label.trim()),
})

/** Empty form values, for someone with no details yet. */
export const emptyDetailsForm = (): ProfileDetailsFormValues => toDetailsForm(emptyProfileDetails())
