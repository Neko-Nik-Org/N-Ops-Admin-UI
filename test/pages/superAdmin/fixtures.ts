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
/** Organizations as /super-admin/organization/* returns them. */

import type { RawOrganization } from '@/api/organizations'

export const rawOrg = (id: string, name: string, extra: Partial<RawOrganization> = {}): RawOrganization => ({
  organization_id: id,
  organization_name: name,
  organization_info: { website: 'https://acme.dev', contact_email: 'ops@acme.dev' },
  allocated_ai_credit: 1000,
  utilized_ai_credit: 250,
  allocated_storage_bytes: 10_737_418_240,
  utilized_storage_bytes: 1_073_741_824,
  is_active: true,
  user_limit: 25,
  server_limit: 50,
  workflow_limit: 20,
  ss_project_limit: 10,
  ss_keys_limit: 200,
  ss_notes_limit: 100,
  created_at: '2026-11-13T09:58:00Z',
  ...extra,
})
