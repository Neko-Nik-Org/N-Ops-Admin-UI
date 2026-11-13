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

/** Skeleton placeholders that match the shapes of real content while it loads. */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { NLoader } from './NLoader';
import { cn } from '@/utils/cn';

/** A size in px (number) or any CSS length (string). */
type Len = number | string;

/** Props for Skeleton: size and corner radius of the placeholder block. */
export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: Len;
  height?: Len;
  radius?: Len;
  /** Make a circle; uses `width` for both sides. */
  circle?: boolean;
}

/** One shimmering placeholder block. All skeletons on the page shimmer in sync. */
export function Skeleton({ width = '100%', height = 12, radius = 6, circle, className, style, ...rest }: SkeletonProps) {
  const s: CSSProperties = circle
    ? { width, height: width, borderRadius: '50%', ...style }
    : { width, height, borderRadius: radius, ...style };
  return <span aria-hidden="true" className={cn('n-sk', className)} style={s} {...rest} />;
}

/** Lines of placeholder text; the last line is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, lastWidth = '60%', lineHeight = 12, gap = 8 }: { lines?: number; lastWidth?: Len; lineHeight?: number; gap?: number }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? lastWidth : '100%'} />
      ))}
    </span>
  );
}

/**
 * Wrap any skeleton layout in this. It tells screen readers that the area is loading,
 * once, instead of reading every placeholder.
 */
export function SkeletonGroup({ label = 'Loading', children, className, style }: { label?: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} style={style}>
      <span className="n-sr-only">{label}</span>
      {children}
    </div>
  );
}

/* ───────── Ready-made skeletons that match the dashboard ───────── */

/** Matches a summary tile: label, big number, one line of detail. */
export function StatTileSkeleton() {
  return (
    <div className="n-sk-card">
      <div className="n-sk-row">
        <Skeleton width={16} height={16} radius={4} />
        <Skeleton width="45%" height={12} />
      </div>
      <Skeleton width="38%" height={32} radius={8} />
      <Skeleton width="70%" height={11} />
    </div>
  );
}

/** Matches a data table, such as the fleet list. */
export function TableSkeleton({ rows = 6, columns = 5, title = true }: { rows?: number; columns?: number; title?: boolean }) {
  const template = `1.4fr ${'1fr '.repeat(Math.max(0, columns - 1))}`.trim();
  return (
    <div className="n-sk-card">
      {title && (
        <div className="n-sk-row" style={{ justifyContent: 'space-between' }}>
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={12} />
        </div>
      )}
      <div className="n-sk-table">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="n-sk-table__row" style={{ gridTemplateColumns: template }}>
            {Array.from({ length: columns }, (_, c) =>
              c === 0 ? (
                <span key={c} className="n-sk-stack" style={{ gap: 6 }}>
                  <Skeleton width={`${60 + ((r * 17) % 30)}%`} height={12} />
                  <Skeleton width="45%" height={10} />
                </span>
              ) : (
                <Skeleton key={c} width={`${55 + ((r * 13 + c * 11) % 40)}%`} height={10} />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Matches a feed or list: avatar or dot, two lines, a time on the right. */
export function ListSkeleton({ rows = 5, avatar = true, title = true }: { rows?: number; avatar?: boolean; title?: boolean }) {
  return (
    <div className="n-sk-card">
      {title && <Skeleton width={140} height={16} />}
      <div className="n-sk-stack n-sk-divided" style={{ gap: 12 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="n-sk-row">
            {avatar ? <Skeleton circle width={28} /> : <Skeleton circle width={8} />}
            <span className="n-sk-stack" style={{ gap: 6 }}>
              <Skeleton width={`${55 + ((i * 19) % 35)}%`} height={12} />
              <Skeleton width={`${35 + ((i * 23) % 25)}%`} height={10} />
            </span>
            <Skeleton width={36} height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Matches a chart panel. A faint N runs in the middle so it reads as "loading", not "empty". */
export function ChartSkeleton({ height = 160, title = true }: { height?: number; title?: boolean }) {
  const bars = [38, 52, 44, 60, 72, 58, 66, 80, 62, 70, 54, 64];
  return (
    <div className="n-sk-card">
      {title && (
        <span className="n-sk-stack" style={{ gap: 6 }}>
          <Skeleton width={120} height={16} />
          <Skeleton width={180} height={10} />
        </span>
      )}
      <div className="n-sk-chart" style={{ height }}>
        <div className="n-sk-chart__bars" style={{ opacity: 0.55 }}>
          {bars.map((h, i) => (
            <Skeleton key={i} height={`${h}%`} width="auto" radius={0} />
          ))}
        </div>
        <NLoader size={44} variant="trace" decorative />
      </div>
    </div>
  );
}

/** The whole Overview page while its first data loads: 4 tiles, fleet + approvals, then chart, runs and audit. */
export function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading overview" className="n-sk-dash">
      <div className="n-sk-grid-4">
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </div>
      <div className="n-sk-grid-3">
        <div className="n-sk-span-2" style={{ minWidth: 0 }}>
          <TableSkeleton rows={6} columns={5} />
        </div>
        <ListSkeleton rows={3} avatar={false} />
      </div>
      <div className="n-sk-grid-3">
        <ChartSkeleton />
        <ListSkeleton rows={5} avatar={false} />
        <ListSkeleton rows={5} />
      </div>
    </SkeletonGroup>
  );
}
