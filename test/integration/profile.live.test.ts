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

/**
 * Live contract test for editing your own profile (`PUT /user/self/profile`): runs the UI's real API
 * modules against a running N-Ops Main API. Skipped unless NOPS_LIVE_API_URL is set.
 *
 *   NOPS_LIVE_API_URL=http://127.0.0.1:18686 NOPS_LIVE_MAILPIT_URL=http://127.0.0.1:18025 \
 *     npx vitest run test/integration/profile.live.test.ts
 *
 * Needs the users from roles.live.test.ts (`root`, `scoped`, `viewer`, password `Start#Pass1`,
 * emails verified, display names "Root User" / "Scoped User" / "Viewer User"), a Turnstile verify
 * URL that always succeeds, and (optionally) Mailpit catching the API's SMTP mail. Changes display names and
 * emails (the last test needs `root`'s email still verified), so run it once on a fresh database.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/axios') // test/setup.ts mocks the client for unit tests; this file needs the real one

const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.NOPS_LIVE_API_URL
const MAILPIT_URL = processEnv.NOPS_LIVE_MAILPIT_URL ?? 'http://127.0.0.1:18025'

const { apiClient } = await import('@/lib/axios')
const { login } = await import('@/features/auth/api/login')
const { refreshSession } = await import('@/features/auth/api/session')
const account = await import('@/features/account/api/account')
const { setSessionToken } = await import('@/features/auth/store/sessionToken')
const { errorStatus } = await import('@/types/api')

const statusOf = async (promise: Promise<unknown>): Promise<number | undefined> => {
  try {
    await promise
  } catch (error) {
    return errorStatus(error)
  }
  throw new Error('Expected the request to fail')
}

const signIn = async (userName: string, rememberMe = false) => {
  const response = await login({ userName, password: 'Start#Pass1', rememberMe }, 'stub-turnstile-token')
  if (response.is_2fa_required) throw new Error('Unexpected 2FA')
  setSessionToken(response.session_id, rememberMe)
}

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

/** Waits for the newest verification email to `to` and returns the code in it. */
const readCode = async (to: string): Promise<string> => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json()) as {
      messages: Array<{ ID: string }>
    }
    if (search.messages.length) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${search.messages[0].ID}`)).json()) as { Text: string }
      const match = /verification code is:\s*(\S+)/.exec(message.Text)
      if (match) return match[1]
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No verification email for ${to}`)
}

/** Number of emails Mailpit has caught for `to`. */
const mailCount = async (to: string): Promise<number> =>
  (
    (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json()) as {
      messages: unknown[]
    }
  ).messages.length

describe.skipIf(!API_URL)('live Main API: PUT /user/self/profile', () => {
  beforeAll(() => {
    apiClient.defaults.baseURL = API_URL
    apiClient.defaults.headers.common['x-real-ip'] = '127.0.0.1'
  })

  it('renames without touching the email or its verified state', async () => {
    await signIn('scoped')
    const name = `Scoped ${unique()}`
    await account.updateProfile({ displayName: name })
    await expect(account.getProfile()).resolves.toMatchObject({
      displayName: name,
      primaryEmail: 'scoped@example.test',
      isEmailVerified: true,
    })
  })

  it('answers a display name someone in the organization has with a bare 417', async () => {
    await signIn('scoped')
    expect(await statusOf(account.updateProfile({ displayName: 'Root User' }))).toBe(417)
  })

  it('answers an email someone else has with a bare 417, after saving the name (not atomic)', async () => {
    await signIn('root')
    const taken = (await account.getProfile()).primaryEmail
    await signIn('scoped')
    const name = `Scoped ${unique()}`
    expect(await statusOf(account.updateProfile({ displayName: name, primaryEmail: taken }))).toBe(417)
    await expect(account.getProfile()).resolves.toMatchObject({ displayName: name, primaryEmail: 'scoped@example.test' })
  })

  it('marks a changed email unverified; after a refresh, verification goes to the new address', async () => {
    await signIn('viewer', true)
    const email = `viewer-${unique()}@example.test`
    await account.updateProfile({ displayName: 'Viewer User', primaryEmail: email })
    await expect(account.getProfile()).resolves.toMatchObject({ primaryEmail: email, isEmailVerified: false })

    // what the UI does for a remembered session: rebuild the session from the database
    setSessionToken(await refreshSession(), true)
    // the refreshed session knows the new address is unverified, so sending is no longer refused (409).
    // The API ignores SMTP_PORT / SMTP_USE_TLS (always TLS on 465), so with a plain local mail
    // catcher the send itself fails; with working SMTP the code is read and verified too.
    const sent = await account.sendEmailVerification().then(
      () => 201,
      (error: unknown) => errorStatus(error),
    )
    expect(sent).not.toBe(409)
    if (sent === 201) {
      await account.verifyEmailCode(await readCode(email))
      await expect(account.getProfile()).resolves.toMatchObject({ primaryEmail: email, isEmailVerified: true })
    }
  })

  it('backend bug: without a refresh, the stale session refuses to verify the new address', async () => {
    await signIn('root') // not remembered: the session can't be refreshed
    const email = `root-${unique()}@example.test`
    await account.updateProfile({ displayName: 'Root User', primaryEmail: email })
    await expect(account.getProfile()).resolves.toMatchObject({ isEmailVerified: false })
    // the session still holds the old, verified address, so the API says "already verified"
    expect(await statusOf(account.sendEmailVerification())).toBe(409)
    expect(await mailCount(email)).toBe(0)
  })
})
