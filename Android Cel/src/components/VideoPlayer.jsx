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
    ...callbacks // Capturar todas las funciones on* como callbacks
}, ref) => {
    const isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    const { videoElement, hlsPlayerRef, mpegtsPlayerRef } = useVideoPlayer({
        stream: isNative ? null : stream, // No cargar stream en web si estamos en App
        type, token, API_BASE, autoPlay, isMuted, callbacks
    });

    useImperativeHandle(ref, () => ({
        get current() { return isNative ? null : videoElement.current; },
        play: () => { if (!isNative) videoElement.current?.play() },
        pause: () => { if (!isNative) videoElement.current?.pause() },
        setAudioTrack: (index) => {
            if (hlsPlayerRef?.current) hlsPlayerRef.current.audioTrack = index;
        },
        setSubtitleTrack: (index) => {
            if (hlsPlayerRef?.current) hlsPlayerRef.current.subtitleTrack = index;
        }
    }));

    useEffect(() => {
        if (isNative && stream) {
            const activeStreamKey = (stream.stream_id || stream.id || stream.movie_id || stream.series_id);
            const extension = stream.container_extension ? `.${stream.container_extension}` : (type === 'live' ? '.m3u8' : '');
            const finalUrl = `${API_BASE}/stream/${type}/${activeStreamKey}${extension}?token=${token}`;

            // Añadir clase para hacer transparente el fondo del WebView
            document.body.classList.add('native-playing');

            NativePlayer.play({ url: finalUrl, title: stream.name || 'Shadow TV' })
                .then(() => console.log("Native player launched successfully"))
                .catch(err => console.error("Native player error", err));

            // Simular que ya cargó para ocultar el spinner en el layout detrás
            if (callbacks.onLoadEnd) callbacks.onLoadEnd();
        }

        return () => {
            if (isNative) {
                document.body.classList.remove('native-playing');
                NativePlayer.stop().catch(() => { });
            }
        };
    }, [stream, type, token, isNative]); // Lanzar la app nativa cuando cambie el stream

    if (isNative) {
        return (
            <div className="native-video-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                Reproduciendo en pantalla completa...
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
