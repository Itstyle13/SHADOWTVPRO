package com.shadowtv.pro.ui.components

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.*
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.shadowtv.pro.data.network.RetrofitClient

/**
 * Grilla genérica de cards para canales, películas y series.
 * Permite navegación D-pad horizontal y vertical.
 */
@Composable
fun <T> ChannelGrid(
    items: List<T>,
    columns: Int = 6,
    cardWidth: Dp = 150.dp,
    cardHeight: Dp = 110.dp,
    token: String,
    getName: (T) -> String,
    getIcon: (T) -> String,
    getSubtitle: ((T) -> String?)? = null,
    onItemSelected: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    val gridState = rememberLazyGridState()
    val focusRequesters = remember(items.size) {
        List(items.size) { FocusRequester() }
    }
    var focusedIndex by remember { mutableIntStateOf(0) }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(cardWidth),
        state = gridState,
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        itemsIndexed(items) { index, item ->
            val isFocused = focusedIndex == index
            val iconUrl = RetrofitClient.getIconUrl(token, getIcon(item), getName(item))

            StreamCard(
                name = getName(item),
                iconUrl = iconUrl,
                isFocused = isFocused,
                modifier = Modifier
                    .width(cardWidth)
                    .height(cardHeight)
                    .focusRequester(focusRequesters[index])
                    .onFocusChanged { state ->
                        if (state.isFocused) focusedIndex = index
                    }
                    .focusable()
                    .onKeyEvent { event ->
                        if (event.type == KeyEventType.KeyDown) {
                            when (event.key) {
                                Key.Enter, Key.NumPadEnter, Key.DirectionCenter -> {
                                    onItemSelected(item)
                                    true
                                }
                                Key.DirectionRight -> {
                                    val next = (index + 1).coerceAtMost(items.size - 1)
                                    focusRequesters[next].requestFocus()
                                    true
                                }
                                Key.DirectionLeft -> {
                                    val prev = (index - 1).coerceAtLeast(0)
                                    focusRequesters[prev].requestFocus()
                                    true
                                }
                                Key.DirectionDown -> {
                                    val next = (index + columns).coerceAtMost(items.size - 1)
                                    focusRequesters[next].requestFocus()
                                    true
                                }
                                Key.DirectionUp -> {
                                    val prev = (index - columns).coerceAtLeast(0)
                                    focusRequesters[prev].requestFocus()
                                    true
                                }
                                else -> false
                            }
                        } else false
                    },
                subtitle = getSubtitle?.invoke(item)
            )
        }
    }
}
