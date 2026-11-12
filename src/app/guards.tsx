import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ScreenLoader } from '@/components/loading'
import { sessionStatusAtom } from '@/features/auth/store/session'

const SessionCheck = () => <ScreenLoader messages={['Checking your session']} />

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)

  if (status === 'checking') return <SessionCheck />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}

export const RequireGuest = ({ children }: { children: ReactNode }) => {
  const status = useAtomValue(sessionStatusAtom)

  if (status === 'checking') return <SessionCheck />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <>{children}</>
}
