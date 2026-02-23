const xtreamService = require('../services/xtreamService');
const streamService = require('../services/streamService');
const proxyService = require('../services/proxyService');
const { getProxyBase } = require('../utils/urlHelper');
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class ContentController {
    async getCategories(request, reply) {
        const { type } = request.params;
        const { username, xtream_password } = request.user;
        try {
            return await xtreamService.getCategories(username, xtream_password, type);
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Categorías (${type}):`, error.message);
            return reply.code(500).send({ error: 'Error al cargar categorías' });
        }
    }

    async getStreams(request, reply) {
        const { type } = request.params;
        const { category_id } = request.query;
        const { username, xtream_password } = request.user;
        try {
            return await xtreamService.getStreams(username, xtream_password, category_id, type);
        } catch (error) {
            console.error(`[CONTROLLER ERROR] Streams (${type}):`, error.message);
            return reply.code(500).send({ error: 'Error al cargar streams' });
        }
    }

    async getEPG(request, reply) {
        const { streamId } = request.params;
        const { username, xtream_password } = request.user;
        try {
            return await xtreamService.getEPG(username, xtream_password, streamId);
        } catch (error) {
            return reply.code(500).send({ error: 'Error EPG' });
        }
    }

    async getSeriesInfo(request, reply) {
        const { id } = request.params;
        const { username, xtream_password } = request.user;
        try {
            return await xtreamService.getSeriesInfo(username, xtream_password, id);
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
        const { username, xtream_password } = request.user;
        const server = process.env.XTREAM_API_URL.replace(/\/$/, '');
        const streamId = id.split('.')[0];
        const path = type === 'series' ? 'series' : (type === 'vod' ? 'movie' : 'live');

        try {
            const cached = streamService.formatCache.get(streamId);
            if (type === 'live' && cached && (Date.now() - cached.timestamp < 5000)) {
                if (cached.format === 'mpegts') {
                    const finalUrl = `${server}/${path}/${username}/${xtream_password}/${id}`;
                    return streamService.serveDirectStream(finalUrl, id.split('.')[1] || 'ts', request, reply, type, httpsAgent);
                }
                if (cached.format === 'hls' && cached.body) {
                    return reply.type('application/vnd.apple.mpegurl').header('X-Cache', 'HIT').send(cached.body);
                }
            }

            if (type === 'live') {
                const m3u8Url = `${server}/${path}/${username}/${xtream_password}/${streamId}.m3u8`;
                try {
                    const res = await axios.get(m3u8Url, {
                        headers: { 'User-Agent': 'VLC/3.0.12 LibVLC/3.0.12' },
                        httpsAgent, responseType: 'text', timeout: 5000
                    });
                    const body = String(res.data);
                    if (body.includes('#EXTM3U')) {
                        const finalUrl = res.request?.res?.responseUrl || m3u8Url;
                        const rewritten = streamService.rewriteM3U8(body, finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1), getProxyBase(request), request.query.token || '');
                        streamService.formatCache.set(streamId, { format: 'hls', body: rewritten, timestamp: Date.now() });
                        return reply.type('application/vnd.apple.mpegurl').send(rewritten);
                    }
                } catch (e) { /* fallback a MPEG-TS si falla HLS */ }
                streamService.formatCache.set(streamId, { format: 'mpegts', timestamp: Date.now() });
            }

            const cleanId = id.endsWith('.mp4') && id.includes('.', id.length - 5) ? id.replace(/\.mp4$/, '') : id;
            const ext = cleanId.includes('.') ? cleanId.split('.').pop() : (type === 'live' ? 'ts' : 'mp4');
            const streamIdOnly = cleanId.split('.')[0];
            const targetUrl = `${server}/${path}/${username}/${xtream_password}/${cleanId}${cleanId.includes('.') ? '' : (type === 'live' ? '.ts' : '.mp4')}`;
            console.log(`[STREAM] Requesting ${type.toUpperCase()}: ${targetUrl}`);

            return streamService.serveDirectStream(targetUrl, ext, request, reply, type, httpsAgent);
        } catch (error) {
            console.error(`[STREAM ERROR]: ${error.message}`);
            return reply.code(500).send({ error: 'Stream no disponible' });
        }
    }

    async transcode(request, reply) {
        const { type, id } = request.params;
        const { username, xtream_password } = request.user;
        const server = process.env.XTREAM_API_URL.replace(/\/$/, '');
        const path = type === 'series' ? 'series' : (type === 'vod' ? 'movie' : 'live');

        // Limpiamos el ID: si viene con .mp4 al final (para engañar al browser), se lo quitamos
        // pero mantenemos la extensión real si venía antes (ej: 123.mkv.mp4 -> 123.mkv)
        const cleanId = id.endsWith('.mp4') && id.includes('.', id.length - 5) ? id.replace(/\.mp4$/, '') : id;

        const inputUrl = `${server}/${path}/${username}/${xtream_password}/${cleanId}${cleanId.includes('.') ? '' : (type === 'live' ? '.ts' : '.mp4')}`;

        console.log(`[TRANSCODE] Iniciando para ${type}: ${inputUrl}`);
        reply.header('Content-Type', 'video/mp4');
        // Iniciamos la transcodificación pasando request para detectar desconexiones
        return reply.send(streamService.startTranscode(inputUrl, reply, request));
    }
}

module.exports = new ContentController();
