import React, { useImperativeHandle, useEffect } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { Capacitor, registerPlugin } from '@capacitor/core';

const NativePlayer = registerPlugin('NativePlayer');

const VideoPlayer = React.forwardRef(({
    stream,
    type,
    token,
    API_BASE,
    isMuted,
    autoPlay = true,
    objectFit = 'contain',
    aspectRatio,
    onTimeUpdate,
    onDurationChange,
    onLoadEnd,
    ...callbacks // Capturar todas las funciones on* como callbacks
}, ref) => {
    const isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    const { videoElement, hlsPlayerRef, mpegtsPlayerRef } = useVideoPlayer({
        stream: isNative ? null : stream, // No cargar stream en web si estamos en App
        type, token, API_BASE, autoPlay, isMuted, callbacks
    });

    useImperativeHandle(ref, () => ({
        get current() { return isNative ? null : videoElement.current; },
        play: () => {
            if (!isNative) videoElement.current?.play();
            else NativePlayer.resume().catch(() => { });
        },
        pause: () => {
            if (!isNative) videoElement.current?.pause();
            else NativePlayer.pause().catch(() => { });
        },
        seekTo: (time) => {
            if (!isNative && videoElement.current) videoElement.current.currentTime = time;
            else NativePlayer.seekTo({ time }).catch(() => { });
        },
        setAudioTrack: (index) => {
            if (!isNative && hlsPlayerRef?.current) hlsPlayerRef.current.audioTrack = index;
            else if (isNative) NativePlayer.setTrack({ type: 'audio', id: String(index) }).catch(() => { });
        },
        setSubtitleTrack: (index) => {
            if (!isNative && hlsPlayerRef?.current) hlsPlayerRef.current.subtitleTrack = index;
            else if (isNative) NativePlayer.setTrack({ type: 'text', id: String(index) }).catch(() => { });
        }
    }));

    useEffect(() => {
        if (isNative) {
            NativePlayer.setMuted({ muted: isMuted }).catch(() => { });
        }
    }, [isMuted, isNative]);

    useEffect(() => {
        if (isNative) {
            NativePlayer.setObjectFit({ fit: objectFit }).catch(() => { });
        }
    }, [objectFit, isNative]);

    useEffect(() => {
        let progressInterval;
        let tracksLoaded = false;

        if (isNative && stream) {
            progressInterval = setInterval(async () => {
                try {
                    const result = await NativePlayer.getProgress();
                    if (result && typeof result.currentTime === 'number') {
                        if (onTimeUpdate) onTimeUpdate(result.currentTime);
                        if (onDurationChange && result.duration > 0) {
                            onDurationChange(result.duration);
                            if (!tracksLoaded && callbacks.onTracksLoaded) {
                                const tracks = await NativePlayer.getTracks();
                                if (tracks && (tracks.audioTracks || tracks.subtitleTracks)) {
                                    callbacks.onTracksLoaded({
                                        audioTracks: tracks.audioTracks || [],
                                        subtitleTracks: tracks.subtitleTracks || []
                                    });
                                    tracksLoaded = true;
                                }
                            }
                        }
                    }
                } catch (e) { }
            }, 1000);
        }
        return () => {
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [isNative, stream]);

    useEffect(() => {
        if (isNative && stream) {
            const activeStreamKey = (stream.stream_id || stream.id || stream.movie_id || stream.series_id);
            // FORZAR .ts para Live TV para evitar los problemas de conexiones múltiples HLS
            const extension = type === 'live' ? '.ts' : (stream.container_extension ? `.${stream.container_extension}` : '.mp4');
            const reconnectParam = stream._reconnect ? `&reconnect=${stream._reconnect}` : '';
            const finalUrl = `${API_BASE}/stream/${type}/${activeStreamKey}${extension}?token=${token}${reconnectParam}`;

            // Añadir clase para hacer transparente el fondo del WebView
            document.documentElement.classList.add('native-playing');

            NativePlayer.play({ url: finalUrl, title: stream.name || 'Shadow TV' })
                .then(() => console.log("Native player launched successfully"))
                .catch(err => console.error("Native player error", err));

            // Simular que ya cargó para ocultar el spinner en el layout detrás
            if (onLoadEnd) onLoadEnd();
        }

        return () => {
            if (isNative) {
                document.documentElement.classList.remove('native-playing');
                NativePlayer.stop().catch(() => { });
            }
        };
    }, [stream, type, token, isNative]); // Lanzar la app nativa cuando cambie el stream

    if (isNative) {
        return (
            <div className="native-video-placeholder" style={{ width: '100%', height: '100%' }}>
                {/* Empty placeholder to let the native UI show through */}
            </div>
        );
    }

    return (
        <video
            ref={videoElement}
            className="video-player-element"
            muted={isMuted}
            style={{ objectFit: objectFit }}
            playsInline
        />
    );
});

export default VideoPlayer;
