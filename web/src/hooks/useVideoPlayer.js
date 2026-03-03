import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

export const useVideoPlayer = ({ stream, type, token, API_BASE, autoPlay, isMuted, callbacks = {} }) => {
    const mpegtsPlayerRef = useRef(null);
    const hlsPlayerRef = useRef(null);
    const videoElement = useRef(null);
    const lastStreamIdRef = useRef(null);

    // Watchdog and Reconnection State
    const watchdogRef = useRef(null);
    const retryCountRef = useRef(0);
    const lastPosRef = useRef(0);
    const lastTimeRef = useRef(0);
    const isInitializingRef = useRef(false);
    const lastReinitTimeRef = useRef(0); // Para cooldown entre reconexiones
    const MAX_RETRIES = 5; // Reducido de 10 a 5 — si falla 5 veces es problema del servidor, no de la app

    const cleanupPlayers = () => {
        if (mpegtsPlayerRef.current) {
            try { mpegtsPlayerRef.current.destroy(); } catch (e) { }
            mpegtsPlayerRef.current = null;
        }
        if (hlsPlayerRef.current) {
            try { hlsPlayerRef.current.destroy(); } catch (e) { }
            hlsPlayerRef.current = null;
        }
    };

    const stopWatchdog = () => {
        if (watchdogRef.current) {
            clearInterval(watchdogRef.current);
            watchdogRef.current = null;
        }
    };

    useEffect(() => {
        if (!stream) return;

        let isMounted = true;
        const attempts = { hls: false, mpegts: false, native: false };
        // Buscar el ID en todas las variantes posibles de Xtream
        const activeStreamKey = (stream.stream_id || stream.id || stream.movie_id || stream.series_id);

        // Reset retry count on manual stream change
        if (lastStreamIdRef.current !== activeStreamKey) {
            retryCountRef.current = 0;
            lastStreamIdRef.current = activeStreamKey;
            lastReinitTimeRef.current = 0;
        }

        const reinit = (reason = 'unknown') => {
            if (!isMounted) return;

            // COOLDOWN: Evitar reconexiones en cascada — mínimo 15s entre reintentos
            const now = Date.now();
            const timeSinceLast = now - lastReinitTimeRef.current;
            if (timeSinceLast < 15000 && lastReinitTimeRef.current > 0) {
                console.log(`[VideoPlayer] Reintentar ignorado — cooldown activo (${Math.round((15000 - timeSinceLast) / 1000)}s restantes)`);
                return;
            }

            if (retryCountRef.current >= MAX_RETRIES) {
                console.warn(`[VideoPlayer] Agotados reintentos (${MAX_RETRIES}) para ${activeStreamKey}. Razón: ${reason}`);
                callbacks.onError?.({ message: "Error de conexión persistente. Por favor, elige un canal diferente o reintenta más tarde." });
                stopWatchdog();
                return;
            }

            lastReinitTimeRef.current = now;
            retryCountRef.current++;

            // Backoff exponencial: 2s, 4s, 8s... máx 30s
            const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 30000);
            console.log(`[VideoPlayer] Reconexión (${retryCountRef.current}/${MAX_RETRIES}) en ${delay}ms — Razón: ${reason}`);

            setTimeout(() => {
                if (isMounted) init();
            }, delay);
        };

        const startWatchdog = () => {
            stopWatchdog();

            // Períodos de gracia generosos para no crear reconexiones innecesarias
            // Live: 30s, VOD/Series: 60s
            const gracePeriod = (type === 'vod' || type === 'series') ? 60000 : 30000;
            // Umbral de estancamiento: 30s para live, 60s para VOD
            const stagnationThreshold = (type === 'vod' || type === 'series') ? 60000 : 30000;
            const startTime = Date.now();

            lastPosRef.current = videoElement.current?.currentTime || 0;
            lastTimeRef.current = Date.now();

            watchdogRef.current = setInterval(() => {
                const video = videoElement.current;
                if (!video) return;

                const currentPos = video.currentTime;
                const now = Date.now();

                // Período de gracia — no actuar hasta que haya pasado suficiente tiempo
                if (now - startTime < gracePeriod) return;

                const isPaused = video.paused;

                // Si está pausado intencionalmente, no hacer nada
                if (isPaused && video.readyState >= 3) return;

                if (!isPaused) {
                    if (currentPos > lastPosRef.current) {
                        // El video avanza normalmente — reseteamos el reloj
                        lastPosRef.current = currentPos;
                        lastTimeRef.current = now;
                        // Si se recuperó sola, reseteamos el contador de reintentos
                        if (retryCountRef.current > 0 && (now - lastTimeRef.current > 60000)) {
                            retryCountRef.current = 0;
                        }
                    } else if (now - lastTimeRef.current > stagnationThreshold) {
                        // El video lleva mucho tiempo sin avanzar — reintentar
                        console.warn(`[VideoPlayer] Watchdog: video estancado por ${stagnationThreshold / 1000}s en pos=${currentPos}`);
                        lastTimeRef.current = now; // Reset para evitar loops inmediatos
                        reinit('stagnation');
                    }
                }
                // Nota: eliminamos el trigger de 'waiting/buffering infinito' porque
                // los streams HLS pueden tener buffering normal durante cambios de segmento
            }, 5000); // Revisión cada 5s en vez de cada 2s — menos agresivo
        };

        const startNative = (url) => {
            if (!isMounted) return;
            attempts.native = true;
            cleanupPlayers();
            if (videoElement.current) {
                const format = (stream.container_extension || '').toLowerCase();
                const isUnsupported = ['mkv', 'avi', 'flv', 'wmv', 'divx', 'mpg', 'mpeg'].includes(format);

                // Forzar transcodificación si el formato es dudoso O si el segundo intento falló
                const useTranscode = (type === 'vod' || type === 'series') && (isUnsupported || retryCountRef.current >= 2);
                const extension = stream.container_extension ? `.${stream.container_extension}` : '';
                let finalUrl = url || `${API_BASE}/${useTranscode ? 'transcode' : 'stream'}/${type}/${activeStreamKey}${extension}${useTranscode ? '.mp4' : ''}?token=${token}`;

                // Sanitizar URL
                finalUrl = finalUrl.replace(/([^:])\/\//g, '$1/');

                console.log(`[VideoPlayer] Native init (${type}) — transcoding: ${useTranscode} — attempt: ${retryCountRef.current}`);

                videoElement.current.src = finalUrl;
                if (autoPlay) {
                    const playPromise = videoElement.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (e.name === 'AbortError') return; // Ignorar AbortError — es normal al cambiar stream
                            console.warn("[VideoPlayer] Play bloqueado:", e.message);
                        });
                    }
                }
            }
        };

        const startMpegTs = async () => {
            if (!isMounted) return;
            attempts.mpegts = true;
            const url = `${API_BASE}/stream/${type}/${activeStreamKey}?token=${token}`;
            if (!mpegts.isSupported()) return false;

            const player = mpegts.createPlayer({
                type: 'mpegts',
                isLive: true,
                url: url,
                cors: true
            }, {
                enableWorker: true,
                enableStashBuffer: false,
                autoCleanupSourceBuffer: true,
                fixAudioTimestampGap: true,
                liveBufferLatencyChasing: false,
                lowLatencyMode: false,
                lazyLoad: false,
            });

            player.attachMediaElement(videoElement.current);
            player.load();
            mpegtsPlayerRef.current = player;
            if (autoPlay) {
                player.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        console.warn("[VideoPlayer] Autoplay MPEG-TS bloqueado:", e);
                    }
                });
            }

            player.on(mpegts.Events.ERROR, (errorType, detail) => {
                const isFormatError = errorType === mpegts.ErrorTypes.MEDIA_ERROR ||
                    detail === mpegts.ErrorDetails.FORMAT_ERROR;

                if (isFormatError && !attempts.hls) {
                    console.warn("[VideoPlayer] MPEG-TS: error de formato → intentando HLS");
                    cleanupPlayers();
                    startHls();
                } else if (detail === mpegts.ErrorDetails.NETWORK_ERROR) {
                    // Solo reconectar en errores de red, con cooldown
                    reinit('mpegts_network_error');
                } else {
                    console.error("[VideoPlayer] MPEG-TS error no manejado:", errorType, detail);
                }
            });
            return true;
        };

        const startHls = () => {
            if (!isMounted) return;
            attempts.hls = true;
            const url = `${API_BASE}/stream/${type}/${activeStreamKey}.m3u8?token=${token}`;

            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    // Reducir reintentos internos de HLS.js para no interferir con nuestro watchdog
                    manifestLoadingMaxRetry: 3,
                    levelLoadingMaxRetry: 3,
                    fragLoadingMaxRetry: 3,
                    // Desactivar modo baja latencia para streams HLS estándar (reduce reconexiones)
                    lowLatencyMode: false,
                    liveSyncDurationCount: 3,
                    backBufferLength: 60, // Más buffer para reducir stutter
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    // Tiempos de espera más generosos
                    manifestLoadingTimeOut: 15000,
                    levelLoadingTimeOut: 15000,
                    fragLoadingTimeOut: 20000,
                });
                hls.loadSource(url);
                hls.attachMedia(videoElement.current);
                hlsPlayerRef.current = hls;

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (autoPlay && isMounted) {
                        videoElement.current?.play().catch(e => {
                            if (e.name !== 'AbortError') {
                                console.warn("[VideoPlayer] Autoplay HLS bloqueado:", e);
                            }
                        });
                    }
                    callbacks.onLoadEnd?.();
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn("[VideoPlayer] HLS: error de medios → recuperando internamente...");
                                // HLS.js maneja esto internamente, solo log
                                hls.recoverMediaError();
                                break;
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                // Solo reconectar en errores de red definitivos — con cooldown
                                console.error("[VideoPlayer] HLS: error de red fatal");
                                cleanupPlayers();
                                reinit('hls_network_error');
                                break;
                            default:
                                console.error("[VideoPlayer] HLS: error fatal desconocido");
                                cleanupPlayers();
                                reinit('hls_fatal_error');
                                break;
                        }
                    }
                    // Errores NO fatales (segmentos faltantes, etc.) son manejados por HLS.js internamente — ignorarlos
                });
            } else {
                // Fallback para Safari (tiene soporte nativo HLS)
                startNative(url);
            }
        };

        const handleLoadEnd = () => {
            console.log(`[VideoPlayer] ▶ Reproduciendo: ${activeStreamKey}`);
            callbacks.onLoadEnd?.();
            // Reseteamos el contador de reintentos cuando el video empieza a reproducir exitosamente
            if (retryCountRef.current > 0) {
                console.log(`[VideoPlayer] Reproducción exitosa — reseteando contador de reintentos`);
                retryCountRef.current = 0;
            }
            startWatchdog();
        };

        const handleWaiting = () => {
            // Solo notificar al UI de loading — NO reconectar
            callbacks.onLoadStart?.();
        };

        const handleVideoError = () => {
            const error = videoElement.current?.error;
            if (error) {
                console.error(`[VideoPlayer] Error de video element: código=${error.code}`);
                // Código 1 = MEDIA_ERR_ABORTED (usuario cambió de canal) — NO reconectar
                // Código 2 = MEDIA_ERR_NETWORK — reconectar
                // Código 3 = MEDIA_ERR_DECODE — intentar con transcodificación
                // Código 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — cambiar método
                if (error.code === 1) return; // Ignorar — es un cambio voluntario de stream

                if ((error.code === 3 || error.code === 4) && (type === 'vod' || type === 'series')) {
                    if (retryCountRef.current < 2) retryCountRef.current = 2; // Saltar directo a transcode
                }
                reinit(`video_error_code_${error.code}`);
            }
        };

        const video = videoElement.current;
        if (video) {
            video.addEventListener('playing', handleLoadEnd);
            video.addEventListener('waiting', handleWaiting);
            video.addEventListener('error', handleVideoError);

            const handleTimeUpdate = () => callbacks.onTimeUpdate?.(video.currentTime);
            const handleDurationChange = () => {
                const dur = video.duration;
                if (dur && isFinite(dur)) {
                    callbacks.onDurationChange?.(dur);
                }
                // ELIMINADO: el trigger que llamaba reinit() cuando duración < 120s
                // Era la causa principal de reconexiones falsas en Live TV (duración = Infinity/NaN)
            };

            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('durationchange', handleDurationChange);

            videoElement.current._cleanupListeners = () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('durationchange', handleDurationChange);
            };
        }

        const init = async (resumePosition = 0) => {
            if (!isMounted || isInitializingRef.current) return;
            isInitializingRef.current = true;

            cleanupPlayers();
            stopWatchdog();

            const video = videoElement.current;
            if (video) {
                video.pause();
                video.src = "";
                video.load();
                video.muted = isMuted;
                if (video.volume === 0) video.volume = 1;

                if (resumePosition > 0) {
                    const handleOnce = () => {
                        video.currentTime = resumePosition;
                        video.removeEventListener('canplay', handleOnce);
                    };
                    video.addEventListener('canplay', handleOnce);
                }
            }

            if (callbacks.onLoadStart) callbacks.onLoadStart();

            const streamPath = (stream.url || activeStreamKey || '').toString().toLowerCase();

            try {
                if (type === 'vod' || type === 'series') {
                    startNative();
                } else if (streamPath.includes('.ts')) {
                    await startMpegTs();
                } else {
                    // Por defecto HLS para Live TV
                    startHls();
                }

                // Iniciar watchdog APÓS un breve delay para no cortar la carga inicial
                setTimeout(() => {
                    if (isMounted) startWatchdog();
                }, 3000);
            } catch (err) {
                console.error("[VideoPlayer] Error durante la inicialización:", err);
                if (type === 'vod' || type === 'series') startNative();
                else if (type === 'live') startHls();
            } finally {
                isInitializingRef.current = false;
            }
        };

        init();

        return () => {
            isMounted = false;
            stopWatchdog();
            if (video) {
                video.removeEventListener('playing', handleLoadEnd);
                video.removeEventListener('waiting', handleWaiting);
                video.removeEventListener('error', handleVideoError);
                if (videoElement.current?._cleanupListeners) {
                    videoElement.current._cleanupListeners();
                }
                try {
                    video.pause();
                    video.removeAttribute('src');
                    video.load();
                } catch (e) { }
            }
            cleanupPlayers();
        };
    }, [stream, type, token, API_BASE]);

    return { videoElement, hlsPlayerRef, mpegtsPlayerRef };
};
