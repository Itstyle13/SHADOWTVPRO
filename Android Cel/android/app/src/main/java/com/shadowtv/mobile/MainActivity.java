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

        // 3. Crear el PlayerView de Media3
        playerView = new PlayerView(this);
        playerView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        
        // No usar controles nativos, usaremos los de la web overlay
        playerView.setUseController(false);

        // 4. Añadirlo detrás del WebView (index 0)
        parent.addView(playerView, 0);

        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
    }

    public void playVideo(String url) {
        runOnUiThread(() -> {
            if (player == null) setupPlayer();

            Uri videoUri = Uri.parse(url);
            MediaItem mediaItem;

            if (url.contains(".m3u8")) {
                mediaItem = new MediaItem.Builder()
                        .setUri(videoUri)
                        .setMimeType(MimeTypes.APPLICATION_M3U8)
                        .build();
                DefaultHttpDataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory();
                HlsMediaSource hlsMediaSource = new HlsMediaSource.Factory(dataSourceFactory)
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
