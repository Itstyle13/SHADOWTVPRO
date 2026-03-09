package com.shadowtv.pro.data.repository

import com.shadowtv.pro.data.local.PreferencesManager
import com.shadowtv.pro.data.models.*
import com.shadowtv.pro.data.network.ApiService
import com.shadowtv.pro.data.network.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class IptvRepository(
    val api: ApiService = RetrofitClient.apiService,
    private val prefs: PreferencesManager? = null
) {

    private fun bearerToken(token: String) = "Bearer $token"

    // ─── Auth ─────────────────────────────────────────────────────────────────

    suspend fun login(username: String, password: String): Result<LoginResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                api.login(
                    LoginRequest(
                        xtreamUrl = "https://zona593movie.com:8443",
                        username = username,
                        password = password
                    )
                )
            }
        }

    // ─── Live TV ──────────────────────────────────────────────────────────────

    suspend fun getLiveStreams(token: String): Result<List<LiveStream>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getLiveStreams(bearerToken(token)) }
        }

    suspend fun getLiveCategories(token: String): Result<List<Category>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getLiveCategories(bearerToken(token)) }
        }

    // ─── VOD ──────────────────────────────────────────────────────────────────

    suspend fun getVodStreams(token: String, categoryId: String? = null): Result<List<VodStream>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getVodStreams(bearerToken(token), categoryId) }
        }

    suspend fun getVodCategories(token: String): Result<List<Category>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getVodCategories(bearerToken(token)) }
        }

    // ─── Series ───────────────────────────────────────────────────────────────

    suspend fun getSeries(token: String, categoryId: String? = null): Result<List<SeriesItem>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getSeries(bearerToken(token), categoryId) }
        }

    suspend fun getSeriesInfo(token: String, seriesId: Int): Result<SeriesInfo> =
        withContext(Dispatchers.IO) {
            runCatching { api.getSeriesInfo(bearerToken(token), seriesId) }
        }

    suspend fun getSeriesCategories(token: String): Result<List<Category>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getSeriesCategories(bearerToken(token)) }
        }

    // ─── EPG ──────────────────────────────────────────────────────────────────

    suspend fun getEpg(token: String, channelId: String): Result<List<EpgEntry>> =
        withContext(Dispatchers.IO) {
            runCatching { api.getEpg(bearerToken(token), channelId) }
        }
}
