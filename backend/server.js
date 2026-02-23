require('dotenv').config();
const fastify = require('fastify')({ logger: true });

// --- Plugins ---
fastify.register(require('@fastify/cors'), { origin: '*' });

fastify.register(require('@fastify/rate-limit'), {
  max: 5000,
  timeWindow: '1 minute'
});

// --- Routes ---
fastify.register(require('./routes/auth'), { prefix: '/auth' });
fastify.register(require('./routes/content'), { prefix: '/api' });

// Health Check
fastify.get('/', async () => ({ status: 'ok', service: 'IPTV Backend Intermediary' }));

// --- Start Server ---
const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 3000,
      host: '0.0.0.0'
    });
    console.log(`Server listening on port ${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
