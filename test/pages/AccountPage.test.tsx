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
/** Tests for src/pages/AccountPage.tsx (with UserDetailsCard, OrgInfoCard and the theme preference). */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { themeAtom } from '@/app/theme'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import { clearSessionToken, getSessionToken, setSessionToken } from '@/features/auth/store/sessionToken'
import { AccountPage } from '@/pages/AccountPage'
import { ApiError } from '@/types/api'
import { api, makeUser, renderWithProviders } from '../testUtils'

const orgInfo = {
  organization_id: 'org-123',
  organization_name: 'Acme',
  organization_info: { region: 'eu-west' },
  allocated_ai_credit: 100,
  utilized_ai_credit: 90,
  allocated_storage_bytes: 1024 ** 3,
  utilized_storage_bytes: 512 * 1024 ** 2,
  user_limit: 10,
  current_user_count: 4,
  server_limit: 50,
  workflow_limit: 20,
  ss_project_limit: 5,
  current_ss_project_count: 2,
  ss_keys_limit: 100,
  ss_notes_limit: 30,
  created_at: '2026-01-02T00:00:00Z',
}

/**
 * Answers each GET by URL: org info, the given profile `details`, and username checks
 * with `usernameStatus` (200 free, 409 taken).
 */
const mockGets = (usernameStatus = 200, details: object = {}) =>
  api.get.mockImplementation((url: string) => {
    if (url.startsWith('/user/self/user-name/check/')) return Promise.resolve({ status: usernameStatus, data: '' })
    if (url === '/user/self/details') return Promise.resolve({ data: details })
    return Promise.resolve({ data: orgInfo })
  })

describe('AccountPage', () => {
  it("shows the signed-in user's profile", () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })
    expect(screen.getByText('Priya Rao')).toBeInTheDocument()
    expect(screen.getByText('priya')).toBeInTheDocument()
    expect(screen.getByText('priya@acme.dev')).toBeInTheDocument()
    expect(screen.getByText('Not verified')).toBeInTheDocument()
  })

  it('hides the profile when it is unknown (after a page reload)', () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account' })
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it("shows the organization's details, usage and limits", async () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    expect(await screen.findByText('org-123')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/self/org-info')
    expect(screen.getByText('Jan 2, 2026')).toBeInTheDocument()
    expect(screen.getByText('eu-west')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Users' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('meter', { name: 'AI credits' })).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByRole('meter', { name: 'Storage' })).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('512 MB')).toBeInTheDocument()
  })

  it('explains when the organization cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Forbidden'))
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    expect(await screen.findByText("Couldn't load organization details: Forbidden")).toBeInTheDocument()
  })

  it('changes the theme preference', () => {
    mockGets()
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }))
    expect(store.get(themeAtom)).toBe('light')
    expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true')
  })
})

/** Types a code into the OTP boxes (pasting fills them all). */
const typeCode = (code: string) =>
  fireEvent.paste(screen.getByLabelText('Character 1 of 7'), { clipboardData: { getData: () => code } })

