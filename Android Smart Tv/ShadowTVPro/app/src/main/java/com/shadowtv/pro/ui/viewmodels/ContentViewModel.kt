package com.shadowtv.pro.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shadowtv.pro.data.local.PreferencesManager
import com.shadowtv.pro.data.models.*
import com.shadowtv.pro.data.repository.IptvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

enum class ContentSection { LIVE, VOD, SERIES }

data class ContentState(
    // Live TV
    val liveStreams: List<LiveStream> = emptyList(),
    val liveCategories: List<Category> = emptyList(),
    val selectedLiveCategory: String? = null,
    // VOD
    val vodStreams: List<VodStream> = emptyList(),
    val vodCategories: List<Category> = emptyList(),
    val selectedVodCategory: String? = null,
    // Series
    val series: List<SeriesItem> = emptyList(),
    val seriesCategories: List<Category> = emptyList(),
    val selectedSeriesCategory: String? = null,
    // Series detail
    val selectedSeriesInfo: SeriesInfo? = null,
    val selectedSeriesItem: SeriesItem? = null,
    // EPG
    val currentEpg: EpgEntry? = null,
    // UI State
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentSection: ContentSection = ContentSection.LIVE,
    val searchQuery: String = ""
)

class ContentViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)
    private val repo = IptvRepository()

    private val _state = MutableStateFlow(ContentState())
    val state: StateFlow<ContentState> = _state.asStateFlow()

    private var token: String = ""

    init {
        viewModelScope.launch {
            token = prefs.tokenFlow.first() ?: ""
            if (token.isNotBlank()) {
                loadLiveContent()
            }
        }
    }

    // ─── Section switching ────────────────────────────────────────────────────

    fun setSection(section: ContentSection) {
        _state.value = _state.value.copy(currentSection = section, error = null)
        when (section) {
            ContentSection.LIVE -> if (_state.value.liveStreams.isEmpty()) loadLiveContent()
            ContentSection.VOD -> if (_state.value.vodStreams.isEmpty()) loadVodContent()
            ContentSection.SERIES -> if (_state.value.series.isEmpty()) loadSeriesContent()
        }
    }

    // ─── Live TV ──────────────────────────────────────────────────────────────

    fun loadLiveContent() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val streamsResult = repo.getLiveStreams(token)
            val catsResult = repo.getLiveCategories(token)
            _state.value = _state.value.copy(
                liveStreams = streamsResult.getOrDefault(emptyList()),
                liveCategories = catsResult.getOrDefault(emptyList()),
                isLoading = false,
                error = streamsResult.exceptionOrNull()?.message
            )
        }
    }

    fun filterLiveByCategory(categoryId: String?) {
        _state.value = _state.value.copy(selectedLiveCategory = categoryId)
    }

    fun getFilteredLiveStreams(): List<LiveStream> {
        val query = _state.value.searchQuery.lowercase()
        return _state.value.liveStreams
            .filter { stream ->
                (_state.value.selectedLiveCategory == null || stream.categoryId == _state.value.selectedLiveCategory) &&
                        (query.isEmpty() || stream.name.lowercase().contains(query))
            }
    }

    // ─── VOD ─────────────────────────────────────────────────────────────────

    fun loadVodContent() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val streamsResult = repo.getVodStreams(token)
            val catsResult = repo.getVodCategories(token)
            _state.value = _state.value.copy(
                vodStreams = streamsResult.getOrDefault(emptyList()),
                vodCategories = catsResult.getOrDefault(emptyList()),
                isLoading = false,
                error = streamsResult.exceptionOrNull()?.message
            )
        }
    }

    fun filterVodByCategory(categoryId: String?) {
        _state.value = _state.value.copy(selectedVodCategory = categoryId)
    }

    fun getFilteredVod(): List<VodStream> {
        val query = _state.value.searchQuery.lowercase()
        return _state.value.vodStreams.filter { movie ->
            (_state.value.selectedVodCategory == null || movie.categoryId == _state.value.selectedVodCategory) &&
                    (query.isEmpty() || movie.name.lowercase().contains(query))
        }
    }

    // ─── Series ───────────────────────────────────────────────────────────────

    fun loadSeriesContent() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val seriesResult = repo.getSeries(token)
            val catsResult = repo.getSeriesCategories(token)
            _state.value = _state.value.copy(
                series = seriesResult.getOrDefault(emptyList()),
                seriesCategories = catsResult.getOrDefault(emptyList()),
                isLoading = false,
                error = seriesResult.exceptionOrNull()?.message
            )
        }
    }

    fun loadSeriesInfo(seriesItem: SeriesItem) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, selectedSeriesItem = seriesItem)
            repo.getSeriesInfo(token, seriesItem.seriesId)
                .onSuccess { info ->
                    _state.value = _state.value.copy(selectedSeriesInfo = info, isLoading = false)
                }
                .onFailure {
                    _state.value = _state.value.copy(isLoading = false, error = it.message)
                }
        }
    }

    fun clearSeriesSelection() {
        _state.value = _state.value.copy(selectedSeriesInfo = null, selectedSeriesItem = null)
    }

    fun filterSeriesByCategory(categoryId: String?) {
        _state.value = _state.value.copy(selectedSeriesCategory = categoryId)
    }

    fun getFilteredSeries(): List<SeriesItem> {
        val query = _state.value.searchQuery.lowercase()
        return _state.value.series.filter { s ->
            (_state.value.selectedSeriesCategory == null || s.categoryId == _state.value.selectedSeriesCategory) &&
                    (query.isEmpty() || s.name.lowercase().contains(query))
        }
    }

    // ─── EPG ─────────────────────────────────────────────────────────────────

    fun loadEpg(channelId: String) {
        viewModelScope.launch {
            repo.getEpg(token, channelId)
                .onSuccess { entries ->
                    _state.value = _state.value.copy(currentEpg = entries.firstOrNull())
                }
                .onFailure {
                    _state.value = _state.value.copy(currentEpg = null)
                }
        }
    }

    fun clearEpg() {
        _state.value = _state.value.copy(currentEpg = null)
    }

    // ─── Search ───────────────────────────────────────────────────────────────

    fun setSearchQuery(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
    }

    fun getToken(): String = token
}
