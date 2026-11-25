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
/** Tests for Account › Devices: linking the mobile app with a code, and the linked device list. */

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEVICE_TOKEN_TTL_MS } from '@/api/devices'
import { DEVICE_TOKEN_POLL_MS } from '@/hooks/useDevices'
import { AccountDevicesPage } from '@/pages/account/devices'
import { ApiError } from '@/types/api'
import { api, makeUser, renderWithProviders } from '../../testUtils'

const phone = {
  session_id: 7,
  device_name: 'Pixel 9',
  device_type: 'smartphone',
  device_identifier: 'uuid-7',
  device_details: { os_version: 'Android 16', app_version: '1.2.0' },
  created_at: '2026-11-20T10:00:00Z',
  last_accessed_at: '2026-11-24T10:00:00Z',
}

/**
 * Answers the device GETs: the list, one device, whether a code is waiting (`pending()`), and the
 * session info (`session`, or a 404 from an older API when null).
 */
const mockGets = ({
  devices = [phone] as object[],
  pending = (): boolean => false,
  session = { allow_device_logins: true } as object | null,
} = {}) =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/auth/session') {
      if (!session) throw new ApiError('Not found', 404)
      return { data: session }
    }
    if (url === '/user/devices/list') return { data: devices }
    if (url === '/user/devices/check/device-token') return { data: pending() }
    if (url.startsWith('/user/devices/get/')) return { data: phone }
    return { data: {} }
  })

const renderPage = () => renderWithProviders(<AccountDevicesPage />, { route: '/account/devices', user: makeUser() })

describe('AccountDevicesPage', () => {
  it('lists linked devices and shows their details', async () => {
    mockGets()
    renderPage()
    expect(await screen.findByText('Pixel 9')).toBeInTheDocument()
    expect(screen.getByText(/Last used .* · Linked Nov 20, 2026/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Details of Pixel 9' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('uuid-7')).toBeInTheDocument()
    expect(within(dialog).getByText('Os version')).toBeInTheDocument()
    expect(within(dialog).getByText('Android 16')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/devices/get/7')
  })

  it('says when no device is linked', async () => {
    mockGets({ devices: [] })
    renderPage()
    expect(await screen.findByText(/No devices linked yet/)).toBeInTheDocument()
  })

  it('removes a device after asking', async () => {
    mockGets()
    api.delete.mockResolvedValue({ data: '' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Pixel 9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove device' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/user/devices/delete/7'))
    expect(await screen.findByText('Removed Pixel 9.')).toBeInTheDocument()
  })

  it('shows a code, and notices when the app uses it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let waiting = false
      mockGets({ devices: [], pending: () => waiting })
      api.post.mockImplementation(async () => {
        waiting = true
        return { data: 'K7Q2-9XPM' }
      })
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Get a code' }))
      expect(await screen.findByLabelText('Device code')).toHaveTextContent('K7Q2-9XPM')
      // the app signs in with the user id and the code
      expect(screen.getByLabelText('User ID')).toHaveTextContent(String(makeUser().userId))
      // or scans it all from a QR code
      expect(screen.getByRole('img', { name: 'QR code for the N-Ops app' }).querySelector('svg')).not.toBeNull()
      expect(screen.getByText('4:55')).toBeInTheDocument()
      expect(api.post).toHaveBeenCalledWith('/user/devices/generate')

      // the app trades the code for a device session
      waiting = false
      mockGets({ devices: [phone], pending: () => waiting })
      await act(() => vi.advanceTimersByTimeAsync(DEVICE_TOKEN_POLL_MS + 100))
      expect(await screen.findByText(/Your device is linked/)).toBeInTheDocument()
      expect(await screen.findByText('Pixel 9')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('says so when the app used up the code without linking a device', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let waiting = false
      mockGets({ devices: [phone], pending: () => waiting })
      api.post.mockImplementation(async () => {
        waiting = true
        return { data: 'K7Q2-9XPM' }
      })
      renderPage()
      await screen.findByText('Pixel 9')
      fireEvent.click(screen.getByRole('button', { name: 'Get a code' }))
      await screen.findByLabelText('Device code')
      // a wrong attempt deletes the code too, but adds no device
      waiting = false
      await act(() => vi.advanceTimersByTimeAsync(DEVICE_TOKEN_POLL_MS + 100))
      expect(await screen.findByText(/no device was linked/)).toBeInTheDocument()
      expect(screen.queryByText(/Your device is linked/)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('says when the code runs out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let waiting = false
      mockGets({ devices: [], pending: () => waiting })
      api.post.mockImplementation(async () => {
        waiting = true
        return { data: 'K7Q2-9XPM' }
      })
      renderPage()
      fireEvent.click(await screen.findByRole('button', { name: 'Get a code' }))
      await screen.findByLabelText('Device code')
      api.delete.mockImplementation(async () => {
        waiting = false
        return { data: '' }
      })
      await act(() => vi.advanceTimersByTimeAsync(DEVICE_TOKEN_TTL_MS))
      expect(await screen.findByText(/The code ran out/)).toBeInTheDocument()
      // thrown away on the API too, so it can't be used in its last seconds
      expect(api.delete).toHaveBeenCalledWith('/user/devices/revoke')
      expect(screen.queryByText(/Your device is linked/)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels a code made earlier that is still waiting', async () => {
    mockGets({ pending: () => true })
    api.delete.mockResolvedValue({ data: '' })
    renderPage()
    expect(await screen.findByText(/A code you made earlier is still waiting/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel code' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/user/devices/revoke'))
    expect(await screen.findByRole('button', { name: 'Get a code' })).toBeInTheDocument()
  })

  it("says up front when the access policy doesn't allow the mobile app", async () => {
    mockGets({ session: { allow_device_logins: false } })
    renderPage()
    expect(await screen.findByText(/access policy doesn't allow the mobile app/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Get a code' })).not.toBeInTheDocument()
  })

  it('shows the reason the API gives for refusing a code', async () => {
    mockGets()
    api.post.mockRejectedValue(new ApiError('An active device token already exists for your account', 403))
    renderPage()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/session'))
    fireEvent.click(await screen.findByRole('button', { name: 'Get a code' }))
    expect(await screen.findByText('An active device token already exists for your account')).toBeInTheDocument()
  })

  it('explains a 403 from an older API without session info', async () => {
    mockGets({ session: null })
    api.post.mockRejectedValue(new ApiError('Device logins are not allowed for your account', 403))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Get a code' }))
    expect(await screen.findByText(/access policy doesn't allow the mobile app/)).toBeInTheDocument()
  })
})
