const jwt = require('jsonwebtoken');

const verifyToken = async (request, reply) => {
    try {
        const token = request.headers.authorization?.split(' ')[1] || request.query.token;
        if (!token) throw new Error('Token requerido');

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iptv-default-secret');
        request.user = decoded;
    } catch (err) {
        console.error('[AUTH ERROR]:', err.message);
        return reply.code(401).send({ error: 'No autorizado' });
    }
};

module.exports = { verifyToken };
