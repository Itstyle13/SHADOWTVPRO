import React, { useImperativeHandle, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useVideoPlayer } from '../hooks/useVideoPlayer';

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

    const { videoElement, hlsPlayerRef, mpegtsPlayerRef } = useVideoPlayer({
        stream, type, token, API_BASE, autoPlay, isMuted, callbacks
    });

    useImperativeHandle(ref, () => ({
        get current() { return videoElement.current; },
        play: () => {
            if (Capacitor.isNativePlatform()) NativePlayer.resume();
            else videoElement.current?.play();
        },
        pause: () => {
            if (Capacitor.isNativePlatform()) NativePlayer.pause();
            else videoElement.current?.pause();
        },
        seek: (time) => {
            if (Capacitor.isNativePlatform()) NativePlayer.seekTo({ time });
            else if (videoElement.current) videoElement.current.currentTime = time;
        },
        setAudioTrack: (index) => {
            if (Capacitor.isNativePlatform()) NativePlayer.setTrack({ type: 'audio', id: String(index) });
            else if (hlsPlayerRef.current) hlsPlayerRef.current.audioTrack = index;
        },
        setSubtitleTrack: (index) => {
            if (Capacitor.isNativePlatform()) NativePlayer.setTrack({ type: 'text', id: String(index) });
            else if (hlsPlayerRef.current) hlsPlayerRef.current.subtitleTrack = index;
        }
    }));

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            NativePlayer.setObjectFit({ fit: objectFit });
        }
    }, [objectFit]);



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
