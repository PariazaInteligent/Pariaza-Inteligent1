import React, { useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { XMarkIcon } from '../components/ui/Icons';

interface OutletContext {
  setSidebarForceHidden: (isHidden: boolean) => void;
}

const DesertOasisPage: React.FC = () => {
    const { setSidebarForceHidden } = useOutletContext<OutletContext>();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSidebarForceHidden(true);
        const container = containerRef.current;
        if (!container) return;

        const intervals: number[] = [];
        
        const createParticle = (className: string, duration: number) => {
            const particle = document.createElement('div');
			particle.classList.add(className);
			particle.style.left = `${Math.random() * window.innerWidth}px`;
			particle.style.top = `${window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.5}px`;
            if(className === 'sand-particle') {
                particle.style.animationDelay = `${Math.random() * 8}s`;
            }
			container.appendChild(particle);
			setTimeout(() => particle.remove(), duration);
        }

        intervals.push(window.setInterval(() => createParticle('sparkle', 2500), 2000));
        intervals.push(window.setInterval(() => createParticle('sand-particle', 8000), 100));
        intervals.push(window.setInterval(() => createParticle('mote', 6000), 500));

        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth - 0.5);
			const y = (e.clientY / window.innerHeight - 0.5);
            container.style.setProperty('--mouse-x', x.toString());
            container.style.setProperty('--mouse-y', y.toString());
        };
        
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            setSidebarForceHidden(false);
            intervals.forEach(clearInterval);
            document.removeEventListener('mousemove', handleMouseMove);
            container.querySelectorAll('.sparkle, .sand-particle, .mote').forEach(el => el.remove());
        };
    }, [setSidebarForceHidden]);


    return (
        <div ref={containerRef} id="desert-oasis-page-container">
            <Link to="/" className="absolute top-4 right-4 z-20 p-2 bg-black/20 rounded-full text-white hover:bg-black/40 transition-colors" aria-label="Înapoi la pagina principală">
                <XMarkIcon className="h-6 w-6" />
            </Link>
            <div className="scene">
                <div className="sun"></div>
                <div className="sand back"></div>
                <div className="pyramid left"></div>
                <div className="pyramid right"></div>
                <div className="sand"></div>
                <div className="foreground"></div>
                <div className="haze"></div>
                <div className="heat-wave"></div>

                <div className="cloud-wrapper" style={{ top: '10%', animationDuration: '45s' }}>
                    <div className="cloud"></div>
                </div>
                <div className="cloud-wrapper" style={{ top: '15%', animationDuration: '60s', animationDelay: '-10s' }}>
                    <div className="cloud"></div>
                </div>
                <div className="cloud-wrapper" style={{ top: '20%', animationDuration: '35s', animationDelay: '-5s' }}>
                    <div className="cloud"></div>
                </div>
                <div className="cloud-wrapper" style={{ top: '8%', animationDuration: '50s', animationDelay: '-20s' }}>
                    <div className="cloud"></div>
                </div>

                <div className="arboles" style={{ left: '20%', bottom: '20%' }}>
                    <div className="hojas">
                        <div className="hojas1"></div>
                        <div className="hojas2"></div>
                        <div className="hojas3"></div>
                        <div className="hojas4"></div>
                        <div className="hojas5"></div>
                        <div className="hojas6"></div>
                    </div>
                </div>

                <div className="arboles" style={{ left: '70%', bottom: '22%' }}>
                    <div className="hojas">
                        <div className="hojas1"></div>
                        <div className="hojas2"></div>
                        <div className="hojas3"></div>
                        <div className="hojas4"></div>
                        <div className="hojas5"></div>
                        <div className="hojas6"></div>
                    </div>
                </div>

                <div className="caravan">
                    <div className="camel" style={{ left: 0, opacity: 1, visibility: 'visible' }}>
                        <div className="camel-body"></div>
                        <div className="camel-hump"></div>
                        <div className="camel-neck"></div>
                        <div className="camel-head">
                            <div className="camel-ear"></div>
                            <div className="camel-ear right"></div>
                            <div className="camel-jaw"></div>
                            <div className="camel-eye"></div>
                        </div>
                        <div className="camel-tail"></div>
                        <div className="camel-leg front-left"></div>
                        <div className="camel-leg front-right"></div>
                        <div className="camel-leg back-left"></div>
                        <div className="camel-leg back-right"></div>
                    </div>

                    <div className="camel small" style={{ left: '80px', opacity: 1, visibility: 'visible' }}>
                        <div className="camel-body"></div>
                        <div className="camel-hump"></div>
                        <div className="camel-neck"></div>
                        <div className="camel-head">
                            <div className="camel-ear"></div>
                            <div className="camel-ear right"></div>
                            <div className="camel-jaw"></div>
                            <div className="camel-eye"></div>
                        </div>
                        <div className="camel-tail"></div>
                        <div className="camel-leg front-left"></div>
                        <div className="camel-leg front-right"></div>
                        <div className="camel-leg back-left"></div>
                        <div className="camel-leg back-right"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesertOasisPage;
