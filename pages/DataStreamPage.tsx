import React, { useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { XMarkIcon } from '../components/ui/Icons';

interface OutletContext {
  setSidebarForceHidden: (isHidden: boolean) => void;
}

const DataStreamPage: React.FC = () => {
    const { setSidebarForceHidden } = useOutletContext<OutletContext>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mousePos = useRef<{ x: number, y: number }>({ x: -100, y: -100 });

    useEffect(() => {
        setSidebarForceHidden(true);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789$€£¥';
        const fontSize = 16;
        const columns = Math.floor(width / fontSize);
        const drops: number[] = [];

        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }

        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };
        document.addEventListener('mousemove', handleMouseMove);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // This is a simple resize; for a perfect result, columns and drops array should be recalculated.
            // For this easter egg, a simple canvas resize is sufficient.
        };
        window.addEventListener('resize', handleResize);

        let animationFrameId: number;
        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = '#0f0'; // Green text
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                const xPos = i * fontSize;
                const yPos = drops[i] * fontSize;
                
                // Mouse interaction effect
                const dx = xPos - mousePos.current.x;
                const dy = yPos - mousePos.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 50) {
                    ctx.fillStyle = '#fff'; // White text near mouse
                    ctx.font = `${fontSize + 4}px monospace`;
                } else {
                     ctx.fillStyle = '#0f0'; // Green text
                     ctx.font = `${fontSize}px monospace`;
                }

                ctx.fillText(text, xPos, yPos);
                
                if (yPos > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            setSidebarForceHidden(false);
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, [setSidebarForceHidden]);

    return (
        <div id="data-stream-page-container">
            <canvas ref={canvasRef} id="data-stream-canvas"></canvas>
            <Link to="/" className="absolute top-4 right-4 z-20 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 backdrop-blur-sm transition-colors" aria-label="Înapoi la pagina principală">
                <XMarkIcon className="h-6 w-6" />
            </Link>
        </div>
    );
};

export default DataStreamPage;
