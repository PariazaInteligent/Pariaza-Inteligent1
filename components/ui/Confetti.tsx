
import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  trigger: number; // A number that changes to trigger the effect
}

const Confetti: React.FC<ConfettiProps> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (trigger === 0) return; // Don't run on initial render

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const launch = () => {
      canvas.style.display = 'block';
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;

      const colors = ['#22d3ee', '#34d399', '#fbbf24', '#ef4444', '#a78bfa', '#60a5fa'];
      const N = 180;
      const parts = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: -10 - Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        col: colors[Math.floor(Math.random() * colors.length)],
      }));

      let t = 0;
      const dur = 2200;
      const g = 0.05;
      const start = performance.now();

      const step = (now: number) => {
        t = now - start;
        const W2 = canvas.width = window.innerWidth;
        const H2 = canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, W2, H2);

        for (const p of parts) {
          p.vy += g;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          
          if (p.x > W2 + p.size || p.x < -p.size || p.y > H2 + p.size) {
            // reset particle
            p.x = Math.random() * W2;
            p.y = -20;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }

        if (t < dur) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          canvas.style.display = 'none';
          ctx.clearRect(0, 0, W2, H2);
        }
      };
      animationFrameId = requestAnimationFrame(step);
    };

    launch();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if(canvas) canvas.style.display = 'none';
    };
  }, [trigger]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, display: 'none' }} />;
};

export default Confetti;
