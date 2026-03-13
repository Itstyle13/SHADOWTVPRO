const axios = require('axios');
const https = require('https');
const NodeCache = require('node-cache');

// Agente para ignorar certificados SSL no válidos (común en servidores IPTV)
// keepAlive: true para reutilizar TCP connections y reducir conexiones en el panel del reseller
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 10,
    maxFreeSockets: 5,
});

// Cache TTL: 10 minutes for categories/streams, 24 hours for auth validation
const cache = new NodeCache({ stdTTL: 600 });

class XtreamService {
    async authenticate(baseUrl, username, password) {
        const cleanUrl = baseUrl.replace(/\/$/, ''); // Quitar barra final si existe
        try {
            console.log(`[XTREAM] Intentando autenticar usuario: ${username} en ${cleanUrl}`);
            const response = await axios.get(`${cleanUrl}/player_api.php`, {
                params: {
                    username: username,
                    password: password
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'IPTVSmarters/1.0.0'
                },
                httpsAgent // Ignorar errores de certificado
            });

            if (response.data && response.data.user_info) {
                if (response.data.user_info.auth === 1) {
                    if (response.data.user_info.status !== 'Active') {
                        throw new Error('Tu cuenta no está activa o ha expirado.');
                    }
                    console.log(`[XTREAM] Autenticación exitosa para: ${username}`);
                    return response.data;
                } else {
                    throw new Error('Usuario o contraseña incorrectos.');
                }
            } else {
                throw new Error('El servidor IPTV no respondió con el formato esperado (user_info missing).');
            }
        } catch (error) {
            console.error('[XTREAM AUTH ERROR]:', error.message);
            if (error.response) {
                // El servidor respondió con un código de error (4xx, 5xx)
                throw new Error(`El servidor IPTV respondió con error: ${error.response.status} ${error.response.statusText}`);
            } else if (error.request) {
                // La petición se hizo pero no hubo respuesta
                throw new Error('No se recibió respuesta del servidor IPTV. Verifica la URL y el puerto.');
            } else {
                // Algo pasó al configurar la petición
                throw new Error(`Error de configuración o red: ${error.message}`);
            }
        }
    }

    async getCategories(baseUrl, username, password, type = 'live') {
        const cacheKey = `categories_${baseUrl}_${username}_${type}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            console.log(`Serving ${type} categories from cache`);
            return cachedData;
        }

        const cleanUrl = baseUrl.replace(/\/$/, '');
        const action = type === 'series' ? 'get_series_categories' : (type === 'vod' ? 'get_vod_categories' : 'get_live_categories');
        try {
            const response = await axios.get(`${cleanUrl}/player_api.php`, {
                params: {
                    username,
                    password,
                    action
                },
                headers: {
                    'User-Agent': 'IPTVSmarters/1.0.0'
                },
                httpsAgent
            });

            // Save to cache
            cache.set(cacheKey, response.data);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getStreams(baseUrl, username, password, categoryId, type = 'live') {
        const cacheKey = `streams_${baseUrl}_${username}_${type}_${categoryId || 'all'}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            console.log(`Serving ${type} streams from cache`);
            return cachedData;
        }

        const cleanUrl = baseUrl.replace(/\/$/, '');
        const action = type === 'series' ? 'get_series' : (type === 'vod' ? 'get_vod_streams' : 'get_live_streams');
        try {
            const params = { username, password, action };
            if (categoryId) params.category_id = categoryId;

            const response = await axios.get(`${cleanUrl}/player_api.php`, {
                params,
                headers: {
                    'User-Agent': 'IPTVSmarters/1.0.0'
                },
                httpsAgent
            });

            // Save to cache
            cache.set(cacheKey, response.data);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getEPG(baseUrl, username, password, streamId, limit = 5) {
        const cacheKey = `epg_${baseUrl}_${streamId}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) return cachedData;

        const cleanUrl = baseUrl.replace(/\/$/, '');
        try {
            const response = await axios.get(`${cleanUrl}/player_api.php`, {
                params: {
                    username,
                    password,
                    action: 'get_short_epg',
                    stream_id: streamId,
                    limit
                },
                headers: {
                    'User-Agent': 'IPTVSmarters/1.0.0'
                },
                httpsAgent
            });

            if (response.data && response.data.epg_listings) {
                cache.set(cacheKey, response.data.epg_listings, 300); // Cache 5 min
                return response.data.epg_listings;
            }
            return [];
        } catch (error) {
            console.error('Error fetching EPG:', error.message);
            return [];
        }
    }

    async getSeriesInfo(baseUrl, username, password, seriesId) {
        const cacheKey = `series_info_${baseUrl}_${seriesId}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) return cachedData;

        const cleanUrl = baseUrl.replace(/\/$/, '');
        try {
            const response = await axios.get(`${cleanUrl}/player_api.php`, {
                params: {
                    username,
                    password,
                    action: 'get_series_info',
                    series_id: seriesId
                },
                headers: {
                    'User-Agent': 'IPTVSmarters/1.0.0'
                },
                httpsAgent
            });

            // La API de Xtream suele devolver { episodes: {...}, info: {...} }
            // O un array, dependiendo de la versión. Vamos a asumir estandar.
            if (response.data && (response.data.episodes || Array.isArray(response.data))) {
                cache.set(cacheKey, response.data, 600); // Cache 10 min
                return response.data;
            }
            return {};
        } catch (error) {
            console.error('Error fetching Series Info:', error.message);
            return {};
        }
    }
}

module.exports = new XtreamService();
