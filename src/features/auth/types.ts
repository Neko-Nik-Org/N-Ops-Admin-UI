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

/** Values the user enters on the sign-in form. */
/**
 * Types for sign-in, sessions and two-factor authentication.
 * Snake_case interfaces mirror the Main API's JSON; camelCase ones are the app's own shapes.
 */

export interface LoginCredentials {
  userName: string
  password: string
  rememberMe: boolean
}

/** The signed-in user as the app stores it. */
export interface CurrentUser {
  userId: number
  organizationId: string
  /** Permission names granted to the user (see the Main API's docs/Permissions.md). */
  permissions: string[]
  /** Tag ids the user is limited to; empty means every tag. */
  tags: number[]
  userName: string
  displayName: string
  organizationName: string
  primaryEmail: string
  isEmailVerified: boolean
}

/** Login response when no second factor is needed: includes the session id and user profile. */
/** Signed-in user's profile as the API sends it, in both the login and `/auth/verify` responses. */
export interface RawSessionProfile {
  user_id: number
  organization_id: string
  permissions: string[]
  tags: number[]
  user_name: string
  display_name: string
  organization_name: string
  primary_email: string
  is_email_verified: boolean
}

export interface LoginSuccessResponse {
  message: string
  is_2fa_required: false
  session_id: string
  data: RawSessionProfile
}

/** Login response when a second factor is required: includes a temporary token for the 2FA step. */
export interface LoginTwoFactorResponse {
  message: string
  is_2fa_required: true
  temporary_auth_token: string
  data: {
    display_name: string
    organization_name: string
    primary_email: string
    is_email_verified: boolean
    has_email_2fa: boolean
    has_totp_2fa: boolean
    last_login_at: string
  }
}

/** Either login response; narrow on `is_2fa_required`. */
export type LoginResponse = LoginSuccessResponse | LoginTwoFactorResponse

/** What `useLogin` resolves to — lets the caller decide where to navigate. */
export type LoginOutcome = { kind: 'authenticated' } | { kind: 'two-factor'; context: TwoFactorContext }

/** Carried via router state from the login page to the 2FA page — never put in the URL. */
export interface TwoFactorContext {
  temporaryAuthToken: string
  email: string
  organizationName: string
  hasTotp: boolean
  hasEmail: boolean
  rememberMe: boolean
}

/** Supported second factors: authenticator app code or emailed code. */
export type TwoFactorMethod = 'totp' | 'email'


/** Converts the API's session profile into the CurrentUser shape the app uses. */
export const toCurrentUser = (p: RawSessionProfile): CurrentUser => ({
  userId: p.user_id,
  organizationId: p.organization_id,
  permissions: p.permissions,
  tags: p.tags,
  userName: p.user_name,
  displayName: p.display_name,
  organizationName: p.organization_name,
  primaryEmail: p.primary_email,
  isEmailVerified: p.is_email_verified,
})
