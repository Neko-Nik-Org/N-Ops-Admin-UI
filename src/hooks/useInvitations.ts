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
/** React Query hooks for invitations to join the organization (`/invite/*`). */

import { useMutation, useQuery } from '@tanstack/react-query'
import { deleteInvitation, listInvitations, sendInvitation } from '@/api/invitations'
import type { InvitationInput } from '@/types/invitation'
import { ADMIN_KEYS, useAdminRefresh } from '@/hooks/useAdminRefresh'

/** Every pending invitation, from `/invite/list`. Pass `enabled: false` without `user:invite:view`. */
export const useInvitations = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: ADMIN_KEYS.invitations, queryFn: listInvitations, enabled })

/** One invitation, picked from the list (the API has no fetch-one endpoint); undefined when it doesn't exist. */
export const useInvitation = (invitationId: number | null, { enabled = true }: { enabled?: boolean } = {}) => {
  const query = useInvitations({ enabled: enabled && invitationId !== null })
  return { ...query, invitation: query.data?.find((i) => i.invitationId === invitationId) }
}

export const useSendInvitation = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.invitations)
  return useMutation({ mutationFn: (input: InvitationInput) => sendInvitation(input), onSuccess: refresh })
}

export const useDeleteInvitation = () => {
  const refresh = useAdminRefresh(ADMIN_KEYS.invitations)
  return useMutation({ mutationFn: (invitationId: number) => deleteInvitation(invitationId), onSuccess: refresh })
}
