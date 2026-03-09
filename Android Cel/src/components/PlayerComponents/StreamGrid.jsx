import { memo } from 'react';
import { API_BASE } from '../../config';
import CategorySidebar from './CategorySidebar';

const StreamRow = memo(({ item, isActive, playStream, style, token }) => {
    if (!item) return null;
    return (
        <div style={style}>
            <div
                className={`channel-card-xuper ${isActive ? 'active' : ''}`}
                onClick={() => playStream(item, item.stream_type || 'live')}
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
    loading: externalLoading
}) => {
    // Debugging logs to console
    console.log(`[StreamGrid] filteredStreams: ${filteredStreams?.length}, showChannels: ${showChannels}, selected: ${selectedCategory}`);

    return (
        <>
            <style>{`
                .channel-card-xuper {
                    display: flex;
                    align-items: center;
                    background: rgba(30, 30, 30, 0.75);
                    border-radius: 12px;
                    padding: 8px 16px 8px 8px; /* Menos padding izq para el cuadro del logo */
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.1s;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .channel-card-xuper:hover {
                    background: rgba(50, 50, 50, 0.9);
                }
                .channel-card-xuper.active {
                    background: rgba(60, 60, 60, 0.95);
                    border: 1px solid rgba(255,255,255,0.3);
                }
                .channel-logo-container-xuper {
                    width: 48px;
                    height: 48px;
                    background: rgba(20, 20, 20, 0.8); /* Cuadro más oscuro detrás del logo */
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

                {/* El buscador se integrará luego como overlay si el usuario pulsa en la lupa superior */}

                <div className="grid-area" style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', overflowY: 'auto' }}>
                    {externalLoading || filteredStreams.length === 0 ? (
                        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <div className="no-channels-msg" style={{ width: '100%', textAlign: 'center', fontSize: '1.2rem', fontWeight: '500' }}>
                                {externalLoading ? '⌛ Cargando canales...' : (searchQuery ? '🔍 No se encontraron canales' : '📺 No hay canales disponibles')}
                            </div>
                        </div>
                    ) : (
                        <div className="channels-scroll-container" style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredStreams.map((item) => {
                                const isActive = (
                                    currentStream?.stream_id === item.stream_id ||
                                    currentStream?.series_id === item.series_id ||
                                    currentStream?.id === item.id
                                );
                                return (
                                    <StreamRow
                                        key={item.stream_id || item.series_id || item.id || Math.random()}
                                        item={item}
                                        isActive={isActive}
                                        playStream={playStream}
                                        style={{ paddingRight: '4px' }}
                                        token={token}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default memo(StreamGrid);
