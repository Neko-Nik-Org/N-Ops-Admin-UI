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
 * Persistence for the session token.
 *
 * The token is kept in first-party cookies (secure, SameSite=strict) only so it survives page
 * reloads; it is never sent to the API as a cookie. lib/axios.ts reads it and sends it as the
 * `x-nops-token` header.
 */

import Cookies from 'js-cookie'

/** Cookie holding the session id returned by the API. */
const SESSION_COOKIE = 'nops_session'
/** Set alongside the session when "Keep me signed in" was ticked; the API only allows refresh for those sessions. */
const REMEMBER_COOKIE = 'nops_remember'
/** When the current session id was issued — used to schedule the next `/auth/refresh` before the API's 3h TTL runs out. */
const ISSUED_AT_COOKIE = 'nops_session_at'
/** How long cookies last for "Keep me signed in" sessions; other sessions end with the browser session. */
const REMEMBER_ME_DAYS = 7

/** Cookie attributes for a session, depending on whether it should be remembered. */
const cookieOptions = (rememberMe: boolean): Cookies.CookieAttributes => ({
  expires: rememberMe ? REMEMBER_ME_DAYS : undefined,
  sameSite: 'strict',
  secure: true,
})

/** Current session id, or undefined when signed out. */
export const getSessionToken = (): string | undefined => Cookies.get(SESSION_COOKIE)

/** Whether the current session was created with "Keep me signed in" (and can therefore be refreshed). */
export const isSessionRemembered = (): boolean => Cookies.get(REMEMBER_COOKIE) === '1'

/** Epoch ms the current session id was issued, or 0 if unknown (e.g. a cookie set before this was tracked). */
export const getSessionIssuedAt = (): number => Number(Cookies.get(ISSUED_AT_COOKIE)) || 0

/** Stores a new session id along with its issue time and remember-me flag. */
export const setSessionToken = (token: string, rememberMe: boolean): void => {
  const options = cookieOptions(rememberMe)
  Cookies.set(SESSION_COOKIE, token, options)
  Cookies.set(ISSUED_AT_COOKIE, String(Date.now()), options)
  if (rememberMe) {
    Cookies.set(REMEMBER_COOKIE, '1', options)
  } else {
    Cookies.remove(REMEMBER_COOKIE)
  }
}

/** Removes every session cookie (sign-out, 401 or failed verification). */
export const clearSessionToken = (): void => {
  Cookies.remove(SESSION_COOKIE)
  Cookies.remove(REMEMBER_COOKIE)
  Cookies.remove(ISSUED_AT_COOKIE)
}
