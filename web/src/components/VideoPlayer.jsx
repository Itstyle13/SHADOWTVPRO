import React, { useImperativeHandle } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';

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
        play: () => videoElement.current?.play(),
        pause: () => videoElement.current?.pause(),
        setAudioTrack: (index) => {
            if (hlsPlayerRef.current) hlsPlayerRef.current.audioTrack = index;
        },
        setSubtitleTrack: (index) => {
            if (hlsPlayerRef.current) hlsPlayerRef.current.subtitleTrack = index;
        }
    }));



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
