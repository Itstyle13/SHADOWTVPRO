// Render inyecta VITE_API_BASE_URL, pero si falla, apuntamos al backend de Render por defecto.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://shadow-tv-backend.onrender.com';
