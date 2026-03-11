package com.shadowtv.mobile;

import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.BridgeActivity;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.AspectRatioFrameLayout;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

@UnstableApi
public class MainActivity extends BridgeActivity {
    
    private ExoPlayer player;
    private PlayerView playerView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        // Capacitor crea la vista web despues de onCreate, en onStart o cuando se carga.
        setupPlayer();
    }

    private void setupPlayer() {
        if (playerView != null) return; // ya configurado

        // 1. Configurar WebView como transparente para que deje ver lo de atras
        getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);

        // 2. Obtener el contenedor base de Capacitor
        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
        parent.setBackgroundColor(Color.BLACK);

        // 3. Crear el PlayerView de Media3
        playerView = new PlayerView(this);
        playerView.setBackgroundColor(Color.BLACK);
        playerView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        
        // No usar controles nativos, usaremos los de la web overlay
        playerView.setUseController(false);

        // 4. Añadirlo detrás del WebView (index 0)
        parent.addView(playerView, 0);

        androidx.media3.exoplayer.DefaultLoadControl loadControl = new androidx.media3.exoplayer.DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                        30000,  // minBufferMs (aumentado para mayor estibilidad, Smart Buffer base)
                        180000, // maxBufferMs (3 minutos para Timeshift local)
                        5000,   // bufferForPlaybackMs (carga inicial más pesada para evitar micro-congelamientos)
                        8000    // bufferForPlaybackAfterRebufferMs (colchón extra tras un rebuffer)
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build();

        player = new ExoPlayer.Builder(this)
                .setLoadControl(loadControl)
                .build();
        
        player.addListener(new androidx.media3.common.Player.Listener() {
            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                // Delegamos la reconexión inteligente al Watchdog de React (useVideoPlayer.js)
                // Anteriormente, llamar a playVideo(currentUrl) aquí causaba un bucle infinito
                // de 2 segundos si el servidor Xtream enviaba un error temporal o cerraba la conexión.
                System.out.println("ExoPlayer Error: " + error.getMessage());
            }
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == androidx.media3.common.Player.STATE_ENDED) {
                    // Igual que arriba, si el stream termina (microcorte), dejamos que React 
                    // decida cuándo y cómo reconectar usando su backoff exponencial.
                    System.out.println("ExoPlayer ended.");
                }
            }
        });

        playerView.setPlayer(player);
    }

    private String currentUrl;

    public void playVideo(String url) {
        currentUrl = url;
        runOnUiThread(() -> {
            if (player == null) setupPlayer();

            Uri videoUri = Uri.parse(url);
            MediaItem mediaItem;

            if (url.contains(".m3u8")) {
                mediaItem = new MediaItem.Builder()
                        .setUri(videoUri)
                        .setMimeType(MimeTypes.APPLICATION_M3U8)
                        .build();
                DefaultHttpDataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory()
                        .setAllowCrossProtocolRedirects(true);
                HlsMediaSource hlsMediaSource = new HlsMediaSource.Factory(dataSourceFactory)
                        .setAllowChunklessPreparation(true) // Prepara más rápido y con menos metadata
                        .createMediaSource(mediaItem);
                player.setMediaSource(hlsMediaSource);
            } else {
                mediaItem = MediaItem.fromUri(videoUri);
                player.setMediaItem(mediaItem);
            }

            player.prepare();
            player.setPlayWhenReady(true);
        });
    }

    public void pauseVideo() {
        runOnUiThread(() -> {
            if (player != null) player.pause();
        });
    }

    public void stopVideo() {
        runOnUiThread(() -> {
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
        });
    }

    public long[] getVideoProgress() {
        if (player != null) {
            long current = player.getCurrentPosition();
            long duration = player.getDuration();
            return new long[] { current, duration > 0 ? duration : 0 };
        }
        return new long[] { 0, 0 };
    }

    public void seekVideo(long positionMs) {
        runOnUiThread(() -> {
            if (player != null) {
                player.seekTo(positionMs);
            }
        });
    }

    public void resumeVideo() {
        runOnUiThread(() -> {
            if (player != null) player.play();
        });
    }

    public void setVideoMuted(boolean muted) {
        runOnUiThread(() -> {
            if (player != null) {
                player.setVolume(muted ? 0f : 1f);
            }
        });
    }

    public void setVideoObjectFit(String fit) {
        runOnUiThread(() -> {
            if (playerView != null) {
                switch (fit) {
                    case "contain":
                        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
                        break;
                    case "16:9":
                        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FILL);
                        break;
                    case "4:3":
                        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_ZOOM);
                        break;
                    default:
                        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
                        break;
                }
            }
        });
    }

    public JSObject getVideoTracks() {
        JSObject ret = new JSObject();
        JSArray audioTracks = new JSArray();
        JSArray subtitleTracks = new JSArray();

        if (player != null) {
            androidx.media3.common.Tracks tracks = player.getCurrentTracks();
            for (int i = 0; i < tracks.getGroups().size(); i++) {
                androidx.media3.common.Tracks.Group group = tracks.getGroups().get(i);
                if (group.getType() == androidx.media3.common.C.TRACK_TYPE_AUDIO) {
                    for (int j = 0; j < group.length; j++) {
                        if (group.isTrackSupported(j)) {
                            JSObject track = new JSObject();
                            track.put("id", i + "_" + j);
                            track.put("groupIndex", i);
                            track.put("trackIndex", j);
                            String lang = group.getMediaTrackGroup().getFormat(j).language;
                            String label = group.getMediaTrackGroup().getFormat(j).label;
                            track.put("language", lang != null ? lang : "Unknown");
                            track.put("label", label != null ? label : "Audio " + (audioTracks.length() + 1));
                            audioTracks.put(track);
                        }
                    }
                } else if (group.getType() == androidx.media3.common.C.TRACK_TYPE_TEXT) {
                    for (int j = 0; j < group.length; j++) {
                        if (group.isTrackSupported(j)) {
                            JSObject track = new JSObject();
                            track.put("id", i + "_" + j);
                            track.put("groupIndex", i);
                            track.put("trackIndex", j);
                            String lang = group.getMediaTrackGroup().getFormat(j).language;
                            String label = group.getMediaTrackGroup().getFormat(j).label;
                            track.put("language", lang != null ? lang : "Unknown");
                            track.put("label", label != null ? label : "Sub " + (subtitleTracks.length() + 1));
                            subtitleTracks.put(track);
                        }
                    }
                }
            }
        }
        ret.put("audioTracks", audioTracks);
        ret.put("subtitleTracks", subtitleTracks);
        return ret;
    }

    public void setVideoTrack(String type, int groupIndex, int trackIndex) {
        runOnUiThread(() -> {
            if (player != null) {
                androidx.media3.common.TrackSelectionParameters.Builder builder = 
                    player.getTrackSelectionParameters().buildUpon();
                
                int trackType = type.equals("audio") ? androidx.media3.common.C.TRACK_TYPE_AUDIO : androidx.media3.common.C.TRACK_TYPE_TEXT;
                
                if (groupIndex == -1) {
                    builder.setTrackTypeDisabled(trackType, true);
                } else {
                    builder.setTrackTypeDisabled(trackType, false);
                    androidx.media3.common.TrackGroup trackGroup = player.getCurrentTracks().getGroups().get(groupIndex).getMediaTrackGroup();
                    builder.setOverrideForType(new androidx.media3.common.TrackSelectionOverride(trackGroup, trackIndex));
                }
                player.setTrackSelectionParameters(builder.build());
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
