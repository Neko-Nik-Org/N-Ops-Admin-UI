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

/**
 * Loading kit: N-Ops branded loaders, spinners, skeletons, LoadingButton and
 * loading-state hooks. Import everything from '@/components/loading'.
 * Colors come from the CSS variables in n-loading.css, so it follows the app theme.
 */

export { NLogo, NGradient, N_PATH, N_NODES, useSvgId } from './NLogo';
export type { NLogoProps } from './NLogo';
export { NLoader } from './NLoader';
export type { NLoaderProps, NLoaderVariant } from './NLoader';
export { NSpinner } from './NSpinner';
export type { NSpinnerProps } from './NSpinner';
export { LoadingButton } from './LoadingButton';
export type { LoadingButtonProps, ButtonState } from './LoadingButton';
export { ScreenLoader, PanelLoader } from './ScreenLoader';
export type { ScreenLoaderProps, PanelLoaderProps } from './ScreenLoader';
export {
  Skeleton,
  SkeletonText,
  SkeletonGroup,
  StatTileSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { TopProgress } from './TopProgress';
export { useDelayedLoading, useAsyncAction } from './hooks';
