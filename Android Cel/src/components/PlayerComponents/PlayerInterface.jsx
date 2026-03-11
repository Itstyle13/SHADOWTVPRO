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
    selectedType,
    audioTracks,
    subtitleTracks,
    currentAudioTrack,
    currentSubtitleTrack,
    onChangeAudio,
    onChangeSubtitle
}, videoRef) => {
    const [trackToast, setTrackToast] = React.useState(null);
    const showTrackToast = (msg) => {
        setTrackToast(msg);
        setTimeout(() => setTrackToast(null), 3000);
    };

    const loadFavorites = React.useCallback(() => {
        try {
            const stored = localStorage.getItem('tv_favorites');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }, []);

    const [favorites, setFavorites] = React.useState(loadFavorites);

    React.useEffect(() => {
        const handleFavoritesChanged = () => {
            setFavorites(loadFavorites());
        };
        window.addEventListener('favorites_changed', handleFavoritesChanged);
        return () => window.removeEventListener('favorites_changed', handleFavoritesChanged);
    }, [loadFavorites]);

    const handleToggleFavorite = () => {
        if (!currentStream || selectedType !== 'live') return;
        const streamId = currentStream.stream_id || currentStream.id;
        if (!streamId) return;

        setFavorites(prev => {
            const idStr = streamId.toString();
            const isFav = prev.includes(idStr);
            const newFavs = isFav ? prev.filter(id => id !== idStr) : [...prev, idStr];
            localStorage.setItem('tv_favorites', JSON.stringify(newFavs));
            window.dispatchEvent(new Event('favorites_changed'));
            return newFavs;
        });
    };

    const isCurrentFavorite = React.useMemo(() => {
        if (!currentStream || selectedType !== 'live') return false;
        const streamId = (currentStream.stream_id || currentStream.id)?.toString();
        return favorites.includes(streamId);
    }, [currentStream, favorites, selectedType]);

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
            {/* Track Toast */}
            {trackToast && (
                <div className="track-toast">
                    {trackToast}
                </div>
            )}

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

            {/* Controles del reproductor: aparecen al mover el mouse, se ocultan tras 3s */}
            {currentStream && (
                <div
                    className={`player-controls-bottom ${showUI ? 'controls-visible' : ''}`}
                    style={showChannels ? {
                        left: 'auto',
                        right: '16px',
                        transform: 'none',
                        zIndex: 100001,
                    } : { zIndex: 100001 }}
                >
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
                        <div 
                            className="nav-btn small-btn" 
                            onClick={() => {
                                if (selectedType === 'vod' || selectedType === 'series') {
                                    onSeek(Math.max(0, currentTime - 10));
                                } else {
                                    playPrevious();
                                }
                            }} 
                            title={selectedType === 'live' ? "Canal Anterior" : "Retroceder 10s"}
                        >
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
                        <div 
                            className="nav-btn small-btn" 
                            onClick={() => {
                                if (selectedType === 'vod' || selectedType === 'series') {
                                    onSeek(Math.min(duration, currentTime + 10));
                                } else {
                                    playNext();
                                }
                            }} 
                            title={selectedType === 'live' ? "Siguiente Canal" : "Adelantar 10s"}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <polygon points="5 4 15 12 5 20 5 4" /><rect x="17" y="4" width="2" height="16" />
                            </svg>
                        </div>
                        {(selectedType === 'vod' || selectedType === 'series') && audioTracks && audioTracks.length > 0 && (
                            <div className="nav-btn fit-btn" onClick={() => {
                                const currentIndex = audioTracks.findIndex(t => String(t.id) === String(currentAudioTrack));
                                const nextIdx = currentIndex === -1 ? 1 % audioTracks.length : (currentIndex + 1) % audioTracks.length;
                                const nextTrack = audioTracks[nextIdx];
                                onChangeAudio(nextTrack.id);
                                showTrackToast(`Audio: ${nextTrack.language.toUpperCase()}`);
                            }} title="Cambiar Idioma">
                                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>AUD</span>
                            </div>
                        )}
                        {(selectedType === 'vod' || selectedType === 'series') && subtitleTracks && subtitleTracks.length > 0 && (
                            <div className="nav-btn fit-btn" onClick={() => {
                                const options = [{ id: -1, label: 'Apagado', language: 'Desactivado' }, ...subtitleTracks];
                                const currentIndex = options.findIndex(t => String(t.id) === String(currentSubtitleTrack));
                                const nextIdx = currentIndex === -1 ? 1 % options.length : (currentIndex + 1) % options.length;
                                const nextTrack = options[nextIdx];
                                onChangeSubtitle(nextTrack.id);
                                showTrackToast(`Sub: ${nextTrack.language.toUpperCase()}`);
                            }} title="Cambiar Subtítulo">
                                <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>SUB</span>
                            </div>
                        )}
                        {selectedType === 'live' && (
                            <>
                                <div className="nav-btn small-btn" onClick={handleToggleFavorite} title={isCurrentFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}>
                                    {isCurrentFavorite ? (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ef4444" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))' }}>
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="transparent" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                        </svg>
                                    )}
                                </div>
                                <div className="nav-btn small-btn" onClick={() => {
                                    setShowChannels(true);
                                    setTimeout(() => {
                                        const searchInput = document.getElementById('tvhub-search-input');
                                        if (searchInput) searchInput.focus();
                                    }, 100);
                                }} title="Buscar Canales">
                                    <span style={{ fontSize: '15px' }}>🔍</span>
                                </div>
                            </>
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

                .track-toast {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.75);
                    color: #fff;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    z-index: 100000;
                    backdrop-filter: blur(4px);
                    animation: fadeInOut 3s forwards;
                    pointer-events: none;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
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
                    bottom: 16px;
                    bottom: 16px;
                    left: 2%;
                    right: 2%;
                    width: 96%;
                    max-width: 1200px;
                    margin: 0 auto;
                    background: rgba(0,0,0,0.55);
                    backdrop-filter: blur(12px);
                    padding: 10px 18px;
                    border-radius: 40px;
                    border: 1px solid rgba(255,255,255,0.08);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 99998;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.4s ease;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    white-space: nowrap;
                }

                .player-controls-bottom.controls-visible {
                    opacity: 1;
                    pointer-events: auto;
                }

                .player-controls-bottom:hover {
                    opacity: 1;
                    pointer-events: auto;
                }

                .controls-row {
                    display: flex;
                    gap: 10px;
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
                    border-radius: 3px;
                    outline: none;
                    cursor: pointer;
                    position: relative;
                    z-index: 2;
                }

                /* Aumentar el area tactil del slider */
                .vod-progress-bar::-webkit-slider-runnable-track {
                    height: 20px;
                    cursor: pointer;
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
                    width: 32px; height: 32px;
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
