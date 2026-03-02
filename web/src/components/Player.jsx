import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import PlayerInterface from './PlayerComponents/PlayerInterface';
import VideoPlayer from './VideoPlayer';
import ShadowLogo from './ShadowLogo';

// Sections
import Movies from './sections/Movies';
import Series from './sections/Series';
import TVHub from './sections/TVHub';
import Clock from './PlayerComponents/Clock';
import SplashScreen from './SplashScreen';

import { API_BASE as API_ROOT } from '../config';
const API_BASE = `${API_ROOT}/api`;

const Player = () => {
    const token = useRef(localStorage.getItem('token')).current;

    // Global State
    const [selectedType, setSelectedType] = useState('live');
    const [currentStream, setCurrentStream] = useState(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChannels, setShowChannels] = useState(true);
    const [showUI, setShowUI] = useState(true);
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [currentEPG, setCurrentEPG] = useState(null);
    const [isExpired, setIsExpired] = useState(false);

    // Tracks & Fit
    const [audioTracks, setAudioTracks] = useState([]);
    const [subtitleTracks, setSubtitleTracks] = useState([]);
    const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
    const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoObjectFit, setVideoObjectFit] = useState('contain');
    const [mainStreams, setMainStreams] = useState([]);
    const [mainSearchQuery, setMainSearchQuery] = useState('');
    const [mainLoading, setMainLoading] = useState(false);
    const [activeStreamList, setActiveStreamList] = useState([]);

    const [loadedSections, setLoadedSections] = useState({ live: false, vod: false, series: false });
    const [imagesReady, setImagesReady] = useState({ live: false, vod: false, series: false });
    const [showInitialSplash, setShowInitialSplash] = useState(true);

    const isAppReady = loadedSections.live && loadedSections.vod && loadedSections.series;

    // Helper to preload images
    const preloadSectionImages = useCallback(async (list, type) => {
        if (!list || list.length === 0) {
            setImagesReady(prev => ({ ...prev, [type]: true }));
            return;
        }

        // Preload first 40 images (intensive initial cache)
        const targetCount = 40;
        const imagesToLoad = list.slice(0, targetCount).map(item => {
            const icon = item.stream_icon || item.icon || item.series_id || item.cover;
            const name = item.name || '';
            return `${API_BASE}/proxy-icon?url=${encodeURIComponent(icon)}&name=${encodeURIComponent(name)}&token=${token}`;
        });

        // Preload images sequentially to avoid overwhelming the browser
        for (const url of imagesToLoad) {
            await new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = resolve;
                img.onerror = resolve;
            });
        }

        setImagesReady(prev => ({ ...prev, [type]: true }));
    }, []);

    // Mark section as ready
    const handleDataLoaded = useCallback((section, initialData) => {
        setLoadedSections(prev => ({ ...prev, [section]: true }));
        if (initialData) {
            preloadSectionImages(initialData, section);
        } else {
            // Fallback if no data was provided
            setImagesReady(prev => ({ ...prev, [section]: true }));
        }
    }, [preloadSectionImages]);

    // Refs
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const uiTimeoutRef = useRef(null);
    const layoutRef = useRef(null);

    // Check Expiration & Load Last Channel
    useEffect(() => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            if (userInfo.status && userInfo.status !== 'Active') setIsExpired(true);
            else if (userInfo.exp_date) {
                const expTimestamp = parseInt(userInfo.exp_date);
                if (expTimestamp !== 0 && expTimestamp < Date.now() / 1000) setIsExpired(true);
            }
        } catch (e) { }

        const lastChannel = localStorage.getItem('lastWatchedStream');
        if (lastChannel && !currentStream) { // Evitar doble carga
            try {
                const streamData = JSON.parse(lastChannel);
                const type = localStorage.getItem('lastWatchedType') || 'live';
                setSelectedType(type);
                handlePlayStream(streamData, type, false); // No forzar FS al inicio
            } catch (e) { console.error("Error loading last channel", e); }
        }

        // Fetch Initial Streams for Main Sidebar
        const fetchInitial = async () => {
            setMainLoading(true);
            try {
                const res = await axios.get(`${API_BASE}/streams/live`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMainStreams(res.data);
            } catch (err) {
                console.error("Error loading main streams:", err);
            } finally {
                setMainLoading(false);
            }
        };
        fetchInitial();

        // Safety timeout to unblock app after 10s no matter what
        const safetyTimer = setTimeout(() => {
            setLoadedSections(prev => ({ live: true, vod: true, series: true }));
        }, 10000);

        return () => clearTimeout(safetyTimer);
    }, [token]);

    // Fullscreen Listener
    useEffect(() => {
        const handleFsChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);

            // Si salimos de pantalla completa y estamos en VOD o Series,
            // (Comportamiento modificado: no detener reproducción, para que la UI principal funcione)
            if (!isFs && (selectedType === 'vod' || selectedType === 'series')) {
                // setCurrentStream(null); // Eliminamos esto para que no quite la película al salir de FS accidentalmente
                setShowChannels(true); // Aseguramos que se vea la UI
            }
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, [selectedType]);

    // UI Auto-Hide
    const handleMouseMove = useCallback(() => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => {
            if (isFullscreen) setShowUI(false);
        }, 3000);
    }, [isFullscreen]);

    const handlePlayStream = useCallback((stream, type, autoFs = true) => {
        setSelectedType(type);
        setCurrentStream(stream);
        setIsLoading(true);
        setError(null);
        setIsPlaying(true);
        setAudioTracks([]);
        setSubtitleTracks([]);

        localStorage.setItem('lastWatchedStream', JSON.stringify(stream));
        localStorage.setItem('lastWatchedType', type);

        // Guardar específicamente el último canal de TV para restaurarlo al volver de Hubs
        if (type === 'live') {
            localStorage.setItem('lastWatchedLiveStream', JSON.stringify(stream));
        }

        if (type === 'live') {
            const rawId = (stream.stream_id || stream.id).toString();
            axios.get(`${API_BASE}/epg/${rawId}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCurrentEPG(res.data?.[0] || null))
                .catch(() => setCurrentEPG(null));
        } else {
            setCurrentEPG(null);
            // Entrar en fullscreen automáticamente para películas y series si se solicita y es posible
            if (autoFs && layoutRef.current && !document.fullscreenElement) {
                layoutRef.current.requestFullscreen().catch(() => {
                    // Silenciamos este error ya que suele ser por falta de gesto del usuario
                });
            }
        }
    }, [API_BASE, token]);

    const handleTogglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
            else { videoRef.current.play(); setIsPlaying(true); }
        }
    };

    const handleFullscreen = () => {
        if (layoutRef.current) {
            if (!document.fullscreenElement) layoutRef.current.requestFullscreen();
            else document.exitFullscreen();
        }
    };

    const handleSeek = (time) => {
        if (videoRef.current?.current) {
            videoRef.current.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const FIT_MODES = ['contain', '16:9', '4:3'];
    const FIT_LABELS = { contain: 'Original', '16:9': '16:9', '4:3': '4:3' };

    const toggleVideoFit = () => {
        const currentIndex = FIT_MODES.indexOf(videoObjectFit);
        const nextFit = FIT_MODES[(currentIndex + 1) % FIT_MODES.length];
        setVideoObjectFit(nextFit);
        return nextFit;
    };

    const handleSetType = (type, forceFs = true, openHub = true) => {
        // Si cambiamos de sección principal, detenemos la reproducción actual
        if (type !== selectedType) {
            setCurrentStream(null);
            setError(null);
            setIsLoading(false);
            setCurrentEPG(null);

            // Si volvemos a LIVE, restauramos automáticamente el último canal de TV
            if (type === 'live') {
                const lastLive = localStorage.getItem('lastWatchedLiveStream');
                if (lastLive) {
                    try {
                        handlePlayStream(JSON.parse(lastLive), 'live');
                    } catch (e) { console.error("Error al restaurar canal de TV:", e); }
                }
            }
        }

        setSelectedType(type);
        if (openHub) {
            setShowChannels(true);
        }
        // Disparar fullscreen si es 'live', 'vod' o 'series' Y se solicita explícitamente Y no estamos ya en él
        if ((type === 'live' || type === 'vod' || type === 'series') && forceFs && layoutRef.current && !document.fullscreenElement) {
            layoutRef.current.requestFullscreen().catch(err => {
                console.warn("Error enabling fullscreen:", err);
            });
        }
    };

    const navigationHandlers = useRef({ next: null, prev: null });
    const setNavigationHandlers = useCallback((handlers) => {
        navigationHandlers.current = { ...navigationHandlers.current, ...handlers };
    }, []);

    // Memoize onStreamsUpdate to prevent unnecessary re-renders of Hubs
    const handleStreamsUpdate = useCallback((list) => {
        setActiveStreamList(list);
    }, []);

    // Pre-mount ALL sections at startup to completely eliminate loading times when switching tabs (user request)
    const [mountedSections, setMountedSections] = useState({
        live: true,
        vod: true,
        series: true
    });

    const playNext = () => navigationHandlers.current.next?.();
    const playPrevious = () => navigationHandlers.current.prev?.();


    const renderSection = () => {
        const props = {
            API_BASE, token,
            onPlayStream: handlePlayStream,
            currentStream,
            setSelectedType: handleSetType,
            setNavigationHandlers,
            showChannels, setShowChannels,
            isFullscreen, showUI,
            onStreamsUpdate: handleStreamsUpdate,
            onDataLoaded: handleDataLoaded,
            selectedType
        };

        return (
            <>
                {mountedSections.live && (
                    <div style={{ display: selectedType === 'live' ? 'contents' : 'none' }}>
                        <TVHub {...props} />
                    </div>
                )}
                {mountedSections.vod && (
                    <div style={{ display: selectedType === 'vod' ? 'contents' : 'none' }}>
                        <Movies {...props} />
                    </div>
                )}
                {mountedSections.series && (
                    <div style={{ display: selectedType === 'series' ? 'contents' : 'none' }}>
                        <Series {...props} />
                    </div>
                )}
            </>
        );
    };

    return (
        <div className={`player-layout ${isFullscreen ? 'layout-fullscreen' : ''}`} ref={layoutRef}>

            {!isFullscreen && (
                <div className="layout-col-left">
                    <div className="header-logo-area">
                        <ShadowLogo size={46} />
                    </div>

                    <div className="sidebar-main">
                        <div className={`nav-item ${selectedType === 'live' ? 'active' : ''}`} onClick={() => handleSetType('live')}>
                            <span className="nav-icon">📺</span>
                            <span className="nav-label">TV</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'destacados' ? 'active' : ''}`} onClick={() => handleSetType('live')}>
                            <span className="nav-icon">👍</span>
                            <span className="nav-label">DESTACADOS</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'vod' ? 'active' : ''}`} onClick={() => handleSetType('vod')}>
                            <span className="nav-icon">🎬</span>
                            <span className="nav-label">PELÍCULA</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'series' ? 'active' : ''}`} onClick={() => handleSetType('series')}>
                            <span className="nav-icon">📺</span>
                            <span className="nav-label">SERIES</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'kids' ? 'active' : ''}`} onClick={() => handleSetType('vod')}>
                            <span className="nav-icon">👶</span>
                            <span className="nav-label">KIDS</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'anime' ? 'active' : ''}`} onClick={() => handleSetType('series')}>
                            <span className="nav-icon">🐼</span>
                            <span className="nav-label">ANIME</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'explorar' ? 'active' : ''}`} onClick={() => handleSetType('live')}>
                            <span className="nav-icon">🧭</span>
                            <span className="nav-label">EXPLORAR</span>
                        </div>
                    </div>

                    <div className="sidebar-footer">
                        <div className="footer-btn" title="Inicio">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="footer-btn" title="Favoritos">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </div>
                        <div className="footer-btn" title="Buscar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <div className="footer-btn" title="Salir" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar (Iconos Estilo Xuper TV) - Global Top Right */}
            {!isFullscreen && (
                <div className="top-bar">
                    <div className="status-icons-group">
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>🔍</span>
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>⚡</span>
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>🕓</span>
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>👤</span>
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>🔔</span>
                        <span style={{ fontSize: '18px', cursor: 'pointer' }}>📡</span>
                        <Clock />
                    </div>
                </div>
            )}

            {/* Column 2: Center Video Area */}
            <div className={`layout-col-center${isFullscreen ? ' fullscreen-active' : ''}`}>
                <div className="video-container">
                    <PlayerInterface
                        ref={videoRef}
                        containerRef={containerRef}
                        showUI={showUI}
                        showChannels={showChannels}
                        isFullscreen={isFullscreen}
                        loading={isLoading}
                        downloadSpeed={downloadSpeed}
                        currentStream={currentStream}
                        currentEPG={currentEPG}
                        error={error}
                        isPlaying={isPlaying}
                        isMuted={isMuted}
                        handleMouseMove={handleMouseMove}
                        playPrevious={playPrevious}
                        handleTogglePlay={handleTogglePlay}
                        playNext={playNext}
                        handleToggleMute={() => setIsMuted(!isMuted)}
                        handleFullscreen={handleFullscreen}
                        playStream={handlePlayStream}
                        setError={setError}
                        audioTracks={audioTracks}
                        subtitleTracks={subtitleTracks}
                        currentAudioTrack={currentAudioTrack}
                        currentSubtitleTrack={currentSubtitleTrack}
                        onChangeAudio={(id) => { videoRef.current?.setAudioTrack(id); setCurrentAudioTrack(id); }}
                        onChangeSubtitle={(id) => { videoRef.current?.setSubtitleTrack(id); setCurrentSubtitleTrack(id); }}
                        videoObjectFit={videoObjectFit}
                        fitLabel={FIT_LABELS[videoObjectFit] || 'Original'}
                        onToggleFit={toggleVideoFit}
                        setShowChannels={setShowChannels}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        selectedType={selectedType}
                    >
                        <VideoPlayer
                            ref={videoRef}
                            stream={showInitialSplash ? null : currentStream}
                            type={selectedType}
                            token={token}
                            API_BASE={API_BASE}
                            isMuted={isMuted}
                            onLoadStart={() => setIsLoading(true)}
                            onLoadEnd={() => setIsLoading(false)}
                            onTimeUpdate={setCurrentTime}
                            onDurationChange={setDuration}
                            onError={(e) => {
                                setError(e.message);
                            }}
                            onSpeedUpdate={setDownloadSpeed}
                            onTracksLoaded={({ audioTracks, subtitleTracks }) => { setAudioTracks(audioTracks); setSubtitleTracks(subtitleTracks); }}
                            onAudioTrackChanged={setCurrentAudioTrack}
                            onSubtitleTrackChanged={setCurrentSubtitleTrack}
                            objectFit={videoObjectFit}
                        />

                    </PlayerInterface>
                </div>
            </div>

            {/* Column 3: Right Sidebar / App Content */}
            <div
                className="layout-col-right"
                style={{
                    display: (isFullscreen && selectedType !== 'live' && selectedType !== 'vod' && selectedType !== 'series') ? 'none' : 'flex',
                    zIndex: isFullscreen ? 10000 : 'auto',
                    position: isFullscreen ? 'absolute' : 'relative',
                    inset: isFullscreen ? 0 : 'auto',
                    pointerEvents: (isFullscreen && (!showChannels || (selectedType !== 'vod' && selectedType !== 'series'))) ? 'none' : 'auto', // evitamos bloqueos de clicks si el video está visible
                    width: isFullscreen ? '100%' : undefined,
                    background: isFullscreen ? 'transparent' : '#000'
                }}
            >
                {renderSection()}
            </div>

            {isExpired && (
                <div className="expiration-overlay">
                    <div className="expiration-card">
                        <h1 className="shadow-tv-logo" style={{ fontSize: '2.5rem' }}>SHADOW TV <span style={{ color: '#3b82f6' }}>PRO</span></h1>
                        <div className="status-badge" style={{ color: '#ff4444', borderColor: '#ff4444' }}>SUSCRIPCIÓN VENCIDA</div>
                        <button className="logout-btn" style={{ backgroundColor: '#ff4444' }} onClick={() => { localStorage.clear(); window.location.href = '/'; }}>SALIR</button>
                    </div>
                </div>
            )}


            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
            {showInitialSplash && (
                <SplashScreen
                    isReady={isAppReady}
                    onComplete={() => setShowInitialSplash(false)}
                />
            )}
        </div>
    );
};

export default Player;
