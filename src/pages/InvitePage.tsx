import { Link, Navigate, useParams } from 'react-router-dom'
import { PanelLoader } from '@/components/loading'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { InviteForm } from '@/components/organisms/InviteForm'
import { useInviteDetails } from '@/features/invite/hooks/useInviteDetails'

const InviteUnavailable = () => (
  <div className="flex flex-col gap-3 text-center">
    <h1 className="text-2xl font-bold text-text">This invite isn't available</h1>
    <p className="text-sm text-text-muted">
      The link may be invalid or expired, or invites aren't supported on this server yet. Ask whoever invited you to send a new link.
    </p>
    <Link to="/login" className="text-sm text-signal hover:text-signal-strong">
      Back to sign in
    </Link>
  </div>
)

export const InvitePage = () => {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = useInviteDetails(token ?? '')

  if (!token) return <Navigate to="/login" replace />

  return (
    <AuthLayout
      headline="Your team runs its infrastructure here."
      subtext="Servers, secrets, containers, approvals and workflows for your whole team, in one place."
    >
      {isLoading ? (
        <div className="relative flex min-h-[320px] items-center justify-center">
          <PanelLoader label="Loading your invite" />
        </div>
      ) : isError || !data ? (
        <InviteUnavailable />
      ) : (
        <InviteForm token={token} details={data} />
      )}
    </AuthLayout>
  )
}
