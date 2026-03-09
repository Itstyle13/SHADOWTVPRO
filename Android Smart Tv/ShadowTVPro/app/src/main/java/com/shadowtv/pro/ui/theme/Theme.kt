package com.shadowtv.pro.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val ShadowTvColorScheme = darkColorScheme(
    primary = BrandBlue,
    onPrimary = TextPrimary,
    primaryContainer = BrandBlueDark,
    onPrimaryContainer = BrandBlueLight,
    secondary = BrandBlueMid,
    background = SurfaceDark,
    onBackground = TextPrimary,
    surface = SurfaceCard,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = TextSecondary,
    error = ErrorRed,
    outline = SurfaceBorder
)

@Composable
fun ShadowTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ShadowTvColorScheme,
        typography = ShadowTvTypography,
        content = content
    )
}
