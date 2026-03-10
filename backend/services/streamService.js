const axios = require('axios');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { signUrl, resolveUrl, getProxyBase } = require('../utils/urlHelper');
const { PassThrough } = require('stream');

ffmpeg.setFfmpegPath(ffmpegPath);

const AGENT = 'VLC/3.0.12 LibVLC/3.0.12';
const formatCache = new Map();

// Agente HTTPS compartido con Keep-Alive — reutiliza la TCP connection con el servidor Xtream
// Definido aquí para ser exportado y usado también por contentController
const sharedHttpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 20,
    maxFreeSockets: 10,
});

// Mantener compatibilidad con código existente
const httpsAgent = sharedHttpsAgent;

/**
 * Reescribe un manifiesto M3U8 para que los segmentos pasen por el proxy del backend.
 * Esto es necesario porque el servidor Xtream no envía headers CORS,
 * por lo que el browser no puede descargar segmentos directamente desde otro origen.
 */
function rewriteM3U8(body, baseUrl, proxyBase, token) {
    return body.split('\n').map(line => {
        const t = line.trim();

        // Líneas de metadatos con URI (ej: #EXT-X-KEY) → proxiar también
        if (t.startsWith('#') && t.includes('URI="')) {
            return t.replace(/URI="([^"]+)"/g, (_, uri) => {
                const full = resolveUrl(uri, baseUrl);
                const enc = Buffer.from(full).toString('base64url');
                const sig = signUrl(full);
                return `URI="${proxyBase}/api/hls-proxy?url=${enc}&sig=${sig}&token=${token}"`;
            });
        }

        // Líneas vacías o comentarios → sin cambios
        if (!t || t.startsWith('#')) return line;

        // Segmentos → pasar por el proxy del backend (evita bloqueo CORS del browser)
        const full = resolveUrl(t, baseUrl);
        const enc = Buffer.from(full).toString('base64url');
        const sig = signUrl(full);
        return `${proxyBase}/api/hls-proxy?url=${enc}&sig=${sig}&token=${token}`;
    }).join('\n');
}

/**
 * Maneja el streaming directo (MPEG-TS, MKV, MP4).
 */
async function serveDirectStream(targetUrl, ext, request, reply, type, httpsAgent) {
    const headers = { 'User-Agent': AGENT };
    if (request.headers.range) {
        headers['Range'] = request.headers.range;
    }

    try {
        console.log(`[STREAM] Proxying: ${targetUrl}`);
        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: headers,
            responseType: 'stream',
            timeout: type === 'live' ? 0 : 60000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400,
            httpsAgent,
            decompress: false
        });

        console.log(`[STREAM] Provider Response: ${response.status} | Type: ${response.headers['content-type']} | Size: ${response.headers['content-length']}`);

        reply.code(response.status);

        const headersToForward = [
            'content-type', 'content-length', 'content-range',
            'accept-ranges', 'last-modified', 'etag'
        ];

        headersToForward.forEach(header => {
            if (response.headers[header]) {
                reply.header(header, response.headers[header]);
            }
        });

        if (!response.headers['content-type'] || response.headers['content-type'].includes('text/html')) {
            console.warn(`[STREAM] Warning: Posible respuesta no-video detectada.`);
            const lowerExt = (ext || '').toLowerCase();
            if (lowerExt === 'mkv') reply.type('video/x-matroska');
            else if (lowerExt === 'mp4') reply.type('video/mp4');
            else if (lowerExt === 'avi') reply.type('video/x-msvideo');
            else reply.type('video/mp2t');
        }

        reply.header('X-Stream-Proxy', 'backend-modular');

        // Destruir el socket de origen si el cliente (Android/Web) se desconecta
        // Esto evita conexiones fantasmas en el panel de Xtream
        if (request && request.raw) {
            request.raw.on('close', () => {
                try {
                    if (response.data && typeof response.data.destroy === 'function') {
                        response.data.destroy();
                    }
                } catch (e) { }
            });
        }

        return reply.send(response.data);

    } catch (error) {
        const status = error.response?.status || 502;
        console.error(`[STREAM ERROR]: ${error.message}`);
        return reply.code(status).send({ error: "Error al obtener el flujo" });
    }
}

/**
 * Inicia un proceso de transcodificación FFmpeg de forma optimizada.
 */
function startTranscode(inputUrl, reply, request, type = 'vod') {
    const stream = new PassThrough();
    const isLive = type === 'live';

    const command = ffmpeg(inputUrl)
        .inputOptions([
            '-reconnect 1', '-reconnect_streamed 1', '-reconnect_delay_max 5',
            '-analyzeduration 1000000', '-probesize 1000000',
            '-user_agent "VLC/3.0.12 LibVLC/3.0.12"'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioChannels(2)
        .audioBitrate('128k')
        .outputOptions([
            '-preset ultrafast',
            '-tune zerolatency',
            isLive ? '-f mpegts' : '-f mp4',
            isLive ? '-muxdelay 0.1' : '-movflags frag_keyframe+empty_moov+default_base_moof+faststart',
            '-pix_fmt yuv420p',
            '-threads 0',
            '-crf ' + (isLive ? '28' : '30'), // Mejor balance calidad/rendimiento
            '-profile:v baseline', '-level 3.0' // Máxima compatibilidad Android
        ])
        .on('start', (cmd) => {
            // Log mínimo para depuración
        })
        .on('error', (err) => {
            // Ignorar errores de cierre de stream o señales de kill
            if (!err.message.includes('Output stream closed') && !err.message.includes('SIGKILL')) {
                console.error(`[TRANSCODE ERROR]: ${err.message}`);
            }
            stream.end();
        });

    // Detener FFmpeg inmediatamente si el cliente se desconecta
    if (request && request.raw) {
        request.raw.on('close', () => {
            try { command.kill('SIGKILL'); } catch (e) { }
        });
    }

    command.pipe(stream);
    return stream;
}

module.exports = {
    rewriteM3U8,
    serveDirectStream,
    startTranscode,
    formatCache
};
