package com.shadowtv.pro.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle

import com.shadowtv.pro.ui.components.CategorySidebar
import com.shadowtv.pro.ui.components.ChannelGrid
import com.shadowtv.pro.ui.theme.*
import com.shadowtv.pro.ui.viewmodels.ContentSection
import com.shadowtv.pro.ui.viewmodels.ContentViewModel
import com.shadowtv.pro.ui.viewmodels.PlayerViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun MainScreen(
    contentViewModel: ContentViewModel,
    playerViewModel: PlayerViewModel,
    onNavigateToPlayer: () -> Unit,
    onLogout: () -> Unit
) {
    val state by contentViewModel.state.collectAsStateWithLifecycle()
    val token = contentViewModel.getToken()

    // Clock
    var currentTime by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        while (true) {
            currentTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
            kotlinx.coroutines.delay(30_000)
        }
    }

    // Nav item focus requesters
    val tvFocus = remember { FocusRequester() }
    val vodFocus = remember { FocusRequester() }
    val seriesFocus = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        tvFocus.requestFocus()
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceDark)
    ) {
        // ─── Left Sidebar (Navigation) ─────────────────────────────────────
        Column(
            modifier = Modifier
                .width(80.dp)
                .fillMaxHeight()
                .background(SurfaceCard)
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // Logo
            Text(
                text = "S",
                color = BrandBlue,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // TV
            NavItem(
                emoji = "📺",
                label = "TV",
                isSelected = state.currentSection == ContentSection.LIVE,
                focusRequester = tvFocus,
                onFocus = {},
                onSelect = { contentViewModel.setSection(ContentSection.LIVE) },
                nextFocus = vodFocus
            )

            // Movies
            NavItem(
                emoji = "🎬",
                label = "FILMS",
                isSelected = state.currentSection == ContentSection.VOD,
                focusRequester = vodFocus,
                onFocus = {},
                onSelect = { contentViewModel.setSection(ContentSection.VOD) },
                prevFocus = tvFocus,
                nextFocus = seriesFocus
            )

            // Series
            NavItem(
                emoji = "🎭",
                label = "SERIES",
                isSelected = state.currentSection == ContentSection.SERIES,
                focusRequester = seriesFocus,
                onFocus = {},
                onSelect = { contentViewModel.setSection(ContentSection.SERIES) },
                prevFocus = vodFocus
            )

            Spacer(modifier = Modifier.weight(1f))

            // Clock
            Text(
                text = currentTime,
                color = TextMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Logout
            IconButton(
                onClick = onLogout,
                modifier = Modifier.size(40.dp)
            ) {
                Text("⏻", fontSize = 16.sp)
            }
        }

        // ─── Category Sidebar ──────────────────────────────────────────────
        val categories = when (state.currentSection) {
            ContentSection.LIVE -> state.liveCategories
            ContentSection.VOD -> state.vodCategories
            ContentSection.SERIES -> state.seriesCategories
        }
        val selectedCat = when (state.currentSection) {
            ContentSection.LIVE -> state.selectedLiveCategory
            ContentSection.VOD -> state.selectedVodCategory
            ContentSection.SERIES -> state.selectedSeriesCategory
        }

        CategorySidebar(
            categories = categories,
            selectedCategoryId = selectedCat,
            onCategorySelected = { catId ->
                when (state.currentSection) {
                    ContentSection.LIVE -> contentViewModel.filterLiveByCategory(catId)
                    ContentSection.VOD -> contentViewModel.filterVodByCategory(catId)
                    ContentSection.SERIES -> contentViewModel.filterSeriesByCategory(catId)
                }
            }
        )

        // ─── Main Content Area ─────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(SurfaceDark)
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    color = BrandBlue,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                when (state.currentSection) {
                    ContentSection.LIVE -> {
                        ChannelGrid(
                            items = contentViewModel.getFilteredLiveStreams(),
                            token = token,
                            getName = { it.name },
                            getIcon = { it.streamIcon },
                            getSubtitle = { it.channelNumber?.let { n -> "Canal $n" } },
                            onItemSelected = { stream ->
                                playerViewModel.playLive(
                                    stream = stream,
                                    allLiveStreams = contentViewModel.getFilteredLiveStreams(),
                                    token = token
                                )
                                contentViewModel.loadEpg(stream.streamId.toString())
                                onNavigateToPlayer()
                            }
                        )
                    }

                    ContentSection.VOD -> {
                        ChannelGrid(
                            items = contentViewModel.getFilteredVod(),
                            token = token,
                            getName = { it.name },
                            getIcon = { it.streamIcon },
                            getSubtitle = { it.rating?.let { r -> "⭐ $r" } },
                            onItemSelected = { movie ->
                                playerViewModel.playVod(
                                    streamId = movie.streamId,
                                    name = movie.name,
                                    icon = movie.streamIcon,
                                    token = token
                                )
                                onNavigateToPlayer()
                            }
                        )
                    }

                    ContentSection.SERIES -> {
                        ChannelGrid(
                            items = contentViewModel.getFilteredSeries(),
                            token = token,
                            getName = { it.name },
                            getIcon = { it.cover },
                            getSubtitle = { it.genre },
                            onItemSelected = { series ->
                                // Para series, cargamos la info y mostramos episodios
                                contentViewModel.loadSeriesInfo(series)
                                // Por ahora navegamos al player con el primer episodio disponible
                                // (en la fase premium mejoraremos con pantalla de episodios)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NavItem(
    emoji: String,
    label: String,
    isSelected: Boolean,
    focusRequester: FocusRequester,
    onFocus: () -> Unit,
    onSelect: () -> Unit,
    prevFocus: FocusRequester? = null,
    nextFocus: FocusRequester? = null
) {
    var isFocused by remember { mutableStateOf(false) }
    val bgColor = when {
        isSelected -> BrandBlue.copy(alpha = 0.2f)
        isFocused -> SurfaceElevated
        else -> androidx.compose.ui.graphics.Color.Transparent
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .background(bgColor)
            .focusRequester(focusRequester)
            .onFocusChanged { state ->
                isFocused = state.isFocused
                if (state.isFocused) onFocus()
            }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown) {
                    when (event.key) {
                        Key.Enter, Key.NumPadEnter, Key.DirectionCenter -> { onSelect(); true }
                        Key.DirectionDown -> { nextFocus?.requestFocus(); true }
                        Key.DirectionUp -> { prevFocus?.requestFocus(); true }
                        else -> false
                    }
                } else false
            }
            .padding(vertical = 12.dp)
    ) {
        Text(text = emoji, fontSize = 20.sp)
        Text(
            text = label,
            color = if (isSelected) BrandBlue else if (isFocused) TextPrimary else TextMuted,
            fontSize = 8.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
        )
    }
}
