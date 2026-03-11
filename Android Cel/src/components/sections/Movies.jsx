import { useState, useEffect, useRef, useMemo, memo } from 'react';
import axios from 'axios';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { getHistory } from '../../utils/history';

const MovieCard = memo(({ data, columnIndex, rowIndex, style }) => {
    const { items, columnCount, onPlay, API_BASE } = data;
    const index = rowIndex * columnCount + columnIndex;
    const item = items[index];

    if (!item) return null;

    const iconUrl = item.stream_icon || item.cover;
    const proxiedIcon = iconUrl ? `${API_BASE}/proxy-icon?url=${encodeURIComponent(iconUrl)}&name=${encodeURIComponent(item.name || '')}` : "/logo_splash.png";

    return (
        <div style={{
            ...style,
            padding: '10px',
            boxSizing: 'border-box'
        }}>
            <div className="movie-card-premium" onClick={() => onPlay(item)}>
                <img src={proxiedIcon} alt={item.name} loading="lazy" onError={(e) => e.target.src = "/logo_splash.png"} />
                {item.savedTime > 0 && item.savedDuration > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', background: 'rgba(255,255,255,0.2)', width: '100%', zIndex: 12 }}>
                        <div style={{ width: `${(item.savedTime / item.savedDuration) * 100}%`, height: '100%', background: '#ff4444' }}></div>
                    </div>
                )}
                <div className="movie-card-overlay">
                    <div className="movie-card-title">{item.name}</div>
                    <div className="movie-card-info">{item.name.match(/\((19|20)\d{2}\)/) ? item.name.match(/\((19|20)\d{2}\)/)[0].replace(/[()]/g, '') : ''}</div>
                </div>
            </div>
        </div>
    );
});

const MovieRow = memo((props) => {
    const data = props.data || props;
    const { items, columnCount, onPlay, API_BASE } = data;
    const index = props.rowIndex !== undefined ? props.rowIndex : props.index;
    const style = props.style;

    const startIndex = index * columnCount;
    const rowItems = [];
    for (let i = 0; i < columnCount; i++) {
        rowItems.push(items[startIndex + i]);
    }

    return (
        <div style={{ ...style, display: 'flex' }}>
            {rowItems.map((item, i) => (
                <MovieCard
                    key={item?.stream_id || startIndex + i}
                    data={data}
                    columnIndex={i}
                    rowIndex={index}
                    style={{ width: `${100 / columnCount}%`, height: '100%', position: 'relative' }}
                />
            ))}
        </div>
    );
});

