package com.shadowtv.pro.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shadowtv.pro.data.models.Category
import com.shadowtv.pro.ui.theme.*

@Composable
fun CategorySidebar(
    categories: List<Category>,
    selectedCategoryId: String?,
    onCategorySelected: (String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val allCategories = remember(categories) {
        listOf(Category(categoryId = "", categoryName = "Todas")) + categories
    }
    val listState = rememberLazyListState()
    val focusRequesters = remember(allCategories.size) {
        List(allCategories.size) { FocusRequester() }
    }
    var focusedIndex by remember { mutableIntStateOf(0) }

    LazyColumn(
        state = listState,
        modifier = modifier
            .fillMaxHeight()
            .width(180.dp)
            .background(SurfaceCard)
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        itemsIndexed(allCategories) { index, category ->
            val isSelected = selectedCategoryId == category.categoryId
            val isFocused = focusedIndex == index

            val bgColor by animateColorAsState(
                targetValue = when {
                    isSelected -> BrandBlue.copy(alpha = 0.25f)
                    isFocused -> SurfaceElevated
                    else -> Color.Transparent
                },
                animationSpec = tween(120),
                label = "catBg"
            )
            val textColor by animateColorAsState(
                targetValue = when {
                    isSelected -> BrandBlueLight
                    isFocused -> TextPrimary
                    else -> TextSecondary
                },
                animationSpec = tween(120),
                label = "catText"
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(6.dp))
                    .background(bgColor)
                    .then(
                        if (isSelected) Modifier.border(
                            1.dp, BrandBlue.copy(alpha = 0.5f), RoundedCornerShape(6.dp)
                        ) else Modifier
                    )
                    .focusRequester(focusRequesters[index])
                    .onFocusChanged { state ->
                        if (state.isFocused) focusedIndex = index
                    }
                    .onKeyEvent { event ->
                        if (event.type == KeyEventType.KeyDown) {
                            when (event.key) {
                                Key.DirectionDown -> {
                                    val next = (index + 1).coerceAtMost(allCategories.size - 1)
                                    focusRequesters[next].requestFocus()
                                    true
                                }
                                Key.DirectionUp -> {
                                    val prev = (index - 1).coerceAtLeast(0)
                                    focusRequesters[prev].requestFocus()
                                    true
                                }
                                Key.Enter, Key.NumPadEnter, Key.DirectionCenter -> {
                                    onCategorySelected(category.categoryId.ifBlank { null })
                                    true
                                }
                                else -> false
                            }
                        } else false
                    },
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = category.categoryName,
                    color = textColor,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected || isFocused) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                )
            }
        }
    }
}
