import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

// Registro del Service Worker para Caché de Imágenes
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('[SW] Registrado con éxito:', reg.scope))
            .catch(err => console.error('[SW] Error al registrar:', err));
    });
}

// Ocultar la barra de notificaciones superior si estamos en Android natively
if (Capacitor.isNativePlatform()) {
    StatusBar.hide().catch(err => console.error('Error ocultando StatusBar:', err));
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
