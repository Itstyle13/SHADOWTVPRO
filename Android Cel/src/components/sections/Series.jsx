import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

const Series = ({ API_BASE, token, onPlayStream, currentStream, setSelectedType, isFullscreen, showChannels, setShowChannels, onStreamsUpdate, onDataLoaded, selectedType, setNavigationHandlers }) => {
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

    // Estados para el detalle de la serie
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [seriesDetail, setSeriesDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeSeason, setActiveSeason] = useState(null);

    const categoriesRef = useRef(null);
    const contentAreaRef = useRef(null);
    const hasReportedInitial = useRef(false);

    // Fetch All Categories and Series
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [catRes, streamRes] = await Promise.all([
                    axios.get(`${API_BASE}/categories/series`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE}/streams/series`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

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
                    onDataLoaded?.('series', streamRes.data);
                    hasReportedInitial.current = true;
                }
            } catch (err) {
                setError('Error al cargar contenido de series');
                console.error(err);
                if (!hasReportedInitial.current) {
                    onDataLoaded?.('series', []);
                    hasReportedInitial.current = true;
                }
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [API_BASE, token]);

    // Debounce Search Logic
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Optimized Filtering & Sorting
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

    // Infinite Scroll Logic
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 500) {
            if (visibleCount < filteredStreams.length) {
                setVisibleCount(prev => prev + 50);
            }
        }
    };

    useEffect(() => {
        setVisibleCount(50);
        if (contentAreaRef.current) contentAreaRef.current.scrollTop = 0;
    }, [selectedCategory, debouncedSearch, sortBy]);

    const handleBack = () => {
        if (selectedSeries) {
            setSelectedSeries(null);
            setSeriesDetail(null);
            setActiveSeason(null);
            return;
        }
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        setSelectedType('live', false, false);
        setShowChannels(false);
    };

    const handleSelectSeries = async (series) => {
        setSelectedSeries(series);
        setLoadingDetail(true);
        try {
            const res = await axios.get(`${API_BASE}/series/${series.series_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSeriesDetail(res.data);

            // Auto seleccionar primera temporada
            const seasons = Object.keys(res.data.episodes || {});
            if (seasons.length > 0) {
                setActiveSeason(seasons[0]);
            }
        } catch (err) {
            console.error("Error cargando detalle de serie:", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handlePlayEpisode = (episode) => {
        // Formatear el episodio como un stream reproducible
        const streamData = {
            ...episode,
            stream_id: episode.id,
            name: episode.title,
            stream_type: 'series'
        };
        onPlayStream(streamData, 'series');
        setShowChannels(false);
    };

    // Next/Prev for Episodes
    useEffect(() => {
        if (!setNavigationHandlers) return;
        const handleNext = () => {
            if (!currentStream || !seriesDetail || !seriesDetail.episodes) return;
            let foundSeason = null;
            let foundIdx = -1;
            const seasons = Object.keys(seriesDetail.episodes).sort((a, b) => a - b);
            for (const s of seasons) {
                const idx = seriesDetail.episodes[s].findIndex(ep => ep.id === currentStream.id);
                if (idx >= 0) {
                    foundSeason = s; foundIdx = idx; break;
                }
            }
            if (foundSeason !== null) {
                const epList = seriesDetail.episodes[foundSeason];
                if (foundIdx < epList.length - 1) {
                    const nextEp = epList[foundIdx + 1];
                    const streamData = { ...nextEp, stream_id: nextEp.id, name: nextEp.title, stream_type: 'series' };
                    onPlayStream(streamData, 'series'); setShowChannels(false);
                } else {
                    const seasonIdx = seasons.indexOf(foundSeason);
                    if (seasonIdx < seasons.length - 1) {
                        const nextSeason = seasons[seasonIdx + 1];
                        setActiveSeason(nextSeason);
                        const nextEp = seriesDetail.episodes[nextSeason][0];
                        if (nextEp) {
                            const streamData = { ...nextEp, stream_id: nextEp.id, name: nextEp.title, stream_type: 'series' };
                            onPlayStream(streamData, 'series'); setShowChannels(false);
                        }
                    }
                }
            }
        };

        const handlePrev = () => {
            if (!currentStream || !seriesDetail || !seriesDetail.episodes) return;
            let foundSeason = null;
            let foundIdx = -1;
            const seasons = Object.keys(seriesDetail.episodes).sort((a, b) => a - b);
            for (const s of seasons) {
                const idx = seriesDetail.episodes[s].findIndex(ep => ep.id === currentStream.id);
                if (idx >= 0) {
                    foundSeason = s; foundIdx = idx; break;
                }
            }
            if (foundSeason !== null) {
                const epList = seriesDetail.episodes[foundSeason];
                if (foundIdx > 0) {
                    const prevEp = epList[foundIdx - 1];
                    const streamData = { ...prevEp, stream_id: prevEp.id, name: prevEp.title, stream_type: 'series' };
                    onPlayStream(streamData, 'series'); setShowChannels(false);
                } else {
                    const seasonIdx = seasons.indexOf(foundSeason);
                    if (seasonIdx > 0) {
                        const prevSeason = seasons[seasonIdx - 1];
                        setActiveSeason(prevSeason);
                        const prevEpList = seriesDetail.episodes[prevSeason];
                        const prevEp = prevEpList[prevEpList.length - 1];
                        if (prevEp) {
                            const streamData = { ...prevEp, stream_id: prevEp.id, name: prevEp.title, stream_type: 'series' };
                            onPlayStream(streamData, 'series'); setShowChannels(false);
                        }
                    }
                }
            }
        };
        setNavigationHandlers({ next: handleNext, prev: handlePrev });
    }, [currentStream, seriesDetail, setNavigationHandlers, onPlayStream, setShowChannels]);

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

    // RENDERIZADO DE VISTA DETALLE
    if (selectedSeries) {
        return (
            <div className="movie-hub-container series-hub-container" style={{ display: showChannels ? 'flex' : 'none', flexDirection: 'column' }}>
                {/* Top Navigation remains in Detail View for consistency */}
                <div className="movie-top-nav">
                    <div className="movie-top-links">
                        <div className="movie-nav-item" onClick={() => { setSelectedType('live', false, true); setShowChannels(true); }}>TV en vivo</div>
                        <div className="movie-nav-separator"></div>
                        <div className="movie-nav-item" onClick={() => { setSelectedType('vod', false, true); setShowChannels(true); }}>Películas</div>
                        <div className="movie-nav-separator"></div>
                        <div className="movie-nav-item active">Series</div>
                    </div>
                    <div className="movie-top-right">
                        <div className="movie-search-container" style={{ visibility: 'hidden' }}>
                            {/* Hidden search purely for layout alignment if needed, or omit it */}
                        </div>
                        <div className="movie-top-logo">
                            <img src="/logo_splash.png" alt="Shadow TV" />
                        </div>
                    </div>
                </div>

                <div className="movie-hub-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div className="movie-sidebar">
                        <div className="sidebar-header">
                            <button className="sidebar-btn" onClick={handleBack} style={{ marginBottom: '20px' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Atras
                            </button>
                        </div>
                        <div className="categories-scroll-area">
                            {seriesDetail && seriesDetail.episodes && Object.keys(seriesDetail.episodes).sort((a, b) => a - b).map(seasonNum => (
                                <div
                                    key={seasonNum}
                                    className={`movie-category-item season-item ${activeSeason === seasonNum ? 'active' : ''}`}
                                    onClick={() => setActiveSeason(seasonNum)}
                                >
                                    <span>Temporada {seasonNum}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="movie-content-area detail-content-area" style={{ flex: 1, overflowY: 'auto', padding: '40px 60px' }}>
                        <div className="series-detail-header" style={{ marginBottom: '30px' }}>
                            <h1 className="series-main-title" style={{ fontSize: '32px', color: '#fff', margin: 0 }}>{selectedSeries.name}</h1>
                        </div>

                        {loadingDetail ? (
                            <div className="loading-center" style={{ background: 'transparent' }}><div className="spinner"></div></div>
                        ) : (
                            <div className="episodes-list-container">
                                {seriesDetail?.episodes?.[activeSeason]?.map((ep, idx) => {
                                    // Múltiples fallbacks para asegurar que aparezca una imagen
                                    const epIcon = ep.movie_image || ep.info?.movie_image || ep.stream_icon || ep.icon || selectedSeries?.cover;
                                    const proxiedEpIcon = epIcon ? `${API_BASE}/proxy-icon?url=${encodeURIComponent(epIcon)}&name=${encodeURIComponent(ep.title || '')}` : "/logo_splash.png";
                                    return (
                                        <div key={ep.id} className="episode-card-premium" onClick={() => handlePlayEpisode(ep)}>
                                            <div className="episode-index">{idx + 1}</div>
                                            <div className="episode-thumbnail">
                                                <img src={proxiedEpIcon} alt={ep.title} onError={(e) => e.target.src = "/logo_splash.png"} />
                                                <div className="play-overlay">
                                                    <svg viewBox="0 0 24 24" fill="white" width="30" height="30"><path d="M8 5v14l11-7z" /></svg>
                                                </div>
                                            </div>
                                            <div className="episode-info">
                                                <div className="episode-title-row">
                                                    <span className="episode-title">{selectedSeries.name} - S{String(activeSeason).padStart(2, '0')}E{String(ep.episode_num).padStart(2, '0')} - {ep.title}</span>
                                                </div>
                                                <p className="episode-plot">{ep.info?.plot || 'Sin descripción disponible.'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // RENDERIZADO DE VISTA CUADRÍCULA (NORMAL)
    return (
        <div className="movie-hub-container series-hub-container" style={{ display: showChannels ? 'flex' : 'none', flexDirection: 'column' }}>
            {/* Top Navigation */}
            <div className="movie-top-nav">
                <div className="movie-top-links">
                    <div className="movie-nav-item" onClick={() => { setSelectedType('live', false, true); setShowChannels(true); }}>TV en vivo</div>
                    <div className="movie-nav-separator"></div>
                    <div className="movie-nav-item" onClick={() => { setSelectedType('vod', false, true); setShowChannels(true); }}>Películas</div>
                    <div className="movie-nav-separator"></div>
                    <div className="movie-nav-item active">Series</div>
                </div>
                <div className="movie-top-right">
                    <div className="movie-search-container">
                        <svg className="movie-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            id="seriesSearch"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="movie-top-logo">
                        <img src="/logo_splash.png" alt="Shadow TV" />
                    </div>
                </div>
            </div>

            <div className="movie-hub-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div className="movie-sidebar">
                    <div className="sidebar-header">
                        <div className="logo-section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                            <div className="video-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg viewBox="0 0 24 24" fill="white" width="40" height="40">
                                    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
                                    <path d="m6.2 5.3 3.1 3.9" />
                                    <path d="m12.4 3.4 3.1 4" />
                                    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                                </svg>
                            </div>
                        </div>
                        <button className="sidebar-btn" onClick={handleBack}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="18" height="18">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Atras
                        </button>
                        <div className="sidebar-btn" onClick={() => document.getElementById('seriesSearch')?.focus()}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Busca
                        </div>
                    </div>

                    <div className="categories-scroll-area" ref={categoriesRef}>
                        <div className="movie-category-item">
                            <span>Visto recientemente</span>
                            <span className="category-count">0</span>
                        </div>
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
                                <span><span style={{ color: '#ff9800', marginRight: '5px' }}>▶</span>{cat.category_name}</span>
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
                            <h2 className="current-category-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#ff9800' }}>▶</span> {currentCategoryName} <span style={{ color: '#ff9800' }}>▶</span>({filteredStreams.length})
                            </h2>
                        </div>
                    </div>

                    <div className="movie-poster-grid">
                        {filteredStreams.slice(0, visibleCount).map(item => {
                            const iconUrl = item.cover || item.stream_icon;
                            const proxiedIcon = iconUrl ? `${API_BASE}/proxy-icon?url=${encodeURIComponent(iconUrl)}&name=${encodeURIComponent(item.name || '')}` : "/logo_splash.png";
                            return (
                                <div key={item.series_id || item.stream_id} className="movie-card-premium" onClick={() => handleSelectSeries(item)}>
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
        </div>
    );
};

export default Series;
