import React, { forwardRef } from 'react';

const PlayerInterface = forwardRef(({
    showUI,
    showChannels,
    isFullscreen,
    loading,
    downloadSpeed,
    currentStream,
    error,
    isPlaying,
    isMuted,
    handleMouseMove,
    playPrevious,
    handleTogglePlay,
    playNext,
    handleToggleMute,
    handleFullscreen,
    playStream,
    setError,
    containerRef,
    children,
    videoObjectFit,
    fitLabel,
    onToggleFit,
    setShowChannels,
    currentTime,
    duration,
    onSeek,
    selectedType
}, videoRef) => {
    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = Math.floor(time % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="player-interface-inner"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onDoubleClick={handleFullscreen}
            data-fit={videoObjectFit}
        >
            {/* Canal Title Overlay - Ocultar si el catálogo está abierto */}
            {currentStream && showUI && !showChannels && (
                <div className="top-channel-title">
                    {currentStream.name}
                </div>
            )}
            {/* Loader */}
            {loading && (
                <div className="loader-xuper">
                    <div className="spinner-dots">
                        {[...Array(8)].map((_, i) => <div key={i} className="dot"></div>)}
                    </div>
                    <div className="speed-text">
                        {downloadSpeed > 1024 ? `${(downloadSpeed / 1024).toFixed(1)} MB/S` : `${downloadSpeed} KB/S`}
                    </div>
                </div>
            )}

            {error && (
                <div className="error-overlay">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <p className="error-main">{typeof error === 'string' ? error : error.message}</p>
                        <div className="error-actions">
                            <button className="retry-btn" onClick={() => { if (currentStream) playStream(currentStream); setError(null); }}>Reintentar</button>
                            <button className="close-error" onClick={() => setError(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {children}

            {/* Controles SOLO en pantalla completa, aparecen al mover el mouse */}
            {isFullscreen && (
                <div className={`player-controls-bottom ${showUI ? 'controls-visible' : ''}`}>
                    {/* Barra de progreso para VOD/Series */}
                    {(selectedType === 'vod' || selectedType === 'series') && duration > 0 && (
                        <div className="vod-progress-container">
                            <span className="time-label">{formatTime(currentTime)}</span>
                            <div className="progress-slider-wrapper">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration}
                                    value={currentTime}
                                    step="1"
                                    className="vod-progress-bar"
                                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                                />
                                <div
                                    className="progress-fill"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                ></div>
                            </div>
                            <span className="time-label">{formatTime(duration)}</span>
                        </div>
                    )}

                    <div className="controls-row">
                        <div className="nav-btn small-btn" onClick={playPrevious} title="Canal Anterior">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <polygon points="19 20 9 12 19 4 19 20" /><rect x="5" y="4" width="2" height="16" />
                            </svg>
                        </div>
                        <div className="nav-btn small-btn" onClick={handleTogglePlay} title={isPlaying ? 'Pausar' : 'Reproducir'}>
                            {isPlaying
                                ? <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                : <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            }
                        </div>
                        <div className="nav-btn small-btn" onClick={playNext} title="Siguiente Canal">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <polygon points="5 4 15 12 5 20 5 4" /><rect x="17" y="4" width="2" height="16" />
                            </svg>
                        </div>
                        {selectedType === 'live' && (
                            <div className="nav-btn small-btn" onClick={() => {
                                setShowChannels(true);
                                setTimeout(() => {
                                    const searchInput = document.getElementById('tvhub-search-input');
                                    if (searchInput) searchInput.focus();
                                }, 100);
                            }} title="Buscar Canales">
                                <span style={{ fontSize: '15px' }}>🔍</span>
                            </div>
                        )}
                        <div className="nav-btn small-btn" onClick={() => setShowChannels(prev => !prev)} title="Ver Canales">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </div>
                        <div className="nav-btn small-btn" onClick={handleToggleMute} title={isMuted ? 'Activar sonido' : 'Silenciar'}>
                            {isMuted
                                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                            }
                        </div>
                        <div className="nav-btn small-btn fit-btn" onClick={onToggleFit} title="Cambiar tamaño">
                            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>{fitLabel || 'Original'}</span>
                        </div>
                        <div className="nav-btn small-btn" onClick={handleFullscreen} title="Salir de pantalla completa">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                                <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .player-interface-inner {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .loader-xuper {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    z-index: 100;
                }

                .spinner-dots {
                    position: relative;
                    width: 50px; height: 50px;
                }

                .dot {
                    position: absolute;
                    width: 8px; height: 8px;
                    background: #3b82f6;
                    border-radius: 50%;
                    animation: dotFade 1.2s infinite ease-in-out both;
                }

                .dot:nth-child(1) { top: 0; left: 21px; animation-delay: 0s; }
                .dot:nth-child(2) { top: 6px; left: 36px; animation-delay: -0.15s; }
                .dot:nth-child(3) { top: 21px; left: 42px; animation-delay: -0.3s; }
                .dot:nth-child(4) { top: 36px; left: 36px; animation-delay: -0.45s; }
                .dot:nth-child(5) { top: 42px; left: 21px; animation-delay: -0.6s; }
                .dot:nth-child(6) { top: 36px; left: 6px; animation-delay: -0.75s; }
                .dot:nth-child(7) { top: 21px; left: 0px; animation-delay: -0.9s; }
                .dot:nth-child(8) { top: 6px; left: 6px; animation-delay: -1.05s; }

                @keyframes dotFade {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }

                .speed-text {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: rgba(255,255,255,0.8);
                    letter-spacing: 1px;
                }

                .player-controls-bottom {
                    position: absolute;
                    bottom: 30px;
                    left: 40px;
                    right: 40px;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(20px);
                    padding: 20px 30px;
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    z-index: 50;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                    transform: none; /* Asegurar que no hay desplazamiento lateral */
                }

                .player-controls-bottom.controls-visible {
                    opacity: 1;
                    pointer-events: auto;
                    bottom: 40px;
                }

                .controls-row {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    justify-content: center;
                }

                .vod-progress-container {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    width: 100%;
                }

                .time-label {
                    font-size: 0.85rem;
                    color: rgba(255,255,255,0.8);
                    font-weight: 600;
                    min-width: 45px;
                    font-variant-numeric: tabular-nums;
                }

                .progress-slider-wrapper {
                    position: relative;
                    flex: 1;
                    height: 6px;
                    display: flex;
                    align-items: center;
                }

                .vod-progress-bar {
                    width: 100%;
                    height: 6px;
                    -webkit-appearance: none;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    outline: none;
                    cursor: pointer;
                    position: relative;
                    z-index: 2;
                }

                .vod-progress-bar::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    background: #ff9800;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(255,152,0,0.5);
                    transition: transform 0.2s;
                }

                .vod-progress-bar:hover::-webkit-slider-thumb {
                    transform: scale(1.3);
                }

                .progress-fill {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    background: #ff9800;
                    border-radius: 3px;
                    pointer-events: none;
                    z-index: 1;
                }

                .nav-btn.small-btn {
                    width: 38px; height: 38px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .nav-btn.small-btn:hover {
                    background: #3b82f6;
                    transform: scale(1.1);
                }

                .nav-btn.fit-btn {
                    width: auto;
                    padding: 0 12px;
                    border-radius: 20px;
                }

                .error-overlay {
                    position: absolute;
                    bottom: 120px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    padding: 20px 40px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 68, 68, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    width: auto;
                    max-width: 80%;
                    animation: errorAppear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes errorAppear {
                    from { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }

                .error-content {
                    text-align: center;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }

                .error-icon { font-size: 1.8rem; text-shadow: 0 0 10px rgba(255,68,68,0.5); }
                .error-main { 
                    margin: 5px 0 15px 0; 
                    font-size: 1.1rem; 
                    font-weight: 500;
                    letter-spacing: 0.3px;
                }

                .error-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                }

                .retry-btn, .close-error {
                    padding: 10px 25px;
                    border-radius: 30px;
                    border: none;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.2s;
                }

                .retry-btn { 
                    background: #3b82f6; 
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                }
                .retry-btn:hover { background: #2563eb; transform: translateY(-2px); }

                .close-error { 
                    background: rgba(255,255,255,0.1); 
                    color: #fff; 
                }
                .close-error:hover { background: rgba(255,255,255,0.2); }

                .top-channel-title {
                    position: absolute;
                    top: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    padding: 12px 35px;
                    border-radius: 100px;
                    color: #fff;
                    font-size: 1.25rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    z-index: 1000; /* Asegurar que esté por encima de todo */
                    pointer-events: none;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    text-transform: uppercase;
                    animation: fadeInDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    white-space: nowrap;
                }

                @keyframes fadeInDown {
                    from { 
                        opacity: 0; 
                        transform: translate(-50%, -20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translate(-50%, 0); 
                    }
                }

                .failover-toast {
                    position: absolute;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    border: 1px solid var(--neon-blue);
                    padding: 15px 25px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    color: #fff;
                    z-index: 1000;
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
                    font-weight: 600;
                    animation: slideUp 0.3s ease;
                }
                .failover-spinner {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: var(--neon-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </div>
    );
});

export default React.memo(PlayerInterface);
