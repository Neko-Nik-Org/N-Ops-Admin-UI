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
 * Live contract test: runs the UI's real API modules (real axios client, interceptors, cookies)
 * against a running N-Ops Main API. Skipped unless NOPS_LIVE_API_URL is set.
 *
 *   NOPS_LIVE_API_URL=http://127.0.0.1:18686 NOPS_LIVE_MAILPIT_URL=http://127.0.0.1:18025 \
 *     npx vitest run test/integration
 *
 * Needs a disposable database (it changes passwords, usernames and deactivates a user) with users
 * `alice`, `bob` and `carol` (password `Start#Pass1`, email `<name>@example.test`, unverified) whose
 * role has tag:create/edit/delete, a Turnstile verify URL that always succeeds, and Mailpit
 * catching the API's SMTP mail. The API's ALLOWED_ORIGINS must include https://localhost.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/lib/axios') // test/setup.ts mocks the client for unit tests; this file needs the real one

/** Environment variables of the Vitest process (test files are type-checked without Node's types). */
const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.NOPS_LIVE_API_URL
const MAILPIT_URL = processEnv.NOPS_LIVE_MAILPIT_URL ?? 'http://127.0.0.1:18025'
const PASSWORD = 'Start#Pass1'

const { apiClient } = await import('@/lib/axios')
const account = await import('@/features/account/api/account')
const session = await import('@/features/auth/api/session')
const { login } = await import('@/features/auth/api/login')
const tags = await import('@/features/tags/api/tags')
const { clearSessionToken, getSessionToken, setSessionToken } = await import('@/features/auth/store/sessionToken')
const { errorStatus } = await import('@/types/api')

/** HTTP status a promise rejects with (fails the test if it resolves). */
const statusOf = async (promise: Promise<unknown>): Promise<number | undefined> => {
  try {
    await promise
  } catch (error) {
    return errorStatus(error)
  }
  throw new Error('Expected the request to fail')
}

/** Signs in through the UI's login() and stores the session the way the app does. */
const signIn = async (userName: string, password = PASSWORD, rememberMe = false): Promise<string> => {
  const response = await login({ userName, password, rememberMe }, 'stub-turnstile-token')
  if (response.is_2fa_required) throw new Error('Unexpected 2FA')
  setSessionToken(response.session_id, rememberMe)
  return response.session_id
}

/** Deletes every captured email so the next lookup only sees new mail. */
const clearMail = () => fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })

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

