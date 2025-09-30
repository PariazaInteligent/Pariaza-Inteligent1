import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const EnigmaGrid: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500') || '#3b82f6';
        const gridCells = gridRef.current?.querySelectorAll('.enigma-grid-cell');
        let gridInterval: number;

        const updateGrid = () => {
            if (!gridCells) return;
            gridCells.forEach(cell => {
                const htmlCell = cell as HTMLElement;
                if (Math.random() < 0.5) {
                    htmlCell.style.backgroundColor = primaryColor;
                } else {
                    htmlCell.style.backgroundColor = 'transparent';
                }
            });
        };
        
        // --- Particle Canvas Animation ---
        let particleAnimationId: number;
        const v = canvasRef.current;
        if (!v) return;
        const x = v.getContext('2d');
        if (!x) return;

        const dpr = window.devicePixelRatio || 1;
        const b = document.createElement("canvas");
        const y = b.getContext('2d');
        let W: number, H: number;

        const resizeHandler = () => {
            W = window.innerWidth * dpr;
            H = window.innerHeight * dpr;
            v.width = W; v.height = H;
            b.width = W; b.height = H;
        };
        resizeHandler();
        window.addEventListener('resize', resizeHandler);
        
        let st = {
            tr: [] as any[],
            jn: [] as any[],
            lim: 180,
            col: theme === 'dark' ? `hsla(0, 0%, 100%, 0.1)` : `hsla(0, 0%, 0%, 0.1)`,
        };
        const r = (a = 1, b = 0) => Math.random() * (a - b) + b;
        const ch = (a: any[]) => a[Math.floor(Math.random() * a.length)];

        function mk(p?: {x: number, y: number}, a?: number) {
            let s = p || { x: r(b.width), y: r(b.height) };
            const ang = a ?? ch([0, 90, 180, 270]);
            const L1 = r(100, 60);
            const p1 = { x: s.x + Math.cos(ang * Math.PI / 180) * L1, y: s.y + Math.sin(ang * Math.PI / 180) * L1 };
            const t = ch([45, -45]);
            const p2 = { x: p1.x + Math.cos((ang + t) * Math.PI / 180) * r(160, 80), y: p1.y + Math.sin((ang + t) * Math.PI / 180) * r(160, 80) };
            const p3 = { x: p2.x + Math.cos(ang * Math.PI / 180) * r(200, 100), y: p2.y + Math.sin(ang * Math.PI / 180) * r(200, 100) };
            return { pts: [s, p1, p2, p3], h: 210, b: performance.now(), dt: r(2500, 1500), ht: r(2000, 1000), ft: 1200, bs: 0, be: 0 };
        }
        
        let len = (a: {x:number, y:number}[]) => { let l = 0; for (let i = 0; i < a.length - 1; i++) l += Math.hypot(a[i + 1].x - a[i].x, a[i + 1].y - a[i].y); return l; };
        
        function dr(t: any, n: number) {
            if (!y) return;
            let A = n - t.b, PL = len(t.pts), al = 1, p = 0;
            if (A < t.dt) { p = A / t.dt; al = p; } 
            else if (A < t.dt + t.ht) { p = 1; } 
            else if (A < t.dt + t.ht + t.ft) { p = 1; al = 1 - (A - t.dt - t.ht) / t.ft; } 
            else { t.d = 1; return; }
            al *= 0.7; let DL = PL * p;
            y.strokeStyle = st.col;
            y.lineWidth = 2 * dpr;
            y.shadowBlur = 8;
            y.shadowColor = st.col;
            y.beginPath();
            y.moveTo(t.pts[0].x, t.pts[0].y);
            let rem = DL;
            for (let i = 0; i < t.pts.length - 1; i++) {
                let A = t.pts[i], B = t.pts[i + 1], SL = Math.hypot(B.x - A.x, B.y - A.y);
                if (rem >= SL) { y.lineTo(B.x, B.y); rem -= SL; } 
                else { let tp = rem / SL; y.lineTo(A.x + (B.x - A.x) * tp, A.y + (B.y - A.y) * tp); break; }
            }
            y.stroke();
        }

        function cam(n: number) {
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.clearRect(0, 0, W, H);
            let px = Math.sin(n * 0.0002) * 200, py = Math.cos(n * 0.00015) * 150;
            const rot = Math.sin(n * 0.00007) * 0.05, z = 1.15 + 0.05 * Math.sin(n * 0.0001);
            x.translate(W / 2, H / 2);
            x.rotate(rot);
            x.scale(z, z);
            x.translate(-b.width / 2 + px, -b.height / 2 + py);
        }

        function loop(n: number) {
            if(y) {
                y.setTransform(1, 0, 0, 1, 0, 0);
                y.clearRect(0, 0, b.width, b.height);
            }

            if (Math.random() < 0.02 && st.tr.length < st.lim) st.tr.push(mk());
            
            for (let i = st.tr.length - 1; i >= 0; i--) {
                dr(st.tr[i], n);
                if (st.tr[i].d) st.tr.splice(i, 1);
            }
            cam(n);
            x.drawImage(b, 0, 0);
            particleAnimationId = requestAnimationFrame(loop);
        }

        // --- Start Animations ---
        updateGrid();
        gridInterval = window.setInterval(updateGrid, 5000);
        particleAnimationId = requestAnimationFrame(loop);

        // --- Cleanup ---
        return () => {
            clearInterval(gridInterval);
            cancelAnimationFrame(particleAnimationId);
            window.removeEventListener('resize', resizeHandler);
        };
    }, [theme]); // Rerun effect if theme changes to update particle color

    return (
        <div className="enigma-grid-background">
            <canvas ref={canvasRef} className="enigma-particle-canvas" />
            <div ref={gridRef} className="enigma-grid-holder">
                {Array.from({ length: 529 }).map((_, index) => (
                    <div key={index} className="enigma-grid-cell"></div>
                ))}
            </div>
        </div>
    );
};

export default EnigmaGrid;
