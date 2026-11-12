import { QueryClientProvider } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import { queryClient } from '@/lib/queryClient'
import { resolvedThemeAtom } from './theme'

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const resolvedTheme = useAtomValue(resolvedThemeAtom)

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer theme={resolvedTheme} position="top-right" autoClose={4000} />
    </QueryClientProvider>
  )
}
