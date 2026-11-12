import { Navigate, useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { TwoFactorForm } from '@/components/organisms/TwoFactorForm'
import type { TwoFactorContext } from '@/features/auth/types'

export const TwoFactorPage = () => {
  const { state } = useLocation()
  const context = state as TwoFactorContext | null

  if (!context?.temporaryAuthToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthLayout
      headline="One more step, then you're in."
      subtext="A second check keeps production safe, even if a password leaks."
    >
      <TwoFactorForm context={context} />
    </AuthLayout>
  )
}
