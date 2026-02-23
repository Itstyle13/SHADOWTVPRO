const axios = require('axios');
const https = require('https');
const { PassThrough } = require('stream');
const imageCache = require('./imageCache');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const FALLBACK_ICON = 'https://img.icons8.com/ios-filled/100/ffffff/television.png';

async function fetchIcon(url, name, reply) {
    // 1. Intentar desde Caché Local primero
    const cacheKey = url || (name ? `fallback_${name}` : null);
    if (cacheKey) {
        const cached = imageCache.getCachedImage(cacheKey);
        if (cached) {
            console.log(`[PROXY-CACHE] HIT: ${name || url}`);
            reply.header('Content-Type', cached.contentType);
            reply.header('Cache-Control', 'public, max-age=2592000, immutable');
            return reply.send(cached.stream);
        }
    }

    const tryFetch = async (targetUrl) => {
        if (!targetUrl || !targetUrl.startsWith('http')) return null;
        return await axios({
            method: 'get', url: targetUrl, responseType: 'stream',
            timeout: 15000, httpsAgent,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
    };

    try {
        let response = null;
        let finalUrl = url;

        if (url && url !== 'null' && url !== 'undefined') {
            console.log(`[PROXY-ICON] Intentando cargar URL: ${url}`);
            try {
                response = await tryFetch(url);
            } catch (e) {
                console.warn(`[PROXY-ICON] Error con URL original: ${e.message}`);
            }
        }

        if (!response && name) {
            const normalized = name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '').replace(/hd$|fhd$|4k$|sd$/i, '')
                .replace(/[^a-z0-9]/g, '');
            finalUrl = `https://iptv-org.github.io/iptv/logos/${normalized}.png`;
            console.log(`[PROXY-ICON] Intentando fallback GitHub: ${finalUrl}`);
            try {
                response = await tryFetch(finalUrl);
            } catch (e) {
                console.warn(`[PROXY-ICON] Fallo fallback GitHub: ${e.message}`);
            }
        }

        if (response) {
            const contentType = response.headers['content-type'] || 'image/png';
            reply.header('Content-Type', contentType);
            reply.header('Cache-Control', 'public, max-age=2592000, immutable');

            // Duplicar el stream: uno para la respuesta, otro para la caché
            const cacheStream = new PassThrough();
            const clientStream = new PassThrough();

            response.data.pipe(cacheStream);
            response.data.pipe(clientStream);

            // Guardar en caché asíncronamente
            imageCache.saveToCache(cacheKey || finalUrl, cacheStream, contentType)
                .catch(err => console.error('[PROXY-CACHE] Error guardando:', err));

            return reply.send(clientStream);
        }

        console.warn(`[PROXY-ICON] Sin imagen encontrada para: ${name}. Redirigiendo a fallback.`);
        return reply.redirect(FALLBACK_ICON);
    } catch (error) {
        console.error(`[PROXY-ICON ERROR CRÍTICO]: ${error.message}`);
        return reply.redirect(FALLBACK_ICON);
    }
}

module.exports = { fetchIcon };
