import React, { memo, useMemo, useRef } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { API_BASE } from '../../config';
import CategorySidebar from './CategorySidebar';

const StreamRow = memo((props) => {
    const data = props.data || props;
    const { items, currentStream, playStream, token, favorites, toggleFavorite } = data;
    const index = props.rowIndex !== undefined ? props.rowIndex : props.index;
    const style = props.style;

    const item = items ? items[index] : null;
    const timerRef = useRef(null);
    const isFavorite = favorites && item ? favorites.includes((item.stream_id || item.id).toString()) : false;
    
    if (!item) return null;

    const isActive = (
        currentStream?.stream_id === item.stream_id ||
        currentStream?.series_id === item.series_id ||
        currentStream?.id === item.id
    );

    return (
        <div style={{
            ...style,
            padding: '0 8px'
        }}>
            <div
                className={`channel-card-xuper ${isActive ? 'active' : ''}`}
                onClick={() => playStream(item, item.stream_type || 'live')}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (toggleFavorite) toggleFavorite(item.stream_id || item.id);
                }}
                onPointerDown={() => {
                    timerRef.current = setTimeout(() => {
                        if (toggleFavorite) toggleFavorite(item.stream_id || item.id);
                        timerRef.current = null;
                        if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback opcional
                    }, 600); // 600ms long press
                }}
                onPointerUp={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
                onPointerMove={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
                onPointerCancel={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
                style={{ marginBottom: 0, position: 'relative' }} 
            >
                <div className="channel-logo-container-xuper">
                    <img
                        src={item.stream_icon || item.cover ? `${API_BASE}/api/proxy-icon?url=${encodeURIComponent(item.stream_icon || item.cover)}&name=${encodeURIComponent(item.name || '')}${token ? `&token=${token}` : ''}` : "/src/logo_splash.png"}
                        alt=""
                        loading="lazy"
                        className="channel-img-xuper"
                        onError={(e) => { e.target.src = "/src/logo_splash.png"; }}
                    />
                </div>
                <div className="channel-name-text-xuper">
                    {item.name}
                </div>
                {isFavorite && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#ef4444" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))' }}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                )}
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
    categoriesRef,
    token,
    loading: externalLoading,
    favorites,
    toggleFavorite
}) => {
    // Debugging logs to console
    console.log(`[StreamGrid] filteredStreams: ${filteredStreams?.length}, showChannels: ${showChannels}, selected: ${selectedCategory}`);

    const itemData = useMemo(() => ({
        items: filteredStreams,
        currentStream,
        playStream,
        token,
        favorites,
        toggleFavorite
    }), [filteredStreams, currentStream, playStream, token, favorites, toggleFavorite]);

    return (
        <>
            <style>{`
                .channel-card-xuper {
                    display: flex;
                    align-items: center;
                    background: rgba(30, 30, 30, 0.75);
                    border-radius: 12px;
                    padding: 8px 16px 8px 8px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
                    border: 1px solid rgba(255,255,255,0.05);
                    height: 56px; 
                    box-sizing: border-box;
                    will-change: transform;
                }
                .channel-card-xuper:hover {
                    background: rgba(50, 50, 50, 0.9);
                }
                .channel-card-xuper:active {
                    transform: scale(0.97);
                    background: rgba(80, 80, 80, 0.95);
                    box-shadow: 0 0 15px rgba(255,255,255,0.1);
                }
                .channel-card-xuper.active {
                    background: rgba(60, 60, 60, 0.95);
                    border: 1px solid rgba(255,255,255,0.3);
                    box-shadow: 0 0 10px rgba(255,255,255,0.1);
                }
                .channel-logo-container-xuper {
                    width: 44px;
                    height: 44px;
                    background: rgba(20, 20, 20, 0.8);
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-right: 16px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .channel-img-xuper {
                    max-width: 80%;
                    max-height: 80%;
                    object-fit: contain;
                }
                .channel-name-text-xuper {
                    color: white;
                    font-size: 0.85rem;
                    font-weight: 500;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .grid-area {
                    scrollbar-width: thin;
                    scrollbar-color: #3b82f6 rgba(255, 255, 255, 0.05);
                }
            `}</style>
            <div className={`content-list ${showChannels ? 'visible' : ''}`} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Categorías Horizontales */}
                {categories.length > 0 && (
                    <CategorySidebar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        handleCategorySelect={handleCategorySelect}
                        categoriesRef={categoriesRef}
                    />
                )}

                <div className="grid-area" style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                    {externalLoading || (filteredStreams && filteredStreams.length === 0) ? (
                        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <div className="no-channels-msg" style={{ width: '100%', textAlign: 'center', fontSize: '1.2rem', fontWeight: '500' }}>
                                {externalLoading ? '⌛ Cargando canales...' : (searchQuery ? `🔍 No se encontraron canales (${searchQuery})` : '📺 No hay canales disponibles')}
                            </div>
                        </div>
                    ) : (
                        <AutoSizer renderProp={({ height, width }) => {
                                const finalHeight = height || 500;
                                const finalWidth = width || 300;
                                if (!height || !width) {
                                    return <div style={{ height: '100%', width: '100%', background: 'rgba(255,0,0,0.5)', color: 'white', padding: '10px', fontSize: '20px', fontWeight: 'bold' }}>⚠️ ERROR DIMENSIONES: H={height} W={width}</div>;
                                }
                                return (
                                    <List
                                        rowCount={filteredStreams.length}
                                        rowHeight={64}
                                        rowProps={itemData}
                                        rowComponent={StreamRow}
                                        className="channels-scroll-container"
                                        style={{ 
                                            height: finalHeight, 
                                            width: finalWidth
                                        }}
                                    />
                                );
                            }} />
                    )}
                </div>
            </div>
        </>
    );
};

export default memo(StreamGrid);
