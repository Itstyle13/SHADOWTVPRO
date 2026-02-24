import React, { useRef, useCallback, memo } from 'react';
import { API_BASE } from '../../config';
import CategorySidebar from './CategorySidebar';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

const StreamRow = memo(({ item, isActive, playStream, style }) => {
    if (!item) return null;
    return (
        <div style={style}>
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
    return (
        <div className={`content-list ${showChannels ? 'visible' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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

            <div className="grid-area" style={{ flex: 1, minHeight: 0 }}>
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            itemCount={filteredStreams.length}
                            itemSize={54}
                            width={width}
                            itemData={{ filteredStreams, currentStream, playStream }}
                            overscanCount={5}
                        >
                            {({ index, style, data }) => {
                                const item = data.filteredStreams[index];
                                const isActive = (
                                    data.currentStream?.stream_id === item.stream_id ||
                                    data.currentStream?.series_id === item.series_id ||
                                    data.currentStream?.id === item.id
                                );
                                return (
                                    <StreamRow
                                        item={item}
                                        isActive={isActive}
                                        playStream={data.playStream}
                                        style={{ ...style, paddingRight: '12px' }}
                                    />
                                );
                            }}
                        </List>
                    )}
                </AutoSizer>
            </div>
        </div>
    );
};

export default memo(StreamGrid);