describe('AccountPage — email verification', () => {
  it('only offers verification for an unverified email', () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    expect(screen.queryByRole('button', { name: 'Verify email' })).not.toBeInTheDocument()
  })

  it('sends a code, verifies it and refreshes a remembered session', async () => {
    mockGets()
    setSessionToken('old', true)
    api.post.mockImplementation((url: string) =>
      Promise.resolve(url === '/auth/refresh' ? { data: { session_id: 'new' } } : { data: '' }),
    )
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByRole('group', { name: 'Email verification code' })).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/send')

    typeCode('1234567')
    await waitFor(() => expect(store.get(currentUserAtom)?.isEmailVerified).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/validate', '"1234567"', expect.anything())
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(getSessionToken()).toBe('new')
    expect(await screen.findByText('Email verified.')).toBeInTheDocument()
  })

  it('does not refresh a session without "Keep me signed in"', async () => {
    mockGets()
    setSessionToken('s1', false)
    api.post.mockResolvedValue({ data: '' })
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await screen.findByRole('group', { name: 'Email verification code' })
    typeCode('7654321')

    await waitFor(() => expect(store.get(currentUserAtom)?.isEmailVerified).toBe(true))
    expect(api.post).not.toHaveBeenCalledWith('/auth/refresh')
  })

  it('asks for a new code after a wrong one', async () => {
    mockGets()
    api.post.mockImplementation((url: string) =>
      url.endsWith('/validate')
        ? Promise.reject(new ApiError('Verification code is incorrect, request a new one', 400))
        : Promise.resolve({ data: '' }),
    )
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await screen.findByRole('group', { name: 'Email verification code' })
    typeCode('0000000')

    expect(await screen.findByText('That code is wrong. Send a new one and try again.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Send a new code' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled()
  })

  it('treats "already verified" as done', async () => {
    mockGets()
    api.post.mockRejectedValue(new ApiError('Email is already verified', 409))
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await waitFor(() => expect(store.get(currentUserAtom)?.isEmailVerified).toBe(true))
  })
})

describe('AccountPage — username', () => {
  it('shows live availability and blocks a taken name', async () => {
    mockGets(409)
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(screen.getByRole('button', { name: 'Change username' }))
    fireEvent.change(screen.getByLabelText('New username'), { target: { value: 'taken_name' } })

    expect(await screen.findByText('This username is already taken.')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/self/user-name/check/taken_name', expect.anything())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Change username' })).toBeDisabled()
  })

  it('renames, then refreshes a remembered session', async () => {
    mockGets(200)
    setSessionToken('old', true)
    api.post.mockImplementation((url: string) =>
      Promise.resolve(url === '/auth/refresh' ? { data: { session_id: 'new' } } : { data: '' }),
    )
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(screen.getByRole('button', { name: 'Change username' }))
    fireEvent.change(screen.getByLabelText('New username'), { target: { value: 'priya_r' } })
    expect(await screen.findByText('This username is available.')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change username' }))

    await waitFor(() => expect(store.get(currentUserAtom)?.userName).toBe('priya_r'))
    expect(api.post).toHaveBeenCalledWith('/user/self/change-username', '"priya_r"', expect.anything())
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
  })

  it('signs out when the session cannot be refreshed after the rename', async () => {
    mockGets(200)
    setSessionToken('old', true)
    api.post.mockImplementation((url: string) =>
      url === '/auth/refresh'
        ? (clearSessionToken(), Promise.reject(new ApiError('Invalid session', 401))) // the axios interceptor clears the token on 401
        : Promise.resolve({ data: '' }),
    )
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(screen.getByRole('button', { name: 'Change username' }))
    fireEvent.change(screen.getByLabelText('New username'), { target: { value: 'priya_r' } })
    await screen.findByText('This username is available.')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change username' }))

    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
    expect(getSessionToken()).toBeUndefined()
  })
})

describe('AccountPage — edit profile', () => {
  const rawProfile = {
    user_id: 1,
    organization_id: 'org-1',
    user_name: 'priya',
    display_name: 'Priya R',
    organization_name: 'Acme',
    primary_email: 'priya@acme.dev',
    is_email_verified: true,
    is_user_active: true,
    is_organization_active: true,
    permissions: ['tag:create'],
    tags: [],
    allowed_linux_users: [],
    can_approve_approvals: false,
    can_bypass_approvals: false,
  }

  /** Org info, plus /user/self/profile answering with `profile`. */
  const mockWithProfile = (profile: object = rawProfile) =>
    api.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/user/self/profile' ? profile : orgInfo }))

  const openEditor = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    return screen.getByRole('dialog')
  }

  it('validates the name and email', async () => {
    mockWithProfile()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Display name'), { target: { value: '  ' } })
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await within(dialog).findByText('Enter your name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(api.put).not.toHaveBeenCalled()
  })

  it('renames without sending the email, so it stays verified', async () => {
    mockWithProfile()
    api.put.mockResolvedValue({ data: 'Profile updated successfully' })
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Display name'), { target: { value: ' Priya R ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/self/profile', { display_name: 'Priya R' })
    expect(store.get(currentUserAtom)).toMatchObject({ displayName: 'Priya R', isEmailVerified: true })
    expect(store.get(sessionStatusAtom)).toBe('authenticated')
  })

  it('closes without a request when nothing changed', async () => {
    mockWithProfile()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.put).not.toHaveBeenCalled()
  })

  it('changes the email and refreshes a remembered session so the new address can be verified', async () => {
    mockWithProfile()
    setSessionToken('old', true)
    api.put.mockResolvedValue({ data: 'Profile updated successfully' })
    api.post.mockImplementation((url: string) =>
      Promise.resolve(url === '/auth/refresh' ? { data: { session_id: 'new' } } : { data: '' }),
    )
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'priya@new.dev' } })
    expect(within(dialog).getByRole('note')).toHaveTextContent('Your new email will need verifying.')
    expect(within(dialog).getByRole('note')).not.toHaveTextContent('signed out')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/Profile saved. Verify priya@new.dev/)).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/self/profile', { display_name: 'Priya Rao', primary_email: 'priya@new.dev' })
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(store.get(currentUserAtom)).toMatchObject({ primaryEmail: 'priya@new.dev', isEmailVerified: false })
    expect(getSessionToken()).toBe('new')
  })

  it('signs out after an email change when the session cannot be refreshed', async () => {
    mockWithProfile()
    setSessionToken('old', false)
    api.put.mockResolvedValue({ data: 'Profile updated successfully' })
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'priya@new.dev' } })
    expect(within(dialog).getByRole('note')).toHaveTextContent('You’ll be signed out after saving')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile saved. Sign in again to verify priya@new.dev.')).toBeInTheDocument()
    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
    expect(api.post).not.toHaveBeenCalledWith('/auth/refresh')
  })

  it('explains a clash and reloads the profile in case the name was saved', async () => {
    mockWithProfile({ ...rawProfile, display_name: 'Priya R' })
    api.put.mockRejectedValue(new ApiError('SQL Database error', 417))
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    const dialog = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Display name'), { target: { value: 'Priya R' } })
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'taken@acme.dev' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/may already be in use/)).toBeInTheDocument()
    await waitFor(() => expect(store.get(currentUserAtom)?.displayName).toBe('Priya R'))
    expect(store.get(currentUserAtom)?.primaryEmail).toBe('priya@acme.dev')
    expect(store.get(sessionStatusAtom)).toBe('authenticated')
  })
})

