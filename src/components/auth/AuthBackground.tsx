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
/** Animated network canvas behind the sign-in screens. */

import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

export interface AuthBackgroundProps {
  /** 1 = default amount of points. 0.6 for calmer, 1.4 for busier. */
  density?: number;
  /** Points reach toward the mouse. Default true. */
  interactive?: boolean;
  /** Colors for a dark or a light page. Default 'dark'. */
  tone?: 'dark' | 'light';
  className?: string;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** 0 = mint, 1 = violet */
  t: number;
  /** 0..1, flashes when a pulse arrives */
  glow: number;
}

interface Pulse {
  a: number;
  b: number;
  start: number;
  dur: number;
  hops: number;
}

/** Point colors and the pulse head per tone: bright on the dark page, deeper on the light one. */
const PALETTES = {
  dark: { mint: [76, 242, 192], violet: [138, 124, 255], head: 'rgba(232,255,247,0.95)', lines: 1 },
  light: { mint: [14, 155, 120], violet: [91, 75, 207], head: 'rgba(255,255,255,0.98)', lines: 1.35 },
} as const;

/**
 * The animated network behind the sign-in screens.
 * Points drift and link up when they come close; pulses of light hop along the links like
 * requests moving through the control plane. It sizes itself to its parent, pauses when hidden,
 * and draws one still frame when the person prefers reduced motion.
 */
export function AuthBackground({ density = 1, interactive = true, tone = 'dark', className }: AuthBackgroundProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const host = canvas.parentElement ?? canvas;
    const pal = PALETTES[tone];
    /** Mix between the two brand colors (t: 0 = mint, 1 = violet) at alpha `a`. */
    const color = (t: number, a: number) => {
      const c = pal.mint.map((m, i) => Math.round(m + ((pal.violet[i] ?? m) - m) * t));
      return `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a).toFixed(3)})`;
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    let W = 1;
    let H = 1;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    let last = 0;
    let nextPulse = 0;
    let onScreen = true;
    const pointer = { x: -1e4, y: -1e4, active: false };

    const linkDist = () => Math.min(160, Math.max(105, Math.sqrt(W * H) / 8.5));

    const seed = () => {
      const count = Math.round(Math.min(150, Math.max(28, ((W * H) / 12500) * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: 1.1 + Math.random() * 1.5,
        t: Math.random(),
        glow: 0,
      }));
      pulses = [];
    };

    const neighbours = (i: number, D: number, not = -1) => {
      const a = nodes[i];
      const out: number[] = [];
      if (!a) return out;
      nodes.forEach((b, j) => {
        if (j !== i && j !== not && Math.hypot(a.x - b.x, a.y - b.y) < D) out.push(j);
      });
      return out;
    };

    const spawn = (now: number) => {
      const D = linkDist();
      for (let tries = 0; tries < 8; tries++) {
        const i = Math.floor(Math.random() * nodes.length);
        const nb = neighbours(i, D);
        if (nb.length) {
          const b = nb[Math.floor(Math.random() * nb.length)] ?? i;
          const node = nodes[i];
          if (node) node.glow = 1;
          pulses.push({ a: i, b, start: now, dur: 650 + Math.random() * 450, hops: 2 + Math.floor(Math.random() * 3) });
          return;
        }
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      const D = linkDist();
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (Math.abs(dx) > D || Math.abs(dy) > D) continue;
          const d = Math.hypot(dx, dy);
          if (d >= D) continue;
          const k = 1 - d / D;
          ctx.strokeStyle = color((a.t + b.t) / 2, (k * k * 0.42 + Math.max(a.glow, b.glow) * k * 0.35) * pal.lines);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (pointer.active) {
        const R = 190;
        for (const n of nodes) {
          const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
          if (d < R) {
            ctx.strokeStyle = color(n.t, (1 - d / R) * 0.55);
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        }
      }

      // pulses: a bright head with a short tail
      const alive: Pulse[] = [];
      for (const p of pulses) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const q = (now - p.start) / p.dur;
        if (q >= 1) {
          b.glow = 1;
          if (p.hops > 0) {
            const nb = neighbours(p.b, D, p.a);
            const next = nb[Math.floor(Math.random() * nb.length)];
            if (next !== undefined) alive.push({ a: p.b, b: next, start: now, dur: p.dur, hops: p.hops - 1 });
          }
          continue;
        }
        alive.push(p);
        const e = q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2;
        const tail = Math.max(0, e - 0.28);
        const hx = a.x + (b.x - a.x) * e;
        const hy = a.y + (b.y - a.y) * e;
        const tx = a.x + (b.x - a.x) * tail;
        const ty = a.y + (b.y - a.y) * tail;
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, color(a.t, 0));
        g.addColorStop(1, color(b.t, 0.95));
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = pal.head;
        ctx.shadowColor = color(b.t, 0.9);
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      pulses = alive;

      for (const n of nodes) {
        if (n.glow > 0.02) {
          ctx.fillStyle = color(n.t, 0.16 * n.glow);
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = color(n.t, 0.5 + 0.5 * n.glow);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + n.glow * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = (now: number) => {
      raf = 0;
      const dt = Math.min(50, now - (last || now));
      last = now;
      const f = dt / 16.7;
      const m = 40;
      for (const n of nodes) {
        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 220 && d > 1) {
            const pull = (1 - d / 220) * 0.012 * f;
            n.vx += (dx / d) * pull;
            n.vy += (dy / d) * pull;
          }
        }
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 0.6) {
          n.vx *= 0.96;
          n.vy *= 0.96;
        }
        n.x += n.vx * f;
        n.y += n.vy * f;
        if (n.x < -m) n.x = W + m;
        else if (n.x > W + m) n.x = -m;
        if (n.y < -m) n.y = H + m;
        else if (n.y > H + m) n.y = -m;
        n.glow = Math.max(0, n.glow - 0.018 * f);
      }
      if (now > nextPulse) {
        spawn(now);
        nextPulse = now + 450 + Math.random() * 700;
      }
      draw(now);
      start();
    };

    const start = () => {
      if (!raf && onScreen && !document.hidden && !reduce.matches) raf = requestAnimationFrame(step);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      draw(performance.now());
    };

    const onMove = (e: PointerEvent) => {
      if (!interactive || e.pointerType === 'touch') return;
      const r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionPref = () => {
      if (reduce.matches) {
        stop();
        pulses = [];
        draw(performance.now());
      } else start();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? true;
      if (onScreen) start();
      else stop();
    });
    io.observe(canvas);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotionPref);
    resize();
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotionPref);
    };
  }, [density, interactive, tone]);

  return <canvas ref={ref} className={cn('n-auth__bg', className)} aria-hidden="true" />;
}
