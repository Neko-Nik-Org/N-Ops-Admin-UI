import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { useSessionBootstrap } from '@/features/auth/hooks/useSessionBootstrap'

const App = () => {
  useSessionBootstrap()

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
