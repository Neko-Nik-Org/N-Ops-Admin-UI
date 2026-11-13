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

/** Full-screen and per-panel loaders built on NLoader. */

import { useEffect, useState, type ReactNode } from 'react';
import { NLoader, type NLoaderVariant } from './NLoader';
import { cn } from '@/utils/cn';

/** Props for ScreenLoader. */
export interface ScreenLoaderProps {
  /** Show or hide. When it turns false the loader fades out, then unmounts. Default true. */
  visible?: boolean;
  /** Status lines, shown one after another. Default ["Loading"]. */
  messages?: string[];
  /** 0 to 1 for a real progress bar. Leave undefined for an indeterminate bar. */
  progress?: number;
  /** Fill the nearest positioned parent instead of the whole window. */
  contained?: boolean;
  /** Called after the fade-out finishes. */
  onHidden?: () => void;
  /** Milliseconds each message stays on screen. Default 1800. */
  messageInterval?: number;
}

/** Fade-out duration before the loader unmounts; keep in sync with n-loading.css. */
const FADE_MS = 400;

/** Full-screen loader for app start, sign-in and page changes that take a while. */
export function ScreenLoader({
  visible = true,
  messages = ['Loading'],
  progress,
  contained = false,
  onHidden,
  messageInterval = 1800,
}: ScreenLoaderProps) {
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
      onHidden?.();
    }, FADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted || leaving || messages.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % messages.length), messageInterval);
    return () => clearInterval(t);
  }, [mounted, leaving, messages.length, messageInterval]);

  if (!mounted) return null;
  const pct = progress == null ? null : Math.min(1, Math.max(0, progress));
  const message = messages[index % messages.length] ?? 'Loading';

  return (
    <div
      className={cn('n-screen', contained && 'n-screen--contained', leaving && 'is-leaving')}
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
    >
      <div className="n-screen__inner">
        <NLoader size={88} variant="draw" framed decorative />
        <p className="n-screen__brand" aria-hidden="true">
          N<span>-</span>Ops
        </p>
        <p className="n-screen__msg" key={message}>
          {message}
        </p>
        <div
          className="n-screen__bar"
          role={pct == null ? undefined : 'progressbar'}
          aria-valuemin={pct == null ? undefined : 0}
          aria-valuemax={pct == null ? undefined : 100}
          aria-valuenow={pct == null ? undefined : Math.round(pct * 100)}
        >
          {pct == null ? <span className="is-indeterminate" /> : <span style={{ transform: `scaleX(${pct})` }} />}
        </div>
      </div>
    </div>
  );
}

/** Props for PanelLoader. */
export interface PanelLoaderProps {
  /** Short text under the mark, e.g. "Refreshing servers". */
  label?: ReactNode;
  variant?: NLoaderVariant;
  size?: number;
}

/**
 * Covers one card, table or chart while it refreshes, keeping the old content faintly visible.
 * The parent needs `position: relative`.
 */
export function PanelLoader({ label = 'Loading', variant = 'trace', size = 40 }: PanelLoaderProps) {
  return (
    <div className="n-panel-loader" role="status" aria-live="polite">
      <NLoader size={size} variant={variant} decorative />
      <span>{label}</span>
    </div>
  );
}
