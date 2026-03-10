const xtreamService = require('../services/xtreamService');
const streamService = require('../services/streamService');
const proxyService = require('../services/proxyService');
const { getProxyBase } = require('../utils/urlHelper');
const axios = require('axios');
const https = require('https');

// Agente HTTPS con Keep-Alive persistente.
// Esto hace que el backend REUTILICE la misma TCP connection al servidor Xtream
// en vez de abrir una nueva por cada solicitud de segmento HLS.
// El reseller panel verá solo UNA conexión en lugar de múltiples.
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,          // Mantener la conexión TCP abierta
    keepAliveMsecs: 60000,    // Mantener viva por 60 segundos entre solicitudes
    maxSockets: 20,           // Máximo de sockets simultáneos al mismo servidor
    maxFreeSockets: 10,       // Cuántos sockets libres mantener en el pool
});

class ContentController {
    async getCategories(request, reply) {
        const { type } = request.params;
        const { xtream_url, username, xtream_password } = request.user;
        try {
            return await xtreamService.getCategories(xtream_url, username, xtream_password, type);
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Categorías (${type}):`, error.message);
            return reply.code(500).send({ error: 'Error al cargar categorías' });
        }
    }

    async getStreams(request, reply) {
        const { type } = request.params;
        const { category_id } = request.query;
        const { xtream_url, username, xtream_password } = request.user;
        try {
            return await xtreamService.getStreams(xtream_url, username, xtream_password, category_id, type);
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Streams (${type}):`, error.message);
            return reply.code(500).send({ error: 'Error al cargar streams' });
        }
    }

    async getEPG(request, reply) {
        const { streamId } = request.params;
        const { xtream_url, username, xtream_password } = request.user;
        try {
            return await xtreamService.getEPG(xtream_url, username, xtream_password, streamId);
        } catch (error) {
            return reply.code(500).send({ error: 'Error EPG' });
        }
    }

    async getSeriesInfo(request, reply) {
        const { id } = request.params;
        const { xtream_url, username, xtream_password } = request.user;
        try {
            return await xtreamService.getSeriesInfo(xtream_url, username, xtream_password, id);
        } catch (error) {
            return reply.code(500).send({ error: 'Error Series Info' });
        }
    }

    async proxyIcon(request, reply) {
        const { url, name } = request.query;
        return proxyService.fetchIcon(url, name, reply);
    }

    async hlsProxy(request, reply) {
        const { url: encodedUrl, sig } = request.query;
        if (!encodedUrl) return reply.code(400).send({ error: 'Falta parámetro url' });

        try {
            const { signUrl } = require('../utils/urlHelper');
            const realUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');

            if (sig !== signUrl(realUrl)) {
                return reply.code(403).send('Link inválido');
            }

            const res = await axios.get(realUrl, {
                responseType: 'stream',
                headers: { 'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12' },
                httpsAgent,
                timeout: 30000
            });

            const finalUrl = res.request.res.responseUrl || realUrl;
            const ct = (res.headers['content-type'] || '').toLowerCase();
            const isM3U8 = ct.includes('mpegurl') || ct.includes('application/x-mpegurl') || /\.m3u8($|\?)/.test(finalUrl);

            if (isM3U8) {
                const chunks = [];
                for await (const chunk of res.data) chunks.push(chunk);
                const body = Buffer.concat(chunks).toString('utf-8');
                const base = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
                const rewritten = streamService.rewriteM3U8(body, base, getProxyBase(request), request.query.token || '');
                return reply.type('application/vnd.apple.mpegurl').send(rewritten);
            }

            reply.type(res.headers['content-type'] || 'video/mp2t');
            if (res.headers['content-length']) reply.header('Content-Length', res.headers['content-length']);
            return reply.send(res.data);
        } catch (error) {
            return reply.code(502).header('Content-Type', 'text/plain').send('Error HLS Proxy');
        }
    }

    async stream(request, reply) {
        const { type, id } = request.params;
        const { xtream_url, username, xtream_password } = request.user;
        if (!xtream_url) return reply.code(400).send({ error: 'Falta configurar servidor' });
        const server = xtream_url.replace(/\/$/, '');
        const streamId = id.split('.')[0];
        const requestedExt = id.includes('.') ? id.split('.').pop() : '';
        const path = type === 'series' ? 'series' : (type === 'vod' ? 'movie' : 'live');

        try {
            if (type === 'live') {
                if (requestedExt === 'ts') {
                    const tsUrl = `${server}/live/${username}/${xtream_password}/${streamId}.ts`;
                    return streamService.serveDirectStream(tsUrl, 'ts', request, reply, type, httpsAgent);
                }

                const m3u8Url = `${server}/live/${username}/${xtream_password}/${streamId}.m3u8`;
                const cached = streamService.formatCache.get(streamId);
                const now = Date.now();
                const cacheAgeMs = cached ? (now - cached.timestamp) : Infinity;

                // Caché del playlist m3u8: 20s fresco, hasta 40s sirve stale + refresh en background.
                // Esto evita fetches repetidos al servidor para cada refresh de HLS.js.
                if (cached && cached.format === 'hls' && cached.body) {
                    if (cacheAgeMs < 20000) {
                        return reply.type('application/vnd.apple.mpegurl')
                            .header('Cache-Control', 'no-cache')
                            .send(cached.body);
                    }
                    if (cacheAgeMs < 40000) {
                        // Servir inmediato + actualizar en background
                        setImmediate(async () => {
                            try {
                                const res = await axios.get(m3u8Url, {
                                    headers: { 'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12' },
                                    httpsAgent, responseType: 'text', timeout: 8000
                                });
                                const body = String(res.data);
                                if (body.includes('#EXTM3U')) {
                                    const finalUrl = res.request?.res?.responseUrl || m3u8Url;
                                    const base = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
                                    const rewritten = streamService.rewriteM3U8(body, base, getProxyBase(request), request.query.token || '');
                                    streamService.formatCache.set(streamId, { format: 'hls', body: rewritten, timestamp: Date.now() });
                                }
                            } catch (_) { }
                        });
                        return reply.type('application/vnd.apple.mpegurl')
                            .header('Cache-Control', 'no-cache')
                            .send(cached.body);
                    }
                }

                // Sin caché válido → fetch sincrónico (solo la primera vez al cambiar de canal)
                try {
                    const res = await axios.get(m3u8Url, {
                        headers: { 'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12' },
                        httpsAgent, responseType: 'text', timeout: 8000
                    });
                    const body = String(res.data);
                    if (body.includes('#EXTM3U')) {
                        const finalUrl = res.request?.res?.responseUrl || m3u8Url;
                        const base = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
                        // rewriteM3U8 ahora escribe URLs DIRECTAS al servidor Xtream para segmentos
                        const rewritten = streamService.rewriteM3U8(body, base, getProxyBase(request), request.query.token || '');
                        streamService.formatCache.set(streamId, { format: 'hls', body: rewritten, timestamp: Date.now() });
                        return reply.type('application/vnd.apple.mpegurl').send(rewritten);
                    }
                } catch (e) {
                    console.warn('[STREAM] HLS falló, intentando MPEG-TS:', e.message);
                }

                // Fallback MPEG-TS directo
                const tsUrl = `${server}/live/${username}/${xtream_password}/${streamId}.ts`;
                return streamService.serveDirectStream(tsUrl, 'ts', request, reply, type, httpsAgent);
            }

            // VOD y Series → proxy normal
            const cleanId = id.endsWith('.mp4') && id.includes('.', id.length - 5) ? id.replace(/\.mp4$/, '') : id;
            const ext = cleanId.includes('.') ? cleanId.split('.').pop() : 'mp4';
            const targetUrl = `${server}/${path}/${username}/${xtream_password}/${cleanId}${cleanId.includes('.') ? '' : '.mp4'}`;
            console.log(`[STREAM] Proxying ${type.toUpperCase()}: ${targetUrl}`);
            return streamService.serveDirectStream(targetUrl, ext, request, reply, type, httpsAgent);

        } catch (error) {
            console.error(`[STREAM ERROR]: ${error.message}`);
            return reply.code(500).send({ error: 'Stream no disponible' });
        }
    }

    async transcode(request, reply) {
        const { type, id } = request.params;
        const { xtream_url, username, xtream_password } = request.user;
        if (!xtream_url) return reply.code(400).send({ error: 'Falta configurar servidor' });
        const server = xtream_url.replace(/\/$/, '');
        const path = type === 'series' ? 'series' : (type === 'vod' ? 'movie' : 'live');

        // Limpiamos el ID: si viene con .mp4 al final (para engañar al browser), se lo quitamos
        // pero mantenemos la extensión real si venía antes (ej: 123.mkv.mp4 -> 123.mkv)
        const cleanId = id.endsWith('.mp4') && id.includes('.', id.length - 5) ? id.replace(/\.mp4$/, '') : id;

        const inputUrl = `${server}/${path}/${username}/${xtream_password}/${cleanId}${cleanId.includes('.') ? '' : (type === 'live' ? '.ts' : '.mp4')}`;

        console.log(`[TRANSCODE] Iniciando para ${type}: ${inputUrl}`);
        if (type === 'live') {
            reply.header('Content-Type', 'video/mp2t');
        } else {
            reply.header('Content-Type', 'video/mp4');
        }
        // Iniciamos la transcodificación pasando request para detectar desconexiones
        return reply.send(streamService.startTranscode(inputUrl, reply, request, type));
    }
}

module.exports = new ContentController();