const Movies = ({ API_BASE, token, onPlayStream, currentStream, setSelectedType, isFullscreen, showChannels, setShowChannels, onStreamsUpdate, onDataLoaded, selectedType, setNavigationHandlers }) => {
    const [categories, setCategories] = useState([]);
    const [allStreams, setAllStreams] = useState([]);
    const [recentStreams, setRecentStreams] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showSort, setShowSort] = useState(false);
    const [sortBy, setSortBy] = useState('added');

    const categoriesRef = useRef(null);
    const listRef = useRef(null);
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

                const counts = {};
                streamRes.data.forEach(s => {
                    counts[s.category_id] = (counts[s.category_id] || 0) + 1;
                });

                const enrichedCategories = (catRes.data || []).map(cat => ({
                    ...cat,
                    count: counts[cat.category_id] || 0
                }));

                setCategories(enrichedCategories);
                setAllStreams(streamRes.data || []);
                if (!hasReportedInitial.current) {
                    onDataLoaded?.('vod', streamRes.data || []);
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

    // Load History
    useEffect(() => {
        if (showChannels && selectedType === 'vod') {
            setRecentStreams(getHistory('vod'));
        }
    }, [showChannels, selectedType]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Optimized Filtering & Sorting via useMemo
    const filteredStreams = useMemo(() => {
        if (selectedCategory === 'recent') return recentStreams;
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
    }, [selectedCategory, allStreams, debouncedSearch, sortBy, recentStreams]);

    // Setup Navigation Handlers
    useEffect(() => {
        if (!setNavigationHandlers) return;
        const handleNext = () => {
            if (!currentStream) return;
            const streams = filteredStreams || [];
            const idx = streams.findIndex(s => (s.stream_id || s.id) === (currentStream.stream_id || currentStream.id));
            if (idx >= 0 && idx < streams.length - 1) { onPlayStream(streams[idx + 1], 'vod'); setShowChannels(false); }
        };
        const handlePrev = () => {
            if (!currentStream) return;
            const streams = filteredStreams || [];
            const idx = streams.findIndex(s => (s.stream_id || s.id) === (currentStream.stream_id || currentStream.id));
            if (idx > 0) { onPlayStream(streams[idx - 1], 'vod'); setShowChannels(false); }
        };
        setNavigationHandlers('vod', { next: handleNext, prev: handlePrev });
    }, [currentStream, filteredStreams, setNavigationHandlers, onPlayStream, setShowChannels]);

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

    if (loading && categories.length === 0) return <div className="loading-center" style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'white', background: '#000' }}><div className="spinner"></div><p>Cargando Películas...</p></div>;
    if (error && allStreams.length === 0) return <div className="error-center" style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff4444', background: '#000' }}><h2>⚠️ {error}</h2><button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px' }}>Reintentar</button></div>;

    const currentCategoryName = selectedCategory === 'all' ? 'TODO' : (selectedCategory === 'recent' ? 'VISTO RECIENTEMENTE' : categories.find(c => c.category_id === selectedCategory)?.category_name || '');

    return (
        <div className="movie-hub-container" style={{ display: showChannels ? 'flex' : 'none', flexDirection: 'column', background: 'radial-gradient(circle at 20% 50%, rgba(20, 20, 35, 0.95) 0%, rgba(5, 5, 5, 0.98) 100%)' }}>
            <div className="movie-top-nav">
                <div className="movie-top-links">
                    <div className="movie-nav-item" onClick={() => { setSelectedType('live', false, true); setShowChannels(true); }}>TV en vivo</div>
                    <div className="movie-nav-separator"></div>
                    <div className="movie-nav-item active">Películas</div>
                    <div className="movie-nav-separator"></div>
                    <div className="movie-nav-item" onClick={() => { setSelectedType('series', false, true); setShowChannels(true); }}>Series</div>
                </div>
                <div className="movie-top-right">
                    <div className="movie-search-container">
                        <svg className="movie-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            id="movieSearch"
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
                        {recentStreams.length > 0 && (
                            <div className={`movie-category-item ${selectedCategory === 'recent' ? 'active' : ''}`} onClick={() => setSelectedCategory('recent')}>
                                <span>Visto recientemente</span>
                                <span className="category-count">{recentStreams.length}</span>
                            </div>
                        )}
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

                <div className="movie-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="movie-top-bar">
                        <div className="sort-dropdown" onClick={() => setShowSort(!showSort)}>
                            {SORT_LABELS[sortBy]}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                            {showSort && (
                                <div className="sort-options">
                                    {Object.entries(SORT_LABELS || {}).map(([key, label]) => (
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

                    <div className="movie-virtual-grid-wrapper" style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                        <AutoSizer renderProp={({ height, width }) => {
                                const finalHeight = height || 600;
                                const finalWidth = width || 800;
                                if (height === 0 || width === 0) {
                                    return <div style={{ height: '100%', width: '100%', background: 'rgba(255,0,0,0.5)', color: 'white', padding: '10px', fontSize: '20px', fontWeight: 'bold' }}>⚠️ ERROR MOVIES DIM: H={height} W={width}</div>;
                                }
                                const minCardWidth = 180;
                                const columnCount = Math.max(1, Math.floor(finalWidth / minCardWidth));
                                const rowCount = Math.ceil(filteredStreams.length / columnCount);
                                const columnWidth = finalWidth / columnCount;
                                const rowHeight = columnWidth * 1.5;

                                const itemData = {
                                    items: filteredStreams,
                                    columnCount,
                                    onPlay: handlePlay,
                                    API_BASE
                                };

                                return (
                                    <List
                                        rowCount={rowCount}
                                        rowHeight={rowHeight}
                                        rowProps={itemData}
                                        rowComponent={MovieRow}
                                        className="movies-scroll-container"
                                        style={{ 
                                            height: finalHeight, 
                                            width: finalWidth
                                        }}
                                    />
                                );
                            }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Movies;
