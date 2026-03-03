import { useEffect, useState } from 'react';
import ShadowLogo from './ShadowLogo';

const SplashScreen = ({ onComplete, isReady }) => {
    const [fadeOut, setFadeOut] = useState(false);
    const [progress, setProgress] = useState(0);
    const [minTimePassed, setMinTimePassed] = useState(false);

    useEffect(() => {
        // Barra de progreso animada simula avance fluido
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 95) return 95; // Se queda al final esperando la señal real
                return p + 1;
            });
        }, 30);

        // Tiempo mínimo estético (3s)
        const minTimer = setTimeout(() => setMinTimePassed(true), 3000);

        return () => {
            clearInterval(interval);
            clearTimeout(minTimer);
        };
    }, []);

    useEffect(() => {
        // Solo completar si han pasado los 3s mínimos Y los datos están listos
        if (minTimePassed && isReady) {
            setProgress(100);
            const fadeTimeout = setTimeout(() => setFadeOut(true), 500);
            const completeTimeout = setTimeout(() => onComplete(), 1000);
            return () => {
                clearTimeout(fadeTimeout);
                clearTimeout(completeTimeout);
            };
        }
    }, [minTimePassed, isReady, onComplete]);

    return (
        <div className={`splash-container ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-content">
                {/* Logo SVG animado */}
                <div className="splash-logo-wrapper">
                    <div className="splash-glow-ring" />
                    <ShadowLogo size={52} className="splash-svg-logo" />
                </div>

                <p className="splash-tagline">Tu entretenimiento sin límites</p>

                {/* Barra de carga */}
                <div className="splash-loader">
                    <div className="loader-bar" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <style>{`
                .splash-container {
                    position: fixed;
                    inset: 0;
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    transition: opacity 0.5s ease;
                }

                .splash-container.fade-out {
                    opacity: 0;
                    pointer-events: none;
                }

                .splash-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                }

                .splash-logo-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    animation: splashLogoIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                }

                .splash-glow-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
                    animation: glowPulse 2s ease-in-out infinite;
                }

                .splash-svg-logo {
                    position: relative;
                    z-index: 1;
                }

                @keyframes splashLogoIn {
                    from { opacity: 0; transform: scale(0.7); }
                    to { opacity: 1; transform: scale(1); }
                }

                @keyframes glowPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.15); }
                }

                .splash-tagline {
                    color: rgba(255,255,255,0.45);
                    font-size: 0.85rem;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    font-family: 'Inter', sans-serif;
                    animation: fadeInUp 0.8s 0.4s both;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .splash-loader {
                    width: 200px;
                    height: 2px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 2px;
                    overflow: hidden;
                    animation: fadeInUp 0.8s 0.6s both;
                }

                .loader-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    border-radius: 2px;
                    transition: width 0.1s linear;
                    box-shadow: 0 0 8px rgba(59,130,246,0.8);
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
