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

/** Top-of-window progress bar for page and route loads. */

import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

/** Thin accent bar along the top of the window while a page or route loads. */
export function TopProgress({ active, label = 'Loading page' }: { active: boolean; label?: string }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>(active ? 'running' : 'idle');

  useEffect(() => {
    if (active) {
      setPhase('running');
      return;
    }
    setPhase((p) => (p === 'running' ? 'done' : p));
    const t = setTimeout(() => setPhase((p) => (p === 'done' ? 'idle' : p)), 600);
    return () => clearTimeout(t);
  }, [active]);

  if (phase === 'idle') return null;
  return (
    <div className={cn('n-top', phase === 'done' && 'is-done')} role="progressbar" aria-label={label} aria-busy={phase === 'running'}>
      <span />
    </div>
  );
}
