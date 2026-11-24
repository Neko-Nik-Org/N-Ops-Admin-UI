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
/** React Query hooks for the audit log and its scheduled exports. */

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import {
  createAuditExportSchedule,
  deleteAuditExportSchedule,
  exportAuditLogs,
  listAuditActors,
  listAuditExportSchedules,
  listAuditLogs,
  updateAuditExportSchedule,
} from '@/api/auditLogs'
import type { AuditExportFormat, AuditExportScheduleInput, AuditLogFilters } from '@/types/auditLog'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

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
  const refresh = useAdminRefresh()
  return useMutation({
    mutationFn: ({ filters, format }: { filters: AuditLogFilters; format: AuditExportFormat }) =>
      exportAuditLogs(filters, format),
    onSuccess: refresh,
  })
}

export const useAuditExportSchedules = () => useQuery({ queryKey: ADMIN_KEYS.schedules, queryFn: listAuditExportSchedules })

export const useSaveAuditExportSchedule = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.schedules)
  return useMutation({
    mutationFn: ({ scheduleId, input }: { scheduleId?: number; input: AuditExportScheduleInput }) =>
      scheduleId ? updateAuditExportSchedule(scheduleId, input) : createAuditExportSchedule(input),
    onSuccess: refresh,
  })
}

export const useDeleteAuditExportSchedule = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.schedules)
  return useMutation({ mutationFn: (scheduleId: number) => deleteAuditExportSchedule(scheduleId), onSuccess: refresh })
}
