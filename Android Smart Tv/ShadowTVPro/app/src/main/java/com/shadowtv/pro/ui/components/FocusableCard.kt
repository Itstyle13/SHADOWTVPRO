package com.shadowtv.pro.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.shadowtv.pro.ui.theme.*

/**
 * Card enfocable con efecto de escala y borde azul al recibir foco D-pad
 */
@Composable
fun FocusableCard(
    modifier: Modifier = Modifier,
    isFocused: Boolean,
    onClick: () -> Unit,
    content: @Composable BoxScope.() -> Unit
) {
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.08f else 1.0f,
        animationSpec = tween(150),
        label = "cardScale"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) FocusHighlight else Color.Transparent,
        animationSpec = tween(150),
        label = "borderColor"
    )
    val bgColor by animateColorAsState(
        targetValue = if (isFocused) SurfaceElevated else SurfaceCard,
        animationSpec = tween(150),
        label = "bgColor"
    )

    Box(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(2.dp, borderColor, RoundedCornerShape(10.dp)),
        content = content
    )
}

/**
 * Card para canales/películas con imagen y nombre
 */
@Composable
fun StreamCard(
    name: String,
    iconUrl: String,
    isFocused: Boolean,
    modifier: Modifier = Modifier,
    subtitle: String? = null
) {
    FocusableCard(
        modifier = modifier,
        isFocused = isFocused,
        onClick = {}
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Imagen del canal/película
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(SurfaceElevated),
                contentAlignment = Alignment.Center
            ) {
                if (iconUrl.isNotBlank()) {
                    AsyncImage(
                        model = iconUrl,
                        contentDescription = name,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp)
                    )
                } else {
                    Text(
                        text = name.take(2).uppercase(),
                        color = TextSecondary,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Nombre
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (isFocused) SurfaceElevated else SurfaceCard)
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            ) {
                Text(
                    text = name,
                    color = if (isFocused) TextPrimary else TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = if (isFocused) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        color = TextMuted,
                        fontSize = 9.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
