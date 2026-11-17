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
/** React Query hooks for the Admin section. Every change refreshes its list and the audit log. */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from '../api/apiKeys'
import {
  createAuditExportSchedule,
  deleteAuditExportSchedule,
  exportAuditLogs,
  listAuditActors,
  listAuditExportSchedules,
  listAuditLogs,
  updateAuditExportSchedule,
} from '../api/auditLogs'
import { PROFILE_KEY } from '@/features/account/hooks/useAccount'
import { useHasPermissions } from '@/features/auth/permissions'
import { createRole, deleteRole, fetchRole, listRoles, updateRole } from '../api/roles'
import { createUser, deleteUser, listUsers, updateUser } from '../api/users'
import type {
  AdminUserInput,
  ApiKeyInput,
  AuditExportFormat,
  AuditExportScheduleInput,
  AuditLogFilters,
  Role,
  RoleInput,
} from '../types'

/** Cache keys, all under ['admin'] so a sign-out clear catches them. */
export const ADMIN_KEYS = {
  users: ['admin', 'users'],
  roles: ['admin', 'roles'],
  apiKeys: ['admin', 'api-keys'],
  audit: ['admin', 'audit'],
  schedules: ['admin', 'audit-schedules'],
} as const

/** Returns a function that refreshes the given lists plus the audit log. */
const useRefresh = (...keys: ReadonlyArray<readonly string[]>) => {
  const queryClient = useQueryClient()
  return () => Promise.all([...keys, ADMIN_KEYS.audit].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

// ── Users ────────────────────────────────────────────────

export const useAdminUsers = () => useQuery({ queryKey: ADMIN_KEYS.users, queryFn: listUsers })

export const useCreateUser = () => {
  const refresh = useRefresh(ADMIN_KEYS.users)
  return useMutation({ mutationFn: (input: AdminUserInput) => createUser(input), onSuccess: refresh })
}

export const useUpdateUser = () => {
  const refresh = useRefresh(ADMIN_KEYS.users)
  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: AdminUserInput }) => updateUser(userId, input),
    onSuccess: refresh,
  })
}

export const useDeleteUser = () => {
  const refresh = useRefresh(ADMIN_KEYS.users)
  return useMutation({ mutationFn: (userId: number) => deleteUser(userId), onSuccess: refresh })
}

// ── Roles ────────────────────────────────────────────────

/** Every role in the organization, from `/user/roles/list`. Pass `enabled: false` without `user:role:view`. */
export const useRoles = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: ADMIN_KEYS.roles, queryFn: listRoles, enabled })

/** One role fresh from `GET /user/roles/fetch/{id}`; idle while `roleId` is null. */
export const useRole = (roleId: number | null) =>
  useQuery({
    queryKey: [...ADMIN_KEYS.roles, roleId],
    queryFn: () => fetchRole(roleId as number),
    enabled: roleId !== null,
    retry: false,
    gcTime: 0,
  })

/**
 * Real roles for pickers and name lookups on other pages (Users, API keys). Only fetched with
 * `user:role:view`; without it `canView` is false and the list stays empty.
 */
export const useRoleOptions = () => {
  const canView = useHasPermissions('user:role:view')
  const { data: roles = [], isLoading } = useRoles({ enabled: canView })
  const roleName = (roleId: number) => roles.find((r) => r.roleId === roleId)?.roleName ?? `Role #${roleId}`
  return { roles, roleName, canView, isLoading: canView && isLoading }
}

export const useCreateRole = () => {
  const refresh = useRefresh(ADMIN_KEYS.roles)
  return useMutation({ mutationFn: (input: RoleInput) => createRole(input), onSuccess: refresh })
}

export const useUpdateRole = () => {
  // the edited role may be the signed-in user's own, so their profile is reloaded too
  const refresh = useRefresh(ADMIN_KEYS.roles, PROFILE_KEY)
  return useMutation({
    mutationFn: ({ role, input }: { role: Role; input: RoleInput }) => updateRole(role, input),
    onSuccess: refresh,
  })
}

export const useDeleteRole = () => {
  const refresh = useRefresh(ADMIN_KEYS.roles)
  return useMutation({ mutationFn: (roleId: number) => deleteRole(roleId), onSuccess: refresh })
}

// ── API keys ─────────────────────────────────────────────

export const useApiKeys = () => useQuery({ queryKey: ADMIN_KEYS.apiKeys, queryFn: listApiKeys })

export const useCreateApiKey = () => {
  const refresh = useRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({ mutationFn: (input: ApiKeyInput) => createApiKey(input), onSuccess: refresh })
}

export const useUpdateApiKey = () => {
  const refresh = useRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({
    mutationFn: ({ apiKeyId, input }: { apiKeyId: number; input: ApiKeyInput }) => updateApiKey(apiKeyId, input),
    onSuccess: refresh,
  })
}

export const useDeleteApiKey = () => {
  const refresh = useRefresh(ADMIN_KEYS.apiKeys)
  return useMutation({ mutationFn: (apiKeyId: number) => deleteApiKey(apiKeyId), onSuccess: refresh })
}

// ── Audit logs ───────────────────────────────────────────

/** One page of filtered logs; keeps the previous page on screen while the next loads. */
export const useAuditLogs = (filters: AuditLogFilters, page: number, pageSize: number) =>
  useQuery({
    queryKey: [...ADMIN_KEYS.audit, 'list', filters, page, pageSize],
    queryFn: () => listAuditLogs(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })

export const useAuditActors = () => useQuery({ queryKey: [...ADMIN_KEYS.audit, 'actors'], queryFn: listAuditActors })

/** Builds an export of the filtered logs; the caller downloads the returned body. */
export const useExportAuditLogs = () => {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ filters, format }: { filters: AuditLogFilters; format: AuditExportFormat }) =>
      exportAuditLogs(filters, format),
    onSuccess: refresh,
  })
}

export const useAuditExportSchedules = () => useQuery({ queryKey: ADMIN_KEYS.schedules, queryFn: listAuditExportSchedules })

export const useSaveAuditExportSchedule = () => {
  const refresh = useRefresh(ADMIN_KEYS.schedules)
  return useMutation({
    mutationFn: ({ scheduleId, input }: { scheduleId?: number; input: AuditExportScheduleInput }) =>
      scheduleId ? updateAuditExportSchedule(scheduleId, input) : createAuditExportSchedule(input),
    onSuccess: refresh,
  })
}

export const useDeleteAuditExportSchedule = () => {
  const refresh = useRefresh(ADMIN_KEYS.schedules)
  return useMutation({ mutationFn: (scheduleId: number) => deleteAuditExportSchedule(scheduleId), onSuccess: refresh })
}
