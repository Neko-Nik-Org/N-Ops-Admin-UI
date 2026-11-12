import { useQuery } from '@tanstack/react-query'
import { getInviteDetails } from '../api/invite'

export const useInviteDetails = (token: string) =>
  useQuery({ queryKey: ['invite', token], queryFn: () => getInviteDetails(token), retry: false })
