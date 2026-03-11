const MAX_HISTORY_ITEMS = 10;

/**
 * Obtiene el historial guardado para un tipo específico ('vod' o 'series').
 * @param {string} type - 'vod' (películas) o 'series'
 * @returns {Array} Array de streams con su progreso guardado.
 */
export const getHistory = (type) => {
    try {
        const key = type === 'vod' ? 'recent_movies' : 'recent_series';
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error("Error reading history", err);
        return [];
    }
};

/**
 * Guarda o actualiza un stream en el historial.
 * @param {string} type - 'vod' o 'series'
 * @param {Object} streamData - Objeto con la data del stream (id, info, imágenes)
 * @param {Number} currentTime - Posición actual del video en segundos
 * @param {Number} duration - Duración total del video en segundos
 */
export const saveToHistory = (type, streamData, currentTime, duration) => {
    if (!streamData) return;

    // Solo guardamos si avanzó más de 5 segundos, para no saturar con clicks accidentales
    if (currentTime < 5) return;

    try {
        const key = type === 'vod' ? 'recent_movies' : 'recent_series';
        let history = getHistory(type);

        // Usar stream_id o id de la serie
        const streamId = streamData.stream_id || streamData.id || streamData.series_id;

        // Buscar si ya existe para sacarlo y ponerlo al principio
        const existingIndex = history.findIndex(item =>
            (item.stream_id || item.id || item.series_id) === streamId
        );

        let finalItem = { ...streamData, savedTime: currentTime, savedDuration: duration, lastWatched: Date.now() };

        if (existingIndex >= 0) {
            history.splice(existingIndex, 1);
        }

        // Insertar al inicio
        history.unshift(finalItem);

        // Limitar a los últimos N elementos
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }

        localStorage.setItem(key, JSON.stringify(history));
    } catch (err) {
        console.error("Error saving to history", err);
    }
};

/**
 * Retorna el tiempo (en segundos) en el que el usuario se quedó en un video específico.
 * Retorna 0 si no hay registro o si el video ya se vio hasta el 95%.
 */
export const getResumeTime = (type, streamId) => {
    try {
        const history = getHistory(type);
        const item = history.find(i => (i.stream_id || i.id || i.series_id) === streamId);

        if (item && item.savedTime > 0) {
            // Si ya vio más del 95% del video, se considera finalizado y empezará de 0
            if (item.savedDuration && (item.savedTime / item.savedDuration) > 0.95) {
                return 0;
            }
            return item.savedTime;
        }
    } catch (e) {
        console.error("Error getting resume time", e);
    }
    return 0;
};
