// Rate Limiting
fastify.register(require('@fastify/rate-limit'), {
    max: 100, // Max 100 requests
    timeWindow: '1 minute', // Per minute
    errorResponseBuilder: function (request, context) {
        return {
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Has excedido el límite de peticiones. Intenta de nuevo más tarde.'
        }
    }
});
