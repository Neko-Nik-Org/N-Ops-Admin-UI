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
/** Organization profile (read + update). Mock until the API has an org update endpoint. */

import { clone, db, mockDelay, recordAudit } from '../mock/db'
import type { Organization, OrganizationInput } from '../types'

/** Future: `GET /user/self/org-info` (already live, read-only) plus the profile in `organization_info`. */
export const getOrganization = async (): Promise<Organization> => {
  await mockDelay()
  return clone(db.organization)
}

/** Future: `PUT /org/update`. */
export const updateOrganization = async (input: OrganizationInput): Promise<void> => {
  await mockDelay()
  const name = input.organizationName.trim()
  if (!name) throw new Error('Enter an organization name.')
  db.organization = { ...db.organization, organizationName: name, info: { ...input.info } }
  recordAudit('org.update', 'organization', name, 'Updated profile')
}
