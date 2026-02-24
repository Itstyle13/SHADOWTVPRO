import { useEffect, useRef, useCallback } from 'react';
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
    const MAX_RETRIES = 10;

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
        }

        const reinit = () => {
            if (!isMounted) return;

            // Guardar posición actual para reanudar desde el mismo punto
            const lastPosition = videoElement.current?.currentTime || 0;
            console.log(`[VideoPlayer] Guardando posición ${lastPosition} para reanudar.`);

            if (retryCountRef.current >= MAX_RETRIES) {
                console.warn(`[VideoPlayer] Agotados reintentos locales (${MAX_RETRIES}) para ${activeStreamKey}.`);
                callbacks.onError?.({ message: "Error de conexión persistente. Por favor, reintenta manualmente o elige otro canal." });
                stopWatchdog();
                return;
            }

            retryCountRef.current++;
            console.log(`[VideoPlayer] Reintentando reconexión automática (${retryCountRef.current}/${MAX_RETRIES}) para ${activeStreamKey}`);
            setTimeout(() => init(lastPosition), 1000); // Pequeño delay para no saturar
        };

        const startWatchdog = () => {
            stopWatchdog();

            // VOD y Series necesitan más tiempo de gracia (archivos pesados)
            const gracePeriod = (type === 'vod' || type === 'series') ? 30000 : 12000;
            const startTime = Date.now();

            lastPosRef.current = videoElement.current?.currentTime || 0;
            lastTimeRef.current = Date.now();

            watchdogRef.current = setInterval(() => {
                const video = videoElement.current;
                if (!video) return;

                const currentPos = video.currentTime;
                const now = Date.now();

                // Período de gracia inicial
                if (now - startTime < gracePeriod) return;

                const isPaused = video.paused;
                const isWaiting = video.readyState < 3;

                // Caso especial: Atascado en 0 intentando reproducir
                if (currentPos === 0 && !isPaused) {
                    if (now - startTime > 15000) {
                        console.warn(`[VideoPlayer] Watchdog detectó estancamiento inicial en 0 (15s+)`);
                        reinit();
                    }
                    return;
                }

                if (!isPaused) {
                    if (currentPos > lastPosRef.current) {
                        lastPosRef.current = currentPos;
                        lastTimeRef.current = now;
                        if (retryCountRef.current > 0 && (now - lastTimeRef.current > 20000)) {
                            retryCountRef.current = 0;
                        }
                    } else if (now - lastTimeRef.current > 10000) {
                        console.warn(`[VideoPlayer] Watchdog detectó estancamiento en ${currentPos}`);
                        reinit();
                    }
                } else if (isWaiting && now - lastTimeRef.current > 15000) {
                    console.warn(`[VideoPlayer] Watchdog detectó buffering infinito`);
                    reinit();
                }
            }, 2000); // Revisión cada 2s
        };

        const startNative = (url) => {
            if (!isMounted) return;
            attempts.native = true;
            cleanupPlayers();
            if (videoElement.current) {
                const extension = stream.container_extension ? `.${stream.container_extension}` : '';
                const format = (stream.container_extension || '').toLowerCase();
                // Formatos que casi nunca funcionan nativos en web o que suelen tener audio AC3 (no soportado)
                const isUnsupported = ['mkv', 'avi', 'flv', 'wmv', 'divx', 'mpg', 'mpeg'].includes(format);

                // Forzar transcodificación si el formato es dudoso O si el primer intento falló
                const useTranscode = (type === 'vod' || type === 'series') && (isUnsupported || retryCountRef.current >= 1);

                let finalUrl = url || `${API_BASE}/${useTranscode ? 'transcode' : 'stream'}/${type}/${activeStreamKey}${extension}${useTranscode ? '.mp4' : ''}?token=${token}`;

                console.log(`[VideoPlayer] startNative -> container: ${stream.container_extension}, useTranscode: ${useTranscode}, finalUrl: ${finalUrl}`);

                // Asegurar que no hay dobles slashes problemáticos (excepto en http://)
                finalUrl = finalUrl.replace(/([^:])\/\//g, '$1/');

                console.log(`[VideoPlayer] Iniciando Nativo (${type}): ${finalUrl} | Formato: ${format || 'autodetect'} | Intento: ${retryCountRef.current}`);

                videoElement.current.src = finalUrl;
                if (autoPlay) {
                    const playPromise = videoElement.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (e.name === 'AbortError') return;
                            console.warn("[VideoPlayer] Play bloqueado o fallido:", e.message);
                            // Si el error es de formato/soporte, reintentar podría ayudar
                            if (!isUnsupported && retryCountRef.current < 2) {
                                setTimeout(reinit, 2000);
                            }
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
                    console.warn("[VideoPlayer] Autoplay bloqueado por el navegador o error de audio:", e);
                });
            }

            player.on(mpegts.Events.ERROR, (errorType, detail, data) => {
                const isFormatError = errorType === mpegts.ErrorTypes.MEDIA_ERROR ||
                    detail === mpegts.ErrorDetails.FORMAT_ERROR;

                if (isFormatError && !attempts.hls) {
                    console.warn("[VideoPlayer] Error de formato en MPEG-TS. Probando HLS...");
                    cleanupPlayers();
                    startHls();
                } else {
                    console.error("[VideoPlayer] Error MPEG-TS crítico:", errorType, detail);
                    if (detail === mpegts.ErrorDetails.NETWORK_ERROR || isFormatError) {
                        reinit();
                    }
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
                    manifestLoadingMaxRetry: 10,
                    levelLoadingMaxRetry: 10,
                    lowLatencyMode: true, // Modo Baja Latencia Comercial
                    liveSyncDurationCount: 3,
                    backBufferLength: 30
                });
                hls.loadSource(url);
                hls.attachMedia(videoElement.current);
                hlsPlayerRef.current = hls;

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (autoPlay) {
                        videoElement.current.play().catch(e => {
                            console.warn("[VideoPlayer] Autoplay HLS bloqueado:", e);
                        });
                    }
                    if (callbacks.onLoadEnd) callbacks.onLoadEnd();
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn("[VideoPlayer] Error de medios HLS. Intentando recuperación...");
                                hls.recoverMediaError();
                                break;
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.error("[VideoPlayer] Error de red HLS fatal.");
                                cleanupPlayers();
                                reinit();
                                break;
                            default:
                                console.error("[VideoPlayer] Error HLS fatal no recuperable.");
                                cleanupPlayers();
                                reinit();
                                break;
                        }
                    }
                });
            } else {
                startNative(url);
            }
        };

        const handleLoadEnd = () => {
            console.log(`[VideoPlayer] Reproducción activa: ${activeStreamKey}`);
            callbacks.onLoadEnd?.();
            startWatchdog();
        };

        const handleWaiting = () => {
            callbacks.onLoadStart?.();
        };

        const handleVideoError = () => {
            const error = videoElement.current?.error;
            if (error) {
                console.error(`[VideoPlayer] Error de elemento video: ${error.code} - ${error.message}`);
                if ((error.code === 3 || error.code === 4) && (type === 'vod' || type === 'series')) {
                    if (retryCountRef.current < 2) retryCountRef.current = 2;
                }
                reinit();
            }
        };

        const video = videoElement.current;
        if (video) {
            video.addEventListener('playing', handleLoadEnd);
            video.addEventListener('waiting', handleWaiting);
            video.addEventListener('error', handleVideoError);

            const handleTimeUpdate = () => callbacks.onTimeUpdate?.(video.currentTime);
            const handleDurationChange = () => {
                const duration = video.duration;
                callbacks.onDurationChange?.(duration);

                if ((type === 'vod' || type === 'series') && duration > 0 && duration < 120) {
                    if (retryCountRef.current < 2) retryCountRef.current = 2; // Saltar a transcode
                    reinit();
                }
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
                }
                else if (streamPath.includes('.ts')) {
                    // Solo usar MPEG-TS si explícitamente termina en .ts
                    await startMpegTs();
                }
                else {
                    // Por defecto, intentar HLS para Live TV, ya que el backend genera un .m3u8 proxy
                    startHls();
                }

                startWatchdog();
            } catch (err) {
                console.error("[VideoPlayer] Error durante la inicialización:", err);
                if (type === 'vod' || type === 'series') startNative();
                else if (type === 'live') startHls();
                startWatchdog();
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
