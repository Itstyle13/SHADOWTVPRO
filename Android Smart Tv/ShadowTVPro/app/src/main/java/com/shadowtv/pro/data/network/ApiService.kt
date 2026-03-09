package com.shadowtv.pro.data.network

import com.shadowtv.pro.data.models.*
import retrofit2.http.*

interface ApiService {

    // ─── Auth ────────────────────────────────────────────────────────────────

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    // ─── Live TV ─────────────────────────────────────────────────────────────

    @GET("api/streams/live")
    suspend fun getLiveStreams(
        @Header("Authorization") token: String
    ): List<LiveStream>

    @GET("api/categories/live")
    suspend fun getLiveCategories(
        @Header("Authorization") token: String
    ): List<Category>

    // ─── VOD ─────────────────────────────────────────────────────────────────

    @GET("api/streams/vod")
    suspend fun getVodStreams(
        @Header("Authorization") token: String,
        @Query("category") categoryId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): List<VodStream>

    @GET("api/categories/vod")
    suspend fun getVodCategories(
        @Header("Authorization") token: String
    ): List<Category>

    // ─── Series ──────────────────────────────────────────────────────────────

    @GET("api/streams/series")
    suspend fun getSeries(
        @Header("Authorization") token: String,
        @Query("category") categoryId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): List<SeriesItem>

    @GET("api/series/{id}")
    suspend fun getSeriesInfo(
        @Header("Authorization") token: String,
        @Path("id") seriesId: Int
    ): SeriesInfo

    @GET("api/categories/series")
    suspend fun getSeriesCategories(
        @Header("Authorization") token: String
    ): List<Category>

    // ─── EPG ─────────────────────────────────────────────────────────────────

    @GET("api/epg/{id}")
    suspend fun getEpg(
        @Header("Authorization") token: String,
        @Path("id") channelId: String
    ): List<EpgEntry>
}
