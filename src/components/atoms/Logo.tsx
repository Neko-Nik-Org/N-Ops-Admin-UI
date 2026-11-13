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

/** N-Ops brand mark. */

import { NLogo } from '@/components/loading'
import { cn } from '@/utils/cn'

/** The N icon followed by the "N-Ops" wordmark. `iconSize` sets the icon size in px. */
export const Logo = ({ className, iconSize = 32 }: { className?: string; iconSize?: number }) => (
  <span className={cn('inline-flex items-center gap-2.5 text-lg font-semibold text-text', className)}>
    <NLogo size={iconSize} />
    N-Ops
  </span>
)
