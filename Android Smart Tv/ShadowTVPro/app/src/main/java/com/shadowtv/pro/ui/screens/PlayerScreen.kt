package com.shadowtv.pro.ui.screens

import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.shadowtv.pro.ui.components.PlayerControls
import com.shadowtv.pro.ui.theme.SurfaceDark
import com.shadowtv.pro.ui.viewmodels.PlayerViewModel
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    viewModel: PlayerViewModel,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // ─── ExoPlayer Setup ─────────────────────────────────────────────────────
    val exoPlayer = remember {
        ExoPlayer.Builder(context)
            .build()
            .apply {
                playWhenReady = true
            }
    }

    // Auto-hide controls after 3 seconds (matching web app behavior)
    LaunchedEffect(state.showControls) {
        if (state.showControls && !state.isLoading && state.error == null) {
            delay(3000)
            viewModel.hideControls()
        }
    }

    // Load stream when URL changes
    LaunchedEffect(state.streamUrl) {
        val url = state.streamUrl ?: return@LaunchedEffect
        try {
            val dataSourceFactory = DefaultHttpDataSource.Factory()
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(15_000)
                .setAllowCrossProtocolRedirects(true)

            val mediaItem = MediaItem.fromUri(url)

            // Try HLS first (most IPTV streams), fall back to progressive
            val mediaSource = if (url.contains(".m3u8") || url.contains("live")) {
                HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
            } else {
                androidx.media3.exoplayer.source.ProgressiveMediaSource
                    .Factory(dataSourceFactory)
                    .createMediaSource(mediaItem)
            }

            exoPlayer.setMediaSource(mediaSource)
            exoPlayer.prepare()
        } catch (e: Exception) {
            viewModel.setError("Error al cargar el stream: ${e.localizedMessage}")
        }
    }

    // ExoPlayer listener
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_BUFFERING -> viewModel.setLoading(true)
                    Player.STATE_READY -> {
                        viewModel.setLoading(false)
                        viewModel.clearError()
                    }
                    Player.STATE_ENDED -> viewModel.setPlaying(false)
                    Player.STATE_IDLE -> {}
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                viewModel.setError("Error: ${error.localizedMessage ?: "Stream no disponible"}")
                // Auto-retry after 5 seconds for live streams
                if (state.streamUrl?.contains("live") == true) {
                    exoPlayer.prepare()
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                viewModel.setPlaying(isPlaying)
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    // Position tracking for VOD
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(500)
            if (exoPlayer.isPlaying) {
                viewModel.updatePosition(exoPlayer.currentPosition, exoPlayer.duration.coerceAtLeast(0))
            }
        }
    }

    // Sync play/pause state from ViewModel → ExoPlayer
    LaunchedEffect(state.isPlaying) {
        if (state.isPlaying) exoPlayer.play() else exoPlayer.pause()
    }

    // Sync mute state
    LaunchedEffect(state.isMuted) {
        exoPlayer.volume = if (state.isMuted) 0f else 1f
    }

    // ─── UI ──────────────────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusable()
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown) {
                    when (event.key) {
                        Key.Back, Key.Escape -> { onBack(); true }
                        Key.Enter, Key.NumPadEnter, Key.DirectionCenter,
                        Key.MediaPlayPause -> {
                            if (state.showControls) {
                                viewModel.setPlaying(!state.isPlaying)
                            } else {
                                viewModel.showControls()
                            }
                            true
                        }
                        Key.DirectionUp -> { viewModel.showControls(); true }
                        Key.DirectionDown -> { viewModel.showControls(); true }
                        Key.DirectionLeft -> {
                            viewModel.showControls()
                            if (state.liveStreamList.isNotEmpty()) viewModel.playPrevious()
                            true
                        }
                        Key.DirectionRight -> {
                            viewModel.showControls()
                            if (state.liveStreamList.isNotEmpty()) viewModel.playNext()
                            true
                        }
                        Key.MediaFastForward -> { true }
                        Key.MediaRewind -> { true }
                        else -> false
                    }
                } else false
            }
    ) {
        // ExoPlayer Surface
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false // Usamos nuestros controles personalizados
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    setBackgroundColor(android.graphics.Color.BLACK)
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            },
            update = { view ->
                view.player = exoPlayer
            },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay de controles
        PlayerControls(
            visible = state.showControls,
            streamName = state.streamName,
            epgTitle = state.epgTitle,
            isPlaying = state.isPlaying,
            isMuted = state.isMuted,
            isLoading = state.isLoading,
            error = state.error,
            currentPositionMs = state.currentPositionMs,
            durationMs = state.durationMs,
            canNavigateChannels = state.liveStreamList.isNotEmpty(),
            onPlayPause = { viewModel.setPlaying(!state.isPlaying) },
            onPrevious = { viewModel.playPrevious() },
            onNext = { viewModel.playNext() },
            onMute = { viewModel.toggleMute() },
            onRetry = {
                viewModel.clearError()
                exoPlayer.prepare()
            }
        )
    }
}
