import { N_PATH, cx } from './NLogo';

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
      className={cx('n-spinner', className)}
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
