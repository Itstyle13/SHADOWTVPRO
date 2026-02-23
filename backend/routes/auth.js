const jwt = require('jsonwebtoken');
const xtreamService = require('../services/xtreamService');

async function authRoutes(fastify, options) {
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            return reply.code(400).send({ error: 'Missing credentials' });
        }

        try {
            // 1. Authenticate against real Xtream server
            const xtreamData = await xtreamService.authenticate(username, password);

            // 2. Generate local JWT
            const token = jwt.sign(
                {
                    username: username,
                    xtream_password: password, // Encrypt this in production!
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
                },
                process.env.JWT_SECRET
            );

            // 3. Return token and user info (sanitized)
            return {
                token,
                user_info: {
                    username: xtreamData.user_info.username,
                    status: xtreamData.user_info.status,
                    exp_date: xtreamData.user_info.exp_date,
                    max_connections: xtreamData.user_info.max_connections
                },
                server_info: xtreamData.server_info
            };

        } catch (error) {
            return reply.code(401).send({ error: 'Authentication failed: ' + error.message });
        }
    });
}

module.exports = authRoutes;
