package com.shadowtv.mobile;

import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

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

import androidx.media3.extractor.ts.DefaultTsPayloadReaderFactory;
import androidx.media3.exoplayer.hls.DefaultHlsExtractorFactory;

@UnstableApi
public class MainActivity extends BridgeActivity {
    
    private ExoPlayer player;
    private PlayerView playerView;
    private static final String USER_AGENT = "ShadowTvPlayer LibVLC/3.0.22-rc1";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePlayerPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Forzar modo inmersivo (pantalla completa sin barras)
        hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }
    
    @Override
    public void onStart() {
        super.onStart();
        // Capacitor crea la vista web despues de onCreate, en onStart o cuando se carga.
        setupPlayer();
    }

    private void setupPlayer() {
        if (playerView != null) return; // ya configurado

        // 1. Configurar WebView como transparente
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

        // Ajuste inteligente: Inicia rápido (1s) pero llega hasta los 60s de colchón para estabilidad
        androidx.media3.exoplayer.DefaultLoadControl loadControl = new androidx.media3.exoplayer.DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                        15000,  // minBufferMs (Bajado a 15s para no bloquear el inicio)
                        60000,  // maxBufferMs (Mantenemos 60s de colchón máximo)
                        1000,   // bufferForPlaybackMs (Inicia al tener solo 1 segundo)
                        2000    // bufferForPlaybackAfterRebufferMs
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build();

        // MODO FUERZA BRUTA: Preferimos decodificadores de software para evitar fallos de hardware (pantalla verde)
        androidx.media3.exoplayer.DefaultRenderersFactory renderersFactory = new androidx.media3.exoplayer.DefaultRenderersFactory(this)
                .setExtensionRendererMode(androidx.media3.exoplayer.DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                .setAllowedVideoJoiningTimeMs(15000) // Mucho más tolerante (15 segundos)
                .setEnableAudioTrackPlaybackParams(true);

        // CONFIGURACIÓN DE RED GLOBAL (Forzado de Identidad ShadowTv)
        java.util.Map<String, String> defaultRequestProperties = new java.util.HashMap<>();
        defaultRequestProperties.put("User-Agent", USER_AGENT);
        
        DefaultHttpDataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(USER_AGENT)
                .setDefaultRequestProperties(defaultRequestProperties)
                .setAllowCrossProtocolRedirects(true);
        
        // Fábrica de Extractores con máxima tolerancia para señales IPTV
        androidx.media3.extractor.DefaultExtractorsFactory extractorsFactory = new androidx.media3.extractor.DefaultExtractorsFactory()
                .setTsExtractorFlags(DefaultTsPayloadReaderFactory.FLAG_ALLOW_NON_IDR_KEYFRAMES 
                                   | DefaultTsPayloadReaderFactory.FLAG_DETECT_ACCESS_UNITS)
                .setTsExtractorTimestampSearchBytes(1500 * 188);

        androidx.media3.exoplayer.source.DefaultMediaSourceFactory mediaSourceFactory = 
                new androidx.media3.exoplayer.source.DefaultMediaSourceFactory(this, extractorsFactory)
                        .setDataSourceFactory(dataSourceFactory);

        player = new ExoPlayer.Builder(this, renderersFactory)
                .setMediaSourceFactory(mediaSourceFactory)
                .setLoadControl(loadControl)
                .build();
        
        // Optimización agresiva para IPTV: Evitar pixelación al buscar (Auto-Kicker)
        player.setSeekParameters(androidx.media3.exoplayer.SeekParameters.CLOSEST_SYNC);
        player.setVideoScalingMode(androidx.media3.common.C.VIDEO_SCALING_MODE_SCALE_TO_FIT);
        
        // Evitar que el video espere al audio y permitir pérdida de marcos para evitar pantalla congelada
        player.setTrackSelectionParameters(
            player.getTrackSelectionParameters().buildUpon()
                .setPreferredVideoMimeType(androidx.media3.common.MimeTypes.VIDEO_H264)
                .build()
        );
        
        player.addListener(new androidx.media3.common.Player.Listener() {
            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                System.out.println("ExoPlayer Error: " + error.getMessage());
            }
        });

        playerView.setPlayer(player);
    }



    private String currentUrl;
    private int stuckCounter = 0;

    public void playVideo(String url) {
        currentUrl = url;
        runOnUiThread(() -> {
            if (player == null) {
                setupPlayer();
            } else {
                player.stop();
                player.clearMediaItems();
            }

            Uri videoUri = Uri.parse(url);
            MediaItem mediaItem;
            
            if (url.contains(".m3u8")) {
                mediaItem = new MediaItem.Builder()
                        .setUri(videoUri)
                        .setMimeType(MimeTypes.APPLICATION_M3U8)
                        .build();
            } else {
                mediaItem = MediaItem.fromUri(videoUri);
            }

            player.setMediaItem(mediaItem);
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
