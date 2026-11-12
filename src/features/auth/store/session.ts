import { atom } from 'jotai'
import type { CurrentUser } from '../types'

export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated'

export const sessionStatusAtom = atom<SessionStatus>('checking')
export const currentUserAtom = atom<CurrentUser | null>(null)
