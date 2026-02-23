import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';

const Movies = ({ API_BASE, token, onPlayStream, currentStream, setSelectedType, isFullscreen, showChannels, setShowChannels, onStreamsUpdate, onDataLoaded, selectedType }) => {
    const [categories, setCategories] = useState([]);
    const [allStreams, setAllStreams] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showSort, setShowSort] = useState(false);
    const [sortBy, setSortBy] = useState('added');
    const [visibleCount, setVisibleCount] = useState(50);

    const categoriesRef = useRef(null);
    const contentAreaRef = useRef(null);
    const hasReportedInitial = useRef(false);

    // Fetch Initial Data
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [catRes, streamRes] = await Promise.all([
                    axios.get(`${API_BASE}/categories/vod`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE}/streams/vod`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                // Optimización: Calcular conteos en una sola pasada (O(N))
                const counts = {};
                streamRes.data.forEach(s => {
                    counts[s.category_id] = (counts[s.category_id] || 0) + 1;
                });

                const enrichedCategories = catRes.data.map(cat => ({
                    ...cat,
                    count: counts[cat.category_id] || 0
                }));

                setCategories(enrichedCategories);
                setAllStreams(streamRes.data);
                if (!hasReportedInitial.current) {
                    onDataLoaded?.('vod', streamRes.data);
                    hasReportedInitial.current = true;
                }
            } catch (err) {
                setError('Error al cargar contenido');
                console.error(err);
                if (!hasReportedInitial.current) {
                    onDataLoaded?.('vod', []);
                    hasReportedInitial.current = true;
                }
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [API_BASE, token]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Optimized Filtering & Sorting via useMemo
    const filteredStreams = useMemo(() => {
        let result = [...allStreams];

        if (selectedCategory !== 'all') {
            result = result.filter(s => s.category_id === selectedCategory);
        }

        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(s => s.name?.toLowerCase().includes(query));
        }

        switch (sortBy) {
            case 'az': result.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
            case 'za': result.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
            case 'added': result.sort((a, b) => (b.added || 0) - (a.added || 0)); break;
            case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            default: break;
        }

        return result;
    }, [selectedCategory, allStreams, debouncedSearch, sortBy]);

    // Reset visible count on filter change
    useEffect(() => {
        setVisibleCount(50);
        if (contentAreaRef.current) contentAreaRef.current.scrollTop = 0;
    }, [selectedCategory, debouncedSearch, sortBy]);

    // Infinite Scroll Implementation
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 500) {
            if (visibleCount < filteredStreams.length) {
                setVisibleCount(prev => prev + 50);
            }
        }
    };

    const handleBack = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        setSelectedType('live', false, false);
        setShowChannels(false);
    };

    const handlePlay = (item) => {
        onPlayStream(item, 'vod');
        setShowChannels(false);
    };

    useEffect(() => {
        if (typeof onStreamsUpdate === 'function') {
            onStreamsUpdate(filteredStreams);
        }
    }, [filteredStreams, onStreamsUpdate]);

    const SORT_LABELS = {
        added: 'Ordenar por añadidos',
        numbers: 'Ordenar por números',
        rating: 'Ordenar por calificación',
        az: 'Ordenar por A-Z',
        za: 'Pedido por Z-A'
    };

    if (loading && categories.length === 0) return <div className="loading-center"><div className="spinner"></div></div>;

    const currentCategoryName = selectedCategory === 'all' ? 'TODO' : categories.find(c => c.category_id === selectedCategory)?.category_name || '';
    return (
        <div className="movie-hub-container" style={{ display: showChannels ? 'flex' : 'none' }}>
            <div className="movie-sidebar">

                <div className="sidebar-header">
                    <div className="logo-section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                        <div className="video-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="white" width="40" height="40">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                    <button className="sidebar-btn" onClick={handleBack}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Atras
                    </button>
                    <div className="sidebar-btn" onClick={() => document.getElementById('movieSearch').focus()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Busca
                    </div>
                </div>

                <div className="categories-scroll-area" ref={categoriesRef}>
                    <div className={`movie-category-item ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
                        <span>ALL</span>
                        <span className="category-count">{allStreams.length}</span>
                    </div>
                    <div className="movie-category-item">
                        <span>Favorito</span>
                        <span className="category-count">0</span>
                    </div>
                    {categories.map(cat => (
                        <div
                            key={cat.category_id}
                            className={`movie-category-item ${selectedCategory === cat.category_id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.category_id)}
                        >
                            <span>{cat.category_name}</span>
                            <span className="category-count">{cat.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="movie-content-area" ref={contentAreaRef} onScroll={handleScroll}>
                <div className="movie-top-bar">
                    <div className="sort-dropdown" onClick={() => setShowSort(!showSort)}>
                        {SORT_LABELS[sortBy]}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                        {showSort && (
                            <div className="sort-options">
                                {Object.entries(SORT_LABELS).map(([key, label]) => (
                                    <div key={key} className="sort-option" onClick={(e) => { e.stopPropagation(); setSortBy(key); setShowSort(false); }}>
                                        {label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="category-header-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="search-box-premium" style={{ position: 'relative' }}>
                            <input
                                id="movieSearch"
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '8px 15px', borderRadius: '8px', color: 'white', outline: 'none' }}
                            />
                        </div>
                        <h2 className="current-category-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#ff9800' }}>▶</span> {currentCategoryName} <span style={{ color: '#ff9800' }}>▶</span>({filteredStreams.length})
                        </h2>
                    </div>
                </div>

                <div className="movie-poster-grid">
                    {filteredStreams.slice(0, visibleCount).map(item => {
                        const iconUrl = item.stream_icon || item.cover;
                        const proxiedIcon = iconUrl ? `${API_BASE}/proxy-icon?url=${encodeURIComponent(iconUrl)}&name=${encodeURIComponent(item.name || '')}` : "/logo_splash.png";
                        return (
                            <div key={item.stream_id} className="movie-card-premium" onClick={() => handlePlay(item)}>
                                <img src={proxiedIcon} alt={item.name} loading="lazy" onError={(e) => e.target.src = "/logo_splash.png"} />
                                <div className="movie-card-overlay">
                                    <div className="movie-card-title">{item.name}</div>
                                    <div className="movie-card-info">{item.name.match(/\((19|20)\d{2}\)/) ? item.name.match(/\((19|20)\d{2}\)/)[0].replace(/[()]/g, '') : ''}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleCount < filteredStreams.length && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        Cargando más contenido...
                    </div>
                )}
            </div>
        </div>
    );
};

export default Movies;