describe.skipIf(!API_URL)('live Main API', () => {
  beforeAll(() => {
    apiClient.defaults.baseURL = API_URL
    // Login reads the client IP from this header (set by the reverse proxy in production).
    apiClient.defaults.headers.common['x-real-ip'] = '127.0.0.1'
  })

  describe('session endpoints', () => {
    it('POST /auth/login, GET /auth/verify, DELETE /auth/logout', async () => {
      await signIn('alice')
      await expect(session.verifySession()).resolves.toBeNull() // 204 with no body
      await session.logout()
      expect(await statusOf(session.verifySession())).toBe(401)
      expect(getSessionToken()).toBeUndefined() // the 401 interceptor dropped it
    })

    it('rejects a wrong password with 401', async () => {
      expect(await statusOf(login({ userName: 'alice', password: 'nope', rememberMe: false }, 't'))).toBe(401)
    })

    it('POST /auth/refresh only for remembered sessions', async () => {
      await signIn('bob', PASSWORD, false)
      expect(await statusOf(session.refreshSession())).toBe(400)

      const old = await signIn('alice', PASSWORD, true)
      const fresh = await session.refreshSession()
      expect(fresh).not.toBe(old)
      setSessionToken(old, true)
      expect(await statusOf(session.verifySession())).toBe(401) // the old id stops working
      setSessionToken(fresh, true)
      await expect(session.verifySession()).resolves.toBeNull()
    })
  })

  // test/setup.ts clears cookies (the stored session) after every test, so sign in before each one.
  describe('/user/self basics', () => {
    beforeEach(async () => {
      await signIn('alice')
    })

    it('GET/POST ui-info', async () => {
      await account.saveUiInfo({ theme: 'light' })
      await expect(account.getUiInfo()).resolves.toEqual({ theme: 'light' })
    })

    it('GET/POST details (replaces the whole object)', async () => {
      await account.saveUserDetails({ Team: 'SRE', shifts: [1, 2] })
      await expect(account.getUserDetails()).resolves.toEqual({ Team: 'SRE', shifts: [1, 2] })
    })

    it('GET org-info', async () => {
      const org = await account.getOrgInfo()
      expect(org.organizationName).toBe('LocalTest Org')
      expect(org.users.current).toBeGreaterThan(0)
    })
  })

  describe('email verification', () => {
    it('remembered session: wrong code is discarded, right code verifies, refresh updates the session', async () => {
      await signIn('alice', PASSWORD, true)
      await clearMail()

      await account.sendEmailVerification()
      const first = await readCode('alice@example.test')
      expect(first).toHaveLength(account.EMAIL_CODE_LENGTH)

      expect(await statusOf(account.verifyEmailCode(`${first}x`))).toBe(400)
      expect(await statusOf(account.verifyEmailCode(first))).toBe(410) // discarded after the wrong guess

      await clearMail()
      await account.sendEmailVerification()
      await account.verifyEmailCode(await readCode('alice@example.test'))

      // Until the refresh, the cached session still says "not verified".
      await clearMail()
      await account.sendEmailVerification()
      await session.refreshSession().then((id) => setSessionToken(id, true))
      expect(await statusOf(account.sendEmailVerification())).toBe(409)
    })

    it('non-remembered session: verifies, but the session cannot be refreshed', async () => {
      await signIn('bob', PASSWORD, false)
      await clearMail()
      await account.sendEmailVerification()
      await account.verifyEmailCode(await readCode('bob@example.test'))
      expect(await statusOf(session.refreshSession())).toBe(400)

      await signIn('bob') // a new sign-in picks up the verified email
      expect(await statusOf(account.sendEmailVerification())).toBe(409)
    })
  })

  describe('username', () => {
    beforeEach(async () => {
      await signIn('alice', PASSWORD, true)
    })

    it('GET user-name/check: taken and free names', async () => {
      await expect(account.isUsernameAvailable('bob')).resolves.toBe(false)
      await expect(account.isUsernameAvailable('nobody_here')).resolves.toBe(true)
    })

    it('POST change-username rejects a taken name and an invalid one', async () => {
      expect(await statusOf(account.changeUsername('bob'))).toBe(400)
      expect(await statusOf(account.changeUsername('9bad'))).toBe(400)
    })

    it('POST change-username renames; the new name signs in', async () => {
      await account.changeUsername('alice_r')
      await signIn('alice_r')
      expect(await statusOf(login({ userName: 'alice', password: PASSWORD, rememberMe: false }, 't'))).toBe(401)
    })
  })

  describe('password', () => {
    it('POST change-password enforces the policy and the new password signs in', async () => {
      await signIn('bob')
      expect(await statusOf(account.changePassword('weakpass'))).toBe(400)
      await account.changePassword('N3w#Pässword')
      clearSessionToken()
      expect(await statusOf(login({ userName: 'bob', password: PASSWORD, rememberMe: false }, 't'))).toBe(401)
      await signIn('bob', 'N3w#Pässword')
    })
  })

  describe('tags', () => {
    it('create, list, get, update, delete', async () => {
      await signIn('bob', 'N3w#Pässword')
      await tags.createTag({ tagName: 'live-test', tagDescription: 'created by the live test' })
      const created = (await tags.listTags()).find((t) => t.tagName === 'live-test')
      expect(created).toBeDefined()
      await expect(tags.getTag(created!.tagId)).resolves.toMatchObject({ tagName: 'live-test' })
      await tags.updateTag(created!.tagId, { tagName: 'live-test-2', tagDescription: 'updated' })
      await expect(tags.getTag(created!.tagId)).resolves.toMatchObject({ tagName: 'live-test-2' })
      await tags.deleteTag(created!.tagId)
      expect((await tags.listTags()).some((t) => t.tagId === created!.tagId)).toBe(false)
    })
  })

  describe('deactivate', () => {
    it('DELETE deactivate ends the session and blocks sign-in', async () => {
      await signIn('carol')
      await account.deactivateAccount()
      expect(await statusOf(session.verifySession())).toBe(401)
      expect(await statusOf(login({ userName: 'carol', password: PASSWORD, rememberMe: false }, 't'))).toBe(401)
    })
  })
})
