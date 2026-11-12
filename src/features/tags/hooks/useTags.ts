import { useQuery } from '@tanstack/react-query'
import { listTags } from '../api/tags'

export const useTags = () => useQuery({ queryKey: ['tags'], queryFn: listTags, retry: false })
