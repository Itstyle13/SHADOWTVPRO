import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import PlayerInterface from './PlayerComponents/PlayerInterface';
import VideoPlayer from './VideoPlayer';
import ShadowLogo from './ShadowLogo';

// Sections
import Movies from './sections/Movies';
import Series from './sections/Series';
import TVHub from './sections/TVHub';
import Clock from './PlayerComponents/Clock';
import { saveToHistory, getResumeTime } from '../utils/history';

import { API_BASE as API_ROOT } from '../config';
const API_BASE = `${API_ROOT}/api`;

const Player = () => {
    const token = useRef(localStorage.getItem('token')).current;
    const isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

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
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Tracks & Fit
    const [audioTracks, setAudioTracks] = useState([]);
    const [subtitleTracks, setSubtitleTracks] = useState([]);
    const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
    const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoObjectFit, setVideoObjectFit] = useState('contain');

    // Helper to preload images
    const preloadSectionImages = useCallback(async (list, type) => {
        if (!list || list.length === 0) return;
        const targetCount = 40;
        const imagesToLoad = list.slice(0, targetCount).map(item => {
            const icon = item.stream_icon || item.icon || item.series_id || item.cover;
            const name = item.name || '';
            return `${API_BASE}/proxy-icon?url=${encodeURIComponent(icon)}&name=${encodeURIComponent(name)}&token=${token}`;
        });

        for (const url of imagesToLoad) {
            await new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = resolve;
                img.onerror = resolve;
            });
        }
    }, [token]);

    const handleDataLoaded = useCallback((section, initialData) => {
        if (initialData) preloadSectionImages(initialData, section);
    }, [preloadSectionImages]);

    // Refs
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const uiTimeoutRef = useRef(null);
    const layoutRef = useRef(null);

    // Tracking Refs for History
    const timeTrackerRef = useRef(0);
    const durationTrackerRef = useRef(0);
    const currentStreamRef = useRef(null);
    const selectedTypeRef = useRef('live');
    const resumePendingRef = useRef(0);

    // Watchdog Refs
    const lastVideoTimeRef = useRef(0);
    const lastProgressTimeRef = useRef(Date.now());
    const triggerReconnectRef = useRef(null);

    useEffect(() => {
        currentStreamRef.current = currentStream;
        selectedTypeRef.current = selectedType;
        timeTrackerRef.current = currentTime;
        durationTrackerRef.current = duration;
    }, [currentStream, selectedType, currentTime, duration]);

    useEffect(() => {
        lastVideoTimeRef.current = 0;
        lastProgressTimeRef.current = Date.now();
        setIsReconnecting(false);
    }, [currentStream]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!currentStreamRef.current || !isPlaying || isLoading) {
                lastProgressTimeRef.current = Date.now();
                return;
            }

            if (timeTrackerRef.current !== lastVideoTimeRef.current && timeTrackerRef.current > 0) {
                lastVideoTimeRef.current = timeTrackerRef.current;
                lastProgressTimeRef.current = Date.now();
                if (isReconnecting) setIsReconnecting(false);
            } else {
                const diff = Date.now() - lastProgressTimeRef.current;
                // Si han pasado más de 6 segundos sin progreso de tiempo
                if (diff > 6000) {
                    if (!isReconnecting) setIsReconnecting(true);
                    // Solo activar la reconexión una vez cada ciclo de fallo
                    if (diff > 6000 && diff < 8000) {
                        if (triggerReconnectRef.current) triggerReconnectRef.current();
                    }
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, isReconnecting, isLoading]);

    useEffect(() => {
        return () => {
            const stream = currentStreamRef.current;
            const type = selectedTypeRef.current;
            const t = timeTrackerRef.current;
            const d = durationTrackerRef.current;
            if (stream && (type === 'vod' || type === 'series')) {
                saveToHistory(type, stream, t, d);
            }
            timeTrackerRef.current = 0;
            durationTrackerRef.current = 0;
        };
    }, [currentStream]);

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
        if (lastChannel && !currentStream) {
            try {
                const streamData = JSON.parse(lastChannel);
                const type = localStorage.getItem('lastWatchedType') || 'live';
                setSelectedType(type);
                handlePlayStream(streamData, type, false);
            } catch (e) { }
        }

        const fetchInitial = async () => {
            try {
                await axios.get(`${API_BASE}/streams/live`, { headers: { Authorization: `Bearer ${token}` } });
            } catch (err) { }
        };
        fetchInitial();
    }, [token]);

    useEffect(() => {
        const handleFsChange = () => {
            if (isNative) return;
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            if (!isFs && (selectedType === 'vod' || selectedType === 'series')) {
                setCurrentStream(null);
                setShowChannels(true);
            }
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, [selectedType, isNative]);

    const handleMouseMove = useCallback(() => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        if (currentStream) {
            uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
        }
    }, [currentStream]);

    const handlePlayStream = useCallback((stream, type, autoFs = true, isReconnect = false) => {
        const currentId = currentStream ? String(currentStream.stream_id || currentStream.id || '') : '';
        const newId = stream ? String(stream.stream_id || stream.id || '') : '';

        if (!isReconnect && currentStream && stream && currentId === newId && selectedType === type) {
            setShowChannels(false);
            setIsLoading(false);
            if (autoFs && isNative) setIsFullscreen(true);
            return;
        }

        if (isReconnect) {
            setCurrentStream(null);
            setTimeout(() => {
                setSelectedType(type);
                setCurrentStream({ ...stream, _reconnect: Date.now() });
                setIsLoading(true);
                setError(null);
                setIsPlaying(true);
                lastProgressTimeRef.current = Date.now();
            }, 10);
            return;
        }

        setSelectedType(type);
        setCurrentStream(stream);
        setIsLoading(true);
        setError(null);
        setIsPlaying(true);
        setAudioTracks([]);
        setSubtitleTracks([]);
        lastProgressTimeRef.current = Date.now();
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);

        localStorage.setItem('lastWatchedStream', JSON.stringify(stream));
        localStorage.setItem('lastWatchedType', type);

        if (type === 'live') {
            localStorage.setItem('lastWatchedLiveStream', JSON.stringify(stream));
            const rawId = (stream.stream_id || stream.id).toString();
            axios.get(`${API_BASE}/epg/${rawId}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCurrentEPG(res.data?.[0] || null))
                .catch(() => setCurrentEPG(null));
        } else {
            setCurrentEPG(null);
            const streamId = stream.stream_id || stream.id || stream.series_id;
            const rTime = getResumeTime(type, streamId);
            resumePendingRef.current = rTime > 0 ? rTime : 0;
            if (autoFs) {
                if (isNative) setIsFullscreen(true);
                else if (layoutRef.current && !document.fullscreenElement) layoutRef.current.requestFullscreen().catch(() => { });
            }
        }
    }, [token, isNative, currentStream, selectedType]);

    useEffect(() => {
        triggerReconnectRef.current = () => {
            const stream = currentStreamRef.current;
            const type = selectedTypeRef.current;
            if (stream && type) {
                handlePlayStream(stream, type, false, true);
                lastProgressTimeRef.current = Date.now();
            }
        };
    }, [handlePlayStream]);

    const handleTogglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
            else { videoRef.current.play(); setIsPlaying(true); }
        }
    };

    const handleFullscreen = () => {
        if (isNative) {
            const val = !isFullscreen;
            setIsFullscreen(val);
            if (!val && (selectedType === 'vod' || selectedType === 'series')) {
                setCurrentStream(null);
                setShowChannels(true);
            }
        } else if (layoutRef.current) {
            if (!document.fullscreenElement) layoutRef.current.requestFullscreen();
            else document.exitFullscreen();
        }
    };

    const handleSeek = (time) => {
        if (videoRef.current?.seekTo) {
            videoRef.current.seekTo(time);
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
        if (type !== selectedType) {
            setCurrentStream(null);
            setError(null);
            setIsLoading(false);
            setCurrentEPG(null);
            if (type === 'live') {
                const lastLive = localStorage.getItem('lastWatchedLiveStream');
                if (lastLive) {
                    try { handlePlayStream(JSON.parse(lastLive), 'live'); } catch (e) { }
                }
            }
        }
        setSelectedType(type);
        if (openHub) setShowChannels(true);
        if ((type === 'live' || type === 'vod' || type === 'series') && forceFs) {
            if (isNative) setIsFullscreen(true);
            else if (layoutRef.current && !document.fullscreenElement) layoutRef.current.requestFullscreen().catch(() => { });
        }
    };

    const navigationHandlers = useRef({ live: {}, vod: {}, series: {} });
    const setNavigationHandlers = useCallback((type, handlers) => {
        navigationHandlers.current[type] = handlers;
    }, []);

    const playNext = useCallback(() => {
        const handler = navigationHandlers.current[selectedType]?.next;
        if (typeof handler === 'function') handler();
    }, [selectedType]);

    const playPrevious = useCallback(() => {
        const handler = navigationHandlers.current[selectedType]?.prev;
        if (typeof handler === 'function') handler();
    }, [selectedType]);

    const handleStreamsUpdate = useCallback(() => { }, []);

    const renderSection = () => {
        const props = {
            API_BASE, token, onPlayStream: handlePlayStream, currentStream,
            setSelectedType: handleSetType, showChannels, setShowChannels,
            isFullscreen, showUI, onStreamsUpdate: handleStreamsUpdate,
            onDataLoaded: handleDataLoaded, selectedType
        };
        return (
            <div style={{ flex: 1, position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                <div style={{ display: selectedType === 'live' ? 'flex' : 'none', flex: 1, height: '100%' }}>
                    <TVHub {...props} setNavigationHandlers={(h) => setNavigationHandlers('live', h)} />
                </div>
                <div style={{ display: selectedType === 'vod' ? 'flex' : 'none', flex: 1, height: '100%' }}>
                    <Movies {...props} setNavigationHandlers={(h) => setNavigationHandlers('vod', h)} />
                </div>
                <div style={{ display: selectedType === 'series' ? 'flex' : 'none', flex: 1, height: '100%' }}>
                    <Series {...props} setNavigationHandlers={(h) => setNavigationHandlers('series', h)} />
                </div>
            </div>
        );
    };

    const isFullCatalogView = !isFullscreen && !currentStream && (selectedType === 'vod' || selectedType === 'series');

    return (
        <div className={`player-layout ${isFullscreen ? 'layout-fullscreen' : ''}`} ref={layoutRef}>
            {!isFullscreen && (
                <div className="layout-col-left">
                    <div className="header-logo-area"><ShadowLogo size={46} /></div>
                    <div className="sidebar-main">
                        <div className={`nav-item ${selectedType === 'live' ? 'active' : ''}`} onClick={() => handleSetType('live')}>
                            <span className="nav-icon">📺</span><span className="nav-label">TV</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'vod' ? 'active' : ''}`} onClick={() => handleSetType('vod')}>
                            <span className="nav-icon">🎬</span><span className="nav-label">PELÍCULAS</span>
                        </div>
                        <div className={`nav-item ${selectedType === 'series' ? 'active' : ''}`} onClick={() => handleSetType('series')}>
                            <span className="nav-icon">🎭</span><span className="nav-label">SERIES</span>
                        </div>
                    </div>
                    <div className="sidebar-footer">
                        <div className="footer-btn" title="Inicio"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
                        <div className="footer-btn" title="Favoritos"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
                        <div className="footer-btn" title="Buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
                        <div className="footer-btn" title="Salir" onClick={() => { localStorage.clear(); window.location.href = '/'; }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></div>
                    </div>
                    <div style={{ fontSize: '7px', textAlign: 'center', opacity: 0.3, paddingBottom: '5px' }}>v.DEBUG.1</div>
                </div>
            )}

            {!isFullscreen && (
                <div className="top-bar">
                    <div className="status-icons-group">
                        <span>🔍</span><span>⚡</span><span>🕓</span><span>👤</span><span>🔔</span><span>📡</span><Clock />
                    </div>
                </div>
            )}

            <div className={`layout-col-center${isFullscreen ? ' fullscreen-active' : ''}`} style={{ display: isFullCatalogView ? 'none' : 'flex' }}>
                <div className="video-container">
                    {isReconnecting && (
                        <div className="reconnection-overlay" style={{ zIndex: 100002 }}>
                            <img src="/technician.png" alt="Técnico" className="tech-img" />
                            <div className="reconnect-text-container">
                                <h2>Problemas Técnicos</h2>
                                <p>Reconectando señal...</p>
                                <div className="loading-dots"><span>.</span><span>.</span><span>.</span></div>
                            </div>
                        </div>
                    )}
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
                            stream={currentStream}
                            type={selectedType}
                            token={token}
                            API_BASE={API_BASE}
                            isMuted={isMuted}
                            onLoadStart={() => setIsLoading(true)}
                            onLoadEnd={() => setIsLoading(false)}
                            onTimeUpdate={(t) => {
                                setCurrentTime(t);
                                if (resumePendingRef.current > 0 && t > 0) {
                                    handleSeek(resumePendingRef.current);
                                    resumePendingRef.current = 0;
                                }
                            }}
                            onDurationChange={setDuration}
                            onError={(e) => setError(e.message)}
                            onSpeedUpdate={setDownloadSpeed}
                            onTracksLoaded={({ audioTracks, subtitleTracks }) => { setAudioTracks(audioTracks); setSubtitleTracks(subtitleTracks); }}
                            onAudioTrackChanged={setCurrentAudioTrack}
                            onSubtitleTrackChanged={setCurrentSubtitleTrack}
                            objectFit={videoObjectFit}
                        />
                    </PlayerInterface>
                </div>
            </div>

            <div
                className="layout-col-right"
                style={{
                    display: (isFullscreen && selectedType !== 'live' && selectedType !== 'vod' && selectedType !== 'series') ? 'none' : 'flex',
                    zIndex: isFullscreen ? 10000 : 'auto',
                    position: isFullscreen ? 'absolute' : 'relative',
                    inset: isFullscreen ? 0 : 'auto',
                    pointerEvents: (isFullscreen && (!showChannels || (selectedType !== 'vod' && selectedType !== 'series'))) ? 'none' : 'auto',
                    width: isFullscreen ? '100%' : (isFullCatalogView ? 'auto' : undefined),
                    flex: isFullCatalogView ? 1 : undefined,
                    background: isFullscreen ? 'transparent' : '#000',
                }}
            >
                {renderSection()}
            </div>

            {isExpired && (
                <div className="expiration-overlay" style={{ zIndex: 100000 }}>
                    <div className="expiration-card">
                        <h1 className="shadow-tv-logo">SHADOW TV <span style={{ color: '#3b82f6' }}>PRO</span></h1>
                        <div className="status-badge" style={{ color: '#ff4444', borderColor: '#ff4444' }}>SUSCRIPCIÓN VENCIDA</div>
                        <button className="logout-btn" style={{ backgroundColor: '#ff4444' }} onClick={() => { localStorage.clear(); window.location.href = '/'; }}>SALIR</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Player;
