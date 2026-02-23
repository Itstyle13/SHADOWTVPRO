import React, { useRef, useCallback } from 'react';
import { API_BASE } from '../../config';
import CategorySidebar from './CategorySidebar';

const StreamRow = React.memo(({ item, isActive, playStream }) => {
    return (
        <div
            className={`channel-card ${isActive ? 'active' : ''}`}
            onClick={() => playStream(item, item.stream_type || 'live')}
        >
            <div className="channel-logo-box">
                <img
                    src={item.stream_icon || item.cover ? `${API_BASE}/api/proxy-icon?url=${encodeURIComponent(item.stream_icon || item.cover)}&name=${encodeURIComponent(item.name || '')}` : "/src/logo_splash.png"}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.target.src = "/src/logo_splash.png"; }}
                />
            </div>
            <div className="channel-name-text">
                {item.name}
            </div>
        </div>
    );
});

const StreamGrid = ({
    showChannels,
    searchQuery,
    setSearchQuery,
    filteredStreams,
    currentStream,
    playStream,
    categories = [],
    selectedCategory,
    handleCategorySelect,
    categoriesRef
}) => {
    const scrollRef = useRef(null);

    const scrollBy = useCallback((pages) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ top: pages * 78 * 5, behavior: 'smooth' });
        }
    }, []);

    return (
        <div className={`content-list ${showChannels ? 'visible' : ''}`}>
            {/* Categorías Horizontales */}
            {categories.length > 0 && (
                <CategorySidebar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    handleCategorySelect={handleCategorySelect}
                    categoriesRef={categoriesRef}
                />
            )}

            {/* Buscador Premium */}
            <div className="search-container">
                <div className="search-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="20" y1="20" x2="15.5" y2="15.5" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Buscar canal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
                {searchQuery && (
                    <div className="search-clear" onClick={() => setSearchQuery('')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="grid-area" ref={scrollRef}>
                {filteredStreams.map((item, index) => {
                    const isActive = (
                        currentStream?.stream_id === item.stream_id ||
                        currentStream?.series_id === item.series_id ||
                        currentStream?.id === item.id
                    );
                    return (
                        <StreamRow
                            key={item.stream_id || item.series_id || item.id || index}
                            item={item}
                            isActive={isActive}
                            playStream={playStream}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(StreamGrid);
