package com.iptv.app.ui.player

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.PlayerView
import com.iptv.app.R
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class PlayerActivity : AppCompatActivity() {

    private val viewModel: PlayerViewModel by viewModels()
    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView

    @OptIn(UnstableApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)

        playerView = findViewById(R.id.playerView)

        viewModel.streamUrl.observe(this) { url ->
            initializePlayer(url)
        }

        // Test load
        viewModel.loadChannel("123")
    }

    @OptIn(UnstableApi::class)
    private fun initializePlayer(url: String) {
        if (player == null) {
            // Optimización profesional para IPTV
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    2500,  // Min buffer antes de empezar (más estable para IPTV)
                    50000, // Buffer máximo (50 seg)
                    2500,  // Buffer para iniciar reproducción
                    5000   // Buffer necesario tras un re-buffer (evita bucles infinitos)
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()

            val trackSelector = DefaultTrackSelector(this)
            trackSelector.setParameters(
                trackSelector.buildUponParameters()
                    .setForceHighestSupportedBitrate(true)
            )

            player = ExoPlayer.Builder(this)
                .setLoadControl(loadControl)
                .setTrackSelector(trackSelector)
                .build()
            
            playerView.player = player

            // Gestión de errores y reconexión automática
            player?.addListener(object : Player.Listener {
                override fun onPlayerError(error: PlaybackException) {
                    val errorCodeName = error.errorCodeName
                    Toast.makeText(this@PlayerActivity, "Error ($errorCodeName). Reintentando...", Toast.LENGTH_SHORT).show()
                    
                    // Reintentar automáticamente tras 2 segundos si es error de red
                    playerView.postDelayed({
                        player?.prepare()
                        player?.play()
                    }, 2000)
                }
            })
        }

        val mediaSource = buildMediaSource(url)
        player?.setMediaSource(mediaSource)
        player?.prepare()
        player?.playWhenReady = true
        
        setupLiveButton()
    }

    @OptIn(UnstableApi::class)
    private fun buildMediaSource(url: String): MediaSource {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setUserAgent("IPTVPlayer/1.0")

        return DefaultMediaSourceFactory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(url))
    }

    override fun onStop() {
        super.onStop()
        player?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }

    private fun setupLiveButton() {
        val btnLive = findViewById<android.widget.TextView>(R.id.btnLive)
        
        btnLive.setOnClickListener {
            player?.seekToDefaultPosition()
            player?.play()
            Toast.makeText(this, "Yendo al directo...", Toast.LENGTH_SHORT).show()
        }

        player?.addListener(object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) {
                if (events.contains(Player.EVENT_IS_PLAYING_CHANGED) || events.contains(Player.EVENT_PLAYBACK_STATE_CHANGED)) {
                    updateLiveButtonVisibility(btnLive)
                }
            }
        })
    }

    private fun updateLiveButtonVisibility(btnLive: android.widget.TextView) {
        val isLive = player?.isCurrentMediaItemLive == true
        if (isLive) {
            btnLive.visibility = View.VISIBLE
            
            // Opcional: Cambiar color si no está en el borde en vivo
            val isAtLiveEdge = player?.isCurrentMediaItemDynamic == true && (player?.duration ?: 0) != 0L
            // Aquí se podría cambiar el color del botón si no está "en vivo" real, 
            // pero por ahora lo mantenemos visible siempre que sea stream en vivo.
        } else {
            btnLive.visibility = View.GONE
        }
    }
}
