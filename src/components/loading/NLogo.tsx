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

/** The N-Ops logo mark and the shared SVG geometry used by every loader. */

import { useId, type CSSProperties, type SVGProps } from 'react';

/** The N mark drawn on a 160 × 160 grid: bottom-left → top-left → bottom-right → top-right. */
export const N_PATH = 'M50 110 L50 50 L110 110 L110 50';

/** The four points of the N, in stroke order. */
export const N_NODES = [
  { x: 50, y: 110 },
  { x: 50, y: 50 },
  { x: 110, y: 110 },
  { x: 110, y: 50 },
] as const;

/** viewBox that crops tightly around the N (no rounded-square frame). */
export const N_VIEWBOX_TIGHT = '34 34 92 92';
/** viewBox for the full app icon, frame included. */
export const N_VIEWBOX_FRAMED = '0 0 160 160';

/** A unique, url()-safe id for SVG gradients (React's useId contains colons). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/** Signal brand gradient, reading the colors from the CSS variables. */
export function NGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop offset="0" style={{ stopColor: 'var(--n-mint, #4CF2C0)' }} />
        <stop offset="1" style={{ stopColor: 'var(--n-violet, #8A7CFF)' }} />
      </linearGradient>
    </defs>
  );
}

/** Props for NLogo; other SVG attributes are passed through. */
export interface NLogoProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'width' | 'height'> {
  /** Pixel size or any CSS length. Default 32. */
  size?: number | string;
  /** Draw the rounded-square app-icon frame. Default true. */
  framed?: boolean;
  /** Accessible name. Leave empty when the logo sits next to the word “N-Ops”. */
  title?: string;
}

/** The static N-Ops mark. Use it in the sidebar, favicon slots and empty states. */
export function NLogo({ size = 32, framed = true, title, style, ...rest }: NLogoProps) {
  const gid = useSvgId('n-logo');
  const stroke = `url(#${gid})`;
  const nodeFill: CSSProperties = { fill: 'var(--n-ink-2, #0B1118)' };
  return (
    <svg
      viewBox={framed ? N_VIEWBOX_FRAMED : N_VIEWBOX_TIGHT}
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }}
      {...rest}
    >
      <NGradient id={gid} />
      {framed && <rect x="4" y="4" width="152" height="152" rx="40" style={nodeFill} stroke={stroke} strokeWidth="4" />}
      <path d={N_PATH} fill="none" stroke={stroke} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke={stroke} strokeWidth="6" style={nodeFill}>
        {N_NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="11" />
        ))}
      </g>
    </svg>
  );
}
