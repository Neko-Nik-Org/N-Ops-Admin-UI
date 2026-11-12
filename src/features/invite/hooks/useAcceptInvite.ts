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
