import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonState } from './LoadingButton';

/**
 * Avoids loader flicker.
 * - Shows nothing for fast loads (under `delay` ms).
 * - Once shown, keeps the loader up for at least `minDuration` ms so it never flashes.
 */
export function useDelayedLoading(loading: boolean, { delay = 200, minDuration = 500 } = {}): boolean {
  const [show, setShow] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (loading && !show) {
      t = setTimeout(() => {
        shownAt.current = Date.now();
        setShow(true);
      }, delay);
    } else if (!loading && show) {
      const left = Math.max(0, minDuration - (Date.now() - shownAt.current));
      t = setTimeout(() => setShow(false), left);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [loading, show, delay, minDuration]);

  return show;
}

/**
 * Drives a LoadingButton from an async function: idle → loading → success (for `successMs`) → idle.
 * Errors put the button back to idle and are re-thrown so you can show them.
 *
 *   const [state, approve] = useAsyncAction(() => api.approve(id));
 *   <LoadingButton state={state} onClick={() => approve()} loadingText="Approving" successText="Approved">Approve</LoadingButton>
 */
export function useAsyncAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, { successMs = 1200 } = {}) {
  const [state, setState] = useState<ButtonState>('idle');
  const alive = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: A): Promise<R> => {
      setState('loading');
      try {
        const result = await fnRef.current(...args);
        if (alive.current) {
          setState('success');
          setTimeout(() => {
            if (alive.current) setState('idle');
          }, successMs);
        }
        return result;
      } catch (err) {
        if (alive.current) setState('idle');
        throw err;
      }
    },
    [successMs],
  );

  return [state, run] as const;
}
