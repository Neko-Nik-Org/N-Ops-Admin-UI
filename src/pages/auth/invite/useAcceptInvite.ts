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

/** Hook that accepts an invitation by creating the account. */

import { useAsyncAction } from '@/hooks/useAsyncAction'
import { joinInvite } from '@/api/invite'
import type { AcceptInvitePayload, InviteLink } from '@/types/invite'

/** Drives the "Create account" LoadingButton. The API doesn't sign the new user in, so they sign in next. */
export const useAcceptInvite = (link: InviteLink) =>
  useAsyncAction((payload: AcceptInvitePayload) => joinInvite(link, payload), { successMs: 600 })
