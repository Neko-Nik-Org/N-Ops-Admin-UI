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

/** Layout for signed-out pages (sign in, 2FA, invite): a brand panel next to the form. */

import type { ReactNode } from 'react'
import { NLogo } from '@/components/loading'
import { Logo } from '@/components/atoms/Logo'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'

/** Dots and connecting lines behind the brand mark — a loose network, not a chart (fixed layout, purely decorative). */
const NETWORK_POINTS: Array<[number, number]> = [
  [40, 60], [110, 30], [200, 20], [290, 45], [350, 90],
  [20, 150], [90, 170], [180, 130], [260, 160], [330, 180],
  [55, 250], [150, 290], [230, 300], [310, 270],
  [15, 330], [120, 350], [260, 340], [345, 310],
  [200, 230], [70, 110],
]
/** Lines between NETWORK_POINTS, given as pairs of point indexes. */
const NETWORK_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [4, 8], [5, 19],
  [6, 10], [10, 11], [11, 18], [18, 12], [12, 8], [10, 14], [14, 15], [15, 16], [16, 17], [17, 12],
  [19, 0], [9, 8], [7, 3], [11, 15],
]

/** Decorative SVG network drawn on the brand panel. */
const NetworkGraphic = () => (
  <svg viewBox="0 0 360 380" className="absolute inset-0 h-full w-full text-text-muted" aria-hidden>
    <g className="animate-network-drift">
      {NETWORK_EDGES.map(([a, b], i) => {
        const [x1, y1] = NETWORK_POINTS[a]
        const [x2, y2] = NETWORK_POINTS[b]
        const animated = i % 4 === 0
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.18"
            className={animated ? 'animate-edge-shimmer' : undefined}
            style={animated ? { animationDelay: `${(i / 4) * 0.5}s` } : undefined}
          />
        )
      })}
      {NETWORK_POINTS.map(([x, y], i) => {
        const animated = i % 3 === 0
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.5"
            fill="currentColor"
            opacity="0.4"
            className={animated ? 'animate-node-pulse' : undefined}
            style={animated ? { animationDelay: `${(i / 3) * 0.4}s` } : undefined}
          />
        )
      })}
    </g>
  </svg>
)

/** Props for AuthLayout. */
interface AuthLayoutProps {
  children: ReactNode
  /** Brand-panel heading; defaults to the product tagline. */
  headline?: string
  /** Line shown under the headline. */
  subtext?: string
}

/** Two-column layout: brand panel with headline (hidden on small screens) and the page's form. */
export const AuthLayout = ({
  children,
  headline = 'One platform. Complete infrastructure control.',
  subtext = 'Servers, secrets, containers, approvals and workflows for your whole team, in one place.',
}: AuthLayoutProps) => (
  <div className="flex min-h-screen flex-col lg:flex-row">
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4 lg:hidden">
      <Logo iconSize={28} />
      <ThemeToggle />
    </header>

    <aside className="hidden flex-col justify-between gap-10 bg-surface p-14 lg:flex lg:w-[46%]">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex h-80 w-80 items-center justify-center">
        <NetworkGraphic />
        <NLogo size={176} className="relative animate-logo-glow" />
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-3xl leading-tight font-bold text-text">{headline}</p>
        <p className="max-w-sm text-text-muted">{subtext}</p>
        <p className="font-mono text-xs text-text-muted">Open source under GPL-3.0</p>
      </div>
    </aside>

    <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-sm animate-fade-up">{children}</div>
    </main>
  </div>
)
