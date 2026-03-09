package com.shadowtv.pro.ui.viewmodels

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import com.shadowtv.pro.data.local.PreferencesManager
import com.shadowtv.pro.data.models.LiveStream
import com.shadowtv.pro.data.network.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PlayerState(
    val streamUrl: String? = null,
    val streamName: String = "",
    val streamIcon: String = "",
    val isPlaying: Boolean = true,
    val isMuted: Boolean = false,
    val showControls: Boolean = true,
    val isLoading: Boolean = false,
    val error: String? = null,
    val audioTracks: List<Pair<Int, String>> = emptyList(),
    val subtitleTracks: List<Pair<Int, String>> = emptyList(),
    val selectedAudioTrack: Int = 0,
    val selectedSubtitleTrack: Int = -1,
    val currentPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val epgTitle: String? = null,
    val liveStreamList: List<LiveStream> = emptyList(),
    val currentLiveIndex: Int = -1
)

class PlayerViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)

    private val _state = MutableStateFlow(PlayerState())
    val state: StateFlow<PlayerState> = _state.asStateFlow()

    private var token: String = ""

    fun initWithToken(t: String) {
        token = t
    }

    // ─── Play Live Stream ─────────────────────────────────────────────────────

    fun playLive(stream: LiveStream, allLiveStreams: List<LiveStream>, token: String) {
        this.token = token
        val index = allLiveStreams.indexOfFirst { it.streamId == stream.streamId }
        val url = RetrofitClient.getLiveStreamUrl(token, stream.streamId)
        _state.value = _state.value.copy(
            streamUrl = url,
            streamName = stream.name,
            streamIcon = stream.streamIcon,
            isPlaying = true,
            isLoading = true,
            error = null,
            showControls = true,
            liveStreamList = allLiveStreams,
            currentLiveIndex = index,
            audioTracks = emptyList(),
            subtitleTracks = emptyList()
        )
    }

    fun playVod(streamId: Int, name: String, icon: String, token: String) {
        this.token = token
        val url = RetrofitClient.getVodStreamUrl(token, streamId)
        _state.value = _state.value.copy(
            streamUrl = url,
            streamName = name,
            streamIcon = icon,
            isPlaying = true,
            isLoading = true,
            error = null,
            showControls = true,
            liveStreamList = emptyList(),
            currentLiveIndex = -1
        )
    }

    fun playEpisode(episodeId: String, name: String, icon: String, token: String) {
        this.token = token
        val url = RetrofitClient.getEpisodeStreamUrl(token, episodeId)
        _state.value = _state.value.copy(
            streamUrl = url,
            streamName = name,
            streamIcon = icon,
            isPlaying = true,
            isLoading = true,
            error = null,
            showControls = true
        )
    }

    // ─── Controls ─────────────────────────────────────────────────────────────

    fun setPlaying(isPlaying: Boolean) {
        _state.value = _state.value.copy(isPlaying = isPlaying)
    }

    fun toggleMute() {
        _state.value = _state.value.copy(isMuted = !_state.value.isMuted)
    }

    fun showControls() {
        _state.value = _state.value.copy(showControls = true)
    }

    fun hideControls() {
        _state.value = _state.value.copy(showControls = false)
    }

    fun setLoading(loading: Boolean) {
        _state.value = _state.value.copy(isLoading = loading)
    }

    fun setError(error: String?) {
        _state.value = _state.value.copy(error = error, isLoading = false)
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    fun updatePosition(positionMs: Long, durationMs: Long) {
        _state.value = _state.value.copy(currentPositionMs = positionMs, durationMs = durationMs)
    }

    fun setEpgTitle(title: String?) {
        _state.value = _state.value.copy(epgTitle = title)
    }

    fun setAudioTracks(tracks: List<Pair<Int, String>>) {
        _state.value = _state.value.copy(audioTracks = tracks)
    }

    fun setSubtitleTracks(tracks: List<Pair<Int, String>>) {
        _state.value = _state.value.copy(subtitleTracks = tracks)
    }

    fun selectAudioTrack(index: Int) {
        _state.value = _state.value.copy(selectedAudioTrack = index)
    }

    fun selectSubtitleTrack(index: Int) {
        _state.value = _state.value.copy(selectedSubtitleTrack = index)
    }

    // ─── Channel Navigation ───────────────────────────────────────────────────

    fun playNext() {
        val list = _state.value.liveStreamList
        val current = _state.value.currentLiveIndex
        if (list.isNotEmpty() && current >= 0) {
            val next = (current + 1) % list.size
            playLive(list[next], list, token)
        }
    }

    fun playPrevious() {
        val list = _state.value.liveStreamList
        val current = _state.value.currentLiveIndex
        if (list.isNotEmpty() && current >= 0) {
            val prev = if (current - 1 < 0) list.size - 1 else current - 1
            playLive(list[prev], list, token)
        }
    }

    fun stop() {
        _state.value = PlayerState()
    }
}
