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
/** "Linked devices" card: phones signed in with the N-Ops app, with their details and a way to sign each out. */

import { Laptop, MonitorSmartphone, Smartphone, Tablet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/Badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { ListSkeleton } from '@/components/Skeleton'
import { deviceExpiresAt } from '@/api/devices'
import { AccountCard } from '@/pages/account/AccountCard'
import { DeviceDetailsDialog } from '@/pages/account/devices/DeviceDetailsDialog'
import { useDevices, useRemoveDevice } from '@/hooks/useDevices'
import type { Device } from '@/types/device'
import { formatDate, formatRelative, fromNow } from '@/utils/format'

/** Icon for a device type, by the words apps usually send. */
const deviceIcon = (type: string): LucideIcon => {
  const t = type.toLowerCase()
  if (/tablet|ipad/.test(t)) return Tablet
  if (/phone|mobile|android|ios/.test(t)) return Smartphone
  if (/laptop|desktop|computer|mac|windows|linux/.test(t)) return Laptop
  return MonitorSmartphone
}

export const DevicesCard = () => {
  const devices = useDevices()
  const remove = useRemoveDevice()
  const [details, setDetails] = useState<number | null>(null)
  const [removing, setRemoving] = useState<Device | null>(null)

  const list = devices.data ?? []

  return (
    <AccountCard
      icon={<Smartphone size={16} />}
      title="Linked devices"
      description="Devices signed in with the N-Ops app. A device not used for 7 days is signed out and removed."
      actions={list.length > 0 && <Badge>{list.length}</Badge>}
    >
      {devices.isPending ? (
        <ListSkeleton rows={2} title={false} />
      ) : devices.error ? (
        <p className="text-sm text-danger" role="alert">
          Couldn't load your devices: {devices.error.message}
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-text-muted">
          No devices linked yet. Get a code above to link your phone.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {list.map((device) => {
            const Icon = deviceIcon(device.deviceType)
            const expiresAt = deviceExpiresAt(device.lastAccessedAt)
            // the API's cleanup runs every 6 hours, so an expired device can still be listed for a while
            const expired = expiresAt <= Date.now()
            return (
              <li key={device.sessionId} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-text-muted"
                  aria-hidden="true"
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-text">
                    <span className="truncate font-medium">{device.deviceName}</span>
                    {device.deviceType && <Badge>{device.deviceType}</Badge>}
                    {expired && <Badge tone="warning">Expired</Badge>}
                  </p>
                  <p className="text-xs text-text-muted">
                    Last used {formatRelative(device.lastAccessedAt)} · Linked {formatDate(device.createdAt)} ·{' '}
                    {expired ? 'Signed out' : `Signs out ${fromNow(new Date(expiresAt))} unless used`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <LoadingButton
                    variant="ghost"
                    size="sm"
                    aria-label={`Details of ${device.deviceName}`}
                    onClick={() => setDetails(device.sessionId)}
                  >
                    Details
                  </LoadingButton>
                  <LoadingButton
                    variant="secondary"
                    size="sm"
                    aria-label={`Remove ${device.deviceName}`}
                    onClick={() => setRemoving(device)}
                  >
                    Remove
                  </LoadingButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <DeviceDetailsDialog sessionId={details} onClose={() => setDetails(null)} />
      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.deviceName ?? 'this device'}?`}
        confirmLabel="Remove device"
        successMessage={`Removed ${removing?.deviceName ?? 'the device'}.`}
        onConfirm={() => remove.mutateAsync(removing!.sessionId)}
        onClose={() => setRemoving(null)}
      >
        <p>
          The N-Ops app on this device can't renew its sign-in any more, so it's signed out within 3 hours. To use it again, link
          it with a new code.
        </p>
      </ConfirmDialog>
    </AccountCard>
  )
}
