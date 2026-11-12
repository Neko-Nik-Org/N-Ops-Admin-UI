import { AuthLayout } from '@/components/templates/AuthLayout'
import { LoginForm } from '@/components/organisms/LoginForm'

export const LoginPage = () => (
  <AuthLayout>
    <div className="mb-8 flex flex-col gap-1.5">
      <h1 className="text-3xl font-bold text-text">Sign in</h1>
      <p className="text-sm text-text-muted">Welcome back. Sign in to manage your infrastructure.</p>
    </div>
    <LoginForm />
  </AuthLayout>
)
