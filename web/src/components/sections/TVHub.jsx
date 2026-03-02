import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import StreamGrid from '../PlayerComponents/StreamGrid';

const TVHub = ({ API_BASE, token, onPlayStream, currentStream, setSelectedType, setNavigationHandlers, isFullscreen, showUI, onStreamsUpdate, showChannels, setShowChannels, onDataLoaded, selectedType }) => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1440 || window.innerHeight <= 600);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1440 || window.innerHeight <= 600);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [categories, setCategories] = useState([]);
    const [streams, setStreams] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [streamsLoading, setStreamsLoading] = useState(false); // New state for stream loading
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const hasReportedInitial = useRef(false);

    const categoriesRef = useRef(null);
    const streamCache = useRef({});

    const fetchStreams = useCallback(async (categoryId) => {
        console.log(`[TVHub] Fetching streams for category: ${categoryId}`);
        if (streamCache.current[categoryId]) {
            console.log(`[TVHub] Using cached streams for: ${categoryId}`);
            setStreams(streamCache.current[categoryId]);
            setSearchQuery('');
            onStreamsUpdate(streamCache.current[categoryId]);
            return;
        }

        setStreamsLoading(true); // Start loading streams
        try {
            const url = categoryId === 'all'
                ? `${API_BASE}/streams/live`
                : `${API_BASE}/streams/live?category_id=${categoryId}`;

            console.log(`[TVHub] Requesting URL: ${url}`);
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            console.log(`[TVHub] Streams received: ${res.data?.length || 0}`);

            streamCache.current[categoryId] = res.data;
            setStreams(res.data);
            setSearchQuery('');
            setError(null);
            onStreamsUpdate(res.data);

            if (!hasReportedInitial.current) {
                onDataLoaded?.('live', res.data);
                hasReportedInitial.current = true;
            }
        } catch (err) {
            console.error("[TVHub] Error fetching streams:", err);
            setError('Error al cargar contenido');
        } finally {
            setStreamsLoading(false); // Stop loading streams
        }
    }, [API_BASE, token, onStreamsUpdate, onDataLoaded]);

    const handleCategorySelect = useCallback(async (categoryId) => {
        setSelectedCategory(categoryId);
        await fetchStreams(categoryId);
    }, [fetchStreams]);

    useEffect(() => {
        // Mostrar canales automáticamente al entrar a TV (Live), tanto en normal como en fullscreen
        if (selectedType === 'live') {
            setShowChannels(true);
            if (!isFullscreen && selectedCategory !== 'all') {
                handleCategorySelect('all');
            }
        }
    }, [isFullscreen, setShowChannels, selectedType, selectedCategory, handleCategorySelect]);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE}/categories/live`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allCategories = [{ category_id: 'all', category_name: 'TODO' }, ...res.data];
                setCategories(allCategories);
                if (!selectedCategory) {
                    handleCategorySelect('all');
                }
            } catch (err) {
                console.error("Error loading categories:", err);
                setError('Error al cargar categorías');
                if (!hasReportedInitial.current) {
                    onDataLoaded?.('live');
                    hasReportedInitial.current = true;
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, [API_BASE, token, selectedCategory, handleCategorySelect, onDataLoaded]);

    const filteredStreams = useMemo(() => {
        if (!streams) return [];
        if (!searchQuery) return streams;
        const query = searchQuery.toLowerCase();
        return streams.filter(item => {
            const name = item.name?.toLowerCase() || '';
            const id = (item.stream_id || item.id || '').toString().toLowerCase();
            return name.includes(query) || id.includes(query);
        });
    }, [streams, searchQuery]);

    useEffect(() => {
        if (typeof onStreamsUpdate === 'function') {
            onStreamsUpdate(filteredStreams);
        }
    }, [filteredStreams, onStreamsUpdate]);

    useEffect(() => {
        if (!setNavigationHandlers) return;

        const handleNext = () => {
            if (!currentStream || filteredStreams.length === 0) return;
            const currentIndex = filteredStreams.findIndex(s => (s.stream_id || s.id) === (currentStream.stream_id || currentStream.id));
            if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % filteredStreams.length;
                onPlayStream(filteredStreams[nextIndex], 'live');
            }
        };

        const handlePrev = () => {
            if (!currentStream || filteredStreams.length === 0) return;
            const currentIndex = filteredStreams.findIndex(s => (s.stream_id || s.id) === (currentStream.stream_id || currentStream.id));
            if (currentIndex !== -1) {
                const prevIndex = (currentIndex - 1 + filteredStreams.length) % filteredStreams.length;
                onPlayStream(filteredStreams[prevIndex], 'live');
            }
        };

        setNavigationHandlers({ next: handleNext, prev: handlePrev });
    }, [currentStream, filteredStreams, setNavigationHandlers, onPlayStream]);

    const handlePlayStream = (stream) => {
        onPlayStream(stream, 'live');
        if (isFullscreen) {
            setShowChannels(false);
        }
    };

    const handleBackToHome = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        setSelectedType('live', false, false);
        setShowChannels(false);
    };

    if (loading && categories.length === 0) {
        return (
            <div className="tv-hub-loading-center">
                <div className="spinner"></div>
                <p>Cargando Canales...</p>
                <style>{`
                    .tv-hub-loading-center { 
                        display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        color: #fff; gap: 20px; z-index: 2000; position: absolute; inset: 0; background: #000; 
                    }
                    .spinner { 
                        width: 40px; height: 40px; border: 4px solid rgba(255, 255, 255, 0.1); 
                        border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; 
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="tv-hub-root" style={{
            display: selectedType === 'live' ? 'block' : 'none',
            position: 'absolute',
            inset: 0,
            height: '100%',
            overflow: 'hidden',
            pointerEvents: 'none', // IMPORTANTE: no bloquear clics del resto de la app
            zIndex: 1500
        }}>
            {(!showChannels && isFullscreen && showUI) && (
                <div className="open-menu-btn" onClick={() => setShowChannels(true)} title="Abrir Pantalla de Canales">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                        <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </div>
            )}

            {(!isFullscreen || showChannels) && (
                <div
                    className={`tv-hub-overlay ${isFullscreen ? 'fullscreen-overlay' : ''}`}
                    style={isMobile && isFullscreen ? {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 'auto',
                        bottom: 0,
                        width: '50vw',
                        height: '100vh',
                        maxWidth: '50vw',
                        background: 'rgba(0, 0, 0, 0.96)',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column'
                    } : {}}
                >
                    {/* Buscador global a lo ancho del overlay completo */}
                    <div className="search-bar-global-container"
                        style={isMobile ? { padding: '8px 12px 4px 12px' } : {}}
                    >
                        <input
                            id="tvhub-search-input"
                            type="text"
                            placeholder="Buscar en todos los canales..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (selectedCategory !== 'all') {
                                    handleCategorySelect('all');
                                }
                            }}
                            className="tvhub-search-input"
                            autoComplete="off"
                            style={isMobile ? { padding: '7px 10px', fontSize: '0.85rem' } : {}}
                        />
                    </div>

                    <div
                        className="tv-hub-content"
                        style={isMobile && isFullscreen ? { flexDirection: 'row', flex: 1, height: 0, minHeight: 0, overflow: 'auto' } : {}}
                    >

                        {/* Panel de Categorías */}
                        <div
                            className="tv-categories-pane"
                            style={{
                                display: isFullscreen ? 'flex' : 'none',
                                ...(isMobile && isFullscreen ? {
                                    flex: 'none',
                                    width: '150px',
                                    minWidth: '130px',
                                    height: '100%',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    borderRight: '1px solid rgba(255,255,255,0.08)',
                                    boxSizing: 'border-box',
                                    flexDirection: 'column',
                                } : {})
                            }}
                        >
                            {!isMobile && isFullscreen && <div className="fs-pane-title">Categorías</div>}
                            <div
                                className="vertical-category-list"
                                ref={categoriesRef}
                            >
                                {categories.map(cat => (
                                    <div
                                        key={cat.category_id}
                                        className={`category-vertical-item ${selectedCategory === cat.category_id ? 'active' : ''}`}
                                        onClick={() => handleCategorySelect(cat.category_id)}
                                        style={isMobile && isFullscreen ? {
                                            padding: '8px 6px',
                                            fontSize: '0.65rem',
                                            lineHeight: '1.5',
                                            margin: 0,
                                            display: 'block',
                                        } : {}}
                                    >
                                        <span className="cat-name">{cat.category_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Canales */}
                        <div
                            className="tv-channels-pane"
                            style={isMobile && isFullscreen ? {
                                flex: 1,
                                minWidth: 0,
                                height: '100%',
                                minHeight: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                padding: '0 0 0 4px'
                            } : {}}
                        >
                            {!isMobile && <div className="fs-pane-title">Lista de canales</div>}

                            {error && (
                                <div className="error-msg-overlay">
                                    <span>⚠️ {error}</span>
                                    <button onClick={() => handleCategorySelect(selectedCategory || 'all')}>Reintentar</button>
                                </div>
                            )}
                            <StreamGrid
                                showChannels={true}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                filteredStreams={filteredStreams}
                                currentStream={currentStream}
                                playStream={handlePlayStream}
                                token={token}
                                loading={streamsLoading}
                            />

                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .tv-hub-overlay {
                    position: absolute;
                    top: 80px; /* Debajo de la barra superior en modo normal */
                    bottom: 0; 
                    right: 0; /* Pegado a la derecha en modo normal */
                    left: auto;
                    width: 350px; /* Ancho del panel derecho */
                    z-index: 50;
                    display: flex;
                    flex-direction: column;
                    animation: fadeInHub 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: auto;
                }

                @keyframes fadeInHub {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                /* -- Estilos específicos para Fullscreen Overlay -- */
                .tv-hub-overlay.fullscreen-overlay {
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: auto;
                    width: 700px;
                    background: rgba(10, 10, 10, 0.85); /* Fondo semitransparente general */
                    z-index: 10000; /* Sobre el reproductor fijo 9999 */
                    animation: slideInLeft 0.3s ease-out;
                }

                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-40px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .tv-hub-overlay.fullscreen-overlay .tv-hub-content {
                    flex-direction: row; /* Columna Categorías + Columna Canales */
                }

                .tv-hub-overlay.fullscreen-overlay .tv-channels-pane {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .tv-categories-pane {
                    flex: 1; /* Ocupa 350px */
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    pointer-events: auto;
                    overflow: hidden;
                }

                .vertical-category-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    overflow-y: auto;
                    padding: 0 10px 10px 10px;
                }

                .category-vertical-item {
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    color: #a0a0a0;
                    font-size: 0.95rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .category-vertical-item:hover, .category-vertical-item.active {
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                }

                .fs-pane-title {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.85);
                    padding: 20px 10px 10px 20px;
                }
                /* -- Fin Estilos Fullscreen -- */

                .tv-hub-content {
                    position: relative;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    pointer-events: none;
                    min-height: 0;
                }

                .tv-hub-header {
                    position: absolute;
                    top: 0;
                    right: 0;
                    left: 0;
                    height: 80px;
                    display: flex;
                    justify-content: flex-end; /* Top Bar a la derecha */
                    align-items: center;
                    padding: 0 40px;
                    z-index: 100;
                }

                .tv-channels-pane {
                    position: relative; 
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    padding: 0px 5px 10px 5px;
                    pointer-events: auto; 
                }

                .search-bar-global-container {
                    padding: 20px 20px 5px 20px;
                    width: 100%;
                    flex-shrink: 0;
                    pointer-events: auto;
                    z-index: 100;
                }

                .tvhub-search-input {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 10px;
                    background: rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.2s, background 0.2s;
                }
                .tvhub-search-input:focus {
                    border-color: #3b82f6;
                    background: rgba(0, 0, 0, 0.7);
                }


                .tv-channels-pane .content-list {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    width: 100%;
                }

                .tv-channels-pane .grid-area {
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }

                /* Sobrescribir estilos de StreamGrid para TVHub */
                .tv-channels-pane .channel-card {
                    padding: 6px 10px;
                    margin-bottom: 4px;
                    border-radius: 8px;
                }
                .tv-channels-pane .channel-logo-box {
                    width: 32px;
                    height: 32px;
                    margin-right: 12px;
                    border-radius: 6px;
                }
                .tv-channels-pane .channel-name-text {
                    font-size: 0.6rem;
                    font-weight: 600;
                }
                .tv-channels-pane .grid-area::-webkit-scrollbar {
                    width: 6px;
                    display: block !important;
                }
                .tv-channels-pane .grid-area::-webkit-scrollbar-thumb {
                    background: #3b82f6;
                    border-radius: 10px;
                }
                .tv-channels-pane .grid-area::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }

                .error-msg-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    gap: 15px;
                    color: #ff4444;
                    font-weight: bold;
                }
                .error-msg-overlay button {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                }

                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-weight: 700;
                    font-size: 0.85rem;
                    letter-spacing: 1px;
                    cursor: pointer;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 10px 20px;
                    border-radius: 12px;
                    transition: all 0.2s;
                }

                .back-btn:hover { background: #3b82f6; }

                .global-close-btn {
                    width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
                    background: rgba(255, 255, 255, 0.05); border-radius: 50%; cursor: pointer; color: #fff; transition: 0.3s;
                }

                .global-close-btn:hover { background: rgba(255, 255, 255, 0.15); transform: rotate(90deg); }

                .open-menu-btn {
                    position: absolute; top: 40px; left: 40px; width: 54px; height: 54px;
                    background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(15px); border-radius: 16px;
                    display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer;
                    z-index: 500; border: 1px solid rgba(255, 255, 255, 0.1); transition: all 0.3s;
                }

                .open-menu-btn:hover { background: #3b82f6; transform: scale(1.1); }

                .vertical-category-list::-webkit-scrollbar { width: 4px; }
                .vertical-category-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }

                /* -- Responsive TV Hub para Móviles -- */
                @media screen and (max-width: 1440px), screen and (max-height: 600px) {
                    /* Overlay ocupa 50% izquierdo en móvil */
                    .tv-hub-overlay.fullscreen-overlay {
                        width: 50vw;
                        max-width: 50vw;
                        left: 0;
                        right: auto;
                    }

                    /* Categorías: columna izquierda más estrecha en fullscreen móvil */
                    .tv-categories-pane {
                        width: 150px !important;
                        min-width: 130px !important;
                        flex: none !important;
                        border-right: 1px solid rgba(255,255,255,0.08) !important;
                        border-bottom: none !important;
                        background: none !important;
                    }

                    .fs-pane-title {
                        font-size: 0.75rem !important;
                        padding: 10px 8px 6px 10px !important;
                    }

                    .vertical-category-list {
                        padding: 4px 4px 8px 4px !important;
                        gap: 2px !important;
                    }

                    .category-vertical-item {
                        padding: 9px 6px !important;
                        font-size: 0.63rem !important;
                        line-height: 1.5 !important;
                        border-radius: 6px !important;
                        overflow: visible !important;
                        display: flex !important;
                        align-items: center !important;
                        box-sizing: border-box !important;
                    }

                    .category-vertical-item .cat-name {
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                        display: block !important;
                        max-width: 100% !important;
                    }

                    /* Canales: columna derecha con logos más pequeños */
                    .channel-card-xuper {
                        padding: 4px 6px 4px 5px !important;
                        margin-bottom: 2px !important;
                        border-radius: 6px !important;
                    }

                    .channel-logo-container-xuper {
                        width: 24px !important;
                        height: 24px !important;
                        margin-right: 7px !important;
                        border-radius: 4px !important;
                        flex-shrink: 0 !important;
                    }

                    .channel-name-text-xuper {
                        font-size: 0.58rem !important;
                        letter-spacing: 0 !important;
                        line-height: 1.2 !important;
                    }

                    /* Buscador compacto */
                    .search-bar-global-container {
                        padding: 6px 10px 4px 10px !important;
                    }

                    .tvhub-search-input {
                        padding: 6px 10px !important;
                        font-size: 0.8rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default TVHub;
