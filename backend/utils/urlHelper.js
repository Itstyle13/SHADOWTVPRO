const crypto = require('crypto');

/**
 * Genera una firma HMAC para proteger las URLs del proxy.
 */
function signUrl(url) {
    return crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'iptv-default-secret')
        .update(url)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Resuelve una URL relativa a partir de una URL base.
 */
function resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) {
        const origin = new URL(baseUrl).origin;
        return origin + url;
    }
    return new URL(url, baseUrl).href;
}

/**
 * Obtiene la URL base del proxy para reescribir manifiestos.
 */
function getProxyBase(request) {
    const host = request.headers.host || `127.0.0.1:${process.env.PORT || 3000}`;
    const proto = request.headers['x-forwarded-proto'] || 'http';
    return `${proto}://${host}`;
}

module.exports = {
    signUrl,
    resolveUrl,
    getProxyBase
};
