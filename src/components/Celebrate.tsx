import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Listens for `applywise:submitted` / `applywise:accepted` window events and
 * fires a 1.5s confetti burst + a small celebratory toast. Includes a
 * subtle haptic buzz where the device supports it.
 *
 * Zero dependencies — particles drawn on a fullscreen <canvas>.
 */

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; vr: number;
  life: number;
};

const COLORS = ['#E8A0A8', '#C97F89', '#C9A66B', '#E8D3A7', '#FBF1EC', '#6FAE7A'];

function spawn(canvas: HTMLCanvasElement, count: number, from: 'bottom' | 'top'): Particle[] {
  const w = canvas.width, h = canvas.height;
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 2) + (Math.random() - 0.5) * 1.2;
    const speed = 8 + Math.random() * 9;
    out.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.4,
      y: from === 'bottom' ? h + 10 : -10,
      vx: Math.cos(angle) * speed * (from === 'bottom' ? -1 : 1) * (Math.random() < 0.5 ? -1 : 1),
      vy: from === 'bottom' ? -Math.abs(Math.sin(angle) * speed) - 6 : Math.abs(Math.sin(angle) * speed) + 4,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      life: 0,
    });
  }
  return out;
}

export default function Celebrate() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [toast, setToast] = useState<{ heading: string; sub: string } | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    function loop() {
      const c = canvasRef.current;
      if (!c) { rafRef.current = null; return; }
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);

      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life += 1;
        p.vy += 0.32;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.life > 220 || p.y > c.height + 40) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / 220);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.45);
        ctx.restore();
        next.push(p);
      }
      particlesRef.current = next;

      if (next.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    }

    function celebrate(detail: { name?: string }, accepted: boolean) {
      const c = canvasRef.current;
      if (!c) return;
      // Two volleys for a fuller burst
      particlesRef.current.push(...spawn(c, accepted ? 140 : 90, 'bottom'));
      setTimeout(() => {
        const cv = canvasRef.current;
        if (cv) particlesRef.current.push(...spawn(cv, accepted ? 80 : 50, 'top'));
      }, 220);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);

      try { navigator.vibrate?.(accepted ? [30, 50, 30, 50, 60] : [20, 40, 20]); } catch { /* ignore */ }

      setToast({
        heading: accepted ? '🎉 You got in!' : '✅ Submitted!',
        sub: detail.name
          ? (accepted ? `${detail.name} — what a moment.` : `${detail.name} — one more in the world.`)
          : (accepted ? 'What a moment.' : 'One more in the world.'),
      });
      setTimeout(() => setToast(null), 3200);
    }

    function onSubmit(e: Event) {
      const d = (e as CustomEvent).detail || {};
      celebrate(d, false);
    }
    function onAccept(e: Event) {
      const d = (e as CustomEvent).detail || {};
      celebrate(d, true);
    }

    window.addEventListener('applywise:submitted', onSubmit);
    window.addEventListener('applywise:accepted', onAccept);
    return () => {
      window.removeEventListener('applywise:submitted', onSubmit);
      window.removeEventListener('applywise:accepted', onAccept);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="celebrate-canvas" aria-hidden="true" />
      {toast && (
        <div className="celebrate-toast" role="status">
          <Sparkles size={16} />
          <div>
            <div className="celebrate-toast-heading">{toast.heading}</div>
            <div className="celebrate-toast-sub">{toast.sub}</div>
          </div>
        </div>
      )}
    </>
  );
}
