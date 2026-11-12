import { useQuery } from '@tanstack/react-query'
import { getOverview } from '../api/dashboard'

export const useOverview = () => useQuery({ queryKey: ['dashboard', 'overview'], queryFn: getOverview, retry: false })
