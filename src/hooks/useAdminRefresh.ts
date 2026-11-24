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
/** Cache keys for the Admin pages' React Query data, and a refresh that reloads them plus the audit log after a change. */

import { useQueryClient } from '@tanstack/react-query'

/** Cache keys, all under ['admin'] so a sign-out clear catches them. */
export const ADMIN_KEYS = {
  users: ['admin', 'users'],
  invitations: ['admin', 'invitations'],
  roles: ['admin', 'roles'],
  accessPolicies: ['admin', 'access-policies'],
  apiKeys: ['admin', 'api-keys'],
  audit: ['admin', 'audit'],
  schedules: ['admin', 'audit-schedules'],
} as const

/** Returns a function that refreshes the given lists plus the audit log. */
export const useAdminRefresh = (...keys: ReadonlyArray<readonly string[]>) => {
  const queryClient = useQueryClient()
  return () => Promise.all([...keys, ADMIN_KEYS.audit].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
