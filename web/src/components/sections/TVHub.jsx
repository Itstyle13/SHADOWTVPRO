import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import StreamGrid from '../PlayerComponents/StreamGrid';

const TVHub = ({ API_BASE, token, onPlayStream, currentStream, setSelectedType, setNavigationHandlers, isFullscreen, showUI, onStreamsUpdate, showChannels, setShowChannels, onDataLoaded, selectedType }) => {
    const [categories, setCategories] = useState([]);
    const [streams, setStreams] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const hasReportedInitial = useRef(false);

    const categoriesRef = useRef(null);
    const streamCache = useRef({});

    const fetchStreams = useCallback(async (categoryId) => {
        if (streamCache.current[categoryId]) {
            setStreams(streamCache.current[categoryId]);
            setSearchQuery('');
            return;
        }

        setLoading(true);
        setSearchQuery('');
        try {
            const url = categoryId === 'all'
                ? `${API_BASE}/streams/live`
                : `${API_BASE}/streams/live?category_id=${categoryId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });

            streamCache.current[categoryId] = res.data;
            setStreams(res.data);
            setError(null);

            if (!hasReportedInitial.current) {
                onDataLoaded?.('live', res.data);
                hasReportedInitial.current = true;
            }
        } catch (err) {
            console.error("Error loading streams:", err);
            setError('Error al cargar contenido');
            if (!hasReportedInitial.current && categoryId === 'all') {
                onDataLoaded?.('live', []);
                hasReportedInitial.current = true;
            }
        } finally {
            setLoading(false);
        }
    }, [API_BASE, token, onDataLoaded]);

    const handleCategorySelect = useCallback(async (categoryId) => {
        setSelectedCategory(categoryId);
        await fetchStreams(categoryId);
    }, [fetchStreams]);

    useEffect(() => {
        // Solo forzar mostrar canales si estamos en la sección LIVE
        if (isFullscreen && selectedType === 'live') {
            setShowChannels(true);
        }
    }, [isFullscreen, setShowChannels, selectedType]);

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
        if (!searchQuery) return streams;
        const query = searchQuery.toLowerCase();
        return streams.filter(item =>
            item.name?.toLowerCase().includes(query) ||
            item.stream_id?.toString().includes(query)
        );
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
        setShowChannels(false);
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
        <div style={{ display: isFullscreen ? 'contents' : 'none' }}>
            {(!showChannels && isFullscreen && showUI) && (
                <div className="open-menu-btn" onClick={() => setShowChannels(true)} title="Abrir Pantalla de Canales">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                        <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </div>
            )}

            <div className="tv-hub-overlay" style={{ display: showChannels ? 'flex' : 'none' }}>
                <div className="tv-hub-header">
                    <div className="back-btn" onClick={handleBackToHome}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        <span>INICIO</span>
                    </div>
                    <div className="global-close-btn" onClick={() => setShowChannels(false)} title="Cerrar Menú">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                </div>

                <div className="tv-hub-content">
                    <div className="tv-categories-pane">
                        <h2 className="pane-title">Categorías</h2>
                        <div className="vertical-category-list" ref={categoriesRef}>
                            {categories.map(cat => (
                                <div
                                    key={cat.category_id}
                                    className={`category-vertical-item ${selectedCategory === cat.category_id ? 'active' : ''}`}
                                    onClick={() => handleCategorySelect(cat.category_id)}
                                >
                                    {cat.category_name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="tv-channels-pane">
                        <StreamGrid
                            showChannels={true}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            filteredStreams={filteredStreams}
                            currentStream={currentStream}
                            playStream={handlePlayStream}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                .tv-hub-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 2000;
                    display: flex;
                    flex-direction: column;
                    animation: fadeInHub 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: auto;
                }

                @keyframes fadeInHub {
                    from { opacity: 0; transform: scale(1.05); }
                    to { opacity: 1; transform: scale(1); }
                }

                .tv-hub-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 40px 50px 20px;
                }

                .tv-hub-content {
                    display: flex;
                    flex: 1;
                    padding: 0 40px 40px;
                    gap: 20px;
                    min-height: 0;
                    justify-content: flex-start;
                }

                .tv-categories-pane {
                    width: 220px;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(20px);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 12px;
                    min-height: 0;
                }

                .pane-title {
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: #888;
                    margin-bottom: 15px;
                    font-weight: 800;
                    text-align: center;
                }

                .vertical-category-list {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                }

                .category-vertical-item {
                    padding: 6px 10px;
                    margin-bottom: 4px;
                    border-radius: 6px;
                    color: #aaa;
                    font-size: 0.65rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-transform: uppercase;
                }

                .category-vertical-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }

                .category-vertical-item.active {
                    background: linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, transparent 100%);
                    color: #fff;
                    font-weight: 700;
                    border-left: 3px solid #3b82f6;
                }

                .tv-channels-pane {
                    width: 220px;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(20px);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    padding: 12px;
                }

                .tv-channels-pane .content-list {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                .tv-channels-pane .grid-area {
                    flex: 1;
                    overflow-y: auto !important;
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
            `}</style>
        </div>
    );
};

export default TVHub;
