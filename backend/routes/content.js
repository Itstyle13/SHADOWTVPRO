const { verifyToken } = require('../middlewares/auth');
const contentController = require('../controllers/contentController');

async function contentRoutes(fastify) {
    // Rutas públicas (sin token)
    fastify.get('/proxy-icon', contentController.proxyIcon);

    // Rutas protegidas
    fastify.register(async function (protectedRoutes) {
        protectedRoutes.addHook('preHandler', verifyToken);

        // Categorías y Streams
        protectedRoutes.get('/categories/:type', contentController.getCategories);
        protectedRoutes.get('/streams/:type', contentController.getStreams);

        // Información de Contenido
        protectedRoutes.get('/epg/:streamId', contentController.getEPG);
        protectedRoutes.get('/series/:id', contentController.getSeriesInfo);

        // Proxies (HLS requiere token por seguridad del stream)
        protectedRoutes.get('/hls-proxy', contentController.hlsProxy);

        // Streaming y Transcoding
        protectedRoutes.get('/stream/:type/:id', contentController.stream);
        protectedRoutes.get('/transcode/:type/:id', contentController.transcode);
    });
}

module.exports = contentRoutes;
