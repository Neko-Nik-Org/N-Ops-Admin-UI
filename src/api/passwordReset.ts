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
/** Self-service password reset (signed out). */

import { apiClient } from '@/api/client'

/** How long the emailed code stays valid (the API keeps it in Redis for 5 minutes). */
export const PASSWORD_RESET_CODE_MINUTES = 5

/**
 * `POST /auth/reset/password`: emails a one-time code to a verified address. The body is the
 * email as a bare JSON string and the Turnstile token goes in the `cf-turnstile-token` header.
 * Answers 201. It answers 400 when the email is unknown or unverified, or when a code was
 * already sent and hasn't expired yet.
 */
export const requestPasswordReset = async (email: string, turnstileToken: string): Promise<void> => {
  await apiClient.post('/auth/reset/password', JSON.stringify(email), {
    headers: { 'Content-Type': 'application/json', 'cf-turnstile-token': turnstileToken },
  })
}
