# Guía de Despliegue - IPTV App

Esta aplicación consta de dos partes: un **Backend** (Node.js/Fastify) y un **Frontend** (React/Vite). Sigue estos pasos para subirla a internet.

## 1. Preparación del Código
1. Sube todo el contenido de esta carpeta a un nuevo repositorio en **GitHub**. Los archivos `.gitignore` ya están configurados para evitar subir archivos innecesarios.

## 2. Despliegue del Backend
Te recomiendo usar **Render** o **Railway** porque permiten instalar FFmpeg fácilmente.

### Pasos en Render:
1. Crea un nuevo **Web Service** conectado a tu repositorio de GitHub.
2. Selecciona la carpeta `backend` como el directorio base (*Root Directory*).
3. Comando de Build: `npm install`
4. Comando de Inicio: `npm start`
5. **Variables de Entorno**:
   - `PORT`: 3000 (o el que prefieras)
   - `JWT_SECRET`: (Pon una clave larga y segura)
   - `XTREAM_URL`: (Tu URL de servicio IPTV)
   - `XTREAM_USER`: (Tu usuario)
   - `XTREAM_PASS`: (Tu contraseña)

## 3. Despliegue del Frontend
Te recomiendo usar **Vercel** o **Netlify**.

### Pasos en Vercel:
1. Crea un nuevo proyecto conectado a tu repositorio.
2. Selecciona la carpeta `web` como el directorio base.
3. El comando de build será `npm run build` y el directorio de salida será `dist`.
4. **Variables de Entorno**:
   - Agrega una variable llamada `VITE_API_BASE_URL`.
   - Su valor debe ser la URL de tu backend (ej: `https://tu-backend.onrender.com`). **No** incluyas `/api` al final, solo la URL base.

## 4. Notas Importantes
- **CORS**: El backend está configurado para aceptar peticiones de cualquier origen. Para mayor seguridad, puedes editar `backend/server.js` y cambiar `origin: '*'` por la URL de tu frontend.
- **FFmpeg**: Si usas Render, FFmpeg ya está disponible en su entorno de Node.js por defecto. Si usas otro proveedor, asegúrate de que FFmpeg esté instalado.

---
¡Tu aplicación ahora debería estar accesible desde cualquier lugar con conexión a internet!
