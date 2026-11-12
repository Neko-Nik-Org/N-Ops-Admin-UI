export interface LoginCredentials {
  userName: string
  password: string
  rememberMe: boolean
}

export interface CurrentUser {
  userId: number
  organizationId: string
  permissions: string[]
  tags: number[]
  userName: string
  displayName: string
  organizationName: string
  primaryEmail: string
  isEmailVerified: boolean
}

export interface LoginSuccessResponse {
  message: string
  is_2fa_required: false
  session_id: string
  data: {
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
}

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

export type TwoFactorMethod = 'totp' | 'email'

