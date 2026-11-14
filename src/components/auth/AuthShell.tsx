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
/** Frame for every sign-in screen: network background, brand bar, centered glass card, footer. */

import { useAtomValue } from 'jotai'
import { useId, type ReactNode } from 'react'
import { resolvedThemeAtom } from '@/app/theme'
import { NLoader, NLogo } from '@/components/loading'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { cn } from '@/utils/cn'
import { AuthBackground } from './AuthBackground'

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

/** Props for AuthCard. */
interface AuthCardProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Replaces the animated N loader, e.g. a phone for two-step. */
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/** The glass card in the middle, with a light running around its edge. Animates in on mount. */
export const AuthCard = ({ title, subtitle, icon, children, className }: AuthCardProps) => {
  const id = useId()
  return (
    <section className={cn('n-auth-card', className)} aria-labelledby={id}>
      <div className="n-auth-card__head">
        {icon ? (
          <span className="n-auth-card__icon">{icon}</span>
        ) : (
          <NLoader size={64} variant="draw" framed decorative className="n-auth-card__loader" />
        )}
        <h1 id={id} className="n-auth-title">
          {title}
        </h1>
        {subtitle && <p className="n-auth-sub">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}
