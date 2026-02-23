const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../cache/images');

// Asegurar que el directorio existe
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Genera un hash único para una URL o nombre
 */
function getHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * Verifica si una imagen está en caché y devuelve su stream y metadata si existe
 */
function getCachedImage(url) {
    const hash = getHash(url);
    const filePath = path.join(CACHE_DIR, hash);
    const metaPath = path.join(CACHE_DIR, `${hash}.json`);

    if (fs.existsSync(filePath) && fs.existsSync(metaPath)) {
        try {
            const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            return {
                stream: fs.createReadStream(filePath),
                contentType: metadata.contentType
            };
        } catch (e) {
            console.error('[CACHE] Error leyendo metadata:', e);
            return null;
        }
    }
    return null;
}

const MAX_FILES = 500; // Límite razonable de archivos en caché

/**
 * Mantiene la caché bajo el límite de archivos eliminando los más antiguos
 */
function pruneCache() {
    try {
        const files = fs.readdirSync(CACHE_DIR);
        if (files.length <= MAX_FILES) return;

        // Obtener estadísticas de los archivos para ordenar por fecha de modificación
        const fileStats = files.map(file => {
            const fullPath = path.join(CACHE_DIR, file);
            try {
                const stats = fs.statSync(fullPath);
                return { name: file, time: stats.mtimeMs };
            } catch (e) {
                return null;
            }
        }).filter(f => f !== null);

        // Ordenar: los más antiguos primero
        fileStats.sort((a, b) => a.time - b.time);

        // Eliminar el exceso (un 20% extra para evitar ejecuciones constantes)
        const toDeleteCount = files.length - MAX_FILES + Math.floor(MAX_FILES * 0.2);
        const toDelete = fileStats.slice(0, toDeleteCount);

        for (const file of toDelete) {
            try {
                fs.unlinkSync(path.join(CACHE_DIR, file.name));
            } catch (err) {
                // Ignorar errores
            }
        }
        console.log(`[CACHE] Prune completado. Eliminados ${toDelete.length} archivos antiguos.`);
    } catch (e) {
        console.error('[CACHE] Error limpiando caché:', e);
    }
}

/**
 * Guarda un stream en la caché
 */
async function saveToCache(url, stream, contentType) {
    const hash = getHash(url);
    const filePath = path.join(CACHE_DIR, hash);
    const metaPath = path.join(CACHE_DIR, `${hash}.json`);

    try {
        const writer = fs.createWriteStream(filePath);
        stream.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                try {
                    fs.writeFileSync(metaPath, JSON.stringify({ contentType, url, timestamp: Date.now() }));
                    // Limpieza asíncrona rápida
                    setImmediate(pruneCache);
                    resolve(filePath);
                } catch (err) {
                    reject(err);
                }
            });
            writer.on('error', reject);
        });
    } catch (e) {
        console.error('[CACHE] Error guardando en caché:', e);
    }
}

module.exports = { getCachedImage, saveToCache };
