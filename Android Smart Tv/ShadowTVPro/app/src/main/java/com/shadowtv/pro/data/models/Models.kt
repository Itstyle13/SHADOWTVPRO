package com.shadowtv.pro.data.models

import com.google.gson.annotations.SerializedName

// ─── Auth ────────────────────────────────────────────────────────────────────

data class LoginRequest(
    val xtreamUrl: String,
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    @SerializedName("user_info") val userInfo: UserInfo
)

data class UserInfo(
    val username: String = "",
    val status: String = "",
    @SerializedName("exp_date") val expDate: String? = null,
    @SerializedName("max_connections") val maxConnections: Int = 1,
    val message: String? = null
)

// ─── Live TV ─────────────────────────────────────────────────────────────────

data class LiveStream(
    @SerializedName("stream_id") val streamId: Int = 0,
    val name: String = "",
    @SerializedName("stream_icon") val streamIcon: String = "",
    @SerializedName("epg_channel_id") val epgChannelId: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("num") val channelNumber: Int? = null,
    @SerializedName("stream_type") val streamType: String? = null
)

// ─── VOD (Películas) ─────────────────────────────────────────────────────────

data class VodStream(
    @SerializedName("stream_id") val streamId: Int = 0,
    val name: String = "",
    @SerializedName("stream_icon") val streamIcon: String = "",
    @SerializedName("category_id") val categoryId: String? = null,
    val rating: String? = null,
    val plot: String? = null,
    @SerializedName("release_date") val releaseDate: String? = null,
    val genre: String? = null,
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null
)

// ─── Series ──────────────────────────────────────────────────────────────────

data class SeriesItem(
    @SerializedName("series_id") val seriesId: Int = 0,
    val name: String = "",
    val cover: String = "",
    @SerializedName("category_id") val categoryId: String? = null,
    val plot: String? = null,
    val genre: String? = null,
    val rating: String? = null,
    @SerializedName("releaseDate") val releaseDate: String? = null,
    val cast: String? = null
)

data class SeriesInfo(
    val info: SeriesItem? = null,
    val episodes: Map<String, List<Episode>> = emptyMap()
)

data class Episode(
    val id: String = "",
    @SerializedName("episode_num") val episodeNum: Int = 0,
    val title: String = "",
    @SerializedName("series_id") val seriesId: String = "",
    @SerializedName("container_extension") val containerExtension: String = "mkv",
    val info: EpisodeInfo? = null
)

data class EpisodeInfo(
    val plot: String? = null,
    @SerializedName("movie_image") val movieImage: String? = null,
    @SerializedName("release_date") val releaseDate: String? = null,
    val duration: String? = null
)

// ─── Categories ──────────────────────────────────────────────────────────────

data class Category(
    @SerializedName("category_id") val categoryId: String = "",
    @SerializedName("category_name") val categoryName: String = "",
    @SerializedName("parent_id") val parentId: Int = 0
)

// ─── EPG ─────────────────────────────────────────────────────────────────────

data class EpgEntry(
    val title: String? = null,
    val description: String? = null,
    @SerializedName("start_timestamp") val startTimestamp: Long? = null,
    @SerializedName("stop_timestamp") val stopTimestamp: Long? = null,
    @SerializedName("start") val start: String? = null,
    @SerializedName("end") val end: String? = null,
    @SerializedName("channel_id") val channelId: String? = null
)

// ─── Generic Stream wrapper ───────────────────────────────────────────────────

/** Tipo unificado para representar cualquier contenido reproducible */
sealed class PlayableItem {
    data class Live(val stream: LiveStream) : PlayableItem()
    data class Movie(val stream: VodStream) : PlayableItem()
    data class SeriesEpisode(val series: SeriesItem, val episode: Episode) : PlayableItem()
}
