const API_ROOT = import.meta.env.VITE_API_BASE_URL || 'https://shadow-tv-backend.onrender.com';
const API_BASE = API_ROOT.endsWith('/api') ? API_ROOT : `${API_ROOT}/api`;

const apiService = {
    async get(endpoint, token) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            if (response.status === 401) {
                // Manejar expiración de token si es necesario
            }
            throw new Error(`Error en la petición: ${response.statusText}`);
        }
        return response.json();
    },

    getStreamUrl(type, id, token, extension) {
        const ext = extension ? `.${extension}` : '';
        return `${API_BASE}/stream/${type}/${id}${ext}?token=${token}`;
    },

    getTranscodeUrl(type, id, token) {
        return `${API_BASE}/transcode/${type}/${id}?token=${token}`;
    }
};

export default apiService;
