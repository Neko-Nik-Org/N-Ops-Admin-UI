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
/** Glass card that holds each sign-in form, placed inside AuthShell. */

import { useId, type ReactNode } from 'react'
import { NLoader } from '@/components/molecules/NLoader'
import { cn } from '@/utils/cn'

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