describe('AccountPage — security', () => {
  it('is shown even when the profile is unknown', () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account' })
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
  })

  it('validates and changes the password', async () => {
    mockGets()
    api.post.mockResolvedValue({ data: '' })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'weakpass' } })
    fireEvent.change(within(dialog).getByLabelText('Confirm new password'), { target: { value: 'weakpass' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Add at least one uppercase letter.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'Str0ng!pass' } })
    fireEvent.change(within(dialog).getByLabelText('Confirm new password'), { target: { value: 'Str0ng!pass' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change password' }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/user/self/change-password', JSON.stringify(btoa('Str0ng!pass')), expect.anything()),
    )
  })

  it('deactivates the account and signs out', async () => {
    mockGets()
    setSessionToken('s1', false)
    api.delete.mockResolvedValue({ data: '' })
    const { store } = renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate my account' }))

    await waitFor(() => expect(store.get(sessionStatusAtom)).toBe('unauthenticated'))
    expect(api.delete).toHaveBeenCalledWith('/user/self/deactivate')
    expect(getSessionToken()).toBeUndefined()
  })
})

describe('AccountPage — profile details', () => {
  it('lists saved details, including non-text values', async () => {
    mockGets(200, { Team: 'SRE', 'On call': '', shifts: [1, 2] })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    expect(await screen.findByText('SRE')).toBeInTheDocument()
    expect(screen.getByText('On call')).toBeInTheDocument()
    expect(screen.getByText('[1,2]')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account' })
    expect(await screen.findByText('No extra details yet. Add things like your job title or team.')).toBeInTheDocument()
  })

  it('edits, adds and removes fields, keeping non-text values', async () => {
    mockGets(200, { Team: 'SRE', Location: 'Pune', shifts: [1, 2] })
    api.post.mockResolvedValue({ data: '' })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('1 non-text value is kept as they are.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Value 1'), { target: { value: ' Platform ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove field 2' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add field' }))
    fireEvent.change(within(dialog).getByLabelText('Label 2'), { target: { value: 'Pronouns' } })
    fireEvent.change(within(dialog).getByLabelText('Value 2'), { target: { value: 'they/them' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save details' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/user/self/details', { shifts: [1, 2], Team: 'Platform', Pronouns: 'they/them' }),
    )
    expect(await screen.findByText('they/them')).toBeInTheDocument()
  })

  it('rejects duplicate and empty labels', async () => {
    mockGets(200, { Team: 'SRE' })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add field' }))
    fireEvent.change(within(dialog).getByLabelText('Label 2'), { target: { value: 'team' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save details' }))
    expect(await within(dialog).findByText('This label is already used.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Label 2'), { target: { value: '' } })
    fireEvent.change(within(dialog).getByLabelText('Value 2'), { target: { value: 'orphan' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save details' }))
    expect(await within(dialog).findByText('Enter a label.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('offers starter fields when there are no details', async () => {
    mockGets()
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser() })
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Label 1')).toHaveValue('Job title')
    expect(screen.getByLabelText('Label 2')).toHaveValue('Team')
  })
})

describe('AccountPage — email code characters', () => {
  it('accepts letters in the code (the API charset is configurable)', async () => {
    mockGets()
    api.post.mockResolvedValue({ data: '' })
    renderWithProviders(<AccountPage />, { route: '/account', user: makeUser({ isEmailVerified: false }) })

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await screen.findByRole('group', { name: 'Email verification code' })
    typeCode('aB3-xY9z')

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/user/self/verify-email/validate', '"aB3xY9z"', expect.anything()))
  })
})
