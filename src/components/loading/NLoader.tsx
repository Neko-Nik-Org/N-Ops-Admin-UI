import type { CSSProperties } from 'react';
import { N_NODES, N_PATH, N_VIEWBOX_FRAMED, N_VIEWBOX_TIGHT, NGradient, cx, useSvgId } from './NLogo';

export type NLoaderVariant = 'draw' | 'trace' | 'pulse';

export interface NLoaderProps {
  /** Pixel size of the square. Default 64. */
  size?: number;
  /**
   * - `draw`: the N writes itself stroke by stroke, then un-writes. Best for screens and long waits.
   * - `trace`: a pulse of light runs along the N on a loop. Best for panels, charts and live data.
   * - `pulse`: the mark gently breathes. Quietest; good for small sizes.
   */
  variant?: NLoaderVariant;
  /** Draw the rounded-square app-icon frame behind the N. Default false. */
  framed?: boolean;
  /** Seconds per loop. Defaults: draw 1.8, trace 1.4, pulse 1.6. */
  speed?: number;
  /** Text for screen readers. Default "Loading". */
  label?: string;
  /** Set when a parent already announces loading (e.g. ScreenLoader), so it isn't read twice. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_SPEED: Record<NLoaderVariant, number> = { draw: 1.8, trace: 1.4, pulse: 1.6 };

/** The animated N-Ops mark. */
export function NLoader({
  size = 64,
  variant = 'draw',
  framed = false,
  speed,
  label = 'Loading',
  decorative = false,
  className,
  style,
}: NLoaderProps) {
  const gid = useSvgId('n-loader');
  const stroke = `url(#${gid})`;
  const vars = { '--n-dur': `${speed ?? DEFAULT_SPEED[variant]}s`, width: size, height: size, ...style } as CSSProperties;

  return (
    <span
      className={cx('n-loader', `n-loader--${variant}`, className)}
      style={vars}
      role={decorative ? undefined : 'status'}
      aria-live={decorative ? undefined : 'polite'}
      aria-hidden={decorative || undefined}
    >
      <svg viewBox={framed ? N_VIEWBOX_FRAMED : N_VIEWBOX_TIGHT} width="100%" height="100%" aria-hidden="true" focusable="false">
        <NGradient id={gid} />
        {framed && <rect className="n-loader__frame" x="4" y="4" width="152" height="152" rx="40" stroke={stroke} />}
        <path className="n-loader__track" d={N_PATH} pathLength={100} />
        <path className="n-loader__line" d={N_PATH} pathLength={100} stroke={stroke} />
        <g>
          {N_NODES.map((n, i) => (
            <circle key={i} className="n-loader__node" cx={n.x} cy={n.y} r="11" stroke={stroke} />
          ))}
        </g>
      </svg>
      {!decorative && <span className="n-sr-only">{label}</span>}
    </span>
  );
}
