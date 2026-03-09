package com.shadowtv.pro.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shadowtv.pro.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onComplete: () -> Unit) {
    var progress by remember { mutableFloatStateOf(0f) }
    var minTimePassed by remember { mutableStateOf(false) }
    var dataReady by remember { mutableStateOf(false) }

    // Barra de progreso animada (igual que la web: llega a 95% y espera)
    LaunchedEffect(Unit) {
        val totalDuration = 3000L
        val steps = 95
        val stepDelay = totalDuration / steps
        repeat(steps) {
            delay(stepDelay)
            progress += 1f / 100f
        }
        minTimePassed = true

        // Simular carga completada (en una app real esto sería una carga real)
        delay(200)
        dataReady = true
    }

    // Cuando todo esté listo, completar al 100% y salir
    LaunchedEffect(minTimePassed, dataReady) {
        if (minTimePassed && dataReady) {
            progress = 1.0f
            delay(600)
            onComplete()
        }
    }

    // Animaciones
    val logoScale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "logoScale"
    )
    val logoAlpha by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(800),
        label = "logoAlpha"
    )
    val glowAlpha by rememberInfiniteTransition(label = "glow").animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glowAlpha"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceDark),
        contentAlignment = Alignment.Center
    ) {
        // Glow ring detrás del logo
        Box(
            modifier = Modifier
                .size(200.dp)
                .alpha(glowAlpha * 0.3f)
                .blur(60.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(BrandBlue, Color.Transparent)
                    ),
                    shape = RoundedCornerShape(50)
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.scale(logoScale).alpha(logoAlpha)
        ) {
            // Logo SHADOW TV PRO
            Text(
                text = "SHADOW TV",
                color = TextPrimary,
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 4.sp
            )
            Text(
                text = "PRO",
                color = BrandBlue,
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 4.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Tagline
            Text(
                text = "Tu entretenimiento sin límites",
                color = TextMuted,
                fontSize = 13.sp,
                letterSpacing = 2.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Barra de progreso
            Box(
                modifier = Modifier
                    .width(220.dp)
                    .height(2.dp)
                    .background(SurfaceElevated, RoundedCornerShape(2.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(progress)
                        .background(
                            brush = Brush.horizontalGradient(
                                colors = listOf(BrandBlue, BrandBlueLight)
                            ),
                            shape = RoundedCornerShape(2.dp)
                        )
                )
            }
        }
    }
}
