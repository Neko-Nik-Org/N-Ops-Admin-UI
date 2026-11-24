/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */
/** Frame for every sign-in screen: network background, brand bar, card slot (see AuthCard), footer. */

import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { resolvedThemeAtom } from '@/store/theme'
import { NLogo } from '@/components/NLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/utils/cn'
import { AuthBackground } from '@/components/AuthShell/AuthBackground'

/** Props for AuthShell. */
interface AuthShellProps {
  children: ReactNode
  /** Shown top-right with a live dot, e.g. the organization being signed in to. */
  org?: { name: string; host?: string }
  className?: string
}

/** Full-screen frame: animated network, brand bar (with the theme switch), centered card slot and footer. */
export const AuthShell = ({ children, org, className }: AuthShellProps) => {
  const theme = useAtomValue(resolvedThemeAtom)
  return (
    <div className={cn('n-auth', className)}>
      <AuthBackground tone={theme} />
      <div className="n-auth__veil" aria-hidden="true" />
      <div className="n-auth__layout">
        <header className="n-auth__top">
          <span className="n-auth__brand">
            <NLogo size={30} />
            <span>
              N<span className="n-auth__hy">-</span>Ops
            </span>
          </span>
          <span className="n-auth__actions">
            {org && (
              <span className="n-auth__org">
                <span className="n-auth__dot" aria-hidden="true" />
                {org.name}
                {org.host && <span className="n-auth__host">{org.host}</span>}
              </span>
            )}
            <ThemeToggle />
          </span>
        </header>
        <main className="n-auth__center">{children}</main>
        <footer className="n-auth__foot">
          <span>Open source under GPL-3.0</span>
          <a href="https://nops.app" target="_blank" rel="noreferrer">
            nops.app
          </a>
        </footer>
      </div>
    </div>
  )
}
