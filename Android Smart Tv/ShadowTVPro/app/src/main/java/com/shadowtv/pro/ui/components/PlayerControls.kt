package com.shadowtv.pro.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shadowtv.pro.ui.theme.*

@Composable
fun PlayerControls(
    visible: Boolean,
    streamName: String,
    epgTitle: String?,
    isPlaying: Boolean,
    isMuted: Boolean,
    isLoading: Boolean,
    error: String?,
    currentPositionMs: Long,
    durationMs: Long,
    canNavigateChannels: Boolean,
    onPlayPause: () -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onMute: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Loading spinner (siempre visible cuando carga)
    if (isLoading) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                color = BrandBlue,
                strokeWidth = 3.dp,
                modifier = Modifier.size(56.dp)
            )
        }
    }

    // Error overlay
    if (error != null) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(OverlayDark),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Error",
                    tint = ErrorRed,
                    modifier = Modifier.size(48.dp)
                )
                Text(text = "Error al reproducir", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(text = error, color = TextSecondary, fontSize = 12.sp)
                Button(
                    onClick = onRetry,
                    colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("REINTENTAR", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }
        }
    }

    // Controls overlay (auto-hide)
    AnimatedVisibility(
        visible = visible && !isLoading && error == null,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier.fillMaxSize()
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Top gradient — info del canal/EPG
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(OverlayDark, Color.Transparent)
                        )
                    )
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Column {
                    Text(
                        text = streamName,
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (epgTitle != null) {
                        Text(
                            text = epgTitle,
                            color = TextSecondary,
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Bottom gradient — controles de reproducción
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, OverlayDark)
                        )
                    )
                    .padding(24.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Progress bar (solo para VOD)
                    if (durationMs > 0) {
                        Slider(
                            value = if (durationMs > 0) currentPositionMs.toFloat() / durationMs else 0f,
                            onValueChange = {},
                            colors = SliderDefaults.colors(
                                thumbColor = BrandBlue,
                                activeTrackColor = BrandBlue,
                                inactiveTrackColor = SurfaceBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Control buttons
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Canal anterior
                        if (canNavigateChannels) {
                            IconButton(
                                onClick = onPrevious,
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(SurfaceElevated.copy(alpha = 0.7f), CircleShape)
                            ) {
                                Icon(Icons.Default.SkipPrevious, null, tint = TextPrimary, modifier = Modifier.size(28.dp))
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                        }

                        // Play / Pause
                        IconButton(
                            onClick = onPlayPause,
                            modifier = Modifier
                                .size(60.dp)
                                .background(BrandBlue, CircleShape)
                        ) {
                            Icon(
                                imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = null,
                                tint = TextPrimary,
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        // Canal siguiente
                        if (canNavigateChannels) {
                            Spacer(modifier = Modifier.width(16.dp))
                            IconButton(
                                onClick = onNext,
                                modifier = Modifier
                                    .size(48.dp)
                                    .background(SurfaceElevated.copy(alpha = 0.7f), CircleShape)
                            ) {
                                Icon(Icons.Default.SkipNext, null, tint = TextPrimary, modifier = Modifier.size(28.dp))
                            }
                        }

                        Spacer(modifier = Modifier.weight(1f))

                        // Mute
                        IconButton(
                            onClick = onMute,
                            modifier = Modifier
                                .size(40.dp)
                                .background(SurfaceElevated.copy(alpha = 0.7f), CircleShape)
                        ) {
                            Icon(
                                imageVector = if (isMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                                contentDescription = null,
                                tint = TextPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
