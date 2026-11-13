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

/** Hook that accepts an invite and signs the new user in. */

import { useAsyncAction } from '@/components/loading'
import { useApplySession } from '@/features/auth/hooks/useApplySession'
import { acceptInvite } from '../api/invite'
import type { AcceptInvitePayload } from '../types'

/** Drives the "Create account" LoadingButton. On success the invite response signs you straight in. */
export const useAcceptInvite = (token: string) => {
  const applySession = useApplySession()

  return useAsyncAction(
    async (payload: AcceptInvitePayload) => {
      const response = await acceptInvite(token, payload)
      applySession(response, false)
    },
    { successMs: 600 },
  )
}
