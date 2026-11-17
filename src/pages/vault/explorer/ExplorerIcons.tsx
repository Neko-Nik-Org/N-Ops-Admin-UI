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
/** Large, Explorer-style icons for the Vault's "Large icons" view: folders and file pages. */

import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'

/**
 * A yellow folder. `badge` (e.g. the Env key) sits on its front; `filled` shows a sheet of paper
 * peeking out, as Explorer does for folders that have something in them.
 */
export const FolderGlyph = ({
  badge: Badge,
  filled = false,
  size = 64,
}: {
  badge?: LucideIcon
  filled?: boolean
  size?: number
}) => {
  const id = useId()
  return (
    <span className="relative inline-flex" style={{ width: size, height: size * 0.8 }} aria-hidden="true">
      <svg viewBox="0 0 64 52" width={size} height={size * 0.8} className="drop-shadow-sm">
        <defs>
          <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD96A" />
            <stop offset="1" stopColor="#F6BD38" />
          </linearGradient>
        </defs>
        {/* back with tab */}
        <path
          d="M2 7a4 4 0 0 1 4-4h15.5a4 4 0 0 1 2.8 1.2L28 8h30a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
          fill="#E3A21F"
        />
        {filled && <rect x="9" y="10" width="46" height="26" rx="2" fill="#FBFBFC" />}
        {/* front */}
        <path d="M2 17a4 4 0 0 1 4-4h52a4 4 0 0 1 4 4v27a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill={`url(#${id}-front)`} />
      </svg>
      {Badge && (
        <span className="absolute right-0 bottom-0 flex size-[38%] items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-black/10">
          <Badge className="size-[62%] text-[#0E9B78]" strokeWidth={2.25} />
        </span>
      )}
    </span>
  )
}

/** Tints for the glyph on a file page. */
const TONES = {
  signal: 'text-[#0E9B78]',
  accent: 'text-[#5B4BCF]',
  warning: 'text-[#B87412]',
  muted: 'text-[#5B6472]',
} as const

/** A page with a folded corner and a glyph (key, code, note…), like Explorer's file icons. */
export const FileGlyph = ({
  glyph: Glyph,
  tone = 'muted',
  lines = false,
  size = 64,
}: {
  glyph: LucideIcon
  tone?: keyof typeof TONES
  /** Draw text lines on the page (notes). */
  lines?: boolean
  size?: number
}) => (
  <span className="relative inline-flex justify-center" style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 48 60" height={size} width={size * 0.8} className="drop-shadow-sm">
      <path
        d="M5 1.5h26l14 14V56a2.5 2.5 0 0 1-2.5 2.5h-37A2.5 2.5 0 0 1 3 56V4a2.5 2.5 0 0 1 2-2.5z"
        fill="#FBFBFC"
        stroke="#C9CED6"
      />
      <path d="M31 1.5v11a3 3 0 0 0 3 3h11" fill="#E4E7EC" stroke="#C9CED6" />
      {lines && (
        <g stroke="#C9CED6" strokeWidth="2" strokeLinecap="round">
          <path d="M10 22h20M10 28h26M10 34h22M10 40h26" />
        </g>
      )}
    </svg>
    <Glyph className={`absolute bottom-[12%] left-1/2 size-[38%] -translate-x-1/2 ${TONES[tone]}`} strokeWidth={2.25} />
  </span>
)
