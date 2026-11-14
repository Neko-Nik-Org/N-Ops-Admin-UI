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
/** Scheduled audit export dialog: set up a workflow that emails the audit log on a schedule. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'
import { Textarea } from '@/components/atoms/Textarea'
import { LoadingButton, useAsyncAction } from '@/components/loading'
import { Dialog } from '@/components/molecules/Dialog'
import { FormField } from '@/components/molecules/FormField'
import { useSaveAuditExportSchedule } from '@/features/admin/hooks/useAdmin'
import { exportScheduleSchema, splitList, type ExportScheduleFormValues } from '@/features/admin/schema/adminSchemas'
import type { AuditExportSchedule } from '@/features/admin/types'

/** The form; mounted only while the dialog is open. */
const ScheduleForm = ({ schedule, onClose }: { schedule?: AuditExportSchedule; onClose: () => void }) => {
  const { mutateAsync: saveSchedule } = useSaveAuditExportSchedule()
  const [state, save] = useAsyncAction(
    (v: ExportScheduleFormValues) =>
      saveSchedule({
        scheduleId: schedule?.scheduleId,
        input: { frequency: v.frequency, format: v.format, recipients: splitList(v.recipients), enabled: v.enabled },
      }),
    { successMs: 500 },
  )
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExportScheduleFormValues>({
    resolver: yupResolver(exportScheduleSchema),
    defaultValues: {
      frequency: schedule?.frequency ?? 'weekly',
      format: schedule?.format ?? 'csv',
      recipients: schedule?.recipients.join(', ') ?? '',
      enabled: schedule?.enabled ?? true,
    },
  })

  const onSubmit = (v: ExportScheduleFormValues) =>
    save(v)
      .then(() => {
        toast.success(schedule ? 'Schedule saved.' : 'Scheduled export created.')
        setTimeout(onClose, 500)
      })
      .catch((error: Error) => toast.error(error.message))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="frequency" label="How often">
          <Select id="frequency" {...register('frequency')}>
            <option value="daily">Every day</option>
            <option value="weekly">Every Monday</option>
            <option value="monthly">1st of each month</option>
          </Select>
        </FormField>
        <FormField id="format" label="Format">
          <Select id="format" {...register('format')}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
        </FormField>
      </div>
      <FormField id="recipients" label="Email it to" error={errors.recipients?.message}>
        <Textarea id="recipients" rows={2} placeholder="security@company.com" hasError={!!errors.recipients} {...register('recipients')} />
        {!errors.recipients && <p className="text-xs text-text-muted">Separate addresses with commas. Each run sends the entries since the last run.</p>}
      </FormField>
      <Switch label="Enabled" description="Paused schedules keep their settings but don't run." {...register('enabled')} />
      <div className="flex justify-end gap-2 pt-1">
        <LoadingButton variant="ghost" onClick={onClose}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" state={state} loadingText="Saving" successText="Saved">
          {schedule ? 'Save schedule' : 'Create schedule'}
        </LoadingButton>
      </div>
    </form>
  )
}

/** Creates a scheduled export, or edits `schedule` when given. */
export const ExportScheduleDialog = ({ open, schedule, onClose }: { open: boolean; schedule?: AuditExportSchedule; onClose: () => void }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={schedule ? 'Edit scheduled export' : 'Schedule an export'}
    description="Runs as a workflow, so it also shows up under Workflows. Times are 06:00 in your organization's time zone."
  >
    <ScheduleForm schedule={schedule} onClose={onClose} />
  </Dialog>
)
