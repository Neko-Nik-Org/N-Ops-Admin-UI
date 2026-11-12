import Cookies from 'js-cookie'

const SESSION_COOKIE = 'nops_session'
const REMEMBER_ME_DAYS = 7

export const getSessionToken = (): string | undefined => Cookies.get(SESSION_COOKIE)

export const setSessionToken = (token: string, rememberMe: boolean): void => {
  Cookies.set(SESSION_COOKIE, token, {
    expires: rememberMe ? REMEMBER_ME_DAYS : undefined,
    sameSite: 'strict',
    secure: true,
  })
}

export const clearSessionToken = (): void => {
  Cookies.remove(SESSION_COOKIE)
}
