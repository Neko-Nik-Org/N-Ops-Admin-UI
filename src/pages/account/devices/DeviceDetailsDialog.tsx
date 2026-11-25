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
/** Dialog with everything the API knows about one linked device, read fresh from `/user/devices/get/{id}`. */

import { Dialog } from '@/components/Dialog'
import { SkeletonText } from '@/components/Skeleton'
import { useDevice } from '@/hooks/useDevices'
import { formatDateTime, formatRelative } from '@/utils/format'

/** "os_version" → "Os version". */
const keyLabel = (key: string) => {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** A detail value as text (nested values as JSON). */
const valueText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)

export const DeviceDetailsDialog = ({ sessionId, onClose }: { sessionId: number | null; onClose: () => void }) => {
  const device = useDevice(sessionId)
  const d = device.data

  return (
    <Dialog open={sessionId !== null} title={d?.deviceName ?? 'Device'} onClose={onClose}>
      {device.isPending ? (
        <SkeletonText lines={5} />
      ) : device.error ? (
        <p className="text-sm text-danger" role="alert">
          Couldn't load this device: {device.error.message}
        </p>
      ) : !d ? (
        <p className="text-sm text-text-muted">This device isn't linked any more.</p>
      ) : (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Type</dt>
          <dd className="text-text">{d.deviceType || '—'}</dd>
          <dt className="text-text-muted">Identifier</dt>
          <dd className="font-mono break-all text-text">{d.deviceIdentifier}</dd>
          <dt className="text-text-muted">Linked</dt>
          <dd className="text-text">{formatDateTime(d.createdAt)}</dd>
          <dt className="text-text-muted">Last used</dt>
          <dd className="text-text">
            {formatRelative(d.lastAccessedAt)} ({formatDateTime(d.lastAccessedAt)})
          </dd>
          {Object.entries(d.deviceDetails).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-text-muted">{keyLabel(key)}</dt>
              <dd className="break-all text-text">{valueText(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Dialog>
  )
}
