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

/** Small inline spinner shaped like the N mark. */

import { N_PATH } from './NLogo';
import { cn } from '@/utils/cn';

/** Props for NSpinner. */
export interface NSpinnerProps {
  /** CSS size. Default 1em, so it matches the text around it. */
  size?: number | string;
  /** Give a label only when the spinner stands alone; inside a LoadingButton the button speaks for it. */
  label?: string;
  className?: string;
}

/** A tiny N with a light running along it. Takes the current text color. */
export function NSpinner({ size = '1em', label, className }: NSpinnerProps) {
  return (
    <span
      className={cn('n-spinner', className)}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="38 38 84 84" width="100%" height="100%" aria-hidden="true" focusable="false">
        <path className="n-spinner__track" d={N_PATH} pathLength={100} />
        <path className="n-spinner__head" d={N_PATH} pathLength={100} />
      </svg>
    </span>
  );
}
